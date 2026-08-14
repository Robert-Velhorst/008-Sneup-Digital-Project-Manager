const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const uri = process.env.SNEUP_TRELLO_WEBHOOK_VERIFICATION_MONGO_URI;
const databaseName = uri ? new URL(uri).pathname.replace(/^\//, '').split('?')[0] : '';
if (!uri || !/^sneup_trello_webhook_verification_[a-z0-9_-]+$/i.test(databaseName)) {
  throw new Error('SNEUP_TRELLO_WEBHOOK_VERIFICATION_MONGO_URI must target a dedicated sneup_trello_webhook_verification_* database');
}

const Workspace = require('../src/models/Workspace');
const Board = require('../src/models/Board');
const Recommendation = require('../src/models/Recommendation');
const DecisionQueueItem = require('../src/models/DecisionQueueItem');
const AuditEvent = require('../src/models/AuditEvent');
const TrelloActionAttempt = require('../src/models/TrelloActionAttempt');
const trelloClient = require('../src/services/trelloClient');
const trelloSync = require('../src/services/trelloSync');

const run = async () => {
  const startedAt = process.hrtime.bigint();
  const priorCallbackUrl = process.env.WEBHOOK_CALLBACK_URL;
  const priorEmergencyStop = process.env.SNEUP_PROVIDER_WRITES_DISABLED;
  const callbackUrl = 'https://sneup-verification.example/api/webhooks/trello';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await Promise.all([
      Workspace.init(),
      Board.init(),
      Recommendation.init(),
      DecisionQueueItem.init(),
      AuditEvent.init(),
      TrelloActionAttempt.init()
    ]);
    const workspace = await Workspace.create({
      name: 'Trello webhook integrity verification',
      slug: `trello-webhook-integrity-${Date.now()}`
    });
    const boardIds = Array.from({ length: 3 }, () => new mongoose.Types.ObjectId().toString());
    const boards = await Board.create(boardIds.map((trelloId, index) => ({
      workspaceId: workspace._id,
      trelloId,
      name: `Webhook verification board ${index + 1}`,
      url: `https://trello.com/b/${trelloId}`
    })));
    const providerWebhooks = [
      { id: new mongoose.Types.ObjectId().toString(), idModel: boardIds[1], callbackURL: 'https://stale-one.example/api/webhooks/trello' },
      { id: new mongoose.Types.ObjectId().toString(), idModel: boardIds[1], callbackURL: 'https://stale-two.example/api/webhooks/trello' },
      { id: new mongoose.Types.ObjectId().toString(), idModel: boardIds[2], callbackURL: callbackUrl },
      { id: new mongoose.Types.ObjectId().toString(), idModel: boardIds[2], callbackURL: 'https://stale-three.example/api/webhooks/trello' }
    ];
    let providerWrites = 0;
    const originalMethods = {
      getWebhooks: trelloClient.webhookApi.getWebhooks,
      createWebhook: trelloClient.webhookApi.createWebhook,
      updateWebhook: trelloClient.webhookApi.updateWebhook,
      deleteWebhook: trelloClient.webhookApi.deleteWebhook
    };
    trelloClient.webhookApi.getWebhooks = async () => providerWebhooks;
    for (const method of ['createWebhook', 'updateWebhook', 'deleteWebhook']) {
      trelloClient.webhookApi[method] = async () => {
        providerWrites += 1;
        throw new Error(`Unexpected provider write through ${method}`);
      };
    }
    process.env.WEBHOOK_CALLBACK_URL = callbackUrl;

    const first = await trelloSync.reconcileTrelloWebhooks(workspace._id);
    const second = await trelloSync.reconcileTrelloWebhooks(workspace._id);
    assert.equal(first.metadata.queuedRecommendations, 4);
    assert.equal(second.metadata.queuedRecommendations, 0);
    assert.equal(second.metadata.reusedRecommendations, 4);
    assert.equal(providerWrites, 0);

    const [recommendations, decisions, audits, attempts] = await Promise.all([
      Recommendation.find({ workspaceId: workspace._id }).sort({ actionType: 1 }).lean(),
      DecisionQueueItem.find({ workspaceId: workspace._id }).lean(),
      AuditEvent.find({ workspaceId: workspace._id, action: 'trello_webhook_reconciliation_queued' }).lean(),
      TrelloActionAttempt.find({ workspaceId: workspace._id }).lean()
    ]);
    assert.equal(recommendations.length, 4);
    assert.equal(decisions.length, 4);
    assert.equal(audits.length, 4);
    assert.equal(attempts.length, 0);
    assert.deepEqual(recommendations.map(item => item.actionType).sort(), [
      'trello_webhook_create',
      'trello_webhook_delete',
      'trello_webhook_delete',
      'trello_webhook_update'
    ]);
    for (const recommendation of recommendations) {
      assert.equal(recommendation.requiresApproval, true);
      assert.equal(recommendation.ownerType, 'robert');
      assert.equal(recommendation.riskLevel, 'high');
      assert.equal(recommendation.status, 'pending');
      assert.equal(recommendation.actionPayload.executable, true);
      assert.equal(recommendation.actionPayload.draftOnly, false);
    }
    assert.ok(recommendations.every(item => boards.some(board => String(board._id) === String(item.boardId))));

    trelloClient.webhookApi.createWebhook = originalMethods.createWebhook;
    process.env.SNEUP_PROVIDER_WRITES_DISABLED = 'true';
    await assert.rejects(
      () => trelloClient.webhookApi.createWebhook(callbackUrl, boardIds[0], 'Blocked verification webhook'),
      error => error?.code === 'SNEUP_PROVIDER_WRITES_DISABLED'
    );

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    process.stdout.write(`${JSON.stringify({
      ok: true,
      database: databaseName,
      durationMs: Math.round(durationMs * 10) / 10,
      boardCount: boards.length,
      observedWebhookCount: providerWebhooks.length,
      recommendations: recommendations.length,
      recommendationActions: recommendations.map(item => item.actionType).sort(),
      decisions: decisions.length,
      audits: audits.length,
      attempts: attempts.length,
      repeatedReconciliationCreated: second.metadata.queuedRecommendations,
      emergencyStopBlockedLowLevelWrite: true,
      providerWrites
    }, null, 2)}\n`);
  } finally {
    process.env.WEBHOOK_CALLBACK_URL = priorCallbackUrl;
    process.env.SNEUP_PROVIDER_WRITES_DISABLED = priorEmergencyStop;
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
};

run().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
