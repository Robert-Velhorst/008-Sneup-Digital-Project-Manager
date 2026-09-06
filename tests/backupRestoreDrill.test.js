const { BSON } = require('mongodb');
const {
  createDrillPlan, claimDatabase, removeOwnedDatabase, fingerprintDatabase, assertRestored,
  runNativeTool, cleanupDrill
} = require('../scripts/verify-backup-restore');

describe('native backup and restore drill safety', () => {
  test.each([
    undefined, '', 'mongodb://remote.example:27017', 'mongodb://localhost:27017',
    'mongodb://127.0.0.1:27017/production', 'mongodb://user:password@127.0.0.1:27017',
    'mongodb://127.0.0.1:27017/?replicaSet=other', 'mongodb://127.0.0.1:65536',
    'mongodb+srv://127.0.0.1', 'mongodb://127.0.0.1:27017/#fragment'
  ])('rejects an ambiguous or nonlocal drill address: %s', uri => {
    expect(() => createDrillPlan(uri)).toThrow(/explicit loopback/);
  });

  test('generates fresh isolated source and target names, never an operator database name', () => {
    const first = createDrillPlan('mongodb://127.0.0.1:27017');
    const second = createDrillPlan('mongodb://127.0.0.1:27017/');
    expect(first.sourceName).toMatch(/^sneup_restore_drill_[a-f0-9]{16}_source$/);
    expect(first.targetName).toMatch(/^sneup_restore_drill_[a-f0-9]{16}_target$/);
    expect(first.sourceName).not.toBe(second.sourceName);
    expect(first.sourceName).not.toBe(first.targetName);
  });

  test('the accepted seed cannot redirect either client to a remote replica-set primary', () => {
    const { MongoClient } = require('mongodb');
    const { Topology } = require('mongodb/lib/sdam/topology');
    const { ServerDescription } = require('mongodb/lib/sdam/server_description');
    const plan = createDrillPlan('mongodb://127.0.0.1:27017');
    for (const uri of [plan.sourceUri, plan.targetUri, plan.toolUri]) {
      const client = new MongoClient(uri);
      const topology = new Topology(client, '127.0.0.1:27017', client.options);
      const description = topology.description.update(new ServerDescription('127.0.0.1:27017', {
        ok: 1, setName: 'fixture', isWritablePrimary: true,
        hosts: ['127.0.0.1:27017', 'remote.invalid:27017'], primary: 'remote.invalid:27017',
        minWireVersion: 0, maxWireVersion: 17
      }));
      expect([...description.servers.keys()]).toEqual(['127.0.0.1:27017']);
    }
  });

  test('refuses an existing database before creating an ownership marker', async () => {
    const db = { listCollections: () => ({ hasNext: async () => true }), createCollection: jest.fn() };
    await expect(claimDatabase(db, 'nonce')).rejects.toThrow(/nonempty/);
    expect(db.createCollection).not.toHaveBeenCalled();
  });

  test.each(['wrong-name', 'wrong-marker'])('refuses cleanup when ownership is not established: %s', async failure => {
    const name = 'sneup_restore_drill_0123456789abcdef_source';
    const db = {
      databaseName: failure === 'wrong-name' ? 'production' : name,
      collection: () => ({ findOne: async () => ({ _id: 'someone-else' }) }),
      dropDatabase: jest.fn()
    };
    await expect(removeOwnedDatabase(db, name, 'owned-nonce')).rejects.toThrow(/ownership/);
    expect(db.dropDatabase).not.toHaveBeenCalled();
  });

  test('does not claim cleanup success when collections remain', async () => {
    const name = 'sneup_restore_drill_0123456789abcdef_target';
    const db = {
      databaseName: name,
      collection: () => ({ findOne: async () => ({ _id: 'owned-nonce' }) }),
      dropDatabase: jest.fn().mockResolvedValue(undefined),
      listCollections: () => ({ hasNext: async () => true })
    };
    await expect(removeOwnedDatabase(db, name, 'owned-nonce')).rejects.toThrow(/still contains/);
  });

  const fakeDatabase = (document, key = { workspaceId: 1, createdAt: -1 }) => ({
    listCollections: () => ({ toArray: async () => [{ name: 'records', type: 'collection', options: {} }] }),
    collection: () => ({
      indexes: async () => [{ name: 'critical', key, unique: true, partialFilterExpression: { active: true } }],
      find: () => ({ sort: () => ({
        async *[Symbol.asyncIterator]() { yield BSON.serialize(document); }
      }) })
    })
  });

  test('equal counts cannot hide changed payload bytes or BSON types', async () => {
    const before = await fingerprintDatabase(fakeDatabase({ _id: 1, amount: BSON.Long.fromString('9007199254740993') }));
    const altered = await fingerprintDatabase(fakeDatabase({ _id: 1, amount: '9007199254740993' }));
    expect(() => assertRestored(before, altered)).toThrow(/Restored database differs/);
    expect(() => assertRestored(before, before)).not.toThrow();
  });

  test('compound index field order must survive restore', async () => {
    const before = await fingerprintDatabase(fakeDatabase({ _id: 1 }));
    const reversed = await fingerprintDatabase(fakeDatabase({ _id: 1 }, { createdAt: -1, workspaceId: 1 }));
    expect(() => assertRestored(before, reversed)).toThrow(/Restored database differs/);
  });

  test('collection removal or index option changes cannot pass as a restore', async () => {
    const before = await fingerprintDatabase(fakeDatabase({ _id: 1 }));
    expect(() => assertRestored(before, [])).toThrow(/Restored database differs/);
    const altered = structuredClone(before);
    altered[0].indexes[0].unique = false;
    expect(() => assertRestored(before, altered)).toThrow(/Restored database differs/);
  });

  test('native tool errors do not expose command arguments or provider output', () => {
    expect(() => runNativeTool(process.execPath, ['-e', 'process.stderr.write("private-fixture");process.exit(2)'], 'mongodump'))
      .toThrow('mongodump failed; native-tool details were withheld');
  });

  test('native tool execution is bounded and does not invoke a shell', () => {
    expect(() => runNativeTool(process.execPath, ['-e', 'setInterval(()=>{},1000)'], 'mongodump', 50))
      .toThrow(/mongodump failed/);
    expect(runNativeTool(process.execPath, ['-p', '"literal;not-a-shell-command"'], 'version').trim())
      .toBe('literal;not-a-shell-command');
  });

  test('the native timeout cannot be ignored by a SIGTERM handler', () => {
    const childProcess = require('node:child_process');
    const execute = jest.spyOn(childProcess, 'execFileSync').mockReturnValue('version');
    try {
      jest.isolateModules(() => {
        require('../scripts/verify-backup-restore').runNativeTool('tool', ['--version'], 'version', 50);
      });
      expect(execute).toHaveBeenCalledWith('tool', ['--version'], expect.objectContaining({
        timeout: 50, killSignal: 'SIGKILL', shell: false, windowsHide: true
      }));
    } finally { execute.mockRestore(); }
  });

  const cleanupFixture = () => {
    const names = ['sneup_restore_drill_0123456789abcdef_source', 'sneup_restore_drill_0123456789abcdef_target'];
    const drops = [];
    const databases = Object.fromEntries(names.map(name => [name, {
      databaseName: name,
      collection: () => ({ findOne: async () => ({ _id: 'owned-nonce' }) }),
      dropDatabase: jest.fn(async () => { drops.push(name); }),
      listCollections: () => ({ hasNext: async () => false })
    }]));
    const client = {
      models: { Test: { init: async () => { throw new Error('failed model initialization'); } } },
      connection: { readyState: 1, getClient: () => ({ db: name => databases[name] }) },
      disconnect: jest.fn().mockResolvedValue(undefined)
    };
    const files = { unlink: jest.fn().mockResolvedValue(undefined), rmdir: jest.fn().mockResolvedValue(undefined) };
    return { names, databases, client, files, drops,
      options: { client, files, names, nonce: 'owned-nonce', directory: 'synthetic-temp', timeoutMs: 20 } };
  };

  test('settled initialization failures do not prevent cleanup of owned resources', async () => {
    const { options, drops, names, files, client } = cleanupFixture();
    expect(await cleanupDrill(options)).toEqual([]);
    expect(drops).toEqual(names);
    expect(files.unlink).toHaveBeenCalledTimes(1);
    expect(files.rmdir).toHaveBeenCalledTimes(1);
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  test('a failed source removal does not skip the target, archive, or connection', async () => {
    const { options, databases, names, drops, files, client } = cleanupFixture();
    databases[names[0]].dropDatabase.mockRejectedValue(new Error('source removal failed'));
    expect(await cleanupDrill(options)).toHaveLength(1);
    expect(drops).toEqual([names[1]]);
    expect(files.unlink).toHaveBeenCalledTimes(1);
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  test('unsettled initialization blocks database removal but not archive and connection cleanup', async () => {
    const { options, drops, files, client } = cleanupFixture();
    client.models.Test.init = () => new Promise(() => {});
    expect(await cleanupDrill(options)).toHaveLength(1);
    expect(drops).toEqual([]);
    expect(files.unlink).toHaveBeenCalledTimes(1);
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  test('a marker persisted before a lost acknowledgment is tracked for ownership-checked cleanup', async () => {
    const { options, databases, names, drops } = cleanupFixture();
    const db = databases[names[0]];
    let persistedMarker;
    db.createCollection = async () => {};
    db.collection = () => ({
      insertOne: async document => { persistedMarker = document; throw new Error('lost marker acknowledgment'); },
      findOne: async () => persistedMarker
    });
    const attempted = [];
    await expect(claimDatabase(db, 'owned-nonce', attempted)).rejects.toThrow(/lost marker/);
    expect(attempted).toEqual([names[0]]);
    expect(await cleanupDrill({ ...options, names: attempted })).toEqual([]);
    expect(drops).toEqual([names[0]]);
  });
});
