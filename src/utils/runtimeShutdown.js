const DEFAULT_SHUTDOWN_GRACE_MS = 15000;
const MIN_SHUTDOWN_GRACE_MS = 100;
const MAX_SHUTDOWN_GRACE_MS = 120000;

const getShutdownGraceMs = (environment = process.env) => {
  const raw = String(environment.SNEUP_SHUTDOWN_GRACE_MS ?? '').trim();
  if (!raw) return DEFAULT_SHUTDOWN_GRACE_MS;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < MIN_SHUTDOWN_GRACE_MS || value > MAX_SHUTDOWN_GRACE_MS) {
    const error = new Error(
      `SNEUP_SHUTDOWN_GRACE_MS must be an integer between ${MIN_SHUTDOWN_GRACE_MS} and ${MAX_SHUTDOWN_GRACE_MS}`
    );
    error.code = 'SNEUP_SHUTDOWN_CONFIGURATION';
    throw error;
  }
  return value;
};

const withTimeout = (promise, options = {}) => {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      const error = new Error(options.message || 'Runtime component did not stop before the shutdown deadline');
      error.code = options.code || 'SNEUP_SHUTDOWN_COMPONENT_TIMEOUT';
      reject(error);
    }, options.timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
};

const closeHttpServer = (server, options = {}) => {
  if (!server || server.listening === false) return Promise.resolve({ forced: false });

  return new Promise((resolve, reject) => {
    let settled = false;
    let forced = false;
    let timeoutError;
    let timer;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error?.code === 'ERR_SERVER_NOT_RUNNING') return resolve({ forced });
      if (error) return reject(error);
      return resolve({ forced });
    };

    timer = setTimeout(() => {
      forced = true;
      timeoutError = new Error('HTTP requests did not finish before the shutdown deadline');
      timeoutError.code = 'SNEUP_HTTP_DRAIN_TIMEOUT';
      server.closeAllConnections?.();
      setImmediate(() => finish(timeoutError));
    }, options.timeoutMs);
    server.close(error => finish(timeoutError || error));
    server.closeIdleConnections?.();
  });
};

module.exports = {
  DEFAULT_SHUTDOWN_GRACE_MS,
  MAX_SHUTDOWN_GRACE_MS,
  MIN_SHUTDOWN_GRACE_MS,
  closeHttpServer,
  getShutdownGraceMs,
  withTimeout
};
