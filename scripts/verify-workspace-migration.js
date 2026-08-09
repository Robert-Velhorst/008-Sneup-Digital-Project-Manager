const assert = require('assert');
const mongoose = require('mongoose');

process.env.SNEUP_DEFAULT_WORKSPACE_ID = 'migration-verification';
process.env.SNEUP_DEFAULT_WORKSPACE_NAME = 'Migration verification';

const Workspace = require('../src/models/Workspace');
const { WORKSPACE_COLLECTIONS } = require('../src/services/workspaceCollectionRegistry');
const workspaceScopeService = require('../src/services/workspaceScopeService');

const uri = process.env.SNEUP_MIGRATION_VERIFICATION_MONGO_URI;
const databaseName = uri ? new URL(uri).pathname.replace(/^\//, '').split('?')[0] : '';

if (!uri || !/^sneup_workspace_migration_verification_[a-z0-9_-]+$/i.test(databaseName)) {
  throw new Error(
    'SNEUP_MIGRATION_VERIFICATION_MONGO_URI must target a dedicated '
    + 'sneup_workspace_migration_verification_* database'
  );
}

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  for (const [, model] of WORKSPACE_COLLECTIONS) {
    await model.collection.insertOne({ verificationRecord: true });
  }

  const preflight = await workspaceScopeService.inspectDefaultWorkspaceMigration();
  assert.equal(preflight.indexPreflight.canApply, true);
  assert.equal(preflight.totalMissing, WORKSPACE_COLLECTIONS.length);
  for (const [name] of WORKSPACE_COLLECTIONS) {
    assert.equal(preflight.collections[name], 1, `${name} was omitted from migration preflight`);
  }

  const result = await workspaceScopeService.backfillDefaultWorkspace();
  await workspaceScopeService.ensureFeatureFlagIndexes();
  await workspaceScopeService.ensureProviderEntityIndexes();
  const workspaceId = workspaceScopeService.getDefaultWorkspaceObjectId();
  assert.equal(result.totalModified, WORKSPACE_COLLECTIONS.length);
  assert.equal(await Workspace.countDocuments({ _id: workspaceId }), 1);

  for (const [name, model] of WORKSPACE_COLLECTIONS) {
    assert.equal(await model.countDocuments(workspaceScopeService.missingWorkspaceQuery()), 0, `${name} retained legacy records`);
    assert.equal(await model.countDocuments({ workspaceId }), 1, `${name} was not scoped to the default workspace`);
  }

  const featureFlagModel = WORKSPACE_COLLECTIONS.find(([name]) => name === 'featureFlags')[1];
  const featureFlagIndexes = await featureFlagModel.collection.indexes();
  assert.equal(featureFlagIndexes.some(index => index.unique === true
    && index.key.workspaceId === 1
    && index.key.key === 1), true, 'feature flag workspace/key index was not created');

  for (const [name, model] of workspaceScopeService.providerEntityModels) {
    const indexes = await model.collection.indexes();
    assert.equal(indexes.some(index => index.unique === true
      && index.key.workspaceId === 1
      && index.key.trelloId === 1), true, `${name} workspace/Trello index was not created`);
    assert.equal(indexes.some(index => index.unique === true
      && Object.keys(index.key || {}).length === 1
      && index.key.trelloId === 1), false, `${name} retained global Trello uniqueness`);
  }

  process.stdout.write(`${JSON.stringify({
    verified: true,
    databaseName,
    collections: WORKSPACE_COLLECTIONS.length,
    preflightMissing: preflight.totalMissing,
    modified: result.totalModified,
    workspaceId: String(workspaceId)
  }, null, 2)}\n`);
};

run()
  .finally(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  })
  .catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
