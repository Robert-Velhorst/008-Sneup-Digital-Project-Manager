const originalEnvironment = { ...process.env };
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};
const tick = () => new Promise(resolve => setImmediate(resolve));

describe('startup interrupted by runtime shutdown', () => {
  const mockedModules = [];
  const mock = (name, value) => {
    mockedModules.push(name);
    jest.doMock(name, () => value);
  };

  afterEach(() => {
    process.env = { ...originalEnvironment };
    mockedModules.splice(0).forEach(name => jest.dontMock(name));
    jest.resetModules();
  });
  afterAll(() => { process.env = originalEnvironment; });

  const loadRuntime = (pauseAt) => {
    process.env = {
      ...originalEnvironment,
      NODE_ENV: 'development', SNEUP_DEMO_MODE: 'false', SNEUP_NGROK_ENABLED: 'false',
      HOST: '127.0.0.1', PORT: '0', TRELLO_API_KEY: 'test-key', TRELLO_API_TOKEN: 'test-token',
      SNEUP_SHUTDOWN_GRACE_MS: '1000'
    };
    const entered = deferred();
    const gate = deferred();
    const events = [];
    let connected = false;
    const step = (name, result) => jest.fn(async () => {
      events.push(name);
      if (name === pauseAt) {
        entered.resolve();
        await gate.promise;
      }
      return result;
    });
    const database = {
      connectDatabase: async () => { await step('connect')(); connected = true; },
      disconnectDatabase: async () => { events.push('disconnect'); connected = false; },
      isDatabaseConnected: () => connected,
      getDatabaseStatus: () => ({ state: connected ? 'connected' : 'disconnected' })
    };
    mock('../src/utils/database', database);
    mock('../src/utils/logger', { info: jest.fn(), warn: jest.fn(), error: jest.fn() });
    mock('../src/utils/processHandlers', { registerProcessHandlers: jest.fn() });
    mock('../src/services/workspaceScopeService', {
      inspectDefaultWorkspaceMigration: step('inspect', { totalMissing: 0, indexPreflight: { duplicateGroups: [] } }),
      assertWorkspaceMigrationReady: jest.fn(),
      backfillDefaultWorkspace: step('backfill', { totalModified: 0 }),
      ensurePolicyRuleIndexes: step('policy-index', {}),
      ensureJobControlIndexes: step('job-index', {}),
      ensureFeatureFlagIndexes: step('flag-index', {}),
      ensureProviderEntityIndexes: step('provider-index', {})
    });
    mock('../src/services/trelloSync', {
      initSync: step('trello'), stopSync: step('trello-stop'),
      reconcileTrelloWebhooks: step('reconcile')
    });
    mock('../src/services/analyticsService', {
      initAnalytics: () => events.push('analytics-start'), stopAnalytics: step('analytics-stop')
    });
    mock('../src/services/connectorSyncService', { init: () => events.push('connector-start'), stop: step('connector-stop') });
    for (const name of ['workspaceDeletion', 'identityRetention', 'dataRetention', 'intervention', 'performance', 'notification']) {
      mock(`../src/workers/${name}Worker`, {
        init: () => events.push(`${name}-start`), stop: step(`${name}-stop`), run: step('deletion')
      });
    }
    mock('../src/services/ngrokTunnelService', { start: step('tunnel'), stop: step('tunnel-stop') });
    return { app: require('../src/index'), entered, gate, events, database };
  };

  test.each([
    ['connect', 'inspect'], ['inspect', 'backfill'], ['backfill', 'policy-index'],
    ['policy-index', 'job-index'], ['job-index', 'flag-index'], ['flag-index', 'provider-index'],
    ['provider-index', 'trello'], ['trello', 'deletion'], ['deletion', 'analytics-start'],
    ['tunnel', 'reconcile'], ['reconcile', null]
  ])('stopping during %s cannot advance to the next startup phase', async (phase, nextPhase) => {
    const { app, entered, gate, events, database } = loadRuntime(phase);
    const startup = app.initApp().then(value => ({ value }), error => ({ error }));
    await entered.promise;
    let stopSettled = false;
    const stopping = app.shutdown().finally(() => { stopSettled = true; });
    try {
      await tick();
      const stoppedWhilePending = stopSettled;
      gate.resolve();
      const result = await startup;
      await stopping;
      expect(result.error).toMatchObject({ code: 'SNEUP_STARTUP_CANCELLED' });
      expect(stoppedWhilePending).toBe(false);
      if (nextPhase) expect(events).not.toContain(nextPhase);
      expect(events.filter(event => event === 'disconnect')).toHaveLength(1);
      expect(database.isDatabaseConnected()).toBe(false);
      expect(app.getServer()).toBeUndefined();
      expect(app.getStartupState()).toEqual({ initialized: false, phase: 'stopped' });
    } finally {
      gate.resolve();
      await startup;
      await stopping;
      await app.shutdown();
    }
  });

  test('concurrent initialization owns one listener and one set of startup work', async () => {
    const { app, entered, gate, events } = loadRuntime('connect');
    const listeners = [];
    const listen = app.listen;
    jest.spyOn(app, 'listen').mockImplementation((...args) => {
      const server = listen.apply(app, args);
      listeners.push(server);
      return server;
    });
    const first = app.initApp();
    await entered.promise;
    const second = app.initApp();
    gate.resolve();
    const servers = await Promise.all([first, second]);
    try {
      expect(servers[0]).toBe(servers[1]);
      expect(events.filter(event => event === 'connect')).toHaveLength(1);
      expect(await app.initApp()).toBe(servers[0]);
      expect(events.filter(event => event === 'tunnel')).toHaveLength(1);
    } finally {
      await app.shutdown();
      await Promise.all(listeners.map(server => new Promise(resolve => server.close(resolve))));
    }
  });

  test.each(['connect', 'tunnel'])('a stalled %s fails shutdown within its bound and late acquisition is still cleaned', async phase => {
    const { app, entered, gate, events, database } = loadRuntime(phase);
    process.env.SNEUP_SHUTDOWN_GRACE_MS = '100';
    const startup = app.initApp().catch(error => error);
    await entered.promise;
    try {
      await expect(app.shutdown()).rejects.toMatchObject({
        code: 'SNEUP_SHUTDOWN_INCOMPLETE',
        components: expect.arrayContaining(['startup acquisition'])
      });
      expect(app.getStartupState()).toEqual({ initialized: false, phase: 'failed' });
      gate.resolve();
      expect(await startup).toMatchObject({ code: 'SNEUP_STARTUP_CANCELLED' });
      expect(database.isDatabaseConnected()).toBe(false);
      expect(app.getServer()).toBeUndefined();
      expect(events).not.toContain('reconcile');
      if (phase === 'connect') expect(events).not.toContain('inspect');
    } finally {
      gate.resolve();
      await startup;
      await app.shutdown();
    }
  });

  test('a connection failure during shutdown cannot switch to development demo mode', async () => {
    const { app, entered, gate, events } = loadRuntime('connect');
    const startup = app.initApp().catch(error => error);
    await entered.promise;
    const stopping = app.shutdown();
    gate.reject(new Error('test connection unavailable'));
    expect(await startup).toMatchObject({ code: 'SNEUP_STARTUP_CANCELLED' });
    await stopping;
    expect(process.env.SNEUP_DEMO_MODE).toBe('false');
    expect(events).not.toContain('tunnel');
    expect(app.getServer()).toBeUndefined();
  });

  test('a connection acquired after the final database check gets a fresh cleanup pass', async () => {
    const { app, entered, gate, database } = loadRuntime('connect');
    process.env.SNEUP_SHUTDOWN_GRACE_MS = '100';
    const startup = app.initApp().catch(error => error);
    await entered.promise;
    const isConnected = database.isDatabaseConnected;
    database.isDatabaseConnected = () => {
      const connected = isConnected();
      if (!connected) gate.resolve();
      return connected;
    };
    try {
      await expect(app.shutdown()).rejects.toMatchObject({ code: 'SNEUP_SHUTDOWN_INCOMPLETE' });
      expect(await startup).toMatchObject({ code: 'SNEUP_STARTUP_CANCELLED' });
      expect(isConnected()).toBe(false);
    } finally {
      gate.resolve();
      await startup;
      await app.shutdown();
    }
  });

  test('late Trello schedules are stopped even when startup settles during the previous drain', async () => {
    const { app, entered, gate } = loadRuntime('trello');
    process.env.SNEUP_SHUTDOWN_GRACE_MS = '100';
    const trello = require('../src/services/trelloSync');
    const initialize = trello.initSync;
    const drainEntered = deferred();
    const drain = deferred();
    let schedulesActive = false;
    let stopCount = 0;
    trello.initSync = async () => {
      await initialize();
      schedulesActive = true;
    };
    trello.stopSync = async () => {
      schedulesActive = false;
      stopCount += 1;
      if (stopCount === 1) {
        drainEntered.resolve();
        await drain.promise;
      }
    };
    const startup = app.initApp().catch(error => error);
    await entered.promise;
    const stopping = app.shutdown().catch(error => error);
    try {
      await drainEntered.promise;
      gate.resolve();
      await tick();
      expect(schedulesActive).toBe(true);
      drain.resolve();
      expect(await stopping).toMatchObject({ code: 'SNEUP_SHUTDOWN_INCOMPLETE' });
      expect(await startup).toMatchObject({ code: 'SNEUP_STARTUP_CANCELLED' });
      expect(schedulesActive).toBe(false);
      expect(stopCount).toBe(2);
      expect(app.getStartupState()).toEqual({ initialized: false, phase: 'failed' });
    } finally {
      gate.resolve();
      drain.resolve();
      await startup;
      await stopping;
      await app.shutdown();
    }
  });

  test('stopping while the real local listener binds prevents tunnel startup and releases the port', async () => {
    const { app, events } = loadRuntime('unused');
    process.env.SNEUP_DEMO_MODE = 'true';
    const startup = app.initApp().catch(error => error);
    const listener = app.getServer();
    const stopping = app.shutdown();
    expect(await startup).toMatchObject({ code: 'SNEUP_STARTUP_CANCELLED' });
    await stopping;
    expect(listener.listening).toBe(false);
    expect(app.getServer()).toBeUndefined();
    expect(events).not.toContain('tunnel');
  });

  test('a stopped runtime cannot be reinitialized by a late caller', async () => {
    const { app, events } = loadRuntime('unused');
    await app.shutdown();
    await expect(app.initApp()).rejects.toMatchObject({ code: 'SNEUP_STARTUP_CANCELLED' });
    expect(events).not.toContain('connect');
    expect(app.getStartupState()).toEqual({ initialized: false, phase: 'stopped' });
  });
});
