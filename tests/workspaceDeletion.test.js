const fs = require('fs');
const path = require('path');
const Workspace = require('../src/models/Workspace');
const WorkspaceDeletionReceipt = require('../src/models/WorkspaceDeletionReceipt');
const { WORKSPACE_COLLECTIONS } = require('../src/services/workspaceCollectionRegistry');
const {
  CLEANUP_DELAYS_MS,
  WorkspaceDeletionService,
  assertWorkspaceDeletionOwner,
  publicDeletionReceipt
} = require('../src/services/workspaceDeletionService');

const receipt = (fields = {}) => ({
  _id: 'receipt-1',
  deletionId: 'deletion-1',
  targetWorkspaceId: 'workspace-1',
  status: 'in_progress',
  requestedAt: new Date('2026-08-09T08:00:00.000Z'),
  startedAt: new Date('2026-08-09T08:00:01.000Z'),
  plannedCounts: {},
  deletedCounts: {},
  completedCollections: [],
  cleanupPass: 0,
  leaseId: 'lease-1',
  save: jest.fn(async function save() { return this; }),
  markModified: jest.fn(),
  ...fields
});

const collection = (count) => ({
  countDocuments: jest.fn()
    .mockResolvedValueOnce(count)
    .mockResolvedValueOnce(0),
  deleteMany: jest.fn()
    .mockResolvedValueOnce({ deletedCount: count })
    .mockResolvedValueOnce({ deletedCount: 0 })
});

describe('workspace deletion lifecycle', () => {
  test('requires an owner, archived state, exact slug, and explicit acknowledgement', () => {
    const service = new WorkspaceDeletionService({ collections: [] });
    const workspace = { _id: 'workspace-1', slug: 'delivery', status: 'archived' };
    const valid = {
      workspace,
      auth: { roles: ['owner'] },
      confirmation: 'delivery',
      acknowledgePermanentDeletion: true
    };

    expect(() => service.validateRequest(valid)).not.toThrow();
    expect(() => assertWorkspaceDeletionOwner({ roles: ['admin'] }))
      .toThrow(expect.objectContaining({ statusCode: 403 }));
    expect(() => service.validateRequest({ ...valid, workspace: { ...workspace, status: 'active' } }))
      .toThrow(expect.objectContaining({ statusCode: 409 }));
    expect(() => service.validateRequest({ ...valid, confirmation: 'Delivery' }))
      .toThrow(expect.objectContaining({ statusCode: 400 }));
    expect(() => service.validateRequest({ ...valid, acknowledgePermanentDeletion: false }))
      .toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  test('purges ordinary data before identity, removes the workspace last, and schedules bounded cleanup', async () => {
    const records = collection(3);
    const sessions = collection(2);
    const workspaceModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue({ status: 'deleting' }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      exists: jest.fn().mockResolvedValue(false)
    };
    const service = new WorkspaceDeletionService({
      collections: [['sessionTokens', sessions], ['records', records]],
      Workspace: workspaceModel,
      now: () => new Date('2026-08-09T08:01:00.000Z')
    });
    service.renewLease = jest.fn(async value => value);
    const value = receipt();

    const result = await service.purge(value);

    expect(records.deleteMany).toHaveBeenCalledWith({ workspaceId: 'workspace-1' });
    expect(sessions.deleteMany).toHaveBeenCalledWith({ workspaceId: 'workspace-1' });
    expect(records.deleteMany.mock.invocationCallOrder[0])
      .toBeLessThan(sessions.deleteMany.mock.invocationCallOrder[0]);
    expect(sessions.deleteMany.mock.invocationCallOrder[0])
      .toBeLessThan(workspaceModel.deleteOne.mock.invocationCallOrder[0]);
    expect(result.status).toBe('completed');
    expect(result.deletedCounts).toMatchObject({ records: 3, sessionTokens: 2, workspace: 1 });
    expect(result.nextCleanupAt).toEqual(new Date('2026-08-09T08:02:00.000Z'));
    expect(CLEANUP_DELAYS_MS).toHaveLength(5);
  });

  test('resumes after deletion occurred before progress was saved without losing the planned count', async () => {
    const records = {
      countDocuments: jest.fn().mockResolvedValue(0),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 })
    };
    const service = new WorkspaceDeletionService({ collections: [['records', records]] });
    service.saveProgress = jest.fn(async value => value);
    const value = receipt({ plannedCounts: { records: 4 } });

    const result = await service.purgeCollection(value, 'records', records, 'workspace-1');

    expect(result.deletedCounts.records).toBe(4);
    expect(result.completedCollections).toContain('records');
    expect(records.countDocuments).toHaveBeenCalledTimes(1);
  });

  test('removes the technical workspace reference after the final bounded cleanup pass', async () => {
    const value = receipt({
      status: 'completed',
      cleanupPass: 4,
      nextCleanupAt: new Date('2026-08-09T08:00:00.000Z'),
      deletedCounts: { records: 3 }
    });
    const query = {
      select: jest.fn(() => query),
      limit: jest.fn().mockResolvedValue([value])
    };
    const Receipt = { find: jest.fn(() => query) };
    const service = new WorkspaceDeletionService({
      collections: [],
      Receipt,
      now: () => new Date('2026-08-10T08:00:00.000Z')
    });
    service.sweepWorkspaceData = jest.fn().mockResolvedValue({ records: 1 });

    await expect(service.runDueCleanupPasses()).resolves.toBe(1);

    expect(value.deletedCounts.records).toBe(4);
    expect(value.cleanupPass).toBe(5);
    expect(value.targetWorkspaceId).toBeUndefined();
    expect(value.nextCleanupAt).toBeUndefined();
    expect(value.save).toHaveBeenCalledTimes(1);
  });

  test('recovers expired and bounded failed deletion receipts without exposing identifiers', async () => {
    const candidate = receipt({ status: 'failed', retryCount: 1 });
    const query = {
      select: jest.fn(() => query),
      limit: jest.fn().mockResolvedValue([candidate])
    };
    const Receipt = { find: jest.fn(() => query) };
    const service = new WorkspaceDeletionService({ collections: [], Receipt });
    const acquired = receipt();
    service.acquire = jest.fn().mockResolvedValue(acquired);
    service.purge = jest.fn().mockResolvedValue({ ...acquired, status: 'completed' });

    await expect(service.recoverInterruptedDeletions()).resolves.toBe(1);

    expect(service.acquire).toHaveBeenCalledWith(candidate, { allowFailed: true });
    expect(service.purge).toHaveBeenCalledWith(acquired);
    expect(Receipt.find).toHaveBeenCalledWith(expect.objectContaining({
      targetWorkspaceId: { $exists: true },
      $or: expect.any(Array)
    }));
  });

  test('exposes only the non-identifying completed receipt fields', () => {
    expect(WorkspaceDeletionReceipt.schema.path('targetWorkspaceId').options.select).toBe(false);
    expect(Workspace.schema.path('status').enumValues).toContain('deleting');
    expect(publicDeletionReceipt(receipt({
      targetWorkspaceId: 'private-workspace-id',
      leaseId: 'private-lease',
      deletedCounts: { cards: 5 }
    }))).toEqual({
      deletionId: 'deletion-1',
      status: 'in_progress',
      requestedAt: new Date('2026-08-09T08:00:00.000Z'),
      startedAt: new Date('2026-08-09T08:00:01.000Z'),
      completedAt: undefined,
      deletedCounts: { cards: 5 }
    });
  });

  test('uses one registry for export and deletion and covers every workspace-scoped model', () => {
    const registered = new Set(WORKSPACE_COLLECTIONS.map(([, model]) => model.modelName));
    const workspaceModels = fs.readdirSync(path.join(__dirname, '../src/models'))
      .filter(file => file.endsWith('.js'))
      .map(file => require(path.join(__dirname, '../src/models', file)))
      .filter(model => model?.schema?.path('workspaceId'))
      .map(model => model.modelName);

    expect(new Set(WORKSPACE_COLLECTIONS.map(([name]) => name)).size).toBe(WORKSPACE_COLLECTIONS.length);
    expect([...new Set(workspaceModels)].sort()).toEqual([...registered].sort());
  });

  test('wires owner confirmation and deletion state protection through the API and command center', () => {
    const route = fs.readFileSync(path.join(__dirname, '../src/routes/workspaces.js'), 'utf8');
    const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

    expect(route).toContain("router.post('/:workspaceId/delete'");
    expect(route).toContain("workspace.status === 'deleting'");
    expect(html).toContain('id="workspaceDeleteButton"');
    expect(app).toContain('openWorkspaceDeletion');
    expect(app).toContain('acknowledgePermanentDeletion');
    expect(app).toContain('/delete`');
  });
});
