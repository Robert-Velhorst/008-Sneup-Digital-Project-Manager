const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const { cleanupVerificationDatabase } = require('./verify-hai-snapshot');

async function run() {
  const uri = process.env.SNEUP_RECONCILIATION_QUEUE_MONGO_URI;
  const name = uri ? new URL(uri).pathname.slice(1) : '';
  if (!/^sneup_reconciliation_queue_[a-z0-9_-]+$/i.test(name) || Buffer.byteLength(name) > 63) {
    throw new Error('SNEUP_RECONCILIATION_QUEUE_MONGO_URI must target a new sneup_reconciliation_queue_* database');
  }
  process.env.SNEUP_DEMO_MODE = 'false';
  process.env.SNEUP_PROVIDER_WRITES_DISABLED = 'true';
  const token = randomUUID();
  process.env.SNEUP_REQUIRE_API_KEY = 'true';
  process.env.SNEUP_API_KEY = token;
  let ownsDatabase = false;
  let server;
  let evidence;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 5 });
    assert.equal((await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).length, 0);
    await mongoose.connection.db.collection('_sneup_verification_owner').insertOne({ _id: 'owner', token });
    ownsDatabase = true;
    const Attempt = require('../src/models/TrelloActionAttempt');
    const Recommendation = require('../src/models/Recommendation');
    const Board = require('../src/models/Board');
    const service = require('../src/services/operationsLedgerService');
    service.performTrelloAction = () => { throw new Error('Provider execution is forbidden in this verifier'); };
    await Promise.all([Attempt, Recommendation, Board].map(Model => Model.init()));
    const workspaceId = new mongoose.Types.ObjectId();
    const foreignWorkspaceId = new mongoose.Types.ObjectId();
    const old = new Date('2020-01-01T00:00:00Z');
    const now = new Date('2026-09-07T12:00:00Z');
    const fields = { workspaceId, findingType: 'manual', title: 'Synthetic queue verification',
      recommendedAction: 'Synthetic review', actionType: 'comment' };
    const historyRec = await Recommendation.create({ ...fields, status: 'executed' });
    const historyCount = 5000;
    await Attempt.insertMany(Array.from({ length: historyCount }, (_, index) => ({
      workspaceId, recommendationId: historyRec._id, actionType: 'comment', status: index % 2 ? 'failed' : 'succeeded',
      startedAt: old, finishedAt: old, createdAt: old, payload: { synthetic: 'x'.repeat(1024) }
    })));
    const make = async ({ status = 'succeeded', recStatus = 'executing', reconciliation = 'not_needed', marker = false,
      decision, scope = workspaceId } = {}) => {
      const rec = await Recommendation.create({ ...fields, workspaceId: scope, status: recStatus });
      const attempt = await Attempt.create({ workspaceId: scope, recommendationId: rec._id, status, actionType: 'comment',
        startedAt: now, createdAt: now, reconciliation: { status: reconciliation },
        ...(marker ? { executionEffects: { status: 'pending', outcome: 'failed',
          auditId: new mongoose.Types.ObjectId(), followUpId: new mongoose.Types.ObjectId() } } : {}) });
      if (decision) await Recommendation.updateOne({ _id: rec._id }, { $set: { reconciliationDecision: {
        _id: new mongoose.Types.ObjectId(), attemptId: attempt._id, outcome: 'failed', evidence: 'Synthetic operator evidence',
        actor: 'synthetic-reviewer', decidedAt: now, ...(decision === 'pending' ? { effects: { status: 'pending' } } : {})
      } } });
      return { rec, attempt };
    };
    const expected = [];
    for (const options of [
      { status: 'in_progress' }, { status: 'failed', reconciliation: 'required' }, {}, { status: 'failed' },
      { status: 'failed', marker: true, decision: 'claimed' },
      { status: 'failed', recStatus: 'failed', reconciliation: 'confirmed_failed', decision: 'pending' }
    ]) expected.push((await make(options)).attempt._id);
    const definitive = await make({ status: 'failed', marker: true });
    const other = await make({ scope: foreignWorkspaceId });
    const corrupt = await make({ status: 'in_progress' });
    const foreignBoard = await Board.create({ workspaceId: foreignWorkspaceId, trelloId: 'synthetic-foreign',
      name: 'Private foreign board', url: 'https://trello.com/b/synthetic' });
    await Attempt.updateOne({ _id: corrupt.attempt._id }, { $set: { recommendationId: other.rec._id, boardId: foreignBoard._id } });
    expected.push(corrupt.attempt._id);
    expected.sort((a, b) => String(a).localeCompare(String(b)));
    const eligible = attempt => attempt.status === 'in_progress' || attempt.reconciliation?.status === 'required'
      || attempt.recommendationId?.reconciliationDecision?.effects?.status === 'pending'
      || (attempt.recommendationId?.status === 'executing' && !(attempt.status === 'failed'
        && attempt.executionEffects?.outcome === 'failed' && attempt.reconciliation?.status === 'not_needed'
        && !attempt.recommendationId?.reconciliationDecision));
    const legacy = await Attempt.find({ workspaceId }).sort({ startedAt: 1, createdAt: 1 }).limit(100).populate('recommendationId').lean();
    assert.equal(legacy.filter(eligible).length, 0, 'Reproduce old completed-history starvation');

    let hydrationLimit = 0;
    const originalFind = Attempt.find;
    Attempt.find = function(query, ...args) {
      if (query?._id?.$in) hydrationLimit = Math.max(hydrationLimit, query._id.$in.length);
      return originalFind.call(this, query, ...args);
    };
    const start = performance.now();
    let rows;
    try { rows = await service.listTrelloActionsNeedingReconciliation({ workspaceId, limit: 100, lean: true }); }
    finally { Attempt.find = originalFind; }
    const boundedReadMs = performance.now() - start;
    assert.deepEqual(rows.map(row => String(row._id)), expected.map(String));
    assert.equal(hydrationLimit, expected.length, 'Only eligible identities enter hydration');
    assert.equal(rows.find(row => String(row._id) === String(corrupt.attempt._id)).recommendationId, null);
    assert.equal(rows.find(row => String(row._id) === String(corrupt.attempt._id)).boardId, null);
    assert.ok(!JSON.stringify(rows).includes('Private foreign board'));
    assert.ok(!rows.some(row => String(row._id) === String(definitive.attempt._id)));
    const one = await service.listTrelloActionsNeedingReconciliation({ workspaceId, limit: 1 });
    assert.equal(one.length, 1);
    assert.equal(String(one[0]._id), String(expected[0]));
    assert.equal(typeof one[0].toObject, 'function', 'Non-lean caller still receives Mongoose documents');
    const three = await service.listTrelloActionsNeedingReconciliation({ workspaceId: String(workspaceId), limit: 3, lean: true });
    assert.deepEqual(three.map(row => String(row._id)), expected.slice(0, 3).map(String));
    const health = await service.getTrelloActionReconciliationHealth({ workspaceId, now: new Date(now.getTime() + 48 * 3600000), lean: true });
    assert.equal(health.summary.unresolved, expected.length);
    assert.equal(health.summary.requiresOperator, expected.length);
    assert.equal((await service.listTrelloActionsNeedingReconciliation({ workspaceId: foreignWorkspaceId })).length, 1);

    const app = require('../src/index');
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    const request = async (route, area = 'trello-actions/') => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/${area}${route}`, {
        headers: { 'x-sneup-api-key': token, 'x-sneup-workspace-id': String(workspaceId) }, signal: AbortSignal.timeout(10000)
      });
      return { status: response.status, body: await response.json() };
    };
    const queueHttp = await request('reconciliation?limit=3');
    assert.equal(queueHttp.status, 200);
    assert.deepEqual(queueHttp.body.data.actions.map(row => row._id), expected.slice(0, 3).map(String));
    const healthHttp = await request('reconciliation/health');
    assert.equal(healthHttp.status, 200);
    assert.equal(healthHttp.body.data.health.summary.unresolved, expected.length);

    const originalAggregate = Recommendation.aggregate;
    Recommendation.aggregate = () => ({ option: async () => { throw Object.assign(new Error('Synthetic query timeout'), { code: 50 }); } });
    try {
      await assert.rejects(service.listTrelloActionsNeedingReconciliation({ workspaceId }), { code: 50 });
      const failedHttp = await request('reconciliation/health');
      assert.equal(failedHttp.status, 500);
      assert.equal(failedHttp.body.ok, false);
      assert.equal(failedHttp.body.data, null, 'Unavailable health must not become a healthy zero');
      const ledgerHttp = await request('', 'operations-ledger');
      assert.equal(ledgerHttp.status, 200, 'Healthy ledger sections must remain available');
      const ledger = ledgerHttp.body.data.ledger;
      assert.equal(ledger.reconciliationHealth, null);
      assert.deepEqual(ledger.errors, [{ section: 'reconciliationHealth', message: 'Temporarily unavailable' }]);
      assert.ok(ledger.recommendations.length > 0);
      assert.ok(ledger.actions.length > 0);
    }
    finally { Recommendation.aggregate = originalAggregate; }
    const originalReferenceFind = Recommendation.collection.find;
    Recommendation.collection.find = function(filter, options) {
      assert.equal(options.maxTimeMS, 5000, 'Population must forward its own server-side timeout');
      throw Object.assign(new Error('Synthetic reference timeout'), { code: 50 });
    };
    try {
      await assert.rejects(service.listTrelloActionsNeedingReconciliation({ workspaceId }), { code: 50 });
      const failedHttp = await request('reconciliation/health');
      assert.equal(failedHttp.status, 500);
      assert.equal(failedHttp.body.ok, false);
      assert.equal(failedHttp.body.data, null);
    } finally { Recommendation.collection.find = originalReferenceFind; }
    const referenceStart = performance.now();
    const reference = await Attempt.find({ workspaceId }).populate({ path: 'recommendationId', match: { workspaceId } }).lean();
    const referenceMs = performance.now() - referenceStart;
    assert.equal(reference.filter(eligible).length, rows.length);
    await Attempt.insertMany(Array.from({ length: 300 }, () => ({ workspaceId, status: 'in_progress', actionType: 'comment',
      startedAt: new Date(now.getTime() + 1000) })));
    assert.equal((await service.listTrelloActionsNeedingReconciliation({ workspaceId, limit: 100000, lean: true })).length, 250);
    assert.equal((await service.listTrelloActionsNeedingReconciliation({ workspaceId, limit: -1, lean: true })).length, 1);
    assert.equal((await service.listTrelloActionsNeedingReconciliation({ workspaceId, limit: 'invalid', lean: true })).length, 50);
    evidence = { result: 'PASS', historyCount, unresolved: rows.length, legacyVisible: 0,
      boundedHydrationIdentities: hydrationLimit, fullHistoryRows: reference.length,
      boundedReadMs: Number(boundedReadMs.toFixed(2)), fullHistoryReferenceMs: Number(referenceMs.toFixed(2)),
      realProviderCalls: 0, scenarios: ['completed-history-starvation', 'all-eligibility-paths', 'stable-limit-order',
        'lean-and-document-results', 'workspace-objectid-casting', 'foreign-reference-isolation', 'failure-exclusion',
        'operator-claim-and-effects-pending', 'health-after-history', 'query-failure-propagation', 'bounded-hydration',
        'authenticated-queue-and-health-http', 'unavailable-health-is-not-zero', 'service-limit-clamping',
        'population-timeout-propagation', 'workspace-ledger-partial-http'] };
  } finally {
    try {
      if (server?.listening) {
        server.closeAllConnections();
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      }
    } finally {
      let verifiedOwnership = false;
      try {
        if (ownsDatabase && mongoose.connection.readyState === 1) {
          verifiedOwnership = Boolean(await mongoose.connection.db.collection('_sneup_verification_owner').findOne({ _id: 'owner', token }));
        }
      } finally { await cleanupVerificationDatabase(mongoose, verifiedOwnership); }
    }
  }
  console.log(JSON.stringify(evidence));
}

run().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
