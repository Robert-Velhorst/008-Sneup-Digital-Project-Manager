const http = require('http');

const listen = server => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

describe('runtime shutdown utilities', () => {
  test('validates the configured graceful drain window', () => {
    const { getShutdownGraceMs } = require('../src/utils/runtimeShutdown');

    expect(getShutdownGraceMs({})).toBe(15000);
    expect(getShutdownGraceMs({ SNEUP_SHUTDOWN_GRACE_MS: '25000' })).toBe(25000);
    expect(() => getShutdownGraceMs({ SNEUP_SHUTDOWN_GRACE_MS: '0' })).toThrow(expect.objectContaining({
      code: 'SNEUP_SHUTDOWN_CONFIGURATION'
    }));
    expect(() => getShutdownGraceMs({ SNEUP_SHUTDOWN_GRACE_MS: 'private' })).toThrow(expect.objectContaining({
      code: 'SNEUP_SHUTDOWN_CONFIGURATION'
    }));
  });

  test('closes an idle HTTP server normally', async () => {
    const { closeHttpServer } = require('../src/utils/runtimeShutdown');
    const server = http.createServer((req, res) => res.end('ok'));
    await listen(server);

    await expect(closeHttpServer(server, { timeoutMs: 1000 })).resolves.toEqual({ forced: false });
    expect(server.listening).toBe(false);
  });

  test('force closes a request that exceeds the graceful deadline and reports the timeout', async () => {
    const { closeHttpServer } = require('../src/utils/runtimeShutdown');
    let requestStarted;
    const started = new Promise(resolve => { requestStarted = resolve; });
    const server = http.createServer(() => requestStarted());
    await listen(server);
    const address = server.address();
    const request = http.get({ host: '127.0.0.1', port: address.port, path: '/' });
    request.on('error', () => {});
    await started;

    await expect(closeHttpServer(server, { timeoutMs: 25 })).rejects.toMatchObject({
      code: 'SNEUP_HTTP_DRAIN_TIMEOUT'
    });
    expect(server.listening).toBe(false);
    request.destroy();
  });
});
