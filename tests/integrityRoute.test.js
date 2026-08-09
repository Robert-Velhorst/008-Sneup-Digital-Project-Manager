describe('integrity routes', () => {
  afterEach(() => {
    jest.dontMock('../src/services/dataIntegrityService');
    jest.dontMock('../src/services/workspaceScopeService');
    jest.dontMock('../src/utils/requestSecurity');
    jest.resetModules();
  });

  test('protects scans and repairs separately and derives the repair actor from authentication', async () => {
    const service = {
      scan: jest.fn().mockResolvedValue({ summary: { findings: 0 }, repairStates: new Map() }),
      publicReport: jest.fn(report => ({ summary: report.summary })),
      apply: jest.fn().mockResolvedValue({ repaired: 1 })
    };
    const requirePermission = jest.fn(() => (req, res, next) => next());
    jest.doMock('../src/services/dataIntegrityService', () => service);
    jest.doMock('../src/services/workspaceScopeService', () => ({ getRequestWorkspaceObjectId: jest.fn(() => 'workspace-1') }));
    jest.doMock('../src/utils/requestSecurity', () => ({ requirePermission }));

    const router = require('../src/routes/integrity');
    expect(requirePermission.mock.calls.map(call => call[0])).toEqual(['audit:read', 'integrity:repair']);

    const getHandler = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.get).route.stack[1].handle;
    const postHandler = router.stack.find(layer => layer.route?.path === '/repair').route.stack[1].handle;
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await getHandler({ query: { limit: '20' }, auth: {} }, res);
    await postHandler({ body: { confirm: 'repair-derived-state', fingerprints: ['abc'] }, auth: { displayName: 'Admin User' } }, res);

    expect(service.scan).toHaveBeenCalledWith({ workspaceId: 'workspace-1', limit: '20' });
    expect(service.apply).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'workspace-1',
      actor: 'Admin User',
      source: 'api',
      fingerprints: ['abc']
    }));
  });
});
