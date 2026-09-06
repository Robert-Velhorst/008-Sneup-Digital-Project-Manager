const { cleanupVerificationDatabase } = require('../scripts/verify-hai-snapshot');

const fixture = () => ({
  models: {},
  connection: {
    readyState: 1,
    dropDatabase: jest.fn().mockResolvedValue(undefined),
    db: { listCollections: jest.fn(() => ({ toArray: async () => [] })) }
  },
  disconnect: jest.fn().mockResolvedValue(undefined)
});

test('settles every model initialization, including failures, before dropping and confirming cleanup', async () => {
  const client = fixture();
  let finish;
  client.models.Slow = { init: () => new Promise(resolve => { finish = resolve; }) };
  client.models.Failed = { init: () => Promise.reject(new Error('Index failed')) };
  const pending = cleanupVerificationDatabase(client, true);
  try {
    await Promise.resolve();
    expect(client.connection.dropDatabase).not.toHaveBeenCalled();
  } finally {
    finish?.();
    await pending;
  }
  expect(client.connection.dropDatabase).toHaveBeenCalledTimes(1);
  expect(client.connection.db.listCollections).toHaveBeenCalledWith({}, { nameOnly: true });
  expect(client.disconnect).toHaveBeenCalledTimes(1);
});

test('never drops an unowned database', async () => {
  const client = fixture();
  await cleanupVerificationDatabase(client, false);
  expect(client.connection.dropDatabase).not.toHaveBeenCalled();
  expect(client.disconnect).toHaveBeenCalledTimes(1);
});

test('disconnects even if dropping fails', async () => {
  const client = fixture();
  client.connection.dropDatabase.mockRejectedValue(new Error('Drop failed'));
  await expect(cleanupVerificationDatabase(client, true)).rejects.toThrow('Drop failed');
  expect(client.disconnect).toHaveBeenCalledTimes(1);
});

test('does not claim removal if collections remain', async () => {
  const client = fixture();
  client.connection.db.listCollections.mockReturnValue({ toArray: async () => [{ name: 'remaining' }] });
  await expect(cleanupVerificationDatabase(client, true)).rejects.toThrow('Verification database still contains collections');
  expect(client.disconnect).toHaveBeenCalledTimes(1);
});

test('bounds stuck initialization, disconnects, and does not race it with a drop', async () => {
  jest.useFakeTimers();
  const client = fixture();
  client.models.Stuck = { init: () => new Promise(() => {}) };
  const pending = cleanupVerificationDatabase(client, true, { timeoutMs: 100 }).catch(error => error);
  try {
    await jest.advanceTimersByTimeAsync(100);
    const state = await Promise.race([pending, Promise.resolve('still pending')]);
    expect(state).toMatchObject({ code: 'SNEUP_VERIFICATION_CLEANUP_TIMEOUT' });
    expect(client.connection.dropDatabase).not.toHaveBeenCalled();
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});
