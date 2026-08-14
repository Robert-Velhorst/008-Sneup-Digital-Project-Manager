const app = require('../src/index');
const { NgrokTunnelService } = require('../src/services/ngrokTunnelService');

const listen = () => new Promise((resolve, reject) => {
  const server = app.listen(0, '127.0.0.1');
  server.once('listening', () => resolve(server));
  server.once('error', reject);
});

const closeServer = server => new Promise((resolve, reject) => {
  server.close(error => (error ? reject(error) : resolve()));
});

describe('ngrok browser origin integration', () => {
  const originalEnvironment = { ...process.env };

  beforeEach(() => {
    process.env.SNEUP_NGROK_ENABLED = 'true';
    process.env.SNEUP_REQUIRE_API_KEY = 'true';
    process.env.SNEUP_API_KEY = 'n'.repeat(40);
    process.env.NGROK_AUTHTOKEN = 'ngrok-auth-token-for-cors-integration-2026';
    delete process.env.SNEUP_PUBLIC_URL;
    delete process.env.WEBHOOK_CALLBACK_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  test('admits the discovered tunnel origin for invitation and session browser requests', async () => {
    const close = jest.fn().mockResolvedValue();
    const service = new NgrokTunnelService({
      loadNgrok: () => ({ forward: jest.fn().mockResolvedValue({
        url: () => 'https://browser-sneup.ngrok.app',
        close
      }) })
    });

    await service.start({ host: '127.0.0.1', port: 3197 });

    const server = await listen();
    try {
      const address = server.address();
      const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/workspaces/invitations/accept`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://browser-sneup.ngrok.app',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,authorization'
        }
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-origin')).toBe('https://browser-sneup.ngrok.app');
      expect(response.headers.get('access-control-allow-methods')).toContain('POST');
      expect(response.headers.get('access-control-allow-headers')).toMatch(/Authorization/i);
    } finally {
      await closeServer(server);
    }

    await service.stop();
    expect(close).toHaveBeenCalledTimes(1);
    expect(process.env.SNEUP_PUBLIC_URL).toBeUndefined();
  });
});
