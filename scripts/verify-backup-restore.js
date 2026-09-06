const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const mongoose = require('mongoose');
const { BSON } = require('mongodb');
const { withTimeout } = require('../src/utils/runtimeShutdown');

const MARKER = 'sneup_restore_drill_ownership';
const DATABASE_PATTERN = /^sneup_restore_drill_[a-f0-9]{16}_(source|target)$/;

const createDrillPlan = uri => {
  const match = /^mongodb:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})\/?$/.exec(String(uri || ''));
  if (!match || Number(match[1]) > 65535) {
    throw new Error('The restore drill requires an explicit loopback address: mongodb://127.0.0.1:<port>, without a database, credentials, or options');
  }
  const nonce = crypto.randomBytes(8).toString('hex');
  const uriBase = `mongodb://127.0.0.1:${match[1]}`;
  const sourceName = `sneup_restore_drill_${nonce}_source`;
  const targetName = `sneup_restore_drill_${nonce}_target`;
  return {
    sourceName, targetName,
    sourceUri: `${uriBase}/${sourceName}?directConnection=true`,
    targetUri: `${uriBase}/${targetName}?directConnection=true`,
    toolUri: `${uriBase}/?directConnection=true`,
    nonce: crypto.randomBytes(24).toString('hex')
  };
};

const claimDatabase = async (db, nonce, attemptedNames = []) => {
  assert.equal(await db.listCollections({}, { nameOnly: true }).hasNext(), false,
    'Refusing to modify a nonempty restore-drill database');
  // A marker write can persist even when its acknowledgement is lost.
  attemptedNames.push(db.databaseName);
  await db.createCollection(MARKER);
  await db.collection(MARKER).insertOne({ _id: nonce });
};

const removeOwnedDatabase = async (db, expectedName, nonce) => {
  assert.ok(DATABASE_PATTERN.test(expectedName) && db.databaseName === expectedName,
    'Restore-drill database ownership mismatch');
  const marker = await db.collection(MARKER).findOne({ _id: nonce });
  assert.equal(marker?._id, nonce, 'Restore-drill database ownership marker mismatch');
  await db.dropDatabase();
  assert.equal(await db.listCollections({}, { nameOnly: true }).hasNext(), false,
    'Restore-drill database still contains collections');
};

const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
};

const fingerprintDatabase = async db => {
  const collections = (await db.listCollections().toArray())
    .filter(item => item.name !== MARKER).sort((a, b) => a.name.localeCompare(b.name));
  assert.ok(collections.length <= 200, 'Unexpected restore-drill collection count');
  const manifest = [];
  for (const item of collections) {
    const collection = db.collection(item.name);
    const indexes = (await collection.indexes()).map(index => {
      const { ns, key, ...options } = index;
      // Compound index order is significant even though metadata object ordering is not.
      return canonical({ ...options, key: Object.entries(key) });
    }).sort((a, b) => a.name.localeCompare(b.name));
    const hash = crypto.createHash('sha256');
    let count = 0;
    for await (const document of collection.find({}, { raw: true, batchSize: 100, maxTimeMS: 10000 }).sort({ _id: 1 })) {
      assert.ok(Buffer.isBuffer(document), 'Native BSON data was not available for verification');
      hash.update(document);
      count += 1;
    }
    manifest.push({ name: item.name, type: item.type, options: canonical(item.options), indexes, count, sha256: hash.digest('hex') });
  }
  return manifest;
};

const assertRestored = (expected, actual) => {
  // Do not print document contents, credential ciphertext, or private index predicates on failure.
  assert.equal(JSON.stringify(actual) === JSON.stringify(expected), true, 'Restored database differs from the source data or indexes');
};

const runNativeTool = (executable, args, label, timeout = 120000) => {
  try {
    return execFileSync(executable, args, {
      encoding: 'utf8', timeout, killSignal: 'SIGKILL', maxBuffer: 128 * 1024, windowsHide: true,
      shell: false, stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch {
    throw new Error(`${label} failed; native-tool details were withheld`);
  }
};

const cleanupDrill = async ({ client, names, nonce, directory, reconnect, files = fs, timeoutMs = 30000 }) => {
  const failures = [];
  const attempt = async (resource, cleanup) => {
    try { await cleanup(); return true; } catch (error) { failures.push({ resource, error }); return false; }
  };
  if (names.length) {
    // Rejected initialization is settled; pending initialization can still create collections.
    let canDrop = await attempt('model initialization', () => withTimeout(Promise.allSettled(
      Object.values(client.models).map(model => Promise.resolve().then(() => model.init()))
    ), { timeoutMs }));
    if (canDrop && client.connection.readyState !== 1) {
      canDrop = await attempt('cleanup connection', reconnect);
    }
    if (canDrop) {
      for (const name of names) {
        await attempt(name, () => removeOwnedDatabase(client.connection.getClient().db(name), name, nonce));
      }
    }
  }
  if (directory) {
    await attempt('synthetic archive', () => files.unlink(path.join(directory, 'synthetic.archive.gz')).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    }));
    await attempt('synthetic directory', () => files.rmdir(directory));
  }
  await attempt('database disconnect', () => client.disconnect());
  return failures;
};

const seedFixture = async () => {
  const Workspace = require('../src/models/Workspace');
  const { WORKSPACE_COLLECTIONS } = require('../src/services/workspaceCollectionRegistry');
  const { HaiIntegrationService } = require('../src/services/haiIntegrationService');
  const connectorService = require('../src/services/accountConnectorService');
  const workspaceScope = require('../src/services/workspaceScopeService');
  const models = Object.fromEntries(WORKSPACE_COLLECTIONS);
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const workspace = await Workspace.create({ name: 'Synthetic recovery workspace', slug: 'restore-drill' });
  const other = await Workspace.create({ name: 'Isolated recovery workspace', slug: 'restore-drill-other' });
  const workspaceId = workspace._id;
  const board = await models.boards.create({ workspaceId, trelloId: 'a'.repeat(24), name: 'Recovery board', url: 'https://trello.com/b/fixture' });
  const list = await models.lists.create({ workspaceId, boardId: board._id, trelloId: 'b'.repeat(24), name: 'In progress' });
  const card = await models.cards.create({ workspaceId, boardId: board._id, listId: list._id, trelloId: 'c'.repeat(24), name: 'Preserve the exact next action' });
  const references = { workspaceId, boardId: board._id, cardId: card._id };
  const payload = { trelloId: card.trelloId, text: 'Synthetic reviewed comment: caf\u00e9\nSecond line.' };
  const recommendation = await models.recommendations.create({
    ...references, findingType: 'stale_card', title: 'Review recovery evidence',
    recommendedAction: 'Review the existing action before retrying', actionType: 'comment',
    actionPayload: payload, requiresApproval: true, status: 'failed'
  });
  const approval = await models.approvals.create({
    ...references, recommendationId: recommendation._id, requestedAction: 'comment',
    decision: 'approved', approvedPayloadSnapshot: payload,
    expiresAt: new Date(Date.now() + 86400000), decidedBy: 'synthetic operator'
  });
  await models.recommendations.updateOne({ _id: recommendation._id }, { $set: {
    currentApprovalId: approval._id, approvalExpiresAt: approval.expiresAt
  } });
  const attempt = await models.trelloActionAttempts.create({
    ...references, recommendationId: recommendation._id, approvalId: approval._id,
    actionType: 'comment', payload, status: 'failed', errorMessage: 'Synthetic unknown provider outcome',
    reconciliation: { status: 'required', reason: 'Review evidence before any retry', detectedAt: new Date() }
  });
  await models.auditEvents.create({
    ...references, entityType: 'recommendation', entityId: recommendation._id,
    recommendationId: recommendation._id, approvalId: approval._id, trelloActionAttemptId: attempt._id,
    action: 'synthetic_recovery_fixture', source: 'manual', afterState: { status: 'failed', payload }
  });
  const pending = await models.recommendations.create({
    ...references, findingType: 'missing_next_action', title: 'Approve a concrete next action',
    recommendedAction: 'Review before any external change', actionType: 'comment', actionPayload: payload
  });
  await models.decisionQueueItems.create({
    ...references, recommendationId: pending._id, ownerType: 'robert',
    title: pending.title, question: 'Review the next action: Yes/No?', status: 'open'
  });
  await models.recommendations.create({
    workspaceId: other._id, findingType: 'stale_card', title: 'Other workspace private fixture',
    recommendedAction: 'Keep isolated', actionType: 'manual_review'
  });
  await models.policyRules.create({ workspaceId, name: 'Recovery review', actionType: 'comment', requiresApproval: true });
  const account = await models.connectorAccounts.create({
    workspaceId, connectorId: 'trello', connectorName: 'Synthetic Trello account',
    category: 'project_management', authType: 'api_key', status: 'disabled',
    credentials: { apiKey: connectorService.encrypt('synthetic-credential-not-a-provider-key') }
  });
  await mongoose.connection.db.collection('recoveryBsonEvidence').insertOne({
    _id: new mongoose.Types.ObjectId(), workspaceId,
    long: BSON.Long.fromString('9007199254740993'), decimal: BSON.Decimal128.fromString('1.234500'),
    binary: new BSON.Binary(Buffer.from([0, 1, 127, 255])), timestamp: new BSON.Timestamp({ t: 100, i: 2 }),
    nested: { z: 1, a: [new Date('2020-01-01T00:00:00Z'), null, true] }
  });
  const hai = new HaiIntegrationService();
  const beforeSnapshot = await hai.getSnapshot({ workspaceId });
  assert.deepEqual(beforeSnapshot.partialErrors, []);
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  return { workspaceId, cardId: card._id, recommendationId: recommendation._id, approvalId: approval._id,
    accountId: account._id, attemptId: attempt._id, pendingId: pending._id, payload, models, hai, workspaceScope, connectorService };
};

const verifyRestoredReads = async fixture => {
  const { models, workspaceId, hai } = fixture;
  const preflight = await fixture.workspaceScope.inspectDefaultWorkspaceMigration();
  assert.equal(preflight.totalMissing, 0);
  assert.equal(preflight.indexPreflight.canApply, true);
  const recommendation = await models.recommendations.findById(fixture.recommendationId).lean();
  assert.equal(String(recommendation.currentApprovalId), String(fixture.approvalId));
  assert.equal(recommendation.status, 'failed');
  assert.equal(recommendation.requiresApproval, true);
  const approval = await models.approvals.findById(fixture.approvalId).lean();
  assert.deepEqual(approval.approvedPayloadSnapshot, fixture.payload);
  const attempt = await models.trelloActionAttempts.findById(fixture.attemptId).lean();
  assert.equal(attempt.status, 'failed');
  assert.equal(attempt.reconciliation.status, 'required');
  const account = await models.connectorAccounts.findById(fixture.accountId).select('+credentials');
  assert.equal(fixture.connectorService.decrypt(account.credentials.apiKey), 'synthetic-credential-not-a-provider-key');
  const key = process.env.CONNECTOR_ENCRYPTION_KEY;
  try {
    process.env.CONNECTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    assert.throws(() => fixture.connectorService.decrypt(account.credentials.apiKey), /could not be decrypted/);
  } finally {
    process.env.CONNECTOR_ENCRYPTION_KEY = key;
  }
  const snapshot = await hai.getSnapshot({ workspaceId });
  assert.deepEqual(snapshot.partialErrors, []);
  assert.equal(snapshot.demoMode, false);
  assert.ok(snapshot.recommendations.some(item => item.id === String(fixture.pendingId)));
  assert.ok(snapshot.decisions.some(item => item.cardId === String(fixture.cardId)));
  assert.ok(!JSON.stringify(snapshot).includes('Other workspace private fixture'));
  assert.equal(hai.getManifest('http://127.0.0.1').safety.providerWrites, 'never_direct');
};

const run = async () => {
  const plan = createDrillPlan(process.env.SNEUP_BACKUP_RESTORE_MONGO_URI);
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const dump = process.env.SNEUP_MONGODUMP_PATH || `mongodump${suffix}`;
  const restore = process.env.SNEUP_MONGORESTORE_PATH || `mongorestore${suffix}`;
  const dumpVersion = runNativeTool(dump, ['--version'], 'mongodump', 10000).match(/mongodump version: ([0-9.]+)/)?.[1];
  const restoreVersion = runNativeTool(restore, ['--version'], 'mongorestore', 10000).match(/mongorestore version: ([0-9.]+)/)?.[1];
  assert.ok(dumpVersion && restoreVersion, 'MongoDB native tool versions could not be verified');
  process.env.SNEUP_DEMO_MODE = 'false';
  process.env.SNEUP_PROVIDER_WRITES_DISABLED = 'true';
  process.env.CONNECTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  process.env.TRELLO_API_KEY = '';
  process.env.TRELLO_API_TOKEN = '';
  let directory;
  const attemptedDatabases = [];
  let evidence;
  let failure;
  let phase = 'database_setup';
  const options = { directConnection: true, serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 15000,
    waitQueueTimeoutMS: 5000, maxPoolSize: 5, minPoolSize: 0 };
  try {
    await mongoose.connect(plan.sourceUri, options);
    const source = mongoose.connection.db;
    await claimDatabase(source, plan.nonce, attemptedDatabases);
    const target = mongoose.connection.getClient().db(plan.targetName);
    await claimDatabase(target, plan.nonce, attemptedDatabases);
    phase = 'synthetic_fixture';
    const fixture = await seedFixture();
    phase = 'source_fingerprint';
    const before = await fingerprintDatabase(source);
    assert.ok(before.length >= 41, 'The complete workspace collection registry was not backed up');
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sneup-restore-drill-'));
    const archive = path.join(directory, 'synthetic.archive.gz');
    const started = Date.now();
    phase = 'native_dump';
    runNativeTool(dump, [`--uri=${plan.toolUri}`, `--db=${plan.sourceName}`, `--excludeCollection=${MARKER}`,
      `--archive=${archive}`, '--gzip', '--numParallelCollections=1', '--quiet'], 'mongodump');
    phase = 'native_restore';
    runNativeTool(restore, [`--uri=${plan.toolUri}`, `--archive=${archive}`, '--gzip',
      `--nsInclude=${plan.sourceName}.*`, `--nsFrom=${plan.sourceName}.*`, `--nsTo=${plan.targetName}.*`,
      '--stopOnError', '--maintainInsertionOrder', '--numParallelCollections=1', '--quiet'], 'mongorestore');
    phase = 'restored_fingerprint';
    const restored = await fingerprintDatabase(target);
    assertRestored(before, restored);
    assertRestored(before, await fingerprintDatabase(source));
    const archiveBytes = (await fs.stat(archive)).size;
    const nativeRoundTripMs = Date.now() - started;
    const serverVersion = (await source.admin().command({ buildInfo: 1 })).version;
    await mongoose.disconnect();
    await mongoose.connect(plan.targetUri, { ...options, autoIndex: false, autoCreate: false });
    phase = 'restored_application_reads';
    await verifyRestoredReads(fixture);
    assertRestored(restored, await fingerprintDatabase(mongoose.connection.db));
    evidence = { success: true, synthetic: true, productionAcceptance: false, serverVersion,
      dumpVersion, restoreVersion, collections: before.length, documents: before.reduce((sum, item) => sum + item.count, 0),
      indexes: before.reduce((sum, item) => sum + item.indexes.length, 0), archiveBytes, nativeRoundTripMs,
      bsonAndIndexesPreserved: true, sourceUnchanged: true, restoredReadsUnchanged: true,
      approvalAndReconciliationPreserved: true, encryptionKeyRequired: true, haiReadAndIsolationVerified: true,
      providerWrites: false };
  } catch (error) {
    failure = error;
  } finally {
    const cleanupFailures = await cleanupDrill({
      client: mongoose, names: attemptedDatabases, nonce: plan.nonce, directory,
      reconnect: () => mongoose.connect(plan.sourceUri, options)
    });
    if (cleanupFailures.length) {
      failure = new AggregateError([failure, ...cleanupFailures.map(item => item.error)].filter(Boolean),
        `Restore-drill cleanup could not be confirmed. Isolated databases: ${attemptedDatabases.join(', ')}.`);
    }
  }
  if (failure) throw new Error(`Backup/restore drill failed during ${phase}; no production data was used. ` + (
    /^(mongodump|mongorestore|Restore-drill cleanup|Restored database differs)/.test(failure.message)
      ? failure.message : 'Inspect the local database and native-tool setup.'
  ), { cause: failure });
  return { ...evidence, verificationDatabasesRemoved: true, syntheticArchiveRemoved: true };
};

if (require.main === module) run().then(evidence => {
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}).catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});

module.exports = { createDrillPlan, claimDatabase, removeOwnedDatabase, fingerprintDatabase, assertRestored, runNativeTool, cleanupDrill, run };
