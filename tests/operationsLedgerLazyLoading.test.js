const LAZY_LEDGER_DEPENDENCIES = [
  '../src/services/trelloClient',
  '../src/services/policyRuleService',
  '../src/services/recommendationPayloadPolicy',
  '../src/services/workGraphService',
  '../src/services/providerWriteSafetyService'
];

describe('operations ledger lazy dependency boundaries', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('../src/services/operationsLedgerService');
    jest.dontMock('../src/services/demoWorkspaceService');
    jest.dontMock('../src/services/workspaceScopeService');
    LAZY_LEDGER_DEPENDENCIES.forEach(dependency => jest.dontMock(dependency));
  });

  test('does not load write, policy, or graph dependencies for a read-only service import', () => {
    LAZY_LEDGER_DEPENDENCIES.forEach((dependency) => {
      jest.doMock(dependency, () => {
        throw new Error(`Eager ledger dependency loaded: ${dependency}`);
      });
    });

    expect(() => require('../src/services/operationsLedgerService')).not.toThrow();
  });

  test('serves the demo ledger without loading the live database service', async () => {
    const ledger = { demoMode: true, recommendations: [] };
    jest.doMock('../src/services/operationsLedgerService', () => {
      throw new Error('Live operations ledger service loaded in demo mode');
    });
    jest.doMock('../src/services/workspaceScopeService', () => {
      throw new Error('Workspace database scope loaded in demo mode');
    });
    jest.doMock('../src/services/demoWorkspaceService', () => ({
      getDemoOperationsLedger: jest.fn(() => ledger),
      isDemoMode: jest.fn(() => true)
    }));

    const router = require('../src/routes/operationsLedger');
    const route = router.stack.find(layer => layer.route?.path === '/' && layer.route?.methods?.get);
    const handler = route.route.stack.at(-1).handle;
    const response = { json: jest.fn(value => value) };

    await handler({ query: {}, auth: { workspaceId: 'demo' } }, response);

    expect(response.json).toHaveBeenCalledWith({ success: true, ledger });
  });
});
