const mongoose = require('mongoose');
const { run } = require('../scripts/verify-workspace-invitations');

describe('invitation verification database ownership', () => {
  const environment = { ...process.env };
  const database = mongoose.connection.db;
  let connect;
  let disconnect;
  let drop;

  beforeEach(() => {
    connect = jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
    disconnect = jest.spyOn(mongoose, 'disconnect').mockResolvedValue(undefined);
    drop = jest.spyOn(mongoose.connection, 'dropDatabase').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mongoose.connection.db = database;
    process.env = { ...environment };
  });

  test.each([undefined, 'mongodb://127.0.0.1:27017/sneup',
    'mongodb://127.0.0.1:27017/sneup_invite_verification_short',
    'mongodb://127.0.0.1:27017/sneup_invite_verification_0000000000000001/extra'])
  ('rejects an unowned database before connecting: %s', async uri => {
    if (uri === undefined) delete process.env.SNEUP_INVITE_VERIFICATION_MONGO_URI;
    else process.env.SNEUP_INVITE_VERIFICATION_MONGO_URI = uri;
    await expect(run()).rejects.toThrow('An owned invitation verification database is required');
    expect(connect).not.toHaveBeenCalled();
    expect(drop).not.toHaveBeenCalled();
  });

  test('preserves a nonempty database even with a valid fixture name', async () => {
    process.env.SNEUP_INVITE_VERIFICATION_MONGO_URI = 'mongodb://127.0.0.1:27017/sneup_invite_verification_0000000000000001';
    mongoose.connection.db = {
      listCollections: jest.fn(() => ({ toArray: async () => [{ name: 'existing_records' }] }))
    };
    await expect(run()).rejects.toThrow('Refusing to modify an existing nonempty database');
    expect(drop).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  test('disconnects without attempting a drop when connection fails', async () => {
    process.env.SNEUP_INVITE_VERIFICATION_MONGO_URI = 'mongodb://127.0.0.1:27017/sneup_invite_verification_0000000000000001';
    connect.mockRejectedValue(new Error('Fixture connection failed'));
    await expect(run()).rejects.toThrow('Fixture connection failed');
    expect(drop).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
