const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { cleanupVerificationDatabase } = require('../scripts/verify-hai-snapshot');
const source = fs.readFileSync(path.join(__dirname, '../scripts/verify-review-concurrency.js'), 'utf8');

function fixture(existing = false, longName = false) {
  const imported = [];
  let inspected = false;
  let finish;
  const done = new Promise(resolve => { finish = resolve; });
  const mongoose = { models: {}, connect: jest.fn().mockResolvedValue(), disconnect: jest.fn().mockResolvedValue(), connection: {
    readyState: 1, dropDatabase: jest.fn().mockResolvedValue(),
    db: { listCollections: () => ({ toArray: async () => { inspected = true; return existing ? [{ name: 'preserved' }] : []; } }) }
  } };
  const process = { env: { SNEUP_REVIEW_CONCURRENCY_VERIFICATION_MONGO_URI:
    `mongodb://127.0.0.1:27017/sneup_review_concurrency_verification_${'a'.repeat(longName ? 32 : 16)}` },
    hrtime: { bigint: () => 0n }, stdout: { write: jest.fn() }, stderr: { write: finish } };
  const context = { Buffer, URL, process, require: name => {
    if (name === 'mongoose') return mongoose;
    if (name === 'node:assert/strict') return require(name);
    if (name === './verify-hai-snapshot') return { cleanupVerificationDatabase };
    expect(inspected).toBe(true);
    imported.push(name);
    return { init() { throw new Error('Stop after verifying import order'); } };
  } };
  return { run: () => vm.runInNewContext(source, context), done, mongoose, imported };
}

test('rejects overlong verification database names before connecting or loading models', () => {
  const f = fixture(false, true);
  expect(f.run).toThrow('dedicated');
  expect(f.mongoose.connect).not.toHaveBeenCalled();
  expect(f.imported).toEqual([]);
});

test('a nonempty verification database is neither model-initialized nor removed', async () => {
  const f = fixture(true);
  f.run();
  await f.done;
  expect(f.imported).toEqual([]);
  expect(f.mongoose.connection.dropDatabase).not.toHaveBeenCalled();
  expect(f.mongoose.disconnect).toHaveBeenCalledTimes(1);
});

test('models load only after empty-database ownership and failed initialization still cleans up', async () => {
  const f = fixture();
  f.run();
  await f.done;
  expect(f.imported).toContain('../src/models/Workspace');
  expect(f.mongoose.connection.dropDatabase).toHaveBeenCalledTimes(1);
  expect(f.mongoose.disconnect).toHaveBeenCalledTimes(1);
});
