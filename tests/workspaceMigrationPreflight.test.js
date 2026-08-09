const workspaceScopeService = require('../src/services/workspaceScopeService');
const { WORKSPACE_COLLECTIONS } = require('../src/services/workspaceCollectionRegistry');

const model = ({ missing = 0, conflicts = [] } = {}) => ({
  countDocuments: jest.fn().mockResolvedValue(missing),
  aggregate: jest.fn().mockResolvedValue(conflicts),
  updateMany: jest.fn()
});

describe('workspace migration preflight', () => {
  test('uses the complete shared workspace collection registry', () => {
    expect(workspaceScopeService.workspaceScopedModels).toBe(WORKSPACE_COLLECTIONS);
    expect(workspaceScopeService.workspaceScopedModels).toHaveLength(40);
    expect(workspaceScopeService.workspaceScopedModels.map(([name]) => name)).toEqual(expect.arrayContaining([
      'apiTokens',
      'capacityProfiles',
      'featureFlags',
      'notificationDeliveries',
      'notificationPolicies',
      'sessionTokens',
      'users',
      'webhookDeliveries',
      'workSignals',
      'workspaceInvitations'
    ]));
  });

  test('reports only aggregate future unique-key conflicts before any backfill write', async () => {
    const workspaceId = '507f1f77bcf86cd799439011';
    const boards = model({ missing: 2 });
    const policyRules = model({ conflicts: [{ duplicateGroups: 1, duplicateRecords: 2 }] });
    const jobControls = model();
    const featureFlags = model({ conflicts: [{ duplicateGroups: 1, duplicateRecords: 3 }] });

    const preflight = await workspaceScopeService.inspectDefaultWorkspaceMigration({
      models: [['boards', boards]],
      workspaceId,
      workspaceKey: 'production',
      policyRuleModel: policyRules,
      jobControlModel: jobControls,
      featureFlagModel: featureFlags
      , providerModels: []
    });

    expect(preflight).toMatchObject({
      mode: 'inspect',
      totalMissing: 2,
      indexPreflight: {
        canApply: false,
        duplicateGroups: 2,
        duplicateRecords: 5,
        policyRules: { duplicateGroups: 1, duplicateRecords: 2 },
        jobControls: { duplicateGroups: 0, duplicateRecords: 0 },
        featureFlags: { duplicateGroups: 1, duplicateRecords: 3 }
      }
    });
    expect(boards.updateMany).not.toHaveBeenCalled();
    expect(policyRules.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ $match: expect.objectContaining({ $or: expect.any(Array) }) }),
      expect.objectContaining({ $group: expect.objectContaining({ _id: { actionType: '$actionType' } }) })
    ]));
    expect(featureFlags.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ $group: expect.objectContaining({ _id: { key: '$key' } }) })
    ]));
    expect(JSON.stringify(preflight.indexPreflight)).not.toMatch(/credential|token|condition|507f1f77/i);
    expect(() => workspaceScopeService.assertWorkspaceMigrationReady(preflight)).toThrow(/preflight found duplicate/i);
  });

  test('allows a clean preflight and treats a missing legacy collection as conflict-free', async () => {
    const namespaceMissing = model();
    namespaceMissing.aggregate.mockRejectedValue({ code: 26, codeName: 'NamespaceNotFound' });
    const preflight = await workspaceScopeService.inspectDefaultWorkspaceMigration({
      models: [],
      workspaceId: '507f1f77bcf86cd799439011',
      policyRuleModel: namespaceMissing,
      jobControlModel: model(),
      featureFlagModel: model()
      , providerModels: []
    });

    expect(preflight.indexPreflight).toMatchObject({ canApply: true, duplicateGroups: 0, duplicateRecords: 0 });
    expect(() => workspaceScopeService.assertWorkspaceMigrationReady(preflight)).not.toThrow();
  });

  test('creates the feature flag workspace key index through the guarded migration path', async () => {
    const Model = { createIndexes: jest.fn().mockResolvedValue(undefined) };

    await expect(workspaceScopeService.ensureFeatureFlagIndexes({ Model }))
      .resolves.toEqual({ workspaceKeyIndexReady: true });
    expect(Model.createIndexes).toHaveBeenCalledTimes(1);
  });

  test('preflights and migrates Trello identifiers to workspace-scoped uniqueness', async () => {
    const provider = model({ conflicts: [{ duplicateGroups: 1, duplicateRecords: 2 }] });
    const preflight = await workspaceScopeService.inspectDefaultWorkspaceMigration({
      models: [],
      workspaceId: '507f1f77bcf86cd799439011',
      policyRuleModel: model(),
      jobControlModel: model(),
      featureFlagModel: model(),
      providerModels: [['cards', provider]]
    });
    expect(preflight.indexPreflight).toMatchObject({
      canApply: false,
      providerEntities: { cards: { duplicateGroups: 1, duplicateRecords: 2 } }
    });
    expect(provider.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ $project: expect.objectContaining({
        workspaceId: { $ifNull: ['$workspaceId', '507f1f77bcf86cd799439011'] },
        trelloId: 1
      }) }),
      expect.objectContaining({ $group: expect.objectContaining({
        _id: { workspaceId: '$workspaceId', trelloId: '$trelloId' }
      }) })
    ]));

    const Model = {
      collection: {
        indexes: jest.fn().mockResolvedValue([{ name: 'trelloId_1', key: { trelloId: 1 }, unique: true }]),
        dropIndex: jest.fn().mockResolvedValue(undefined)
      },
      createIndexes: jest.fn().mockResolvedValue(undefined)
    };
    await expect(workspaceScopeService.ensureProviderEntityIndexes({ models: [['cards', Model]] }))
      .resolves.toEqual({ cards: { removedLegacyTrelloIdIndexes: 1 } });
    expect(Model.collection.dropIndex).toHaveBeenCalledWith('trelloId_1');
    expect(Model.createIndexes).toHaveBeenCalledTimes(1);
  });
});
