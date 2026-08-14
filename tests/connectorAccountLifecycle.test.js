const jobObservabilityService = require('../src/services/jobObservabilityService');
const providerSyncPolicyService = require('../src/services/providerSyncPolicyService');
const workSignalAdapterService = require('../src/services/workSignalAdapterService');
const { AccountConnectorService } = require('../src/services/accountConnectorService');
const { ConnectorSyncService } = require('../src/services/connectorSyncService');

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const UPDATED_AT = new Date('2026-08-14T10:00:00.000Z');

const makeAccount = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439012',
  workspaceId: WORKSPACE_ID,
  connectorId: 'github',
  connectorName: 'GitHub',
  category: 'software_delivery',
  authType: 'personal_access_token',
  status: 'connected',
  accountName: 'Delivery engineering',
  externalAccountId: 'delivery-engineering',
  scopes: [],
  consent: {},
  credentials: { apiKey: 'encrypted-private-token' },
  oauthRefreshLease: { tokenHash: 'private-lease-hash', expiresAt: new Date('2026-08-14T10:05:00.000Z') },
  metadata: {
    fields: { organization: 'delivery-engineering' },
    sync: ['repositories'],
    workSignalCursor: 'cursor-1',
    connectorSyncFailure: { retryable: false, consecutiveFailures: 2 }
  },
  lastError: 'Old authorization failed',
  updatedAt: UPDATED_AT,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('connector account lifecycle', () => {
  afterEach(() => jest.restoreAllMocks());

  test('disconnects locally only after exact, acknowledged, current confirmation', async () => {
    const auditEventModel = { create: jest.fn().mockResolvedValue({}) };
    const service = new AccountConnectorService({ auditEventModel, now: () => new Date('2026-08-14T10:01:00.000Z') });
    const account = makeAccount();
    service.requireDatabase = jest.fn();
    service.getManagedAccount = jest.fn().mockResolvedValue(account);

    await expect(service.disconnectAccount(account._id, {
      confirmation: 'Delivery engineering',
      acknowledgeProviderAuthorization: true,
      expectedUpdatedAt: UPDATED_AT.toISOString()
    }, { workspaceId: WORKSPACE_ID, actorId: 'operator-1' })).resolves.toMatchObject({
      account: { status: 'disabled', disconnectedAt: new Date('2026-08-14T10:01:00.000Z') },
      providerAuthorizationChanged: false
    });

    expect(account.status).toBe('disabled');
    expect(account.credentials).toBeUndefined();
    expect(account.oauthRefreshLease).toBeUndefined();
    expect(account.lastError).toBeUndefined();
    expect(account.metadata).toMatchObject({
      fields: { organization: 'delivery-engineering' },
      workSignalCursor: 'cursor-1',
      connectorDisconnected: { actor: 'operator-1' }
    });
    expect(account.metadata).not.toHaveProperty('connectorSyncFailure');
    expect(auditEventModel.create).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: WORKSPACE_ID,
      action: 'connector_account_disconnected',
      actor: 'operator-1',
      riskLevel: 'medium',
      afterState: expect.objectContaining({ status: 'disabled', providerAuthorizationChanged: false })
    }));
    expect(JSON.stringify(auditEventModel.create.mock.calls)).not.toContain('encrypted-private-token');
    expect(JSON.stringify(auditEventModel.create.mock.calls)).not.toContain('private-lease-hash');
  });

  test('rejects mismatched, unacknowledged, stale, and repeated disconnect requests without mutation', async () => {
    const auditEventModel = { create: jest.fn() };
    const service = new AccountConnectorService({ auditEventModel });
    const account = makeAccount();
    service.requireDatabase = jest.fn();
    service.getManagedAccount = jest.fn().mockResolvedValue(account);

    await expect(service.disconnectAccount(account._id, {
      confirmation: 'delivery engineering',
      acknowledgeProviderAuthorization: true,
      expectedUpdatedAt: UPDATED_AT.toISOString()
    })).rejects.toMatchObject({ code: 'SNEUP_CONNECTOR_DISCONNECT_CONFIRMATION_MISMATCH', statusCode: 400 });
    await expect(service.disconnectAccount(account._id, {
      confirmation: 'Delivery engineering',
      expectedUpdatedAt: UPDATED_AT.toISOString()
    })).rejects.toMatchObject({ code: 'SNEUP_CONNECTOR_PROVIDER_AUTHORIZATION_ACK_REQUIRED', statusCode: 400 });
    await expect(service.disconnectAccount(account._id, {
      confirmation: 'Delivery engineering',
      acknowledgeProviderAuthorization: true,
      expectedUpdatedAt: '2026-08-14T09:59:00.000Z'
    })).rejects.toMatchObject({ code: 'SNEUP_CONNECTOR_DISCONNECT_STALE', statusCode: 409 });

    account.status = 'disabled';
    await expect(service.disconnectAccount(account._id, {
      confirmation: 'Delivery engineering',
      acknowledgeProviderAuthorization: true,
      expectedUpdatedAt: UPDATED_AT.toISOString()
    })).rejects.toMatchObject({ code: 'SNEUP_CONNECTOR_ALREADY_DISCONNECTED', statusCode: 409 });
    expect(account.save).not.toHaveBeenCalled();
    expect(auditEventModel.create).not.toHaveBeenCalled();
  });

  test('restores credentials and lifecycle state when disconnect audit evidence fails', async () => {
    const auditEventModel = { create: jest.fn().mockRejectedValue(new Error('audit unavailable')) };
    const service = new AccountConnectorService({ auditEventModel });
    const account = makeAccount();
    service.requireDatabase = jest.fn();
    service.getManagedAccount = jest.fn().mockResolvedValue(account);

    await expect(service.disconnectAccount(account._id, {
      confirmation: 'Delivery engineering',
      acknowledgeProviderAuthorization: true,
      expectedUpdatedAt: UPDATED_AT.toISOString()
    }, { actorId: 'operator-1' })).rejects.toMatchObject({
      code: 'SNEUP_CONNECTOR_DISCONNECT_AUDIT_FAILED',
      statusCode: 503
    });

    expect(account.status).toBe('connected');
    expect(account.credentials).toEqual({ apiKey: 'encrypted-private-token' });
    expect(account.oauthRefreshLease).toMatchObject({ tokenHash: 'private-lease-hash' });
    expect(account.metadata.connectorSyncFailure).toEqual({ retryable: false, consecutiveFailures: 2 });
    expect(account.save).toHaveBeenCalledTimes(2);
  });

  test('blocks disconnected and reconnect-required accounts before feature, OAuth, or provider work', async () => {
    const accountConnectorService = { prepareOAuthAccountForSync: jest.fn() };
    const featureFlagService = { assertEnabled: jest.fn() };
    const service = new ConnectorSyncService({ accountConnectorService, featureFlagService });
    service.requireDatabase = jest.fn();
    const providerRun = jest.spyOn(providerSyncPolicyService, 'run');
    const adapterRead = jest.spyOn(workSignalAdapterService, 'fetchDelta');

    await expect(service.syncAccount(makeAccount({ status: 'disabled', authType: 'oauth2' })))
      .rejects.toMatchObject({ code: 'SNEUP_CONNECTOR_ACCOUNT_DISABLED', statusCode: 409 });
    await expect(service.syncAccount(makeAccount({
      status: 'needs_attention',
      metadata: { connectorSyncFailure: { retryable: false } }
    }))).rejects.toMatchObject({ code: 'SNEUP_CONNECTOR_RECONNECT_REQUIRED', statusCode: 409 });

    expect(featureFlagService.assertEnabled).not.toHaveBeenCalled();
    expect(accountConnectorService.prepareOAuthAccountForSync).not.toHaveBeenCalled();
    expect(providerRun).not.toHaveBeenCalled();
    expect(adapterRead).not.toHaveBeenCalled();
  });

  test('does not let legacy local validation reactivate a disconnected account', async () => {
    const account = makeAccount({ status: 'disabled', markValidated: jest.fn() });
    const connectorAccountModel = {
      findOne: jest.fn().mockResolvedValue(account)
    };
    const service = new AccountConnectorService({ connectorAccountModel });
    service.requireDatabase = jest.fn();

    await expect(service.markAccountValidated(account._id, { workspaceId: WORKSPACE_ID }))
      .rejects.toMatchObject({ code: 'SNEUP_CONNECTOR_ACCOUNT_DISABLED', statusCode: 409 });
    expect(account.markValidated).not.toHaveBeenCalled();
  });

  test('serializes disconnect through the connector sync workspace lease', async () => {
    const accountConnectorService = { disconnectAccount: jest.fn().mockResolvedValue({ providerAuthorizationChanged: false }) };
    const service = new ConnectorSyncService({ accountConnectorService });
    const tracked = jest.spyOn(jobObservabilityService, 'trackJob').mockImplementation(async (options, callback) => ({
      options,
      result: await callback()
    }));
    const body = { confirmation: 'Delivery engineering' };

    await service.runTrackedAccountDisconnect('507f1f77bcf86cd799439012', body, {
      workspaceId: WORKSPACE_ID,
      actorId: 'operator-1'
    });

    expect(tracked).toHaveBeenCalledWith(expect.objectContaining({
      jobName: 'connectors.work_signals_sync',
      triggerType: 'api',
      workspaceId: expect.anything(),
      metadata: { actor: 'operator-1', accountScope: 'single', accountAction: 'disconnect' }
    }), expect.any(Function));
    expect(accountConnectorService.disconnectAccount).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      body,
      expect.objectContaining({ workspaceId: expect.anything(), actorId: 'operator-1' })
    );
  });

  test('reactivates an existing OAuth account without creating a duplicate', async () => {
    const originalKey = process.env.CONNECTOR_ENCRYPTION_KEY;
    process.env.CONNECTOR_ENCRYPTION_KEY = 'connector-encryption-key-for-lifecycle-tests-123456';
    const existing = makeAccount({
      authType: 'oauth2',
      status: 'disabled',
      externalAccountId: 'Delivery engineering',
      credentials: undefined,
      metadata: { connectorDisconnected: { at: UPDATED_AT }, fields: { retainedSelection: 'selected' } }
    });
    const connectorAccountModel = jest.fn();
    connectorAccountModel.findOne = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(existing) });
    const service = new AccountConnectorService({ connectorAccountModel });
    const audit = jest.spyOn(service, 'recordConnectionAudit').mockResolvedValue(undefined);
    const connector = service.requireConnector('github');

    try {
      const account = await service.saveOAuthAccount(connector, {
        access_token: 'new-oauth-access-token',
        account_name: 'Delivery engineering',
        scope: 'repo:status read:user'
      }, { workspaceId: WORKSPACE_ID, actorId: 'operator-1' });

      expect(account).toBe(existing);
      expect(connectorAccountModel).not.toHaveBeenCalled();
      expect(existing.status).toBe('connected');
      expect(existing.metadata).not.toHaveProperty('connectorDisconnected');
      expect(existing.metadata.fields.retainedSelection).toBe('selected');
      expect(existing.credentials.accessToken).not.toContain('new-oauth-access-token');
      expect(audit).toHaveBeenCalledWith(existing, 'operator-1', { rollbackAccount: false });
    } finally {
      if (originalKey === undefined) delete process.env.CONNECTOR_ENCRYPTION_KEY;
      else process.env.CONNECTOR_ENCRYPTION_KEY = originalKey;
    }
  });
});
