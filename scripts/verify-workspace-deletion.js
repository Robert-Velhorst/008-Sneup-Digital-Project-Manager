const assert = require('assert');
const mongoose = require('mongoose');
const Workspace = require('../src/models/Workspace');
const WorkspaceDeletionReceipt = require('../src/models/WorkspaceDeletionReceipt');
const { WORKSPACE_COLLECTIONS } = require('../src/services/workspaceCollectionRegistry');
const { WorkspaceDeletionService } = require('../src/services/workspaceDeletionService');

const uri = process.env.SNEUP_DELETION_VERIFICATION_MONGO_URI;
const databaseName = uri ? new URL(uri).pathname.replace(/^\//, '').split('?')[0] : '';

if (!uri || !/^sneup_deletion_verification_[a-z0-9_-]+$/i.test(databaseName)) {
  throw new Error('SNEUP_DELETION_VERIFICATION_MONGO_URI must target a dedicated sneup_deletion_verification_* database');
}

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const workspace = await Workspace.create({
    name: 'Deletion verification',
    slug: 'deletion-verification',
    status: 'archived'
  });

  for (const [, model] of WORKSPACE_COLLECTIONS) {
    await model.collection.insertOne({
      workspaceId: workspace._id,
      verificationRecord: true
    });
  }

  const service = new WorkspaceDeletionService();
  const receipt = await service.deleteWorkspace({
    workspace,
    auth: { roles: ['owner'] },
    confirmation: workspace.slug,
    acknowledgePermanentDeletion: true
  });

  assert.equal(receipt.status, 'completed');
  assert.equal(await Workspace.countDocuments({ _id: workspace._id }), 0);
  for (const [name, model] of WORKSPACE_COLLECTIONS) {
    assert.equal(await model.countDocuments({ workspaceId: workspace._id }), 0, `${name} retained workspace data`);
  }

  const persistedReceipt = await WorkspaceDeletionReceipt.findOne({ deletionId: receipt.deletionId })
    .select('+targetWorkspaceId');
  assert.equal(persistedReceipt.status, 'completed');
  assert.equal(String(persistedReceipt.targetWorkspaceId), String(workspace._id));

  process.stdout.write(`${JSON.stringify({
    verified: true,
    databaseName,
    collections: WORKSPACE_COLLECTIONS.length,
    deletionId: receipt.deletionId,
    receiptStatus: receipt.status
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
