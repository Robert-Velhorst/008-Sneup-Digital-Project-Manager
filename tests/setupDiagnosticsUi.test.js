const fs = require('node:fs');
const path = require('node:path');

describe('setup diagnostics UI wiring', () => {
  test('joins first-run mode selection, runtime remediation, and desktop support evidence', () => {
    const appSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
    const setupSource = appSource.slice(
      appSource.indexOf('const setupDiagnosticsMarkup'),
      appSource.indexOf('const viewLoaders')
    );

    expect(setupSource).toContain("fetchApi('/api/security/diagnostics')");
    expect(setupSource).toContain('window.sneupDesktop.createSupportBundle()');
    expect(setupSource).toContain('escapeHtml(check.summary)');
    expect(setupSource).toContain('Sneup does not collect credentials during setup.');
    expect(setupSource).not.toContain('type="password"');
  });

  test('exposes only the bounded support-bundle IPC method to the renderer', () => {
    const preload = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'preload.js'), 'utf8');
    const main = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'main.js'), 'utf8');

    expect(preload).toContain("ipcRenderer.invoke('sneup:create-support-bundle')");
    expect(main).toContain("ipcMain.handle('sneup:create-support-bundle'");
    expect(main).toContain("path.join(app.getPath('userData'), 'support')");
    expect(main).toContain('shell.showItemInFolder(filePath)');
  });

  test('keeps the shared setup drawer exposed as a labelled modal dialog', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

    expect(html).toContain('class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"');
  });
});
