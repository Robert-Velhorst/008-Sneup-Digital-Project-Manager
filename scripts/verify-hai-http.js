const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { once } = require('node:events');
const mongoose = require('mongoose');
const { cleanupVerificationDatabase } = require('./verify-hai-snapshot');
const { closeHttpServer } = require('../src/utils/runtimeShutdown');

const run = async () => {
  const uri = process.env.SNEUP_HAI_HTTP_VERIFICATION_MONGO_URI;
  const databaseName = uri ? new URL(uri).pathname.slice(1) : '';
  assert.match(databaseName, /^sneup_hai_http_verification_[a-f0-9]{16}$/, 'A dedicated sneup_hai_http_verification_<16 hex characters> database is required');
  process.env.SNEUP_DEMO_MODE = 'false';
  process.env.SNEUP_PROVIDER_WRITES_DISABLED = 'true';
  process.env.SNEUP_REQUIRE_API_KEY = 'true';
  process.env.SNEUP_API_KEY = crypto.randomBytes(32).toString('hex');
  process.env.SNEUP_API_TOKEN_PEPPER = crypto.randomBytes(32).toString('hex');
  process.env.SNEUP_SESSION_TOKEN_PEPPER = crypto.randomBytes(32).toString('hex');
  let ownsDatabase = false;
  let server;
  let checks = 0;
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000,
      socketTimeoutMS: 15000, waitQueueTimeoutMS: 5000, maxPoolSize: 5
    });
    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
    assert.equal(collections.length, 0, 'Refusing to modify an existing nonempty verification database');
    ownsDatabase = true;
    const Workspace = require('../src/models/Workspace');
    const User = require('../src/models/User');
    const ApiToken = require('../src/models/ApiToken');
    const SessionToken = require('../src/models/SessionToken');
    const Recommendation = require('../src/models/Recommendation');
    const Board = require('../src/models/Board');
    const List = require('../src/models/List');
    const Card = require('../src/models/Card');
    const Approval = require('../src/models/Approval');
    const TrelloActionAttempt = require('../src/models/TrelloActionAttempt');
    await Promise.all([Workspace, User, ApiToken, SessionToken, Recommendation, Board, List, Card].map(model => model.init()));
    const workspace = await Workspace.create({ name: 'HAI HTTP verification', slug: 'hai-http' });
    const other = await Workspace.create({ name: 'Other workspace', slug: 'hai-other' });
    const user = await User.create({ workspaceId: workspace._id, displayName: 'Verification user', role: 'manager', email: 'verification@example.invalid' });
    const otherUser = await User.create({ workspaceId: other._id, displayName: 'Other user', role: 'manager', email: 'other@example.invalid' });
    const board = await Board.create({ workspaceId: workspace._id, trelloId: 'd'.repeat(24), name: 'HTTP board', url: 'https://trello.com/b/fixture' });
    const list = await List.create({ workspaceId: workspace._id, boardId: board._id, trelloId: 'e'.repeat(24), name: 'In progress' });
    const card = await Card.create({ workspaceId: workspace._id, boardId: board._id, listId: list._id, trelloId: 'f'.repeat(24), name: 'HTTP card' });
    const permissions = ['integrations:hai:read', 'integrations:hai:propose'];
    const issue = async (Model, fields) => {
      const raw = crypto.randomBytes(32).toString('hex');
      const record = await Model.create(Model.buildSecretRecord(raw, {
        name: 'HTTP verification token', workspaceId: workspace._id,
        role: 'service', scopes: permissions, expiresAt: new Date(Date.now() + 600000), ...fields
      }));
      return { raw, record };
    };
    const serviceToken = await issue(ApiToken, {});
    const reader = await issue(ApiToken, { scopes: ['integrations:hai:read'] });
    const session = await issue(SessionToken, { userId: user._id });
    const foreign = await Recommendation.create({
      workspaceId: other._id, findingType: 'manual_review', title: 'Other workspace private recommendation',
      actionType: 'manual_review', recommendedAction: 'Review only', status: 'pending'
    });
    const app = require('../src/index');
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = async (path, token, { method = 'GET', body, headers = {} } = {}) => {
      const response = await fetch(`${base}/api/v1${path}`, {
        method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...headers },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000)
      });
      const responseBody = await response.json();
      assert.equal(responseBody.ok, response.ok, 'Every HTTP outcome must use the v1 envelope');
      assert.equal(responseBody.meta?.apiVersion, 'v1');
      assert.match(responseBody.meta?.requestId || '', /^[a-f0-9-]{36}$/);
      assert.equal(responseBody.meta.requestId, response.headers.get('x-sneup-request-id'));
      if (!response.ok) {
        assert.equal(responseBody.data, null);
        assert.equal(typeof responseBody.error?.code, 'string');
      }
      return { status: response.status, body: responseBody };
    };
    for (const token of [serviceToken.raw, session.raw]) {
      const response = await request('/integrations/hai/snapshot', token, { headers: { 'X-Sneup-Workspace-Id': String(other._id) } });
      assert.equal(response.status, 200, 'Valid tokens must still read their own workspace');
      assert.deepEqual(response.body.data.snapshot.partialErrors, []);
      assert.ok(!JSON.stringify(response.body).includes(String(foreign._id)), 'Workspace header must not override token ownership');
      checks++;
    }
    assert.equal((await request('/integrations/hai/snapshot')).status, 401);
    checks++;
    const proposal = {
      externalId: 'http-verification', type: 'request_update', title: 'Reviewed HTTP proposal', reason: 'Synthetic verification',
      payload: { boardId: String(board._id), cardId: String(card._id), skipApproval: true }, autoExecute: true
    };
    assert.equal((await request('/integrations/hai/proposals', reader.raw, { method: 'POST', body: proposal })).status, 403);
    checks++;
    const created = await request('/integrations/hai/proposals', serviceToken.raw, { method: 'POST', body: proposal });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.recommendation.requiresApproval, true);
    assert.equal(created.body.data.recommendation.status, 'pending');
    assert.deepEqual(created.body.data.safety, { approved: false, executed: false, humanDecisionRequired: true });
    const repeated = await request('/integrations/hai/proposals', serviceToken.raw, { method: 'POST', body: proposal });
    assert.equal(repeated.status, 200);
    assert.equal(repeated.body.data.recommendation._id, created.body.data.recommendation._id);
    const refreshed = await request('/integrations/hai/snapshot', serviceToken.raw);
    assert.ok(refreshed.body.data.snapshot.recommendations.some(item => item.id === created.body.data.recommendation._id));
    for (const action of ['approve', 'execute-approved']) {
      assert.equal((await request(`/recommendations/${created.body.data.recommendation._id}/${action}`, serviceToken.raw, { method: 'POST', body: {} })).status, 403);
      checks++;
    }
    checks += 3;

    // These references model lifecycle/data-integrity failures, not user records.
    const invalidCases = [
      [ApiToken, { workspaceId: new mongoose.Types.ObjectId() }, 'missing API-token workspace'],
      [ApiToken, { userId: new mongoose.Types.ObjectId() }, 'missing API-token user'],
      [ApiToken, { userId: otherUser._id }, 'API-token user in another workspace'],
      [SessionToken, { userId: otherUser._id }, 'session user in another workspace']
    ];
    const failures = [];
    for (const [Model, fields, label] of invalidCases) {
      const token = await issue(Model, fields);
      const response = await request('/integrations/hai/snapshot', token.raw);
      if (response.status !== 401) failures.push(`${label}: expected 401, received ${response.status}`);
      checks++;
    }
    assert.deepEqual(failures, [], 'Invalid credential relationships must fail closed');
    assert.equal(await Approval.countDocuments({}), 0);
    assert.equal(await TrelloActionAttempt.countDocuments({}), 0);
  } finally {
    try {
      await closeHttpServer(server, { timeoutMs: 5000 });
    } finally {
      await cleanupVerificationDatabase(mongoose, ownsDatabase);
    }
  }
  process.stdout.write(`${JSON.stringify({ ok: true, database: databaseName, httpChecks: checks, providerWrites: false, verificationDatabaseRemoved: true }, null, 2)}\n`);
};

run().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
