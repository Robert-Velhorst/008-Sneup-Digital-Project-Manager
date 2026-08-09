const logger = require('../utils/logger');
const workspaceDeletionService = require('../services/workspaceDeletionService');

const INTERVAL_MS = 60_000;
let timer;
let running = false;

const run = async () => {
  if (running) return;
  running = true;
  try {
    const recovered = await workspaceDeletionService.recoverInterruptedDeletions();
    const cleaned = await workspaceDeletionService.runDueCleanupPasses();
    if (recovered || cleaned) logger.info('Workspace deletion maintenance completed', { recovered, cleaned });
  } catch (error) {
    logger.error('Workspace deletion maintenance failed', { code: error.code, message: error.message });
  } finally {
    running = false;
  }
};

const init = () => {
  if (timer) return timer;
  void run();
  timer = setInterval(() => void run(), INTERVAL_MS);
  timer.unref?.();
  return timer;
};

const stop = () => {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
};

module.exports = { init, run, stop };
