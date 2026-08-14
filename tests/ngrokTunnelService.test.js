const { NgrokTunnelService } = require('../src/services/ngrokTunnelService');

describe('ngrok tunnel safety', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SNEUP_NGROK_ENABLED = 'true';
    process.env.SNEUP_REQUIRE_API_KEY = 'true';
    process.env.SNEUP_API_KEY = 'a'.repeat(40);
    process.env.NGROK_AUTHTOKEN = 'ngrok-auth-token-for-unit-check-2026';
    delete process.env.SNEUP_NGROK_DOMAIN;
    delete process.env.SNEUP_PUBLIC_URL;
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
    expect(process.env.SNEUP_PUBLIC_URL).toBeUndefined();
    expect(process.env.WEBHOOK_CALLBACK_URL).toBeUndefined();
  });

  test('shares concurrent starts and refreshes tunnel-owned URLs after restart', async () => {
    const listeners = [
      { url: () => 'https://first-sneup.ngrok.app', close: jest.fn().mockResolvedValue() },
      { url: () => 'https://second-sneup.ngrok.app', close: jest.fn().mockResolvedValue() }
    ];
    let releaseFirst;
    const firstForward = new Promise(resolve => { releaseFirst = () => resolve(listeners[0]); });
    const forward = jest.fn()
      .mockReturnValueOnce(firstForward)
      .mockResolvedValueOnce(listeners[1]);
    const service = new NgrokTunnelService({ loadNgrok: () => ({ forward }) });

    const firstStart = service.start({ host: '127.0.0.1', port: 3197 });
    const sharedStart = service.start({ host: '127.0.0.1', port: 3197 });
    releaseFirst();
    await expect(Promise.all([firstStart, sharedStart])).resolves.toEqual([
      expect.objectContaining({ publicUrl: 'https://first-sneup.ngrok.app' }),
      expect.objectContaining({ publicUrl: 'https://first-sneup.ngrok.app' })
    ]);
    expect(forward).toHaveBeenCalledTimes(1);
    expect(process.env.WEBHOOK_CALLBACK_URL).toBe('https://first-sneup.ngrok.app/api/webhooks/trello');

    await service.stop();
    await service.start({ host: '127.0.0.1', port: 3197 });
    expect(forward).toHaveBeenCalledTimes(2);
    expect(process.env.SNEUP_PUBLIC_URL).toBe('https://second-sneup.ngrok.app');
    expect(process.env.WEBHOOK_CALLBACK_URL).toBe('https://second-sneup.ngrok.app/api/webhooks/trello');
    await service.stop();
  });

  test('restores operator-owned public and callback URLs after close', async () => {
    process.env.SNEUP_PUBLIC_URL = 'https://configured.example';
    process.env.WEBHOOK_CALLBACK_URL = 'https://hooks.example/trello';
    const close = jest.fn().mockResolvedValue();
    const service = new NgrokTunnelService({
      loadNgrok: () => ({ forward: jest.fn().mockResolvedValue({
        url: () => 'https://temporary-sneup.ngrok.app',
        close
      }) })
    });

    await service.start();
    expect(process.env.SNEUP_PUBLIC_URL).toBe('https://temporary-sneup.ngrok.app');
    expect(process.env.WEBHOOK_CALLBACK_URL).toBe('https://hooks.example/trello');
    await service.stop();

    expect(close).toHaveBeenCalledTimes(1);
    expect(process.env.SNEUP_PUBLIC_URL).toBe('https://configured.example');
    expect(process.env.WEBHOOK_CALLBACK_URL).toBe('https://hooks.example/trello');
  });

  test('does not replace a callback that the operator changes while the tunnel is active', async () => {
    const service = new NgrokTunnelService({
      loadNgrok: () => ({ forward: jest.fn().mockResolvedValue({
        url: () => 'https://temporary-sneup.ngrok.app',
        close: jest.fn().mockResolvedValue()
      }) })
    });

    await service.start();
    process.env.WEBHOOK_CALLBACK_URL = 'https://hooks.example/reconfigured';
    await service.stop();

    expect(process.env.SNEUP_PUBLIC_URL).toBeUndefined();
    expect(process.env.WEBHOOK_CALLBACK_URL).toBe('https://hooks.example/reconfigured');
  });

  test('closes and rejects a tunnel that returns an unsafe public URL', async () => {
    const close = jest.fn().mockResolvedValue();
    const service = new NgrokTunnelService({
      loadNgrok: () => ({ forward: jest.fn().mockResolvedValue({
        url: () => 'https://user:secret@sneup-test.ngrok.app/path?token=secret',
        close
      }) })
    });

    await expect(service.start()).rejects.toMatchObject({ code: 'SNEUP_NGROK_CONFIGURATION' });
    expect(close).toHaveBeenCalledTimes(1);
    expect(service.getStatus()).toEqual({ enabled: true, connected: false, publicUrl: null });
    expect(process.env.SNEUP_PUBLIC_URL).toBeUndefined();
    expect(process.env.WEBHOOK_CALLBACK_URL).toBeUndefined();
  });

  test('preserves the unsafe-listener error when ngrok close also fails', async () => {
    const service = new NgrokTunnelService({
      loadNgrok: () => ({ forward: jest.fn().mockResolvedValue({
        url: () => 'http://insecure-sneup.ngrok.app',
        close: jest.fn().mockRejectedValue(new Error('private ngrok close detail'))
      }) })
    });

    await expect(service.start()).rejects.toMatchObject({
      code: 'SNEUP_NGROK_CONFIGURATION',
      tunnelCloseFailed: true
    });
    expect(process.env.SNEUP_PUBLIC_URL).toBeUndefined();
    expect(process.env.WEBHOOK_CALLBACK_URL).toBeUndefined();
  });
});
