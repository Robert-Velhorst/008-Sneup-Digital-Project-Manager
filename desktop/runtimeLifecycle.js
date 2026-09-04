const { getShutdownGraceMs, withTimeout } = require('../src/utils/runtimeShutdown');

const createDesktopLifecycle = ({ app, getRuntime, getStartup, onError }) => {
  let closing = false;
  let completed = false;
  let restartRequested = false;

  const finishQuit = async () => {
    try {
      // Initialization may still acquire resources. Let it settle before cleanup.
      await withTimeout(Promise.resolve(getStartup()).catch(() => {}), {
        timeoutMs: getShutdownGraceMs(),
        code: 'SNEUP_DESKTOP_STARTUP_DRAIN_TIMEOUT',
        message: 'Desktop initialization did not settle before shutdown'
      });
      await getRuntime()?.shutdown();
      completed = true;
      if (restartRequested) app.relaunch();
      app.quit();
    } catch {
      restartRequested = false;
      try {
        onError();
      } finally {
        app.exit(1);
      }
    }
  };

  const beforeQuit = (event) => {
    if (completed) return;
    event.preventDefault();
    if (closing) return;
    closing = true;
    void finishQuit();
  };

  const requestRestart = () => {
    if (restartRequested) return { restarting: true };
    if (closing) return { restarting: false };
    restartRequested = true;
    // Let the renderer receive its IPC response before closing its window.
    setImmediate(() => app.quit());
    return { restarting: true };
  };

  return { beforeQuit, requestRestart, isQuitting: () => closing || restartRequested };
};

module.exports = { createDesktopLifecycle };
