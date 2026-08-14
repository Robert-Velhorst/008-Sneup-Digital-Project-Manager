const jobObservabilityService = require('../src/services/jobObservabilityService');
const providerSyncPolicyService = require('../src/services/providerSyncPolicyService');
const workSignalAdapterService = require('../src/services/workSignalAdapterService');
const workSignalService = require('../src/services/workSignalService');
const { ConnectorSyncService } = require('../src/services/connectorSyncService');

const workspaceId = '507f1f77bcf86cd799439011';
const retryEnvironment = {
  SNEUP_CONNECTOR_FAILURE_RETRY_BASE_MS: '60000',
  SNEUP_CONNECTOR_FAILURE_RETRY_MAX_MS: '3600000'
};

const makeAccount = (overrides = {}) => ({
  _id: 'account-1',
  workspaceId,
  connectorId: 'github',
  authType: 'manual',
  status: 'connected',
  metadata: {},
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('connector sync recovery', () => {
  afterEach(() => jest.restoreAllMocks());

  test('persists bounded exponential retry deadlines for transient failures', async () => {
    const now = new Date('2026-08-14T09:00:00.000Z');
    const service = new ConnectorSyncService({ now: () => now });
    const account = makeAccount();
    const transient = Object.assign(new Error('Temporary upstream outage'), { code: 'EAI_AGAIN' });

    await expect(service.recordSyncFailure(account, transient, { environment: retryEnvironment })).resolves.toMatchObject({
      consecutiveFailures: 1,
      retryable: true,
      code: 'EAI_AGAIN',
      retryDelayMs: 60000,
      nextRetryAt: new Date('2026-08-14T09:01:00.000Z')
    });
    expect(account.status).toBe('failed');
    expect(account.lastError).toBe('Temporary upstream outage');

    await service.recordSyncFailure(account, transient, { environment: retryEnvironment });
    expect(account.metadata.connectorSyncFailure).toMatchObject({
      consecutiveFailures: 2,
      retryDelayMs: 120000,
      nextRetryAt: new Date('2026-08-14T09:02:00.000Z')
    });
  });

  test('stops automatic retry for permanent authorization failures', async () => {
    const now = new Date('2026-08-14T09:00:00.000Z');
    const service = new ConnectorSyncService({ now: () => now });
    const account = makeAccount();
    const permanent = Object.assign(new Error('Authorization has expired. Reconnect the account.'), { statusCode: 401 });

    await service.recordSyncFailure(account, permanent, { environment: retryEnvironment });

    expect(account.status).toBe('needs_attention');
    expect(account.metadata.connectorSyncFailure).toEqual({
      consecutiveFailures: 1,
      retryable: false,
      code: 'HTTP_401',
      lastFailedAt: now
    });
  });

  test('selects connected, due retryable, and one-time legacy failures only', () => {
    const now = new Date('2026-08-14T09:00:00.000Z');
    const service = new ConnectorSyncService({ now: () => now });

    expect(service.getScheduledAccountsFilter(workspaceId, ['github'], now)).toEqual({
      workspaceId,
      connectorId: { $in: ['github'] },
      $or: [
        { status: 'connected' },
        {
          status: { $in: ['failed', 'needs_attention'] },
          'metadata.connectorSyncFailure.retryable': true,
          'metadata.connectorSyncFailure.nextRetryAt': { $lte: now }
        },
        { status: 'failed', 'metadata.connectorSyncFailure': { $exists: false } }
      ]
    });
  });

  test('successful synchronization clears recovery state and reconnects the account', async () => {
    const account = makeAccount({
      status: 'failed',
      lastError: 'Temporary outage',
      metadata: {
        connectorSyncFailure: { retryable: true, consecutiveFailures: 2 },
        workSignalCursor: 'cursor-before'
      }
    });
    const service = new ConnectorSyncService({
      featureFlagService: { assertEnabled: jest.fn().mockResolvedValue({ effective: true }) }
    });
    service.requireDatabase = jest.fn();
    service.finalizeDependencyFreshness = jest.fn().mockResolvedValue({ providerCount: 1, markedStale: 0, failureCount: 0, byProvider: {} });
    jest.spyOn(providerSyncPolicyService, 'run').mockImplementation(async (_provider, callback) => ({
      result: await callback(), retryCount: 0, rateLimitWaitMs: 0, attemptCount: 1
    }));
    jest.spyOn(workSignalAdapterService, 'fetchDelta').mockResolvedValue({ records: [], nextCursor: 'cursor-after', metadata: {} });
    jest.spyOn(workSignalService, 'upsertProviderRecords').mockResolvedValue({ count: 0, batchCount: 0, batchSize: 100 });

    await service.syncAccount(account);

    expect(account.status).toBe('connected');
    expect(account.lastError).toBeUndefined();
    expect(account.metadata).not.toHaveProperty('connectorSyncFailure');
    expect(account.metadata.workSignalCursor).toBe('cursor-after');
  });

  test('manual account synchronization uses the shared workspace job lease and records failure', async () => {
    const now = new Date('2026-08-14T09:00:00.000Z');
    const account = makeAccount();
    const service = new ConnectorSyncService({ now: () => now });
    service.getAccountForSync = jest.fn().mockResolvedValue(account);
    service.syncAccount = jest.fn().mockRejectedValue(Object.assign(new Error('Temporary outage'), { code: 'ETIMEDOUT' }));
    const tracked = jest.spyOn(jobObservabilityService, 'trackJob').mockImplementation(async (options, callback) => ({
      options,
      result: await callback()
    }));

    await expect(service.runTrackedAccountSync(account._id, {
      workspaceId,
      actor: 'operator-1',
      environment: retryEnvironment
    })).rejects.toMatchObject({ code: 'ETIMEDOUT' });

    expect(tracked).toHaveBeenCalledWith(expect.objectContaining({
      jobName: 'connectors.work_signals_sync',
      triggerType: 'api',
      workspaceId: expect.anything(),
      metadata: { actor: 'operator-1', accountScope: 'single' }
    }), expect.any(Function));
    expect(account.metadata.connectorSyncFailure).toMatchObject({ retryable: true, consecutiveFailures: 1 });
  });
});
