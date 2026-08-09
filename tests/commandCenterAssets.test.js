const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const service = require('../src/services/commandCenterAssetService');

describe('command-center asset fingerprint coverage', () => {
  test('versions and immutably caches every initial and demand-loaded asset', () => {
    const publicDirectory = path.join(__dirname, '..', 'public');
    const assets = service.buildAssets(publicDirectory);
    const expected = [
      'app.js',
      'connectorView.js',
      'workspaceView.js',
      'formPersistence.js',
      'helpCenter.js',
      'i18n.js',
      'styles.css',
      'favicon.svg'
    ];

    expect(service.FINGERPRINTED_ASSETS).toEqual(expected);
    expected.forEach((assetName) => {
      const requestPath = `/${assetName}`;
      expect(assets.assetPaths.has(requestPath)).toBe(true);
      expect(service.cacheControlFor(assets, requestPath, assets.version)).toBe(service.IMMUTABLE_CACHE_CONTROL);
      expect(service.cacheControlFor(assets, requestPath, 'stale')).toBeNull();
    });
  });

  test('changes the shared version when any fingerprinted asset changes', () => {
    const publicDirectory = path.join(__dirname, '..', 'public');
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sneup-assets-'));
    try {
      fs.copyFileSync(path.join(publicDirectory, 'index.html'), path.join(temporaryDirectory, 'index.html'));
      service.FINGERPRINTED_ASSETS.forEach((assetName) => {
        fs.copyFileSync(path.join(publicDirectory, assetName), path.join(temporaryDirectory, assetName));
      });
      const baseline = service.buildAssets(temporaryDirectory).version;

      service.FINGERPRINTED_ASSETS.forEach((assetName) => {
        const target = path.join(temporaryDirectory, assetName);
        const original = fs.readFileSync(target);
        fs.appendFileSync(target, '\nasset-fingerprint-regression');
        expect(service.buildAssets(temporaryDirectory).version).not.toBe(baseline);
        fs.writeFileSync(target, original);
      });
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
