const { getRuntimeTroubleshooting } = require('../src/services/runtimeTroubleshootingService');

const strong = (purpose) => `sneup-${purpose}-unique-production-secret-2026-value`;

describe('runtime troubleshooting contract', () => {
  test('prioritizes a stable remediation without exposing configuration values', () => {
    const environment = {
      NODE_ENV: 'production',
      SNEUP_DEMO_MODE: 'false',
      HOST: '127.0.0.1',
      TRELLO_API_KEY: 'private-key-without-token'
    };
    const report = getRuntimeTroubleshooting({ environment, nodeVersion: '24.6.0' });

    expect(report).toMatchObject({
      status: 'error',
      ready: false,
      mode: 'live',
      nextAction: {
        checkId: 'database_configuration',
        title: 'Database',
        action: expect.stringContaining('MONGODB_URI')
      },
      secretsExposed: false
    });
    expect(report.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'trello_credentials', title: 'Trello connection', status: 'error' }),
      expect.objectContaining({ id: 'ngrok_ingress', title: 'Cloud tunnel', status: 'ok', action: null })
    ]));
    expect(JSON.stringify(report)).not.toContain(environment.TRELLO_API_KEY);
  });

  test('reports no remediation when every live prerequisite is ready', () => {
    const report = getRuntimeTroubleshooting({ environment: {
      NODE_ENV: 'production',
      SNEUP_DEMO_MODE: 'false',
      HOST: '127.0.0.1',
      MONGODB_URI: 'mongodb://database.example/sneup',
      TRELLO_API_KEY: 'configured-key',
      TRELLO_API_TOKEN: 'configured-token',
      SNEUP_API_TOKEN_PEPPER: strong('api'),
      SNEUP_SESSION_TOKEN_PEPPER: strong('session'),
      SNEUP_INVITE_TOKEN_PEPPER: strong('invite'),
      CONNECTOR_ENCRYPTION_KEY: strong('encryption'),
      CONNECTOR_STATE_SECRET: strong('state')
    }, nodeVersion: '24.6.0' });

    expect(report).toMatchObject({ status: 'ok', ready: true, liveCriticalPathReady: true, nextAction: null });
    expect(report.checks.every(check => check.status === 'ok' && check.action === null)).toBe(true);
  });

  test('provides a bounded graceful-restart remediation', () => {
    const report = getRuntimeTroubleshooting({ environment: {
      NODE_ENV: 'development',
      SNEUP_DEMO_MODE: 'true',
      SNEUP_SHUTDOWN_GRACE_MS: 'forever'
    }, nodeVersion: '24.6.0' });

    expect(report.nextAction).toEqual({
      checkId: 'runtime_shutdown',
      title: 'Graceful restart',
      action: expect.stringContaining('SNEUP_SHUTDOWN_GRACE_MS')
    });
  });
});
