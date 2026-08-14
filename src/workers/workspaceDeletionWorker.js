const logger = require('../utils/logger');
const workspaceDeletionService = require('../services/workspaceDeletionService');

const INTERVAL_MS = 60_000;
let timer;
let runPromise = null;

const run = () => {
  if (runPromise) return runPromise;
  runPromise = (async () => {
    try {
      const recovered = await workspaceDeletionService.recoverInterruptedDeletions();
      const cleaned = await workspaceDeletionService.runDueCleanupPasses();
      if (recovered || cleaned) logger.info('Workspace deletion maintenance completed', { recovered, cleaned });
    } catch (error) {
      logger.error('Workspace deletion maintenance failed', { code: error.code, message: error.message });
    } finally {
      runPromise = null;
    }
  })();
  return runPromise;
};

const init = () => {
  if (timer) return timer;
  void run();
  timer = setInterval(() => void run(), INTERVAL_MS);
  timer.unref?.();
  return timer;
};

const stop = async () => {
  if (timer) clearInterval(timer);
  timer = null;
  if (runPromise) await runPromise;
};

module.exports = { init, run, stop };
