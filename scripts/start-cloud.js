require('dotenv').config();
const { validateCloudEnvironment } = require('../src/utils/cloudConfiguration');

try {
  validateCloudEnvironment();
} catch (error) {
  process.stderr.write(`Cloud startup refused: ${error.code || 'SNEUP_CLOUD_CONFIGURATION'}\n`);
  process.exit(1);
}

const app = require('../src/index');
app.initApp().catch(async () => {
  await app.shutdown();
  process.exitCode = 1;
});
