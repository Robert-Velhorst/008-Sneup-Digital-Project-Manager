const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const { cleanupVerificationDatabase } = require('./verify-hai-snapshot');
const { once } = require('node:events');
const { closeHttpServer } = require('../src/utils/runtimeShutdown');

const verifyIntegrityRecovery = async (workspaceId, createRecommendation) => {
  const integrity = require('../src/services/dataIntegrityService');
  const { WorkerResponse, WebhookDelivery, Recommendation, Approval } = mongoose.models;
  const ApiToken = require('../src/models/ApiToken');
  const raw = crypto.randomBytes(32).toString('hex');
  await ApiToken.create(ApiToken.buildSecretRecord(raw, {
    name: 'Synthetic integrity reader', workspaceId, role: 'service', scopes: ['audit:read'],
    expiresAt: new Date(Date.now() + 600000)
  }));
  const recent = await integrity.scan({ workspaceId });
  assert.ok(!recent.findings.some(item => ['pending_worker_response', 'quarantined_worker_webhook'].includes(item.category)));
  const old = new Date(Date.now() - 3600000);
  await WorkerResponse.collection.updateMany({ workspaceId, claimState: 'pending' }, { $set: { createdAt: old } });
  await WebhookDelivery.collection.updateMany({ workspaceId, status: 'reconciliation_required' }, { $set: { updatedAt: old } });
  const broken = await createRecommendation('broken active reference');
  await Recommendation.updateOne({ _id: broken._id }, { $set: { status: 'approved', currentApprovalId: new mongoose.Types.ObjectId() } });
  const foreign = await createRecommendation('foreign workspace');
  const foreignWorkspace = new mongoose.Types.ObjectId();
  await Recommendation.updateOne({ _id: foreign._id }, { $set: { workspaceId: foreignWorkspace, status: 'approved' } });
  const snapshot = async () => JSON.stringify(await Promise.all([WorkerResponse, WebhookDelivery, Recommendation, Approval]
    .map(Model => Model.find({}).sort({ _id: 1 }).lean())));
  const before = await snapshot();
  const app = require('../src/index');
  let server;
  try {
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const request = async (query = '', { token = raw, method = 'GET', body } = {}) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/integrity${query}`, {
        method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', 'X-Sneup-Workspace-Id': String(foreignWorkspace) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000)
      });
      return { status: response.status, body: await response.json() };
    };
    assert.equal((await request('', { token: '' })).status, 401);
    assert.equal((await request('?category=invalid')).status, 400);
    const response = await request();
    assert.equal(response.status, 200);
    const report = response.body.data.report;
    assert.equal(report.workspaceId, String(workspaceId));
    assert.ok(!JSON.stringify(report).includes(String(foreign._id)));
    assert.ok(!JSON.stringify(report).includes('Synthetic private response'));
    assert.ok(!Object.hasOwn(report, 'repairStates'));
    const recovery = report.findings.filter(item => ['pending_worker_response', 'quarantined_worker_webhook', 'invalid_active_approval'].includes(item.category));
    assert.equal(recovery.length, 4);
    assert.ok(recovery.every(item => !item.repairable));
    const fingerprints = recovery.map(item => item.fingerprint);
    assert.equal((await request('/repair', { method: 'POST', body: { confirm: 'repair-derived-state', fingerprints } })).status, 403);
    const repair = await integrity.apply({ workspaceId, fingerprints, confirm: 'repair-derived-state' });
    assert.equal(repair.repaired, 0);
    assert.equal(repair.skipped, 4);
    let afterId = '';
    let foundBroken = false;
    let pages = 0;
    do {
      const page = await request(`?category=invalid_active_approval&limit=1${afterId ? `&afterId=${afterId}` : ''}`);
      assert.equal(page.status, 200);
      foundBroken ||= page.body.data.report.findings.some(item => item.entityId === String(broken._id));
      afterId = page.body.data.report.nextAfterId;
      assert.ok(++pages < 20, 'Continuation must terminate');
    } while (afterId);
    assert.ok(foundBroken && pages > 1, 'Broken references after healthy records must be reachable');
    const pending = await request('?category=pending_worker_response&limit=1');
    assert.equal(pending.body.data.report.findings[0].category, 'pending_worker_response');
    assert.equal(await snapshot(), before, 'Read-only findings and skipped repairs must preserve recovery evidence');
  } finally {
    await closeHttpServer(server, { timeoutMs: 5000 });
  }
};

const loseAcknowledgement = async (Model, operation, { unreadable = false, supersede = false } = {}) => {
  const originalWrite = Model.collection.findOneAndUpdate;
  const originalRead = Model.collection.findOne;
  let writes = 0;
  Model.collection.findOneAndUpdate = async function(...args) {
    const result = await originalWrite.apply(this, args);
    writes += 1;
    assert.ok(result, 'The controlled write must commit before its acknowledgement is lost');
    if (supersede) {
      await this.updateOne({ _id: args[0]._id }, {
        $set: { lastReviewDecisionId: new mongoose.Types.ObjectId() }, $inc: { __v: 1 }
      });
    }
    throw new Error('Synthetic lost database acknowledgement');
  };
  Model.collection.findOne = async function(...args) {
    if (args[0].lastReviewDecisionId || args[0]['response.workerResponseId']) {
      assert.equal(args[1].timeoutMS, 5000);
      assert.equal(args[1].readPreference.mode, 'primary');
      if (unreadable) throw new Error('Synthetic recovery read failure');
    }
    return originalRead.apply(this, args);
  };
  try {
    return await operation();
  } finally {
    Model.collection.findOneAndUpdate = originalWrite;
    Model.collection.findOne = originalRead;
    assert.equal(writes, 1, 'The service must not replay an uncertain write');
  }
};

const run = async () => {
  const baseUri = process.env.SNEUP_LEDGER_ACK_MONGO_URI;
  const match = /^mongodb:\/\/127\.0\.0\.1:([0-9]{1,5})\/?$/.exec(baseUri || '');
  assert.ok(match && Number(match[1]) > 0 && Number(match[1]) <= 65535,
    'SNEUP_LEDGER_ACK_MONGO_URI must be a literal mongodb://127.0.0.1:<port> with no database, credentials, or options');
  const database = `sneup_ledger_ack_verification_${crypto.randomBytes(8).toString('hex')}`;
  const uri = `mongodb://127.0.0.1:${Number(match[1])}/${database}?directConnection=true`;
  const connectionOptions = {
    serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 15000,
    waitQueueTimeoutMS: 5000, maxPoolSize: 5, directConnection: true
  };
  process.env.SNEUP_DEMO_MODE = 'false';
  process.env.SNEUP_PROVIDER_WRITES_DISABLED = 'true';
  process.env.SNEUP_REQUIRE_API_KEY = 'true';
  process.env.SNEUP_API_KEY = crypto.randomBytes(32).toString('hex');
  process.env.SNEUP_API_TOKEN_PEPPER = crypto.randomBytes(32).toString('hex');
  let ownsDatabase = false;
  let evidence;
  try {
    await mongoose.connect(uri, connectionOptions);
    assert.equal((await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).length, 0,
      'Refusing to use a nonempty verification database');
    ownsDatabase = true;
    const Workspace = require('../src/models/Workspace');
    const Recommendation = require('../src/models/Recommendation');
    const Approval = require('../src/models/Approval');
    const DecisionQueueItem = require('../src/models/DecisionQueueItem');
    const Intervention = require('../src/models/Intervention');
    const WorkerResponse = require('../src/models/WorkerResponse');
    const FollowUpPlan = require('../src/models/FollowUpPlan');
    const AuditEvent = require('../src/models/AuditEvent');
    const TrelloActionAttempt = require('../src/models/TrelloActionAttempt');
    const WebhookDelivery = require('../src/models/WebhookDelivery');
    const { GenericWebhookService } = require('../src/services/genericWebhookService');
    const service = require('../src/services/operationsLedgerService');
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    const workspace = await Workspace.create({ name: 'Acknowledgement verification', slug: database });
    const workspaceId = workspace._id;
    const createRecommendation = suffix => Recommendation.create({
      workspaceId, findingType: 'stale_card', title: `Synthetic ${suffix}`,
      recommendedAction: 'Review the exact synthetic draft', actionType: 'comment',
      actionPayload: { commentText: 'Synthetic draft', draftOnly: true },
      riskLevel: 'medium', requiresApproval: true, status: 'pending'
    });
    const createQueue = recommendation => DecisionQueueItem.create({
      workspaceId, recommendationId: recommendation._id, ownerType: 'robert',
      title: recommendation.title, question: 'Review this synthetic draft: Yes/No?', status: 'open'
    });

    const decisions = [
      ['approveRecommendation', 'approved'], ['rejectRecommendation', 'rejected'],
      ['requestRecommendationChange', 'change_requested']
    ];
    for (const [method, status] of decisions) {
      const recommendation = await createRecommendation(method);
      const queue = await createQueue(recommendation);
      const result = await loseAcknowledgement(Recommendation, () => service[method](recommendation._id, {
        workspaceId, expectedRevision: recommendation.__v, decidedBy: 'synthetic-owner'
      }));
      const saved = await Recommendation.findById(recommendation._id).lean();
      assert.equal(saved.status, status);
      assert.equal(saved.__v, 1);
      assert.equal(String(saved.lastReviewDecisionId), String(result.approval._id));
      assert.equal(await Approval.countDocuments({ recommendationId: saved._id }), 1);
      assert.equal((await DecisionQueueItem.findById(queue._id).lean()).status, status);
      assert.equal(await AuditEvent.countDocuments({ recommendationId: saved._id, approvalId: result.approval._id }), 1);
      if (status === 'approved') assert.equal(String(saved.currentApprovalId), String(result.approval._id));
      else assert.equal(saved.currentApprovalId, undefined);
    }

    const retained = [];
    for (const options of [{ unreadable: true }, { supersede: true }]) {
      const recommendation = await createRecommendation('uncertain');
      const queue = await createQueue(recommendation);
      await assert.rejects(loseAcknowledgement(Recommendation, () => service.approveRecommendation(recommendation._id, {
        workspaceId, expectedRevision: recommendation.__v, decidedBy: 'synthetic-owner'
      }), options), error => error.code === 'SNEUP_LEDGER_COMMIT_UNCERTAIN' && error.statusCode === 503);
      const saved = await Recommendation.findById(recommendation._id).lean();
      assert.ok(await Approval.findById(saved.currentApprovalId).lean(), 'Uncertain approval evidence must survive');
      assert.equal((await DecisionQueueItem.findById(queue._id).lean()).status, 'open');
      assert.equal(await AuditEvent.countDocuments({ recommendationId: saved._id }), 0);
      retained.push({ recommendationId: saved._id, approvalId: saved.currentApprovalId });
    }

    for (const unreadable of [false, true]) {
      const refs = { boardId: new mongoose.Types.ObjectId(), cardId: new mongoose.Types.ObjectId(), memberId: new mongoose.Types.ObjectId() };
      const adjacent = await Intervention.create({
        workspaceId, ...refs, type: 'follow_up', trigger: 'manual_request', severity: 'medium',
        action: 'Adjacent synthetic work must not receive a replay', status: 'executed', executedAt: new Date(Date.now() - 10000)
      });
      const intervention = await Intervention.create({
        workspaceId, ...refs, type: 'follow_up', trigger: 'manual_request', severity: 'medium',
        action: 'Synthetic response verification', status: 'executed', executedAt: new Date()
      });
      const recommendation = await createRecommendation('response');
      await Recommendation.updateOne({ _id: recommendation._id }, { $set: { status: 'executed', interventionId: intervention._id } });
      const fixtureAttempt = await TrelloActionAttempt.create({
        workspaceId, recommendationId: recommendation._id, interventionId: intervention._id,
        actionType: 'comment', payload: { synthetic: true }, status: 'succeeded', finishedAt: new Date(Date.now() - 1000)
      });
      const followUp = await FollowUpPlan.create({
        workspaceId, ...refs, recommendationId: recommendation._id, interventionId: intervention._id,
        reason: 'Synthetic response', nextAction: 'Check response', dueAt: new Date(), status: 'due'
      });
      const directResponse = () => service.recordWorkerResponse({
        workspaceId, ...refs, recommendationId: recommendation._id, interventionId: intervention._id,
        responseText: 'Synthetic private response', responseType: 'completed', source: 'manual', actor: 'synthetic-worker'
      });
      const account = {
        _id: new mongoose.Types.ObjectId(), workspaceId, connectorId: 'webhook_generic', status: 'connected',
        metadata: { workerResponseBindings: [{ source: 'slack', sourceMemberId: 'fixture-member', sourceCardId: 'fixture-card', memberId: refs.memberId, cardId: refs.cardId }] }
      };
      const signingSecret = 'synthetic-verification-only';
      const webhookDependencies = {
        ConnectorAccount: { findOne: async () => account },
        accountConnectorService: { getAccountCredentials: () => ({ signingSecret }) }
      };
      const webhook = new GenericWebhookService(webhookDependencies);
      const body = {
        id: 'synthetic:response', source: 'slack', sourceMemberId: 'fixture-member', sourceCardId: 'fixture-card',
        responseType: 'completed', responseText: 'Synthetic private response'
      };
      const rawBody = Buffer.from(JSON.stringify(body));
      const request = { accountId: String(account._id), body, rawBody, signature: `sha256=${crypto.createHmac('sha256', signingSecret).update(rawBody).digest('hex')}` };
      const operation = loseAcknowledgement(Intervention, unreadable ? () => webhook.ingestWorkerResponse(request) : directResponse, { unreadable });
      if (unreadable) await assert.rejects(operation, error => error.code === 'SNEUP_LEDGER_COMMIT_UNCERTAIN');
      else {
        const result = await operation;
        assert.equal(result.responseText, undefined);
      }
      const saved = await Intervention.findById(intervention._id).lean();
      const savedResponse = await WorkerResponse.findById(saved.response.workerResponseId).lean();
      assert.ok(savedResponse);
      assert.equal(savedResponse.claimState, unreadable ? 'pending' : 'confirmed');
      assert.equal(await WorkerResponse.countDocuments({ interventionId: saved._id }), 1);
      const listed = await service.listWorkerResponses({ workspaceId, recommendationId: recommendation._id });
      assert.equal(listed.length, unreadable ? 0 : 1);
      const accountability = await service.getWorkerAccountability({ workspaceId });
      assert.equal(accountability.members.find(member => member.memberId === String(refs.memberId)).responseCount, unreadable ? 0 : 1);
      assert.equal((await FollowUpPlan.findById(followUp._id).lean()).status, unreadable ? 'due' : 'resolved');
      assert.equal(await AuditEvent.countDocuments({ entityId: saved.response.workerResponseId }), unreadable ? 0 : 2);
      const outcome = await service.evaluateRecommendationOutcome(recommendation._id, { workspaceId, evaluatedBy: 'synthetic-verifier' });
      assert.equal(outcome.status, unreadable ? 'awaiting_evidence' : 'confirmed_improved');
      assert.equal(String(outcome.actionAttemptId), String(fixtureAttempt._id));
      if (unreadable) {
        const delivery = await WebhookDelivery.findOne({ connectorAccountId: account._id, deliveryId: body.id }).lean();
        assert.equal(delivery.status, 'reconciliation_required');
        assert.equal(delivery.expiresAt, undefined);
        assert.equal(delivery.leaseExpiresAt, undefined);
        const restartedWebhook = new GenericWebhookService(webhookDependencies);
        await assert.rejects(restartedWebhook.ingestWorkerResponse(request), error => error.code === 'reconciliation_required');
        assert.equal((await Intervention.findById(adjacent._id).lean()).response?.workerResponseId, undefined);
        assert.equal(await WorkerResponse.countDocuments({ memberId: refs.memberId }), 1);
        const oldOwner = await webhook.claimDelivery(account, 'synthetic:stale-finalizer');
        await WebhookDelivery.updateOne({ _id: oldOwner.delivery._id }, { $set: { leaseExpiresAt: new Date(Date.now() - 1000) } });
        const newOwner = await restartedWebhook.claimDelivery(account, 'synthetic:stale-finalizer');
        assert.equal(newOwner.delivery.attemptCount, oldOwner.delivery.attemptCount + 1);
        await restartedWebhook.reserveWorkerResponseDelivery(newOwner.delivery);
        await assert.rejects(webhook.finalizeDelivery(oldOwner.delivery, 'failed'), error => error.code === 'stale_delivery');
        const protectedDelivery = await WebhookDelivery.findById(newOwner.delivery._id);
        assert.equal(protectedDelivery.status, 'reconciliation_required');
        assert.equal(protectedDelivery.expiresAt, undefined);
        await protectedDelivery.validate();
      }
    }

    await verifyIntegrityRecovery(workspaceId, createRecommendation);
    await mongoose.disconnect();
    await mongoose.connect(uri, connectionOptions);
    for (const item of retained) {
      const saved = await Recommendation.findById(item.recommendationId).lean();
      assert.equal(String(saved.currentApprovalId), String(item.approvalId));
      assert.ok(await Approval.findById(item.approvalId).lean());
    }
    assert.equal(await TrelloActionAttempt.countDocuments({}), 2);
    evidence = {
      ok: true, synthetic: true, database, scenarios: 8, recoveredDecisions: 3, recoveredWorkerResponses: 1,
      unconfirmedEvidenceRetained: true, supersededReviewNotResumed: true, reconnectEvidencePreserved: true,
      pendingResponsesExcludedFromOutcomes: true, webhookReplayCannotRematchWork: true, staleFinalizerBlocked: true,
      syntheticSeededAttempts: 2, additionalTrelloActionAttempts: 0, providerWrites: false,
      integrityRecoveryHttpVerified: true, integrityCategoryContinuationVerified: true, integrityRecoveryEvidenceUnchanged: true
    };
  } finally {
    await cleanupVerificationDatabase(mongoose, ownsDatabase);
  }
  process.stdout.write(`${JSON.stringify({ ...evidence, verificationDatabaseRemoved: true }, null, 2)}\n`);
};

if (require.main === module) run().catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
