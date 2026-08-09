const {
  DATABASE_FAILURE_MODES,
  databaseFailureMode,
  liveDatabaseStartupError
} = require('../src/services/startupPolicyService');

const originalEnvironment = { ...process.env };

const strong = suffix => `sneup-${suffix}-unique-production-secret-value-2026`;

const configureEnvironment = (values) => {
  process.env = {
    ...originalEnvironment,
    PORT: '0',
    HOST: '127.0.0.1',
    SNEUP_NGROK_ENABLED: 'false',
    TRELLO_API_KEY: '',
    TRELLO_API_TOKEN: '',
    ...values
  };
};

const loadAppWithDatabaseFailure = () => {
  const connectionError = Object.assign(new Error('private MongoDB connection detail'), {
    code: 'ECONNREFUSED'
  });
  const database = {
    connectDatabase: jest.fn().mockRejectedValue(connectionError),
    disconnectDatabase: jest.fn().mockResolvedValue(undefined),
    isDatabaseConnected: jest.fn().mockReturnValue(false),
    getDatabaseStatus: jest.fn().mockReturnValue({ state: 'disconnected' })
  };
  const tunnel = {
    start: jest.fn().mockResolvedValue(null),
    stop: jest.fn().mockResolvedValue(undefined)
  };
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  jest.doMock('../src/utils/database', () => database);
  jest.doMock('../src/services/ngrokTunnelService', () => tunnel);
  jest.doMock('../src/utils/logger', () => logger);
  jest.doMock('../src/utils/processHandlers', () => ({ registerProcessHandlers: jest.fn() }));

  return {
    app: require('../src/index'),
    connectionError,
    database,
    logger,
    tunnel
  };
};

describe('database startup policy', () => {
  afterEach(() => {
    process.env = { ...originalEnvironment };
    jest.dontMock('../src/utils/database');
    jest.dontMock('../src/services/ngrokTunnelService');
    jest.dontMock('../src/utils/logger');
    jest.dontMock('../src/utils/processHandlers');
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  test('fails closed in production and permits labelled development fallback', () => {
    expect(databaseFailureMode({ NODE_ENV: 'production' })).toBe(DATABASE_FAILURE_MODES.FAIL_CLOSED);
    expect(databaseFailureMode({ NODE_ENV: 'PRODUCTION' })).toBe(DATABASE_FAILURE_MODES.FAIL_CLOSED);
    expect(databaseFailureMode({ NODE_ENV: 'development' })).toBe(DATABASE_FAILURE_MODES.DEMO_FALLBACK);

    const cause = new Error('private connection detail');
    const error = liveDatabaseStartupError(cause);
    expect(error).toMatchObject({
      code: 'SNEUP_LIVE_DATABASE_UNAVAILABLE',
      statusCode: 503,
      cause
    });
    expect(error.message).not.toContain(cause.message);
  });

  test('production live mode rejects a database outage without opening a server or changing mode', async () => {
    configureEnvironment({
      NODE_ENV: 'production',
      SNEUP_DEMO_MODE: 'false',
      SNEUP_API_TOKEN_PEPPER: strong('api'),
      SNEUP_SESSION_TOKEN_PEPPER: strong('session'),
      SNEUP_INVITE_TOKEN_PEPPER: strong('invite')
    });
    const { app, database, logger, tunnel } = loadAppWithDatabaseFailure();

    await expect(app.initApp()).rejects.toMatchObject({
      code: 'SNEUP_LIVE_DATABASE_UNAVAILABLE',
      statusCode: 503
    });

    expect(database.connectDatabase).toHaveBeenCalledTimes(1);
    expect(process.env.SNEUP_DEMO_MODE).toBe('false');
    expect(app.getServer()).toBeUndefined();
    expect(app.getStartupState()).toMatchObject({ initialized: false, phase: 'failed' });
    expect(tunnel.stop).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'MongoDB is unavailable in production live mode. Refusing demo fallback.',
      { code: 'ECONNREFUSED' }
    );
  });

  test('development fallback remains visibly demo and shuts down cleanly', async () => {
    configureEnvironment({ NODE_ENV: 'development', SNEUP_DEMO_MODE: 'false' });
    const { app, database, tunnel } = loadAppWithDatabaseFailure();

    const server = await app.initApp();

    expect(database.connectDatabase).toHaveBeenCalledTimes(1);
    expect(process.env.SNEUP_DEMO_MODE).toBe('true');
    expect(server.listening).toBe(true);
    await app.shutdown();
    expect(app.getServer()).toBeUndefined();
    expect(tunnel.stop).toHaveBeenCalledTimes(1);
  });

  test('explicit production demo mode starts without attempting MongoDB', async () => {
    configureEnvironment({ NODE_ENV: 'production', SNEUP_DEMO_MODE: 'true' });
    const { app, database } = loadAppWithDatabaseFailure();

    const server = await app.initApp();

    expect(database.connectDatabase).not.toHaveBeenCalled();
    expect(process.env.SNEUP_DEMO_MODE).toBe('true');
    expect(server.listening).toBe(true);
    await app.shutdown();
    expect(app.getServer()).toBeUndefined();
  });
});
