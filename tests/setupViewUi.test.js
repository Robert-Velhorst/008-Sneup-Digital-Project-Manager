const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { createRuntime } = require('../public/i18n');
const { createController, NL_MESSAGES } = require('../public/setupView');

const rootDir = path.join(__dirname, '..');
const moduleSource = fs.readFileSync(path.join(rootDir, 'public', 'setupView.js'), 'utf8');
const appSource = fs.readFileSync(path.join(rootDir, 'public', 'app.js'), 'utf8');

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const diagnostic = (overrides = {}) => ({
  mode: 'demo',
  status: 'ok',
  ready: true,
  liveCriticalPathReady: false,
  counts: { ok: 1, warning: 0, error: 0 },
  checks: [{ status: 'ok', title: 'Database posture', summary: 'Read-only demo is available.', action: '' }],
  ...overrides
});

function createHarness({ locale = 'en', desktop = false, loadDiagnostics } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body>
    <div id="modal"></div>
    <h2 id="modalTitle"></h2>
    <div id="modalBody"></div>
  </body></html>`, { url: 'http://127.0.0.1:3211/' });
  const i18n = createRuntime({ root: null, language: locale, storage: null });
  i18n.registerMessages('nl', NL_MESSAGES);
  const callbacks = {
    loadDiagnostics: loadDiagnostics || jest.fn().mockResolvedValue({ diagnostics: diagnostic() }),
    createSupportBundle: jest.fn().mockResolvedValue({ fileName: 'sneup-support.json' }),
    saveStartupMode: jest.fn().mockResolvedValue({ saved: true, restarting: true }),
    openConnectors: jest.fn(),
    registerModalCleanup: jest.fn()
  };
  const state = { setupMode: '', runtimeMode: 'demo', runtimeDiagnostics: null };
  const elements = {
    modal: dom.window.document.getElementById('modal'),
    modalTitle: dom.window.document.getElementById('modalTitle'),
    modalBody: dom.window.document.getElementById('modalBody')
  };
  const controller = createController({
    document: dom.window.document,
    state,
    elements,
    t: i18n.t,
    plural: i18n.plural,
    escapeHtml,
    desktop: { canSaveStartupMode: desktop, canCreateSupportBundle: desktop },
    callbacks,
    AbortController: dom.window.AbortController
  });
  return { dom, i18n, state, elements, callbacks, controller };
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

describe('demand-loaded setup view', () => {
  test('renders a bounded Dutch browser-runtime setup and delegates connector navigation', async () => {
    const harness = createHarness({ locale: 'nl' });
    harness.callbacks.loadDiagnostics.mockResolvedValue({
      diagnostics: diagnostic({
        checks: [{ status: 'ok', title: '<img src=x onerror=alert(1)>', summary: 'Runtime evidence remains verbatim.', action: '' }]
      })
    });

    expect(harness.controller.open()).toBe(true);
    await settle();

    const { document } = harness.dom.window;
    expect(harness.elements.modalTitle.textContent).toBe('Demowerkruimte');
    expect(document.getElementById('setupDiagnosticsTitle').textContent).toBe('Huidige runtimecontrole');
    expect(document.getElementById('setupDiagnosticsResult').textContent).toContain('De alleen-lezen demowerkruimte is gereed.');
    expect(document.getElementById('setupDiagnosticsResult').textContent).toContain('<img src=x onerror=alert(1)>');
    expect(document.querySelector('#setupDiagnosticsResult img')).toBeNull();
    expect(harness.callbacks.loadDiagnostics).toHaveBeenCalledTimes(1);
    document.getElementById('openRuntimeConnectors').click();
    expect(harness.callbacks.openConnectors).toHaveBeenCalledTimes(1);
    harness.dom.window.close();
  });

  test('keeps a failed desktop save retryable and records a saved preference separately from restart', async () => {
    const harness = createHarness({ locale: 'nl', desktop: true });
    harness.callbacks.saveStartupMode
      .mockRejectedValueOnce(new Error('Settings file unavailable'))
      .mockResolvedValueOnce({ saved: true, restarting: false });
    harness.controller.open();
    await settle();

    const { document, Event } = harness.dom.window;
    document.querySelector('[data-setup-mode="live"]').click();
    const button = document.getElementById('completeSetup');
    button.dispatchEvent(new Event('click', { bubbles: true }));
    button.dispatchEvent(new Event('click', { bubbles: true }));
    await settle();

    expect(harness.callbacks.saveStartupMode).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.saveStartupMode).toHaveBeenCalledWith('live');
    expect(document.getElementById('setupSaveResult').textContent).toContain('Settings file unavailable');
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Opslaan en opnieuw starten');
    expect(harness.state.setupMode).toBe('');

    button.click();
    await settle();
    expect(harness.callbacks.saveStartupMode).toHaveBeenCalledTimes(2);
    expect(document.getElementById('setupSaveResult').textContent).toBe('De opstartvoorkeur is opgeslagen. Sluit en open Sneup opnieuw om deze toe te passen.');
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('Opgeslagen');
    harness.dom.window.close();
  });

  test('submits a restarting preference once while the desktop commit is pending', async () => {
    const harness = createHarness({ desktop: true });
    let resolveSave;
    harness.callbacks.saveStartupMode.mockImplementation(() => new Promise(resolve => { resolveSave = resolve; }));
    harness.controller.open();
    await settle();

    const { document, Event } = harness.dom.window;
    const button = document.getElementById('completeSetup');
    button.dispatchEvent(new Event('click', { bubbles: true }));
    button.dispatchEvent(new Event('click', { bubbles: true }));
    expect(harness.callbacks.saveStartupMode).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);

    resolveSave({ saved: true, restarting: true });
    await settle();
    expect(button.textContent).toBe('Restarting...');
    expect(button.disabled).toBe(true);
    harness.dom.window.close();
  });

  test('ignores stale diagnostic responses after a newer refresh starts', async () => {
    const pending = [];
    const harness = createHarness({
      loadDiagnostics: jest.fn(() => new Promise(resolve => pending.push(resolve)))
    });
    harness.controller.open();
    const { document } = harness.dom.window;
    harness.controller.loadDiagnostics();

    pending[1]({ diagnostics: diagnostic({ checks: [{ status: 'ok', title: 'Current check', summary: 'Newest evidence', action: '' }] }) });
    await settle();
    pending[0]({ diagnostics: diagnostic({ checks: [{ status: 'ok', title: 'Stale check', summary: 'Old evidence', action: '' }] }) });
    await settle();

    expect(document.getElementById('setupDiagnosticsResult').textContent).toContain('Newest evidence');
    expect(document.getElementById('setupDiagnosticsResult').textContent).not.toContain('Old evidence');
    harness.dom.window.close();
  });

  test('owns complete Dutch setup copy while app retains API, storage, and desktop authority', () => {
    const runtime = createRuntime({ root: null, language: 'nl', storage: null });
    runtime.registerMessages('nl', NL_MESSAGES);
    const messages = new Set();
    for (const match of moduleSource.matchAll(/\b(?:t|et)\(\s*(['"])(.*?)\1/g)) messages.add(match[2]);
    for (const match of moduleSource.matchAll(/plural\(\s*(['"])(.*?)\1\s*,\s*(['"])(.*?)\3/g)) {
      messages.add(match[2]);
      messages.add(match[4]);
    }

    expect([...messages].filter(message => !runtime.hasTranslation(message))).toEqual([]);
    expect(moduleSource).not.toMatch(/fetchApi|localStorage|sessionStorage|document\.cookie|sneupDesktop|SESSION_TOKEN/);
    expect(appSource).toContain("loadBrowserModule('/setupView.js', 'SneupSetupView'");
    expect(appSource).toContain("loadDiagnostics: options => fetchApi('/api/security/diagnostics', options)");
    expect(appSource).toContain('await window.sneupDesktop.saveStartupMode(selectedMode)');
    expect(appSource).toContain('localStorage.setItem(FIRST_RUN_SETUP_KEY, selectedMode)');
  });
});
