const mockConnection = {
  readyState: 1,
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(),
  host: 'localhost',
  port: 27017,
  name: 'sneup'
};
const mockConnect = jest.fn().mockResolvedValue(mockConnection);

jest.mock('mongoose', () => ({ connect: mockConnect, connection: mockConnection }));

const database = require('../src/utils/database');

describe('database connection lifecycle', () => {

  test('uses a low-idle bounded pool and registers connection listeners once', async () => {
    const environment = { MONGODB_URI: 'mongodb://database.example/sneup' };

    await database.connectDatabase({ environment });
    await database.connectDatabase({ environment });

    expect(mockConnect).toHaveBeenCalledTimes(2);
    expect(mockConnect).toHaveBeenCalledWith(environment.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 20,
      minPoolSize: 0,
      maxConnecting: 2,
      maxIdleTimeMS: 60000,
      waitQueueTimeoutMS: 5000,
      bufferTimeoutMS: 5000
    });
    expect(mockConnection.on).toHaveBeenCalledTimes(3);
    expect(mockConnection.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockConnection.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    expect(mockConnection.on).toHaveBeenCalledWith('reconnected', expect.any(Function));
  });

  test('accepts bounded production overrides without exposing the database URI', () => {
    const options = database.buildDatabaseOptions({
      SNEUP_MONGODB_MAX_POOL_SIZE: '40',
      SNEUP_MONGODB_MIN_POOL_SIZE: '2',
      SNEUP_MONGODB_MAX_CONNECTING: '4',
      SNEUP_MONGODB_MAX_IDLE_TIME_MS: '120000',
      SNEUP_MONGODB_WAIT_QUEUE_TIMEOUT_MS: '7500'
    });

    expect(options).toEqual(expect.objectContaining({
      maxPoolSize: 40,
      minPoolSize: 2,
      maxConnecting: 4,
      maxIdleTimeMS: 120000,
      waitQueueTimeoutMS: 7500
    }));
    expect(options).not.toHaveProperty('uri');
  });

  test('keeps connection establishment within a deliberately single-socket pool', () => {
    expect(database.buildDatabaseOptions({ SNEUP_MONGODB_MAX_POOL_SIZE: '1' }))
      .toEqual(expect.objectContaining({ maxPoolSize: 1, maxConnecting: 1 }));
  });

  test.each([
    [{ SNEUP_MONGODB_MAX_POOL_SIZE: '0' }, 'SNEUP_MONGODB_MAX_POOL_SIZE'],
    [{ SNEUP_MONGODB_MAX_POOL_SIZE: '10', SNEUP_MONGODB_MIN_POOL_SIZE: '11' }, 'SNEUP_MONGODB_MIN_POOL_SIZE'],
    [{ SNEUP_MONGODB_MAX_POOL_SIZE: '10', SNEUP_MONGODB_MAX_CONNECTING: '11' }, 'SNEUP_MONGODB_MAX_CONNECTING'],
    [{ SNEUP_MONGODB_WAIT_QUEUE_TIMEOUT_MS: 'forever' }, 'SNEUP_MONGODB_WAIT_QUEUE_TIMEOUT_MS']
  ])('fails closed for an unsafe pool configuration %#', (environment, setting) => {
    expect(() => database.buildDatabaseOptions(environment)).toThrow(setting);
  });
});
