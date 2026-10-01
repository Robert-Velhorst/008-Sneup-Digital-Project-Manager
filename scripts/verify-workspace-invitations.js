const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { once } = require('node:events');
const mongoose = require('mongoose');
const { cleanupVerificationDatabase, initializeVerificationModels } = require('./verify-hai-snapshot');
const { closeHttpServer } = require('../src/utils/runtimeShutdown');

const run = async () => {
  const uri = process.env.SNEUP_INVITE_VERIFICATION_MONGO_URI;
  const databaseName = uri ? new URL(uri).pathname.slice(1) : '';
  assert.match(databaseName, /^sneup_invite_verification_[a-f0-9]{16}$/, 'An owned invitation verification database is required');
  Object.assign(process.env, {
    NODE_ENV: 'test', SNEUP_DEMO_MODE: 'false', SNEUP_PROVIDER_WRITES_DISABLED: 'true',
    SNEUP_NGROK_ENABLED: 'false', SNEUP_REQUIRE_API_KEY: 'true', SNEUP_TRUSTED_PROXY_IPS: '',
    SNEUP_PUBLIC_URL: 'https://sneup.verify.invalid', SNEUP_ALLOWED_ORIGINS: 'https://sneup.verify.invalid'
  });
  for (const name of ['SNEUP_API_KEY', 'SNEUP_API_TOKEN_PEPPER', 'SNEUP_SESSION_TOKEN_PEPPER', 'SNEUP_INVITE_TOKEN_PEPPER']) {
    process.env[name] = crypto.randomBytes(32).toString('hex');
  }
  let ownsDatabase = false;
  let server;
  let checks;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000,
      socketTimeoutMS: 15000, waitQueueTimeoutMS: 5000, maxPoolSize: 5 });
    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
    assert.equal(collections.length, 0, 'Refusing to modify an existing nonempty database');
    ownsDatabase = true;
    const Workspace = require('../src/models/Workspace');
    const User = require('../src/models/User');
    const SessionToken = require('../src/models/SessionToken');
    const { verifyInvitationTransitions } = require('./verify-invitation-transitions');
    require('../src/routes/workspaces');
    // Match completed startup schema initialization before issuing fixture reads.
    await initializeVerificationModels(mongoose);
    const workspace = await Workspace.create({ name: 'Invitation fixture', slug: 'invitation-fixture' });
    const admin = await User.create({ workspaceId: workspace._id, displayName: 'Fixture owner', role: 'owner', email: 'owner@example.invalid' });
    const raw = SessionToken.generateRawToken();
    await SessionToken.create(SessionToken.buildSecretRecord(raw, {
      workspaceId: workspace._id, userId: admin._id, expiresAt: new Date(Date.now() + 600000)
    }));
    const app = require('../src/index');
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const request = async (path, token, { method = 'GET', body } = {}) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1${path}`, {
        method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000)
      });
      const responseBody = await response.json();
      assert.equal(responseBody.ok, response.ok);
      assert.equal(responseBody.meta.apiVersion, 'v1');
      return { status: response.status, body: responseBody };
    };
    checks = await verifyInvitationTransitions({ request, workspaceId: String(workspace._id), adminToken: raw });
  } finally {
    try { await closeHttpServer(server, { timeoutMs: 5000 }); }
    finally { await cleanupVerificationDatabase(mongoose, ownsDatabase); }
  }
  process.stdout.write(`${JSON.stringify({ success: true, checks, authenticatedHttp: true, realMongo: true,
    providerCalls: false, databaseRemoved: true, cloudTlsAcceptance: false })}\n`);
};

if (require.main === module) run().catch(error => {
  process.stderr.write(`${error.code || error.name}: ${error.message}\n`);
  process.exitCode = 1;
});

module.exports = { run };
