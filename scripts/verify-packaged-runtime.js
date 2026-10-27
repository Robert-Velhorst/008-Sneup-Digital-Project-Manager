const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { supportedNodeRuntime } = require('../src/utils/nodeRuntimePolicy');

const inspectEmbeddedRuntime = (versions, expectedElectron) => ({
  passed: versions.electron === expectedElectron && supportedNodeRuntime(versions.node),
  electron: versions.electron,
  node: versions.node,
  chrome: versions.chrome,
  expectedElectron,
  requiredNode: '24.22.1+ within 24.x or 26.12.1+ within 26.x'
});

const main = async () => {
  try {
    if (process.argv.length !== 2) throw new Error('Packaged runtime verification accepts no executable-path arguments');
    const executable = path.join(__dirname, '..', 'release', 'win-unpacked', 'Sneup.exe');
    const { getCurrentFuseWire, FuseVersion, FuseV1Options } = await import('@electron/fuses');
    const wire = await getCurrentFuseWire(executable);
    // The documented fuse wire uses ASCII '1' (0x31) for enabled.
    if (wire.version !== FuseVersion.V1 || wire[FuseV1Options.RunAsNode] !== 0x31) {
      throw new Error('The packaged binary does not permit an isolated Node-only probe; verification will not launch the desktop app');
    }
    const result = spawnSync(executable, ['-p', 'JSON.stringify(process.versions)'], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      encoding: 'utf8', windowsHide: true, timeout: 15000
    });
    if (result.error || result.status !== 0) throw new Error('Could not inspect the owned packaged runtime');
    const report = inspectEmbeddedRuntime(JSON.parse(result.stdout), require('../package.json').devDependencies.electron);
    console.log(JSON.stringify(report));
    if (!report.passed) throw new Error('Bundled Electron/Node runtime does not meet the release baseline; vendor patch acceptance is still required');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
};

if (require.main === module) main();

module.exports = { inspectEmbeddedRuntime };
