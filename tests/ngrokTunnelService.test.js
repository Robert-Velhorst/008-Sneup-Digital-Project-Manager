const { NgrokTunnelService } = require('../src/services/ngrokTunnelService');

describe('ngrok tunnel safety', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SNEUP_NGROK_ENABLED = 'true';
    process.env.SNEUP_REQUIRE_API_KEY = 'true';
    process.env.SNEUP_API_KEY = 'a'.repeat(40);
    process.env.NGROK_AUTHTOKEN = 'ngrok-auth-token-for-unit-check-2026';
    delete process.env.SNEUP_NGROK_DOMAIN;
    delete process.env.WEBHOOK_CALLBACK_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('refuses public ingress without a strong API key', async () => {
    delete process.env.SNEUP_API_KEY;
    const loadNgrok = jest.fn();
    const service = new NgrokTunnelService({ loadNgrok });

    await expect(service.start()).rejects.toThrow('SNEUP_API_KEY');
    expect(loadNgrok).not.toHaveBeenCalled();
  });

  test('starts and closes one authenticated tunnel and updates callback URLs', async () => {
    const close = jest.fn().mockResolvedValue();
    const forward = jest.fn().mockResolvedValue({
      url: () => 'https://sneup-test.ngrok.app/',
      close
    });
    const service = new NgrokTunnelService({ loadNgrok: () => ({ forward }) });

    await expect(service.start({ host: '127.0.0.1', port: 3197 })).resolves.toEqual({
      enabled: true,
      connected: true,
      publicUrl: 'https://sneup-test.ngrok.app'
    });
    expect(forward).toHaveBeenCalledWith({
      addr: 'http://127.0.0.1:3197',
      authtoken_from_env: true
    });
    expect(process.env.SNEUP_PUBLIC_URL).toBe('https://sneup-test.ngrok.app');
    expect(process.env.WEBHOOK_CALLBACK_URL).toBe('https://sneup-test.ngrok.app/api/webhooks/trello');

    await service.stop();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
