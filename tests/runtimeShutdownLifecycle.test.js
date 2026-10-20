const originalEnvironment = { ...process.env };

describe('application runtime shutdown lifecycle', () => {
  const moduleMocks = [
    '../src/utils/database',
    '../src/services/workspaceScopeService',
    '../src/services/analyticsService',
    '../src/services/connectorSyncService',
    '../src/services/trelloSync',
    '../src/workers/workspaceDeletionWorker',
    '../src/workers/identityRetentionWorker',
    '../src/workers/dataRetentionWorker',
    '../src/workers/interventionWorker',
    '../src/workers/performanceWorker',
    '../src/workers/notificationWorker',
    '../src/utils/logger',
    '../src/utils/processHandlers'
  ];

  afterEach(() => {
    process.env = { ...originalEnvironment };
    moduleMocks.forEach(modulePath => jest.dontMock(modulePath));
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  test('continues shutdown and closes HTTP and MongoDB when an analytics stop fails', async () => {
    process.env = {
      ...originalEnvironment,
      NODE_ENV: 'development',
      SNEUP_DEMO_MODE: 'false',
      HOST: '127.0.0.1',
      PORT: '0',
      TRELLO_API_KEY: '',
      TRELLO_API_TOKEN: ''
    };
    const database = {
      connectDatabase: jest.fn().mockResolvedValue(undefined),
      disconnectDatabase: jest.fn().mockResolvedValue(undefined),
      isDatabaseConnected: jest.fn().mockReturnValue(true),
      getDatabaseStatus: jest.fn().mockReturnValue({ state: 'connected' })
    };
    const workspaceScope = {
      inspectDefaultWorkspaceMigration: jest.fn().mockResolvedValue({ totalMissing: 0, indexPreflight: { duplicateGroups: [] } }),
      assertWorkspaceMigrationReady: jest.fn(),
      backfillDefaultWorkspace: jest.fn().mockResolvedValue({ totalModified: 0 }),
      ensurePolicyRuleIndexes: jest.fn().mockResolvedValue({ removedLegacyNameIndex: false }),
      ensureJobControlIndexes: jest.fn().mockResolvedValue({ removedLegacyJobNameIndex: false }),
      ensureFeatureFlagIndexes: jest.fn().mockResolvedValue({}),
      ensureProviderEntityIndexes: jest.fn().mockResolvedValue({})
    };
    const analytics = {
      initAnalytics: jest.fn(),
      stopAnalytics: jest.fn().mockRejectedValue(Object.assign(new Error('private stop detail'), { code: 'STOP_FAILED' }))
    };
    const connectorSync = { init: jest.fn(), stop: jest.fn().mockResolvedValue(undefined) };
    const worker = () => ({ init: jest.fn(), stop: jest.fn().mockResolvedValue(undefined) });
    const workspaceDeletion = { ...worker(), run: jest.fn().mockResolvedValue(undefined) };
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    jest.doMock('../src/utils/database', () => database);
    jest.doMock('../src/services/workspaceScopeService', () => workspaceScope);
    jest.doMock('../src/services/analyticsService', () => analytics);
    jest.doMock('../src/services/connectorSyncService', () => connectorSync);
    jest.doMock('../src/workers/workspaceDeletionWorker', () => workspaceDeletion);
    jest.doMock('../src/workers/identityRetentionWorker', worker);
    jest.doMock('../src/workers/dataRetentionWorker', worker);
    jest.doMock('../src/workers/interventionWorker', worker);
    jest.doMock('../src/workers/performanceWorker', worker);
    jest.doMock('../src/workers/notificationWorker', worker);
    jest.doMock('../src/utils/logger', () => logger);
    jest.doMock('../src/utils/processHandlers', () => ({ registerProcessHandlers: jest.fn() }));

    const app = require('../src/index');
    await app.initApp();
    await expect(app.shutdown()).rejects.toMatchObject({
      code: 'SNEUP_SHUTDOWN_INCOMPLETE',
      components: expect.arrayContaining(['analytics service'])
    });

    expect(database.disconnectDatabase).toHaveBeenCalledTimes(1);
    expect(app.getServer()).toBeUndefined();
    expect(app.getStartupState()).toEqual({ initialized: false, phase: 'failed' });
    expect(logger.error).toHaveBeenCalledWith('Runtime shutdown component failed', {
      component: 'analytics service',
      code: 'STOP_FAILED'
    });
  });

  test('waits for Trello webhook reconciliation before reporting serving', async () => {
    process.env = {
      ...originalEnvironment,
      NODE_ENV: 'development',
      SNEUP_DEMO_MODE: 'false',
      HOST: '127.0.0.1',
      PORT: '0',
      TRELLO_API_KEY: 'key',
      TRELLO_API_TOKEN: 'token'
    };
    const database = {
      connectDatabase: jest.fn().mockResolvedValue(undefined),
      disconnectDatabase: jest.fn().mockResolvedValue(undefined),
      isDatabaseConnected: jest.fn().mockReturnValue(true),
      getDatabaseStatus: jest.fn().mockReturnValue({ state: 'connected' })
    };
    const workspaceScope = {
      inspectDefaultWorkspaceMigration: jest.fn().mockResolvedValue({ totalMissing: 0, indexPreflight: { duplicateGroups: [] } }),
      assertWorkspaceMigrationReady: jest.fn(),
      backfillDefaultWorkspace: jest.fn().mockResolvedValue({ totalModified: 0 }),
      ensurePolicyRuleIndexes: jest.fn().mockResolvedValue({ removedLegacyNameIndex: false }),
      ensureJobControlIndexes: jest.fn().mockResolvedValue({ removedLegacyJobNameIndex: false }),
      ensureFeatureFlagIndexes: jest.fn().mockResolvedValue({}),
      ensureProviderEntityIndexes: jest.fn().mockResolvedValue({})
    };
    const worker = () => ({ init: jest.fn(), stop: jest.fn().mockResolvedValue(undefined) });
    const workspaceDeletion = { ...worker(), run: jest.fn().mockResolvedValue(undefined) };
    const analytics = { initAnalytics: jest.fn(), stopAnalytics: jest.fn().mockResolvedValue(undefined) };
    const connectorSync = { init: jest.fn(), stop: jest.fn().mockResolvedValue(undefined) };
    let finishReconciliation;
    const reconciliation = new Promise(resolve => { finishReconciliation = resolve; });
    const trelloSync = {
      initSync: jest.fn().mockResolvedValue(undefined),
      reconcileTrelloWebhooks: jest.fn(() => reconciliation),
      stopSync: jest.fn().mockResolvedValue(undefined)
    };
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    jest.doMock('../src/utils/database', () => database);
    jest.doMock('../src/services/workspaceScopeService', () => workspaceScope);
    jest.doMock('../src/services/trelloSync', () => trelloSync);
    jest.doMock('../src/services/analyticsService', () => analytics);
    jest.doMock('../src/services/connectorSyncService', () => connectorSync);
    jest.doMock('../src/workers/workspaceDeletionWorker', () => workspaceDeletion);
    jest.doMock('../src/workers/identityRetentionWorker', worker);
    jest.doMock('../src/workers/dataRetentionWorker', worker);
    jest.doMock('../src/workers/interventionWorker', worker);
    jest.doMock('../src/workers/performanceWorker', worker);
    jest.doMock('../src/workers/notificationWorker', worker);
    jest.doMock('../src/utils/logger', () => logger);
    jest.doMock('../src/utils/processHandlers', () => ({ registerProcessHandlers: jest.fn() }));

    const app = require('../src/index');
    const startup = app.initApp();
    while (trelloSync.reconcileTrelloWebhooks.mock.calls.length === 0) {
      await new Promise(resolve => setImmediate(resolve));
    }
    expect(trelloSync.initSync).toHaveBeenCalledTimes(1);
    expect(app.getServer().listening).toBe(true);
    expect(app.getStartupState()).toEqual({ initialized: false, phase: 'initializing' });

    finishReconciliation({ providerWrites: false });
    await startup;
    expect(app.getStartupState()).toEqual({ initialized: true, phase: 'serving' });
    await app.shutdown();
    expect(trelloSync.stopSync).toHaveBeenCalledTimes(1);
  });
});
