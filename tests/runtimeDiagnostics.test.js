const {
  getRuntimeDiagnostics,
  getRuntimeReadiness
} = require('../src/services/runtimeDiagnosticsService');
const {
  assertProviderWritesEnabled,
  getProviderWriteSafetyStatus
} = require('../src/services/providerWriteSafetyService');

const strong = (suffix) => `sneup-${suffix}-a-unique-production-secret-value-2026`;

describe('provider write emergency stop', () => {
  test('defaults to approval-gated writes and accepts common true values for the stop', () => {
    expect(getProviderWriteSafetyStatus({})).toEqual({
      enabled: true,
      mode: 'approval_gated',
      approvalRequired: true
    });
    expect(getProviderWriteSafetyStatus({ SNEUP_PROVIDER_WRITES_DISABLED: 'YES' }).enabled).toBe(false);
    expect(getProviderWriteSafetyStatus({ SNEUP_DEMO_MODE: 'true' })).toEqual({
      enabled: false,
      mode: 'demo_read_only',
      approvalRequired: true
    });
  });

  test('rejects execution with a stable operational error', () => {
    expect(() => assertProviderWritesEnabled({ SNEUP_PROVIDER_WRITES_DISABLED: 'true' }))
      .toThrow(expect.objectContaining({
        code: 'SNEUP_PROVIDER_WRITES_DISABLED',
        statusCode: 503
      }));
  });
});

describe('redacted runtime diagnostics', () => {
  test('reports a healthy demo without requiring live credentials', () => {
    const report = getRuntimeDiagnostics({ environment: {
      NODE_ENV: 'development',
      SNEUP_DEMO_MODE: 'true',
      HOST: '127.0.0.1'
    }, nodeVersion: '24.6.0' });

    expect(report).toMatchObject({
      ready: true,
      liveCriticalPathReady: false,
      mode: 'demo',
      secretsExposed: false
    });
    expect(report.providerWrites).toMatchObject({ enabled: false, mode: 'demo_read_only' });
    expect(report.checks.some(check => check.status === 'error')).toBe(false);
  });

  test('rejects the retired Node.js 20 server runtime', () => {
    const report = getRuntimeDiagnostics({
      environment: { NODE_ENV: 'development', SNEUP_DEMO_MODE: 'true' },
      nodeVersion: '20.19.0'
    });

    expect(report.ready).toBe(false);
    expect(report.checks).toContainEqual(expect.objectContaining({
      id: 'node_runtime',
      status: 'error',
      summary: expect.stringContaining('Node.js 22 or newer')
    }));
  });

  test('fails closed for partial provider credentials and insecure remote access', () => {
    const report = getRuntimeDiagnostics({ environment: {
      NODE_ENV: 'development',
      TRELLO_API_KEY: 'configured-key',
      HOST: '0.0.0.0',
      SNEUP_REQUIRE_API_KEY: 'false'
    } });

    expect(report.ready).toBe(false);
    expect(report.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'trello_credentials', status: 'error' }),
      expect.objectContaining({ id: 'remote_api_access', status: 'error' })
    ]));
  });

  test('fails closed when ngrok is enabled without enforced strong API authentication', () => {
    const report = getRuntimeDiagnostics({ environment: {
      NODE_ENV: 'development',
      SNEUP_DEMO_MODE: 'true',
      HOST: '127.0.0.1',
      SNEUP_NGROK_ENABLED: 'true',
      NGROK_AUTHTOKEN: 'configured-ngrok-token',
      SNEUP_REQUIRE_API_KEY: 'false',
      SNEUP_API_KEY: 'short'
    } });

    expect(report.ready).toBe(false);
    expect(report.checks).toContainEqual(expect.objectContaining({ id: 'ngrok_ingress', status: 'error' }));
  });

  test('validates live production prerequisites without returning secret values', () => {
    const environment = {
      NODE_ENV: 'production',
      SNEUP_DEMO_MODE: 'false',
      HOST: '127.0.0.1',
      MONGODB_URI: 'mongodb://database.example/sneup',
      TRELLO_API_KEY: 'configured-trello-key',
      TRELLO_API_TOKEN: 'configured-trello-token',
      SNEUP_API_TOKEN_PEPPER: strong('api'),
      SNEUP_SESSION_TOKEN_PEPPER: strong('session'),
      SNEUP_INVITE_TOKEN_PEPPER: strong('invite'),
      CONNECTOR_ENCRYPTION_KEY: strong('encryption'),
      CONNECTOR_STATE_SECRET: strong('state')
    };
    const report = getRuntimeDiagnostics({ environment });

    expect(report).toMatchObject({ ready: true, liveCriticalPathReady: true, secretsExposed: false });
    expect(JSON.stringify(report)).not.toContain(environment.MONGODB_URI);
    expect(JSON.stringify(report)).not.toContain(environment.TRELLO_API_TOKEN);
    expect(JSON.stringify(report)).not.toContain(environment.CONNECTOR_ENCRYPTION_KEY);
  });
});

describe('readiness state', () => {
  test('serves demo mode as degraded and refuses an uninitialized live runtime', () => {
    expect(getRuntimeReadiness({
      environment: { NODE_ENV: 'development', SNEUP_DEMO_MODE: 'true' },
      databaseState: 'disconnected',
      initialized: true
    })).toMatchObject({ ready: true, status: 'degraded', mode: 'demo', criticalPathReady: false });

    expect(getRuntimeReadiness({
      environment: { NODE_ENV: 'development', SNEUP_DEMO_MODE: 'false' },
      databaseState: 'connected',
      initialized: false
    })).toMatchObject({ ready: false, status: 'not_ready' });
  });
});
