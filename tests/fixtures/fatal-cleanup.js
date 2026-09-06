const { registerProcessHandlers } = require('../../src/utils/processHandlers');
const logger = require('../../src/utils/logger');
const scenario = process.argv[2];

if (scenario !== 'standalone') {
  registerProcessHandlers(logger, {
    shutdown: async () => {
      process.stdout.write('cleanup-started\n');
      await new Promise(resolve => setTimeout(resolve, 3500));
      process.stdout.write('cleanup-completed\n');
    }
  });
}

setTimeout(() => process.exit(9), 10000);
setImmediate(() => {
  if (scenario === 'rejection') {
    void Promise.reject(new Error('Controlled fatal rejection fixture'));
  } else {
    throw new Error('Controlled fatal exception fixture');
  }
});
