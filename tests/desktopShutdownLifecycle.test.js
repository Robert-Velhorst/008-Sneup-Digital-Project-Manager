const { EventEmitter } = require('node:events');

const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

describe('desktop runtime cleanup', () => {
  const originalEnvironment = { ...process.env };
  const modules = [
    'electron', 'http', '../src/index', '../src/utils/logger',
    '../src/services/desktopRuntimeSettings', '../src/services/supportBundleService'
  ];
  const pending = [];

  const boot = async (options = {}) => {
    const app = new EventEmitter();
    const quitEvents = [];
    app.requestSingleInstanceLock = jest.fn(() => true);
    app.whenReady = jest.fn(() => Promise.resolve());
    app.getPath = jest.fn(() => 'test-desktop-data');
    app.relaunch = jest.fn();
    app.exit = jest.fn();
    app.quit = jest.fn(() => {
      const event = { preventDefault: jest.fn() };
      quitEvents.push(event);
      app.emit('before-quit', event);
    });
    const ipc = new Map();
    const runtime = {
      initApp: jest.fn(() => options.startupError ? Promise.reject(options.startupError) : options.startup || Promise.resolve()),
      shutdown: jest.fn(() => options.cleanup || Promise.resolve())
    };
    const window = Object.assign(new EventEmitter(), {
      show: jest.fn(),
      loadURL: jest.fn(() => options.windowLoad || Promise.resolve()),
      webContents: Object.assign(new EventEmitter(), { setWindowOpenHandler: jest.fn() })
    });
    const BrowserWindow = jest.fn(() => window);
    BrowserWindow.getAllWindows = jest.fn(() => []);
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const dialog = { showErrorBox: jest.fn(), showMessageBox: jest.fn(async () => ({ response: 0 })) };
    const healthRequests = [];
    jest.doMock('electron', () => ({
      app, BrowserWindow, dialog, shell: {},
      ipcMain: { handle: (name, handler) => ipc.set(name, handler) }
    }));
    if (options.realHttp) jest.dontMock('http');
    else jest.doMock('http', () => ({
      get: (url, callback) => {
        const request = Object.assign(new EventEmitter(), { setTimeout: jest.fn(), destroy: jest.fn() });
        healthRequests.push({ request, respond: callback });
        if (!options.healthPending) queueMicrotask(() => callback({ statusCode: options.healthStatus || 200, resume: jest.fn() }));
        return request;
      }
    }));
    jest.doMock('../src/index', () => runtime);
    jest.doMock('../src/utils/logger', () => logger);
    jest.doMock('../src/services/desktopRuntimeSettings', () => ({
      getDesktopSettingsPath: () => 'test-settings',
      readDesktopSettings: async () => ({}),
      resolveStartupMode: () => options.startupMode || 'demo',
      saveDesktopStartupMode: jest.fn(async () => ({ startupMode: 'demo' }))
    }));
    jest.doMock('../src/services/supportBundleService', () => ({ createSupportBundle: jest.fn() }));
    require('../desktop/main');
    await flush();
    return { app, quitEvents, ipc, runtime, BrowserWindow, window, logger, dialog, healthRequests };
  };

  beforeEach(() => { jest.resetModules(); });
  afterEach(async () => {
    pending.splice(0).forEach(item => item.resolve());
    await flush();
    jest.clearAllTimers();
    jest.useRealTimers();
    process.env = { ...originalEnvironment };
    modules.forEach(name => jest.dontMock(name));
    jest.resetModules();
  });

  test('normal quit waits for runtime cleanup before permitting Electron to exit', async () => {
    const cleanup = deferred();
    pending.push(cleanup);
    const { app, quitEvents, runtime } = await boot({ cleanup: cleanup.promise });
    app.quit();
    await flush();
    expect(quitEvents[0].preventDefault).toHaveBeenCalledTimes(1);
    expect(runtime.shutdown).toHaveBeenCalledTimes(1);
    expect(app.quit).toHaveBeenCalledTimes(1);
    cleanup.resolve();
    await flush();
    expect(app.quit).toHaveBeenCalledTimes(2);
    expect(quitEvents[1].preventDefault).not.toHaveBeenCalled();
    expect(app.exit).not.toHaveBeenCalled();
  });

  test('repeated close requests share one cleanup operation', async () => {
    const cleanup = deferred();
    pending.push(cleanup);
    const { app, runtime } = await boot({ cleanup: cleanup.promise });
    app.quit();
    app.quit();
    app.emit('window-all-closed');
    await flush();
    expect(runtime.shutdown).toHaveBeenCalledTimes(1);
    cleanup.resolve();
    await flush();
    expect(runtime.shutdown).toHaveBeenCalledTimes(1);
  });

  test('restart preserves its IPC response and relaunches once after cleanup', async () => {
    const cleanup = deferred();
    pending.push(cleanup);
    const { app, runtime, ipc } = await boot({ cleanup: cleanup.promise });
    expect(ipc.get('sneup:restart')()).toEqual({ restarting: true });
    expect(ipc.get('sneup:restart')()).toEqual({ restarting: true });
    await flush();
    expect(runtime.shutdown).toHaveBeenCalledTimes(1);
    expect(app.relaunch).not.toHaveBeenCalled();
    expect(app.exit).not.toHaveBeenCalled();
    cleanup.resolve();
    await flush();
    expect(app.relaunch).toHaveBeenCalledTimes(1);
    expect(app.exit).not.toHaveBeenCalled();
  });

  test('failed cleanup does not relaunch or claim a successful exit', async () => {
    const error = new Error('private database connection details');
    const { app, ipc, logger } = await boot();
    // Reject only after the restart request, avoiding an unrelated unhandled rejection.
    const runtime = require('../src/index');
    runtime.shutdown.mockRejectedValue(error);
    ipc.get('sneup:restart')();
    await flush();
    expect(app.relaunch).not.toHaveBeenCalled();
    expect(app.exit).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalled();
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(error.message);
  });

  test('quit during startup waits before cleanup and prevents a late window', async () => {
    const startup = deferred();
    pending.push(startup);
    const { app, runtime, BrowserWindow } = await boot({ startup: startup.promise });
    app.quit();
    await flush();
    expect(runtime.shutdown).not.toHaveBeenCalled();
    startup.resolve();
    await flush();
    expect(runtime.shutdown).toHaveBeenCalledTimes(1);
    expect(BrowserWindow).not.toHaveBeenCalled();
  });

  test('shutdown stays bounded when initialization never completes', async () => {
    process.env.SNEUP_SHUTDOWN_GRACE_MS = '100';
    const startup = deferred();
    pending.push(startup);
    const { app, logger } = await boot({ startup: startup.promise });
    app.quit();
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(app.exit).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalled();
    expect(app.relaunch).not.toHaveBeenCalled();
  });

  test('live startup recovery also drains resources before scheduling a demo relaunch', async () => {
    const cleanup = deferred();
    pending.push(cleanup);
    const { app, runtime, dialog } = await boot({
      cleanup: cleanup.promise,
      startupMode: 'live',
      startupError: Object.assign(new Error('Live database unavailable'), { code: 'SNEUP_LIVE_DATABASE_UNAVAILABLE' })
    });
    await flush();
    expect(dialog.showMessageBox).toHaveBeenCalledTimes(1);
    expect(runtime.shutdown).toHaveBeenCalledTimes(1);
    expect(app.relaunch).not.toHaveBeenCalled();
    cleanup.resolve();
    await flush();
    expect(app.relaunch).toHaveBeenCalledTimes(1);
    expect(app.exit).not.toHaveBeenCalled();
  });

  test('activation and restart cannot reopen an app already closing normally', async () => {
    const cleanup = deferred();
    pending.push(cleanup);
    const { app, BrowserWindow, ipc } = await boot({ cleanup: cleanup.promise });
    expect(BrowserWindow).toHaveBeenCalledTimes(1);
    app.quit();
    app.emit('activate');
    expect(ipc.get('sneup:restart')()).toEqual({ restarting: false });
    expect(BrowserWindow).toHaveBeenCalledTimes(1);
    cleanup.resolve();
    await flush();
    expect(app.relaunch).not.toHaveBeenCalled();
  });

  test('a pending renderer load cannot prevent cleanup of an initialized backend', async () => {
    const windowLoad = deferred();
    pending.push(windowLoad);
    const { app, runtime, BrowserWindow } = await boot({ windowLoad: windowLoad.promise });
    expect(BrowserWindow).toHaveBeenCalledTimes(1);
    app.quit();
    await flush();
    expect(runtime.shutdown).toHaveBeenCalledTimes(1);
    expect(app.quit).toHaveBeenCalledTimes(2);
    expect(app.exit).not.toHaveBeenCalled();
  });

  test('a second launch focuses an active window but cannot show one during shutdown', async () => {
    const cleanup = deferred();
    pending.push(cleanup);
    const { app, window } = await boot({ cleanup: cleanup.promise });
    app.emit('second-instance');
    expect(window.show).toHaveBeenCalledTimes(1);
    app.quit();
    app.emit('second-instance');
    expect(window.show).toHaveBeenCalledTimes(1);
  });

  test('a readiness timeout followed by a socket error schedules only one retry', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'queueMicrotask'] });
    const { app, healthRequests } = await boot({ healthPending: true });
    const { request } = healthRequests[0];
    request.setTimeout.mock.calls[0][1]();
    request.emit('error', new Error('socket closed after timeout'));
    jest.advanceTimersByTime(250);
    expect(healthRequests).toHaveLength(2);
    app.quit();
  });

  test('quit cancels an active readiness request without opening a late window', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'queueMicrotask'] });
    const { app, healthRequests, BrowserWindow, runtime, dialog } = await boot({ healthPending: true });
    app.quit();
    await flush();
    expect(healthRequests[0].request.destroy).toHaveBeenCalledTimes(1);
    healthRequests[0].request.emit('error', new Error('socket closed after quit'));
    jest.advanceTimersByTime(1000);
    expect(healthRequests).toHaveLength(1);
    expect(runtime.shutdown).toHaveBeenCalledTimes(1);
    expect(BrowserWindow).not.toHaveBeenCalled();
    expect(dialog.showErrorBox).not.toHaveBeenCalled();
  });

  test('quit clears a scheduled readiness retry', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'queueMicrotask'] });
    const { app, healthRequests } = await boot({ healthPending: true });
    healthRequests[0].request.emit('error', new Error('not ready'));
    app.quit();
    await flush();
    jest.advanceTimersByTime(250);
    expect(healthRequests).toHaveLength(1);
  });

  test.each([301, 401, 404, 503])('HTTP %i from readiness cannot open the command center', async (healthStatus) => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'queueMicrotask'] });
    const { app, BrowserWindow } = await boot({ healthStatus });
    expect(BrowserWindow).not.toHaveBeenCalled();
    app.quit();
  });

  test('readiness exhausts exactly 80 failed attempts and exits without opening a window', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'queueMicrotask'] });
    const { app, healthRequests, BrowserWindow, dialog, runtime } = await boot({ healthPending: true });
    for (let attempt = 0; attempt < 80; attempt += 1) {
      expect(healthRequests).toHaveLength(attempt + 1);
      healthRequests[attempt].request.emit('error', new Error('not ready'));
      if (attempt < 79) jest.advanceTimersByTime(250);
    }
    await flush();
    jest.advanceTimersByTime(1000);
    expect(healthRequests).toHaveLength(80);
    expect(BrowserWindow).not.toHaveBeenCalled();
    expect(dialog.showErrorBox).toHaveBeenCalledTimes(1);
    expect(runtime.shutdown).toHaveBeenCalledTimes(1);
    expect(app.quit).toHaveBeenCalledTimes(2);
  });

  test('a late socket error after healthy startup does not restart readiness polling', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'queueMicrotask'] });
    const { app, healthRequests, BrowserWindow } = await boot();
    expect(BrowserWindow).toHaveBeenCalledTimes(1);
    healthRequests[0].request.emit('error', new Error('late socket error'));
    jest.advanceTimersByTime(1000);
    expect(healthRequests).toHaveLength(1);
    app.quit();
  });

  test('real HTTP readiness retries a 503 and opens the window after a 200', async () => {
    const http = jest.requireActual('http');
    let requests = 0;
    const server = http.createServer((_request, response) => {
      requests += 1;
      response.writeHead(requests === 1 ? 503 : 200);
      response.end('health');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    process.env.PORT = String(server.address().port);
    let desktop;
    try {
      desktop = await boot({ realHttp: true });
      for (let attempt = 0; attempt < 100 && !desktop.BrowserWindow.mock.calls.length; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(requests).toBe(2);
      expect(desktop.BrowserWindow).toHaveBeenCalledTimes(1);
      expect(desktop.dialog.showErrorBox).not.toHaveBeenCalled();
    } finally {
      desktop?.app.quit();
      await flush();
      await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    }
  });

  test('quit releases a real readiness socket that has not returned headers', async () => {
    const http = jest.requireActual('http');
    const received = deferred();
    const server = http.createServer(() => received.resolve());
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    process.env.PORT = String(server.address().port);
    let desktop;
    let deadline;
    try {
      desktop = await boot({ realHttp: true });
      await received.promise;
      desktop.app.quit();
      await Promise.race([
        new Promise(resolve => server.close(resolve)),
        new Promise((_resolve, reject) => {
          deadline = setTimeout(() => reject(new Error('Readiness socket remained open after quit')), 1000);
        })
      ]);
      expect(desktop.BrowserWindow).not.toHaveBeenCalled();
      expect(desktop.runtime.shutdown).toHaveBeenCalledTimes(1);
      expect(desktop.dialog.showErrorBox).not.toHaveBeenCalled();
    } finally {
      clearTimeout(deadline);
      desktop?.app.quit();
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
      await flush();
    }
  });
});
