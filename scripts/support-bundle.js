require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const packageMetadata = require('../package.json');
const { getRuntimeDiagnostics } = require('../src/services/runtimeDiagnosticsService');

const outputDirectory = path.resolve(__dirname, '../output/support');
const timestamp = new Date().toISOString().replaceAll(':', '-');
const outputPath = path.join(outputDirectory, `sneup-support-${timestamp}.json`);
const diagnostics = getRuntimeDiagnostics();
const bundle = {
  generatedAt: new Date().toISOString(),
  application: { name: packageMetadata.name, version: packageMetadata.version },
  runtime: { platform: process.platform, architecture: process.arch, node: process.versions.node },
  diagnostics,
  included: ['application metadata', 'runtime metadata', 'redacted configuration diagnostics'],
  excluded: ['environment values', 'credentials', 'tokens', 'connection strings', 'logs', 'user data'],
  secretsExposed: false
};

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
process.stdout.write(`${outputPath}\n`);
