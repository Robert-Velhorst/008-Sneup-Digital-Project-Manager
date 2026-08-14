const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const uri = process.env.SNEUP_CONNECTOR_RECOVERY_VERIFICATION_MONGO_URI;
const databaseName = uri ? new URL(uri).pathname.replace(/^\//, '').split('?')[0] : '';
if (!uri || !/^sneup_connector_recovery_verification_[a-z0-9_-]+$/i.test(databaseName)) {
  throw new Error('SNEUP_CONNECTOR_RECOVERY_VERIFICATION_MONGO_URI must target a dedicated sneup_connector_recovery_verification_* database');
}

const Workspace = require('../src/models/Workspace');
const ConnectorAccount = require('../src/models/ConnectorAccount');
const providerSyncPolicyService = require('../src/services/providerSyncPolicyService');
const workSignalAdapterService = require('../src/services/workSignalAdapterService');
const workSignalService = require('../src/services/workSignalService');
const { ConnectorSyncService } = require('../src/services/connectorSyncService');

const run = async () => {
  const startedAt = process.hrtime.bigint();
  const originalFirstWave = workSignalAdapterService.getFirstWaveConnectorIds;
  const originalFetchDelta = workSignalAdapterService.fetchDelta;
  const originalUpsert = workSignalService.upsertProviderRecords;
  const attempts = new Map();
  let transientRecovered = false;

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await Promise.all([Workspace.init(), ConnectorAccount.init()]);
    const workspace = await Workspace.create({
      name: 'Connector recovery verification',
      slug: `connector-recovery-${Date.now()}`
    });
    const [transient, permanent] = await ConnectorAccount.create([
      {
        workspaceId: workspace._id,
        connectorId: 'github',
        connectorName: 'GitHub transient verification',
        category: 'software_delivery',
        authType: 'manual',
        externalAccountId: 'transient',
        status: 'connected'
      },
      {
        workspaceId: workspace._id,
        connectorId: 'github',
        connectorName: 'GitHub permanent verification',
        category: 'software_delivery',
        authType: 'manual',
        externalAccountId: 'permanent',
        status: 'connected'
      }
    ]);

    workSignalAdapterService.getFirstWaveConnectorIds = () => ['github'];
    workSignalAdapterService.fetchDelta = async (account) => {
      const key = account.externalAccountId;
      attempts.set(key, (attempts.get(key) || 0) + 1);
      if (key === 'permanent') {
        const error = new Error('Authorization has expired. Reconnect the account.');
        error.statusCode = 401;
        throw error;
      }
      if (!transientRecovered) {
        const error = new Error('Temporary DNS outage');
        error.code = 'EAI_AGAIN';
        throw error;
      }
      return {
        records: [],
        nextCursor: 'recovered-cursor',
        hasMore: false,
        metadata: { source: 'verification_stub' }
      };
    };
    workSignalService.upsertProviderRecords = async () => ({ count: 0, batchCount: 0, batchSize: 100 });

    const now = new Date('2026-08-14T09:00:00.000Z');
    const service = new ConnectorSyncService({
      now: () => now,
      featureFlagService: {
        evaluate: async () => ({ effective: true, available: true }),
        assertEnabled: async () => ({ effective: true, available: true })
      }
    });
    service.finalizeDependencyFreshness = async () => ({
      providerCount: 0,
      markedStale: 0,
      failureCount: 0,
      byProvider: {}
    });
    providerSyncPolicyService.reset();
    const options = {
      workspaceId: workspace._id,
      minIntervalMs: 0,
      maxRetries: 0,
      environment: {
        SNEUP_CONNECTOR_FAILURE_RETRY_BASE_MS: '60000',
        SNEUP_CONNECTOR_FAILURE_RETRY_MAX_MS: '3600000'
      }
    };

    const failedPass = await service.syncConnectedAccounts(options);
    assert.equal(failedPass.processedCount, 2);
    assert.equal(failedPass.failureCount, 2);
    const transientFailed = await ConnectorAccount.findById(transient._id).lean();
    const permanentFailed = await ConnectorAccount.findById(permanent._id).lean();
    assert.equal(transientFailed.status, 'failed');
    assert.equal(transientFailed.metadata.connectorSyncFailure.retryable, true);
    assert.equal(transientFailed.metadata.connectorSyncFailure.consecutiveFailures, 1);
    assert.equal(new Date(transientFailed.metadata.connectorSyncFailure.nextRetryAt).toISOString(), '2026-08-14T09:01:00.000Z');
    assert.equal(permanentFailed.status, 'needs_attention');
    assert.equal(permanentFailed.metadata.connectorSyncFailure.retryable, false);
    assert.equal(permanentFailed.metadata.connectorSyncFailure.nextRetryAt, undefined);

    const deferredPass = await service.syncConnectedAccounts(options);
    assert.equal(deferredPass.processedCount, 0);
    assert.deepEqual(Object.fromEntries(attempts), { transient: 1, permanent: 1 });

    await ConnectorAccount.updateOne(
      { _id: transient._id },
      { $set: { 'metadata.connectorSyncFailure.nextRetryAt': new Date('2026-08-14T08:59:00.000Z') } }
    );
    transientRecovered = true;
    const recoveredPass = await service.syncConnectedAccounts(options);
    assert.equal(recoveredPass.processedCount, 1);
    assert.equal(recoveredPass.successCount, 1);
    const transientAfterRecovery = await ConnectorAccount.findById(transient._id).lean();
    const permanentAfterRecovery = await ConnectorAccount.findById(permanent._id).lean();
    assert.equal(transientAfterRecovery.status, 'connected');
    assert.equal(transientAfterRecovery.lastError, undefined);
    assert.equal(transientAfterRecovery.metadata.connectorSyncFailure, undefined);
    assert.equal(transientAfterRecovery.metadata.workSignalCursor, 'recovered-cursor');
    assert.equal(permanentAfterRecovery.status, 'needs_attention');
    assert.deepEqual(Object.fromEntries(attempts), { transient: 2, permanent: 1 });

    const indexes = await ConnectorAccount.collection.indexes();
    assert.equal(indexes.some(index => (
      index.key.workspaceId === 1
      && index.key.status === 1
      && index.key['metadata.connectorSyncFailure.nextRetryAt'] === 1
      && index.key.connectorId === 1
    )), true);

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    process.stdout.write(`${JSON.stringify({
      ok: true,
      database: databaseName,
      durationMs: Math.round(durationMs * 10) / 10,
      initialFailures: failedPass.failureCount,
      immediateRetries: deferredPass.processedCount,
      recoveredAccounts: recoveredPass.successCount,
      permanentAttempts: attempts.get('permanent'),
      durableRecoveryIndex: true,
      providerWrites: false
    }, null, 2)}\n`);
  } finally {
    workSignalAdapterService.getFirstWaveConnectorIds = originalFirstWave;
    workSignalAdapterService.fetchDelta = originalFetchDelta;
    workSignalService.upsertProviderRecords = originalUpsert;
    providerSyncPolicyService.reset();
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
};

run().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
