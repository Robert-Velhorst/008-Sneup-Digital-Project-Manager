const http = require('http');
const path = require('path');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { acquireSingleInstanceLock } = require('./singleInstance');
const { createNavigationPolicy } = require('./navigationPolicy');
const { configureDesktopEnvironment } = require('./runtimeEnvironment');
const { describeStartupFailure } = require('./startupFailure');
const { createDesktopLifecycle } = require('./runtimeLifecycle');
const {
  getDesktopSettingsPath,
  readDesktopSettings,
  resolveStartupMode,
  saveDesktopStartupMode
} = require('../src/services/desktopRuntimeSettings');
const { createSupportBundle } = require('../src/services/supportBundleService');

const DESKTOP_PORT = process.env.PORT || '3197';
const DESKTOP_HOST = '127.0.0.1';
const DESKTOP_URL = `http://${DESKTOP_HOST}:${DESKTOP_PORT}`;

configureDesktopEnvironment({ isPackaged: app.isPackaged });
process.env.HOST = DESKTOP_HOST;
process.env.PORT = DESKTOP_PORT;
process.env.SNEUP_PUBLIC_URL = process.env.SNEUP_PUBLIC_URL || DESKTOP_URL;

let mainWindow;
let sneupRuntime;
let runtimeStartupPromise;
let runtimeStartupMode;
const readinessAbort = new AbortController();
const desktopLifecycle = createDesktopLifecycle({
  app,
  getRuntime: () => sneupRuntime,
  getStartup: () => runtimeStartupPromise,
  onError: () => require('../src/utils/logger').error('Desktop runtime cleanup failed; exiting without relaunch')
});

const getSettingsPath = () => getDesktopSettingsPath(app.getPath('userData'));

const configureRuntime = async () => {
  const settings = await readDesktopSettings(getSettingsPath());
  const startupMode = resolveStartupMode({ settings });
  process.env.SNEUP_DEMO_MODE = startupMode === 'demo' ? 'true' : 'false';
  return startupMode;
};

ipcMain.handle('sneup:save-startup-mode', async (_event, startupMode) => {
  const settings = await saveDesktopStartupMode(getSettingsPath(), startupMode);
  return { startupMode: settings.startupMode };
});

ipcMain.handle('sneup:restart', () => desktopLifecycle.requestRestart());

ipcMain.handle('sneup:create-support-bundle', async () => {
  const { fileName, filePath } = await createSupportBundle({
    outputDirectory: path.join(app.getPath('userData'), 'support')
  });
  shell.showItemInFolder(filePath);
  return { fileName };
});

const waitForSneup = (attempts = 80) => new Promise((resolve, reject) => {
  let remaining = attempts;
  let timer;
  let activeRequest;
  let settled = false;

  const finish = (error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    readinessAbort.signal.removeEventListener('abort', cancel);
    activeRequest?.destroy();
    activeRequest = undefined;
    if (error) reject(error);
    else resolve();
  };

  const cancel = () => finish(new Error('Sneup readiness check cancelled during shutdown.'));

  const check = () => {
    if (settled) return;
    let attemptDone = false;
    const completeAttempt = (ready) => {
      // A timeout destroys the socket, which can also emit an error.
      if (attemptDone || settled) return;
      attemptDone = true;
      activeRequest?.destroy();
      activeRequest = undefined;
      if (ready) return finish();
      remaining -= 1;
      if (remaining <= 0) return finish(new Error('Sneup did not become ready in time.'));
      timer = setTimeout(check, 250);
    };
    try {
      activeRequest = http.get(`${DESKTOP_URL}/health`, response => {
        response.resume();
        completeAttempt(response.statusCode === 200);
      });
      activeRequest.on('error', () => completeAttempt(false));
      activeRequest.setTimeout(1000, () => completeAttempt(false));
    } catch {
      completeAttempt(false);
    }
  };

  if (readinessAbort.signal.aborted) return cancel();
  readinessAbort.signal.addEventListener('abort', cancel, { once: true });
  check();
});

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0f172a',
    show: false,
    title: 'Sneup Digital Project Manager',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (!desktopLifecycle.isQuitting()) mainWindow.show();
  });

  const navigationPolicy = createNavigationPolicy({ shell, internalUrl: DESKTOP_URL });
  mainWindow.webContents.setWindowOpenHandler(navigationPolicy.handleWindowOpen);
  mainWindow.webContents.on('will-navigate', navigationPolicy.handleNavigation);
  mainWindow.webContents.on('will-redirect', navigationPolicy.handleNavigation);

  await mainWindow.loadURL(DESKTOP_URL);
};

const initializeRuntime = async () => {
  // Packaged applications are read-only inside app.asar, so logs live with user data.
  process.env.SNEUP_LOG_DIR = process.env.SNEUP_LOG_DIR || path.join(app.getPath('userData'), 'logs');
  runtimeStartupMode = await configureRuntime();
  if (!desktopLifecycle.isQuitting()) {
    sneupRuntime = require('../src/index');
    await sneupRuntime.initApp();
  }
};

const start = async () => {
  try {
    runtimeStartupPromise = initializeRuntime();
    await runtimeStartupPromise;
    if (desktopLifecycle.isQuitting()) return;
    await waitForSneup();
    if (desktopLifecycle.isQuitting()) return;
    await createWindow();
  } catch (error) {
    if (desktopLifecycle.isQuitting()) return;
    const failure = describeStartupFailure({ error, startupMode: runtimeStartupMode });
    if (failure.recoverable) {
      try {
        const result = await dialog.showMessageBox(failure.dialogOptions);
        if (result.response === 0) {
          await saveDesktopStartupMode(getSettingsPath(), 'demo');
          process.env.SNEUP_DEMO_MODE = 'true';
          desktopLifecycle.requestRestart();
          return;
        }
      } catch {
        dialog.showErrorBox(
          'Sneup could not start demo mode',
          'Sneup could not save the demo-mode preference. Close Sneup and check that its user-data folder is writable.'
        );
      }
    } else {
      dialog.showErrorBox(failure.errorBoxTitle, failure.errorBoxMessage);
    }
    app.quit();
  }
};

if (acquireSingleInstanceLock({ app, getMainWindow: () => desktopLifecycle.isQuitting() ? undefined : mainWindow })) {
  app.on('before-quit', event => {
    desktopLifecycle.beforeQuit(event);
    readinessAbort.abort();
  });
  app.whenReady().then(start);

  app.on('activate', () => {
    if (!desktopLifecycle.isQuitting() && BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
