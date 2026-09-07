const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { cleanupVerificationDatabase } = require('../scripts/verify-hai-snapshot');
const verifiers = [
  ['verify-review-concurrency.js', 'SNEUP_REVIEW_CONCURRENCY_VERIFICATION_MONGO_URI', 'sneup_review_concurrency_verification_'],
  ['verify-follow-up-integrity.js', 'SNEUP_FOLLOW_UP_VERIFICATION_MONGO_URI', 'sneup_follow_up_verification_']
];

function fixture(file, envName, prefix, existing = false, longName = false, owners = new Map(), replaceOwner = false) {
  const source = fs.readFileSync(path.join(__dirname, '../scripts', file), 'utf8');
  const imported = [];
  let inspected = false;
  let finish;
  const done = new Promise(resolve => { finish = resolve; });
  const mongoose = { models: {}, connect: jest.fn().mockResolvedValue(), disconnect: jest.fn().mockResolvedValue(), connection: {
    readyState: 1, dropDatabase: jest.fn().mockResolvedValue(),
    db: {
      listCollections: () => ({ toArray: async () => { inspected = true; return existing ? [{ name: 'preserved' }] : []; } }),
      collection: () => ({
        insertOne: async owner => {
          if (owners.has(owner._id)) throw Object.assign(new Error('Duplicate owner'), { code: 11000 });
          owners.set(owner._id, owner);
        },
        findOne: async query => owners.get(query._id)
      })
    }
  } };
  const process = { env: { [envName]:
    `mongodb://127.0.0.1:27017/${prefix}${'a'.repeat(longName ? 64 : 16)}` },
    hrtime: { bigint: () => 0n }, stdout: { write: jest.fn() }, stderr: { write: finish } };
  const context = { Buffer, URL, process, require: name => {
    if (name === 'mongoose') return mongoose;
    if (name === 'node:assert/strict' || name === 'node:crypto') return require(name);
    if (name === './verify-hai-snapshot') return { cleanupVerificationDatabase };
    expect(inspected).toBe(true);
    imported.push(name);
    return { init() {
      if (replaceOwner) owners.set('owner', { token: 'another-run' });
      throw new Error('Stop after verifying import order');
    } };
  } };
  return { run: () => vm.runInNewContext(source, context), done, mongoose, imported };
}

describe.each(verifiers)('%s database ownership', (file, envName, prefix) => {
test('rejects overlong verification database names before connecting or loading models', () => {
  const f = fixture(file, envName, prefix, false, true);
  expect(f.run).toThrow('dedicated');
  expect(f.mongoose.connect).not.toHaveBeenCalled();
  expect(f.imported).toEqual([]);
});

test('a nonempty verification database is neither model-initialized nor removed', async () => {
  const f = fixture(file, envName, prefix, true);
  f.run();
  await f.done;
  expect(f.imported).toEqual([]);
  expect(f.mongoose.connection.dropDatabase).not.toHaveBeenCalled();
  expect(f.mongoose.disconnect).toHaveBeenCalledTimes(1);
});

test('models load only after empty-database ownership and failed initialization still cleans up', async () => {
  const f = fixture(file, envName, prefix);
  f.run();
  await f.done;
  expect(f.imported).toContain('../src/models/Workspace');
  expect(f.mongoose.connection.dropDatabase).toHaveBeenCalledTimes(1);
  expect(f.mongoose.disconnect).toHaveBeenCalledTimes(1);
});
});

test('concurrent follow-up verification starts cannot both initialize or drop one target', async () => {
  const owners = new Map();
  const args = [...verifiers[1], false, false, owners];
  const first = fixture(...args);
  const second = fixture(...args);
  first.run();
  second.run();
  await Promise.all([first.done, second.done]);
  expect([first, second].filter(f => f.imported.length > 0)).toHaveLength(1);
  expect([first, second].reduce((sum, f) => sum + f.mongoose.connection.dropDatabase.mock.calls.length, 0)).toBe(1);
  expect(first.mongoose.disconnect).toHaveBeenCalledTimes(1);
  expect(second.mongoose.disconnect).toHaveBeenCalledTimes(1);
});

test('lost verification ownership preserves the database and still disconnects', async () => {
  const f = fixture(...verifiers[1], false, false, new Map(), true);
  f.run();
  await f.done;
  expect(f.mongoose.connection.dropDatabase).not.toHaveBeenCalled();
  expect(f.mongoose.disconnect).toHaveBeenCalledTimes(1);
});
