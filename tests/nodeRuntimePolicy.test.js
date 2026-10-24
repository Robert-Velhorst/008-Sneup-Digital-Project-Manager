const { supportedNodeRuntime } = require('../src/utils/nodeRuntimePolicy');
const { inspectEmbeddedRuntime } = require('../scripts/verify-packaged-runtime');

describe('patched runtime baseline', () => {
  test.each(['24.22.1', 'v24.23.0', '26.12.1', 'v26.13.0'])('accepts %s', (version) => {
    expect(supportedNodeRuntime(version)).toBe(true);
  });
  test.each(['22.23.4', '24.22.0', '26.12.0', '25.0.0', '27.0.0', '26.12.1-rc.1', 'invalid'])('rejects %s', (version) => {
    expect(supportedNodeRuntime(version)).toBe(false);
  });
  test('does not equate the latest Electron version with a patched embedded Node', () => {
    expect(inspectEmbeddedRuntime({ electron: '45.0.0', node: '24.22.0', chrome: '156.0.8078.48' }, '45.0.0').passed).toBe(false);
  });
  test('accepts only the expected Electron with a patched bundled Node', () => {
    expect(inspectEmbeddedRuntime({ electron: '45.0.0', node: '24.22.1' }, '45.0.0').passed).toBe(true);
    expect(inspectEmbeddedRuntime({ electron: '44.8.0', node: '24.22.1' }, '45.0.0').passed).toBe(false);
  });
});
