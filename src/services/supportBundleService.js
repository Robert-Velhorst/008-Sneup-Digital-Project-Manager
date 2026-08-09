const fs = require('node:fs/promises');
const path = require('node:path');
const packageMetadata = require('../../package.json');
const { getRuntimeDiagnostics } = require('./runtimeDiagnosticsService');

const supportFileName = (date) => `sneup-support-${date.toISOString().replaceAll(':', '-').replaceAll('.', '-')}.json`;

const createSupportBundle = async ({
  outputDirectory,
  environment = process.env,
  now = new Date(),
  platform = process.platform,
  architecture = process.arch,
  nodeVersion = process.versions.node,
  fsApi = fs
} = {}) => {
  if (!outputDirectory || !path.isAbsolute(outputDirectory)) {
    const error = new Error('Support bundle output directory must be an absolute path');
    error.code = 'SNEUP_SUPPORT_DIRECTORY_INVALID';
    throw error;
  }

  const fileName = supportFileName(now);
  const filePath = path.join(outputDirectory, fileName);
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  const bundle = {
    generatedAt: now.toISOString(),
    application: { name: packageMetadata.name, version: packageMetadata.version },
    runtime: { platform, architecture, node: nodeVersion },
    diagnostics: getRuntimeDiagnostics({ environment, nodeVersion }),
    included: ['application metadata', 'runtime metadata', 'redacted configuration diagnostics'],
    excluded: ['environment values', 'credentials', 'tokens', 'connection strings', 'logs', 'user data'],
    secretsExposed: false
  };

  await fsApi.mkdir(outputDirectory, { recursive: true });
  try {
    await fsApi.writeFile(temporaryPath, `${JSON.stringify(bundle, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx'
    });
    await fsApi.rename(temporaryPath, filePath);
  } catch (error) {
    await fsApi.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }

  return { fileName, filePath, bundle };
};

module.exports = {
  createSupportBundle,
  supportFileName
};
