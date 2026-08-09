const assert = require('assert');
const mongoose = require('mongoose');

const uri = process.env.SNEUP_DATA_RETENTION_VERIFICATION_MONGO_URI;
const databaseName = uri ? new URL(uri).pathname.replace(/^\//, '').split('?')[0] : '';
if (!uri || !/^sneup_data_retention_verification_[a-z0-9_-]+$/i.test(databaseName)) {
  throw new Error('SNEUP_DATA_RETENTION_VERIFICATION_MONGO_URI must target a dedicated sneup_data_retention_verification_* database');
}

const Workspace = require('../src/models/Workspace');
const JobRun = require('../src/models/JobRun');
const BoardHealthSnapshot = require('../src/models/BoardHealthSnapshot');
const Performance = require('../src/models/Performance');
const NotificationDelivery = require('../src/models/NotificationDelivery');
const SessionToken = require('../src/models/SessionToken');
const ApiToken = require('../src/models/ApiToken');
const AuditEvent = require('../src/models/AuditEvent');
const Recommendation = require('../src/models/Recommendation');
const TrelloActionAttempt = require('../src/models/TrelloActionAttempt');
const WorkItem = require('../src/models/WorkItem');
const dataRetentionService = require('../src/services/dataRetentionService');

const oldDate = new Date('2020-01-01T00:00:00.000Z');

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const workspace = await Workspace.create({
    name: 'Retention verification',
    slug: `retention-${Date.now()}`,
    settings: {
      dataRetention: {
        enabled: true,
        operationalDays: 30,
        performanceDays: 180,
        notificationDays: 90,
        credentialDays: 30
      }
    }
  });
  const workspaceId = workspace._id;
  const opaqueId = new mongoose.Types.ObjectId();

  await Promise.all([
    JobRun.collection.insertOne({ workspaceId, jobName: 'old.job', status: 'succeeded', finishedAt: oldDate, createdAt: oldDate, updatedAt: oldDate }),
    BoardHealthSnapshot.collection.insertOne({ workspaceId, boardId: opaqueId, generatedAt: oldDate, healthScore: 80, healthStatus: 'healthy', createdAt: oldDate, updatedAt: oldDate }),
    Performance.collection.insertOne({ workspaceId, memberId: opaqueId, boardId: opaqueId, period: 'weekly', startDate: oldDate, endDate: oldDate, createdAt: oldDate, updatedAt: oldDate }),
    NotificationDelivery.collection.insertOne({ workspaceId, policyId: opaqueId, eventType: 'test', dedupeKey: 'old-final', severity: 'info', title: 'Old', message: 'Old', status: 'delivered', createdAt: oldDate, updatedAt: oldDate }),
    SessionToken.collection.insertOne({ workspaceId, userId: opaqueId, name: 'Old session', tokenPrefix: 'old', tokenHash: 'old', status: 'revoked', expiresAt: oldDate, createdAt: oldDate, updatedAt: oldDate }),
    ApiToken.collection.insertOne({ workspaceId, name: 'Old API token', tokenPrefix: 'old', tokenHash: 'old', status: 'expired', createdAt: oldDate, updatedAt: oldDate }),
    AuditEvent.collection.insertOne({ workspaceId, entityType: 'protected', action: 'protected_audit', riskLevel: 'high', createdAt: oldDate }),
    Recommendation.collection.insertOne({ workspaceId, title: 'Protected recommendation', status: 'rejected', createdAt: oldDate, updatedAt: oldDate }),
    TrelloActionAttempt.collection.insertOne({ workspaceId, actionType: 'move_card', status: 'succeeded', createdAt: oldDate, updatedAt: oldDate }),
    WorkItem.collection.insertOne({ workspaceId, provider: 'test', externalId: 'protected-work', title: 'Protected current work', createdAt: oldDate, updatedAt: oldDate }),
    NotificationDelivery.collection.insertOne({ workspaceId, policyId: opaqueId, eventType: 'test', dedupeKey: 'protected-queued', severity: 'info', title: 'Queued', message: 'Queued', status: 'queued', createdAt: oldDate, updatedAt: oldDate }),
    SessionToken.collection.insertOne({ workspaceId, userId: opaqueId, name: 'Active session', tokenPrefix: 'active', tokenHash: 'active', status: 'active', expiresAt: new Date('2030-01-01T00:00:00.000Z'), createdAt: oldDate, updatedAt: oldDate })
  ]);

  const scanStarted = process.hrtime.bigint();
  const scan = await dataRetentionService.scan({ workspaceId, limit: 50 });
  const scanDurationMs = Number(process.hrtime.bigint() - scanStarted) / 1e6;
  assert.equal(scan.summary.due, 6);
  assert.equal(scan.providerWrites, false);
  const applyStarted = process.hrtime.bigint();
  const result = await dataRetentionService.apply({
    workspaceId,
    limit: 50,
    confirm: 'prune-expired-history',
    workspaceConfirmation: workspace.slug,
    actor: 'verification'
  });
  const applyDurationMs = Number(process.hrtime.bigint() - applyStarted) / 1e6;
  assert.equal(result.deleted, 6);

  const [protectedAudits, recommendations, attempts, workItems, queued, active, startAudits, completionAudits] = await Promise.all([
    AuditEvent.countDocuments({ workspaceId, action: 'protected_audit' }),
    Recommendation.countDocuments({ workspaceId }),
    TrelloActionAttempt.countDocuments({ workspaceId }),
    WorkItem.countDocuments({ workspaceId }),
    NotificationDelivery.countDocuments({ workspaceId, status: 'queued' }),
    SessionToken.countDocuments({ workspaceId, status: 'active' }),
    AuditEvent.countDocuments({ workspaceId, action: 'workspace_data_retention_prune_started' }),
    AuditEvent.countDocuments({ workspaceId, action: 'workspace_data_retention_prune_completed' })
  ]);
  assert.deepEqual([protectedAudits, recommendations, attempts, workItems, queued, active], [1, 1, 1, 1, 1, 1]);
  assert.equal(startAudits, 6);
  assert.equal(completionAudits, 6);

  const indexChecks = [
    [Workspace, { status: 1, 'settings.dataRetention.enabled': 1, 'settings.dataRetention.lastProcessedAt': 1 }],
    [JobRun, { workspaceId: 1, status: 1, finishedAt: 1 }],
    [BoardHealthSnapshot, { workspaceId: 1, generatedAt: 1 }],
    [Performance, { workspaceId: 1, endDate: 1 }],
    [NotificationDelivery, { workspaceId: 1, status: 1, updatedAt: 1 }],
    [SessionToken, { workspaceId: 1, status: 1, updatedAt: 1 }],
    [ApiToken, { workspaceId: 1, status: 1, updatedAt: 1 }]
  ];
  for (const [model, expected] of indexChecks) {
    await model.init();
    const indexes = await model.collection.indexes();
    assert.equal(indexes.some(index => JSON.stringify(index.key) === JSON.stringify(expected)), true, `${model.modelName} retention index missing`);
  }

  process.stdout.write(`${JSON.stringify({
    verified: true,
    databaseName,
    due: scan.summary.due,
    deleted: result.deleted,
    protectedRecords: protectedAudits + recommendations + attempts + workItems + queued + active,
    auditPairs: startAudits,
    indexes: indexChecks.length,
    scanDurationMs: Number(scanDurationMs.toFixed(2)),
    applyDurationMs: Number(applyDurationMs.toFixed(2)),
    rssMb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(1)),
    providerWrites: false
  }, null, 2)}\n`);
};

run()
  .finally(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  })
  .catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
