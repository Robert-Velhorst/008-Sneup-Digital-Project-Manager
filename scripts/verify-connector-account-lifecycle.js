const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');

const uri = process.env.SNEUP_CONNECTOR_LIFECYCLE_VERIFICATION_MONGO_URI;
const databaseName = uri ? new URL(uri).pathname.replace(/^\//, '').split('?')[0] : '';
if (!uri || !/^sneup_connector_lifecycle_verification_[a-z0-9_-]+$/i.test(databaseName)) {
  throw new Error('SNEUP_CONNECTOR_LIFECYCLE_VERIFICATION_MONGO_URI must target a dedicated sneup_connector_lifecycle_verification_* database');
}

process.env.CONNECTOR_ENCRYPTION_KEY ||= crypto.randomBytes(32).toString('hex');

const Workspace = require('../src/models/Workspace');
const ConnectorAccount = require('../src/models/ConnectorAccount');
const AuditEvent = require('../src/models/AuditEvent');
const providerSyncPolicyService = require('../src/services/providerSyncPolicyService');
const workSignalAdapterService = require('../src/services/workSignalAdapterService');
const { AccountConnectorService } = require('../src/services/accountConnectorService');
const { ConnectorSyncService } = require('../src/services/connectorSyncService');

const run = async () => {
  const startedAt = process.hrtime.bigint();
  const accountConnectorService = new AccountConnectorService();
  let adapterReads = 0;
  let featureChecks = 0;
  const originalFetchDelta = workSignalAdapterService.fetchDelta;
  const originalProviderRun = providerSyncPolicyService.run;

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await Promise.all([Workspace.init(), ConnectorAccount.init(), AuditEvent.init()]);
    const workspace = await Workspace.create({
      name: 'Connector lifecycle verification',
      slug: `connector-lifecycle-${Date.now()}`
    });
    const account = await ConnectorAccount.create({
      workspaceId: workspace._id,
      connectorId: 'azure_devops',
      connectorName: 'Azure DevOps',
      category: 'software_delivery',
      authType: 'personal_access_token',
      status: 'connected',
      accountName: 'Delivery organization',
      externalAccountId: 'delivery',
      credentials: {
        apiKey: accountConnectorService.encrypt(JSON.stringify({ token: 'verification-private-token' }))
      },
      oauthRefreshLease: {
        tokenHash: crypto.createHash('sha256').update('verification-private-lease').digest('hex'),
        expiresAt: new Date(Date.now() + 60_000)
      },
      metadata: {
        fields: { organizationUrl: 'https://dev.azure.com/delivery' },
        sync: ['projects', 'work_items'],
        workSignalCursor: 'cursor-before-disconnect',
        connectorSyncFailure: { retryable: false, consecutiveFailures: 2, code: 'HTTP_401' }
      },
      lastError: 'Old token was rejected'
    });
    const accountId = String(account._id);

    await assert.rejects(
      accountConnectorService.disconnectAccount(accountId, {
        confirmation: 'delivery organization',
        acknowledgeProviderAuthorization: true,
        expectedUpdatedAt: account.updatedAt.toISOString()
      }, { workspaceId: workspace._id, actorId: 'verification-operator' }),
      error => error.code === 'SNEUP_CONNECTOR_DISCONNECT_CONFIRMATION_MISMATCH'
    );

    const result = await accountConnectorService.disconnectAccount(accountId, {
      confirmation: 'Delivery organization',
      acknowledgeProviderAuthorization: true,
      expectedUpdatedAt: account.updatedAt.toISOString()
    }, { workspaceId: workspace._id, actorId: 'verification-operator' });
    assert.equal(result.providerAuthorizationChanged, false);
    assert.equal(result.account.status, 'disabled');

    const disconnectedDocument = await ConnectorAccount.findById(accountId)
      .select('+credentials +oauthRefreshLease');
    const disconnected = disconnectedDocument.toObject();
    assert.equal(disconnected.status, 'disabled');
    assert.equal(disconnected.credentials, undefined);
    assert.equal(disconnected.oauthRefreshLease, undefined);
    assert.equal(disconnected.lastError, undefined);
    assert.equal(disconnected.metadata.connectorSyncFailure, undefined);
    assert.equal(disconnected.metadata.workSignalCursor, 'cursor-before-disconnect');
    assert.equal(disconnected.metadata.connectorDisconnected.actor, 'verification-operator');

    const audit = await AuditEvent.findOne({
      workspaceId: workspace._id,
      entityId: disconnectedDocument._id,
      action: 'connector_account_disconnected'
    }).lean();
    assert.ok(audit);
    assert.equal(audit.actor, 'verification-operator');
    assert.equal(audit.afterState.providerAuthorizationChanged, false);
    assert.equal(JSON.stringify(audit).includes('verification-private-token'), false);
    assert.equal(JSON.stringify(audit).includes('verification-private-lease'), false);

    workSignalAdapterService.fetchDelta = async () => {
      adapterReads += 1;
      return { records: [] };
    };
    providerSyncPolicyService.run = async (_connectorId, operation) => operation();
    const syncService = new ConnectorSyncService({
      accountConnectorService,
      featureFlagService: {
        assertEnabled: async () => {
          featureChecks += 1;
          return { effective: true };
        }
      }
    });
    await assert.rejects(
      syncService.syncAccount(accountId, { workspaceId: workspace._id }),
      error => error.code === 'SNEUP_CONNECTOR_ACCOUNT_DISABLED'
    );
    assert.equal(featureChecks, 0);
    assert.equal(adapterReads, 0);

    const rotated = await accountConnectorService.rotateCredentialAccount(accountId, {
      accountName: 'Delivery organization',
      organizationUrl: 'https://dev.azure.com/delivery',
      token: 'verification-reconnected-token',
      scopeAcknowledged: true
    }, { workspaceId: workspace._id, actorId: 'verification-operator' });
    assert.equal(rotated.status, 'connected');
    assert.equal(rotated.syncRecovery, null);
    assert.equal(rotated.disconnectedAt, null);

    const reconnected = await ConnectorAccount.findById(accountId).select('+credentials').lean();
    assert.equal(reconnected.status, 'connected');
    assert.equal(reconnected.metadata.connectorDisconnected, undefined);
    assert.equal(reconnected.metadata.connectorSyncFailure, undefined);
    assert.equal(accountConnectorService.getAccountCredentials(reconnected).token, 'verification-reconnected-token');

    const actions = await AuditEvent.find({ workspaceId: workspace._id, entityId: disconnectedDocument._id })
      .sort({ createdAt: 1 })
      .select('action -_id')
      .lean();
    assert.deepEqual(actions.map(item => item.action), [
      'connector_account_disconnected',
      'connector_account_credentials_rotated'
    ]);

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    process.stdout.write(`${JSON.stringify({
      ok: true,
      database: databaseName,
      durationMs: Math.round(durationMs * 10) / 10,
      exactConfirmationRejected: true,
      credentialsPurged: true,
      refreshLeasePurged: true,
      disconnectedSyncBlockedBeforeFeatureCheck: true,
      auditRollbackCoveredByUnitTest: true,
      reconnectedInPlace: true,
      providerReads: adapterReads,
      providerWrites: false,
      providerAuthorizationChanged: false
    }, null, 2)}\n`);
  } finally {
    workSignalAdapterService.fetchDelta = originalFetchDelta;
    providerSyncPolicyService.run = originalProviderRun;
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
};

run().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
