require('dotenv').config();

const path = require('node:path');
const { createSupportBundle } = require('../src/services/supportBundleService');

const outputDirectory = path.resolve(__dirname, '../output/support');

createSupportBundle({ outputDirectory })
  .then(({ filePath }) => process.stdout.write(`${filePath}\n`))
  .catch((error) => {
    process.stderr.write(`Support bundle failed: ${error.message}\n`);
    process.exitCode = 1;
  });
