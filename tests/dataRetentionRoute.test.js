describe('data retention routes', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('separates read and owner management permissions and forwards authenticated evidence', async () => {
    const service = {
      scan: jest.fn().mockResolvedValue({ summary: { due: 0 }, categories: [] }),
      publicReport: jest.fn(report => report),
      updatePolicy: jest.fn().mockResolvedValue({ enabled: true }),
      apply: jest.fn().mockResolvedValue({ deleted: 1 })
    };
    const requirePermission = jest.fn(() => (req, res, next) => next());
    const jobs = { trackJob: jest.fn(async (options, callback) => callback()) };
    jest.doMock('../src/services/dataRetentionService', () => service);
    jest.doMock('../src/services/jobObservabilityService', () => jobs);
    jest.doMock('../src/services/workspaceScopeService', () => ({ getRequestWorkspaceObjectId: jest.fn(() => 'workspace-1') }));
    jest.doMock('../src/utils/requestSecurity', () => ({ requirePermission }));
    jest.doMock('../src/utils/logger', () => ({ error: jest.fn() }));

    const router = require('../src/routes/dataRetention');
    expect(requirePermission.mock.calls.map(call => call[0])).toEqual([
      'audit:read',
      'data-retention:manage',
      'data-retention:manage'
    ]);

    const policyHandler = router.stack.find(layer => layer.route?.path === '/policy').route.stack[1].handle;
    const applyHandler = router.stack.find(layer => layer.route?.path === '/apply').route.stack[1].handle;
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    const auth = { roles: ['owner'], displayName: 'Workspace Owner' };
    await policyHandler({ body: { enabled: true }, auth }, res);
    await applyHandler({ body: { confirm: 'prune-expired-history', workspaceConfirmation: 'team' }, auth }, res);

    expect(service.updatePolicy).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'workspace-1', actor: 'Workspace Owner', source: 'api'
    }));
    expect(service.apply).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'workspace-1', actor: 'Workspace Owner', source: 'api'
    }));
    expect(jobs.trackJob).toHaveBeenCalledWith(expect.objectContaining({
      jobName: 'privacy.data_retention', triggerType: 'api', workspaceId: 'workspace-1'
    }), expect.any(Function));
  });

  test('rejects non-owners before policy mutation', () => {
    jest.doMock('../src/services/dataRetentionService', () => ({}));
    jest.doMock('../src/services/jobObservabilityService', () => ({}));
    jest.doMock('../src/services/workspaceScopeService', () => ({ getRequestWorkspaceObjectId: jest.fn() }));
    jest.doMock('../src/utils/requestSecurity', () => ({ requirePermission: jest.fn(() => (req, res, next) => next()) }));
    const { assertOwner } = require('../src/routes/dataRetention');
    expect(() => assertOwner({ roles: ['admin'] })).toThrow('Only a workspace owner');
  });
});
