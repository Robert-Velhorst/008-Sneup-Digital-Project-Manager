const crypto = require('crypto');
const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');
const PolicyRule = require('../models/PolicyRule');
const JobControl = require('../models/JobControl');
const FeatureFlag = require('../models/FeatureFlag');
const Board = require('../models/Board');
const Card = require('../models/Card');
const Comment = require('../models/Comment');
const List = require('../models/List');
const Member = require('../models/Member');
const { WORKSPACE_COLLECTIONS } = require('./workspaceCollectionRegistry');

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
const DEFAULT_BACKFILL_CONCURRENCY = 4;
const providerEntityModels = Object.freeze([
  ['boards', Board],
  ['cards', Card],
  ['comments', Comment],
  ['lists', List],
  ['members', Member]
]);

const getDefaultWorkspaceKey = () => Workspace.defaultWorkspaceKey();
const getDefaultWorkspaceName = () => Workspace.defaultWorkspaceName();

const slugifyWorkspaceKey = (value) => {
  const slug = String(value || 'default')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'default';
};

const objectIdFromWorkspaceKey = (value) => {
  const key = String(value || getDefaultWorkspaceKey());
  if (OBJECT_ID_PATTERN.test(key)) {
    return new mongoose.Types.ObjectId(key);
  }

  const hex = crypto.createHash('sha1').update(key).digest('hex').slice(0, 24);
  return new mongoose.Types.ObjectId(hex);
};

const normalizeWorkspaceObjectId = (value) => objectIdFromWorkspaceKey(value || getDefaultWorkspaceKey());

const getDefaultWorkspaceObjectId = () => objectIdFromWorkspaceKey(getDefaultWorkspaceKey());

const getRequestWorkspaceObjectId = (req) => normalizeWorkspaceObjectId(req?.auth?.workspaceId);

const scopeQuery = (req, query = {}) => ({
  ...query,
  workspaceId: getRequestWorkspaceObjectId(req)
});

const defaultWorkspaceQuery = (query = {}) => ({
  ...query,
  workspaceId: getDefaultWorkspaceObjectId()
});

const workspaceScopedModels = WORKSPACE_COLLECTIONS;

const missingWorkspaceQuery = () => ({
  $or: [
    { workspaceId: { $exists: false } },
    { workspaceId: null }
  ]
});

const plannedDefaultWorkspaceQuery = (workspaceId) => ({
  $or: [
    { workspaceId },
    ...missingWorkspaceQuery().$or
  ]
});

const getBackfillConcurrency = (value = process.env.SNEUP_WORKSPACE_BACKFILL_CONCURRENCY) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_BACKFILL_CONCURRENCY;
  return Math.min(Math.max(parsed, 1), 16);
};

const mapWithConcurrency = async (items, concurrency, worker) => {
  const results = new Array(items.length);
  let cursor = 0;
  const workerCount = Math.min(Math.max(concurrency, 1), items.length || 1);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }));

  return results;
};

const ensureDefaultWorkspace = async () => {
  const workspaceId = getDefaultWorkspaceObjectId();
  const key = getDefaultWorkspaceKey();
  return Workspace.findByIdAndUpdate(
    workspaceId,
    {
      $setOnInsert: {
        _id: workspaceId,
        name: getDefaultWorkspaceName(),
        slug: slugifyWorkspaceKey(key),
        status: 'active',
        plan: 'local',
        metadata: {
          source: 'default-workspace-bootstrap',
          workspaceKey: key
        }
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const listActiveWorkspaceIds = async () => {
  const workspaces = await Workspace.find({ status: 'active' }).select('_id').lean();
  return workspaces.map(workspace => workspace._id);
};

const backfillModelWorkspace = async (Model, workspaceId) => {
  const result = await Model.updateMany(
    missingWorkspaceQuery(),
    { $set: { workspaceId } }
  );

  return result.modifiedCount || result.nModified || 0;
};

const inspectDefaultWorkspaceBackfill = async ({
  models = workspaceScopedModels,
  workspaceId = getDefaultWorkspaceObjectId(),
  workspaceKey = getDefaultWorkspaceKey(),
  concurrency = getBackfillConcurrency()
} = {}) => {
  const normalizedConcurrency = getBackfillConcurrency(concurrency);
  const results = await mapWithConcurrency(models, normalizedConcurrency, async ([key, Model]) => [
    key,
    await Model.countDocuments(missingWorkspaceQuery())
  ]);

  const counts = Object.fromEntries(results);
  const totalMissing = Object.values(counts).reduce((total, count) => total + count, 0);

  return {
    mode: 'inspect',
    workspaceId: String(workspaceId),
    workspaceKey,
    concurrency: normalizedConcurrency,
    collections: counts,
    totalMissing
  };
};

const inspectWorkspaceScopedUniqueness = async ({ Model, workspaceId, fields }) => {
  const groupingKey = Object.fromEntries(fields.map(field => [field, `$${field}`]));
  let rows = [];

  try {
    rows = await Model.aggregate([
      { $match: plannedDefaultWorkspaceQuery(workspaceId) },
      { $group: { _id: groupingKey, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      {
        $group: {
          _id: null,
          duplicateGroups: { $sum: 1 },
          duplicateRecords: { $sum: '$count' }
        }
      },
      { $project: { _id: 0, duplicateGroups: 1, duplicateRecords: 1 } }
    ]);
  } catch (error) {
    if (error.code !== 26 && error.codeName !== 'NamespaceNotFound') throw error;
  }

  const summary = rows[0] || {};
  return {
    duplicateGroups: Number(summary.duplicateGroups) || 0,
    duplicateRecords: Number(summary.duplicateRecords) || 0
  };
};

const inspectProviderEntityUniqueness = async ({ Model, workspaceId }) => {
  let rows = [];
  try {
    rows = await Model.aggregate([
      { $match: { trelloId: { $exists: true, $ne: null } } },
      { $project: { workspaceId: { $ifNull: ['$workspaceId', workspaceId] }, trelloId: 1 } },
      { $group: { _id: { workspaceId: '$workspaceId', trelloId: '$trelloId' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $group: { _id: null, duplicateGroups: { $sum: 1 }, duplicateRecords: { $sum: '$count' } } },
      { $project: { _id: 0, duplicateGroups: 1, duplicateRecords: 1 } }
    ]);
  } catch (error) {
    if (error.code !== 26 && error.codeName !== 'NamespaceNotFound') throw error;
  }
  const summary = rows[0] || {};
  return {
    duplicateGroups: Number(summary.duplicateGroups) || 0,
    duplicateRecords: Number(summary.duplicateRecords) || 0
  };
};

const inspectDefaultWorkspaceMigration = async ({
  models = workspaceScopedModels,
  workspaceId = getDefaultWorkspaceObjectId(),
  workspaceKey = getDefaultWorkspaceKey(),
  concurrency = getBackfillConcurrency(),
  policyRuleModel = PolicyRule,
  jobControlModel = JobControl,
  featureFlagModel = FeatureFlag,
  providerModels = providerEntityModels
} = {}) => {
  const [backfill, policyRules, jobControls, featureFlags, providerEntities] = await Promise.all([
    inspectDefaultWorkspaceBackfill({ models, workspaceId, workspaceKey, concurrency }),
    inspectWorkspaceScopedUniqueness({
      Model: policyRuleModel,
      workspaceId,
      fields: ['actionType']
    }),
    inspectWorkspaceScopedUniqueness({
      Model: jobControlModel,
      workspaceId,
      fields: ['jobName']
    }),
    inspectWorkspaceScopedUniqueness({
      Model: featureFlagModel,
      workspaceId,
      fields: ['key']
    }),
    Promise.all(providerModels.map(async ([name, Model]) => [name, await inspectProviderEntityUniqueness({ Model, workspaceId })]))
  ]);
  const providerEntitySummary = Object.fromEntries(providerEntities);
  const providerDuplicateGroups = providerEntities.reduce((total, [, item]) => total + item.duplicateGroups, 0);
  const providerDuplicateRecords = providerEntities.reduce((total, [, item]) => total + item.duplicateRecords, 0);
  const duplicateGroups = policyRules.duplicateGroups + jobControls.duplicateGroups + featureFlags.duplicateGroups + providerDuplicateGroups;
  const duplicateRecords = policyRules.duplicateRecords + jobControls.duplicateRecords + featureFlags.duplicateRecords + providerDuplicateRecords;

  return {
    ...backfill,
    indexPreflight: {
      canApply: duplicateGroups === 0,
      duplicateGroups,
      duplicateRecords,
      policyRules,
      jobControls,
      featureFlags,
      providerEntities: providerEntitySummary
    }
  };
};

const assertWorkspaceMigrationReady = (preflight) => {
  if (preflight?.indexPreflight?.canApply) return;
  const error = new Error('Workspace migration preflight found duplicate workspace-scoped unique keys');
  error.code = 'WORKSPACE_MIGRATION_PRECHECK_FAILED';
  error.statusCode = 409;
  error.preflight = preflight?.indexPreflight;
  throw error;
};

const backfillDefaultWorkspace = async ({
  models = workspaceScopedModels,
  workspaceId = getDefaultWorkspaceObjectId(),
  workspaceKey = getDefaultWorkspaceKey(),
  concurrency = getBackfillConcurrency(),
  ensureWorkspace = ensureDefaultWorkspace
} = {}) => {
  const normalizedConcurrency = getBackfillConcurrency(concurrency);
  await ensureWorkspace();

  const results = await mapWithConcurrency(models, normalizedConcurrency, async ([key, Model]) => [
    key,
    await backfillModelWorkspace(Model, workspaceId)
  ]);

  const counts = Object.fromEntries(results);
  const totalModified = Object.values(counts).reduce((total, count) => total + count, 0);

  return {
    mode: 'apply',
    workspaceId: String(workspaceId),
    workspaceKey,
    concurrency: normalizedConcurrency,
    collections: counts,
    ...counts,
    totalModified
  };
};

const ensurePolicyRuleIndexes = async ({ Model = PolicyRule } = {}) => {
  let indexes = [];
  try {
    indexes = await Model.collection.indexes();
  } catch (error) {
    if (error.code !== 26 && error.codeName !== 'NamespaceNotFound') {
      throw error;
    }
  }
  const legacyNameIndex = indexes.find((index) => index.unique === true
    && Object.keys(index.key || {}).length === 1
    && index.key.name === 1);

  if (legacyNameIndex) {
    await Model.collection.dropIndex(legacyNameIndex.name);
  }

  await Model.createIndexes();
  return { removedLegacyNameIndex: Boolean(legacyNameIndex) };
};

const ensureJobControlIndexes = async ({ Model = JobControl } = {}) => {
  let indexes = [];
  try {
    indexes = await Model.collection.indexes();
  } catch (error) {
    if (error.code !== 26 && error.codeName !== 'NamespaceNotFound') throw error;
  }
  const legacyJobNameIndex = indexes.find((index) => index.unique === true
    && Object.keys(index.key || {}).length === 1
    && index.key.jobName === 1);
  if (legacyJobNameIndex) await Model.collection.dropIndex(legacyJobNameIndex.name);
  await Model.createIndexes();
  return { removedLegacyJobNameIndex: Boolean(legacyJobNameIndex) };
};

const ensureFeatureFlagIndexes = async ({ Model = FeatureFlag } = {}) => {
  await Model.createIndexes();
  return { workspaceKeyIndexReady: true };
};

const ensureProviderEntityIndexes = async ({ models = providerEntityModels } = {}) => {
  const results = {};
  for (const [name, Model] of models) {
    let indexes = [];
    try {
      indexes = await Model.collection.indexes();
    } catch (error) {
      if (error.code !== 26 && error.codeName !== 'NamespaceNotFound') throw error;
    }
    const legacyIndexes = indexes.filter(index => index.unique === true
      && Object.keys(index.key || {}).length === 1
      && index.key.trelloId === 1);
    for (const index of legacyIndexes) await Model.collection.dropIndex(index.name);
    await Model.createIndexes();
    results[name] = { removedLegacyTrelloIdIndexes: legacyIndexes.length };
  }
  return results;
};

module.exports = {
  assertWorkspaceMigrationReady,
  backfillDefaultWorkspace,
  defaultWorkspaceQuery,
  ensurePolicyRuleIndexes,
  ensureJobControlIndexes,
  ensureFeatureFlagIndexes,
  ensureProviderEntityIndexes,
  ensureDefaultWorkspace,
  getBackfillConcurrency,
  getDefaultWorkspaceKey,
  getDefaultWorkspaceName,
  getDefaultWorkspaceObjectId,
  getRequestWorkspaceObjectId,
  inspectDefaultWorkspaceBackfill,
  inspectDefaultWorkspaceMigration,
  inspectProviderEntityUniqueness,
  inspectWorkspaceScopedUniqueness,
  listActiveWorkspaceIds,
  mapWithConcurrency,
  missingWorkspaceQuery,
  normalizeWorkspaceObjectId,
  objectIdFromWorkspaceKey,
  plannedDefaultWorkspaceQuery,
  providerEntityModels,
  scopeQuery,
  slugifyWorkspaceKey,
  workspaceScopedModels
};
