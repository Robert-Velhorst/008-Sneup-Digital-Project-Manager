const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { createRuntime } = require('../public/i18n');
const {
  createController,
  NL_MESSAGES,
  DYNAMIC_OPERATOR_MESSAGES
} = require('../public/enhancementView');

const rootDir = path.join(__dirname, '..');
const moduleSource = fs.readFileSync(path.join(rootDir, 'public', 'enhancementView.js'), 'utf8');
const appSource = fs.readFileSync(path.join(rootDir, 'public', 'app.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

function createHarness(locale = 'nl') {
  const dom = new JSDOM(`<!doctype html><html lang="${locale}"><body>
    <button class="active" data-enhancement-priority="all">All</button>
    <button data-enhancement-priority="P0">P0</button>
    <button data-enhancement-priority="P1">P1</button>
    <button class="active" data-enhancement-status="all">All</button>
    <button data-enhancement-status="ready">Ready</button>
    <button data-enhancement-status="blocked">Blocked</button>
    <select id="enhancementAreaFilter"><option value="all">All areas</option></select>
    <div id="enhancementCount"></div>
    <div id="enhancementMetrics"></div>
    <div id="enhancementStatusSummary"></div>
    <div id="enhancementsList"></div>
  </body></html>`, { url: 'http://127.0.0.1:3212/' });
  const i18n = createRuntime({ root: null, language: locale, storage: null });
  i18n.registerMessages('nl', NL_MESSAGES);
  const ids = ['enhancementAreaFilter', 'enhancementCount', 'enhancementMetrics', 'enhancementStatusSummary', 'enhancementsList'];
  const elements = Object.fromEntries(ids.map(id => [id, dom.window.document.getElementById(id)]));
  const state = {
    enhancements: [{
      id: 'ENH-900',
      title: 'Exact operator title <script>alert(1)</script>',
      area: 'Security',
      priority: 'P0',
      status: 'ready',
      effort: 'medium',
      impact: 'Exact impact evidence remains unchanged.',
      nextStep: 'Exact next-step evidence remains unchanged.'
    }],
    enhancementSummary: {
      byPriority: { P0: 1 },
      byStatus: { ready: 1 },
      byArea: { Security: 1, Resource: 2 }
    },
    recommendationEvaluation: { score: 100, passed: 5, total: 5 },
    recommendationEvaluationLoaded: true,
    enhancementPriority: 'all',
    enhancementArea: 'Security',
    enhancementStatus: 'all'
  };
  const callbacks = { loadEnhancements: jest.fn() };
  const controller = createController({
    document: dom.window.document,
    state,
    elements,
    callbacks,
    t: i18n.t,
    escapeHtml
  });
  return { dom, i18n, state, elements, callbacks, controller };
}

describe('demand-loaded enhancement view', () => {
  test('renders Dutch operator chrome while preserving and escaping exact evidence', () => {
    const harness = createHarness('nl');
    harness.controller.render();
    const text = harness.dom.window.document.body.textContent;

    expect(text).toContain('Totaal');
    expect(text).toContain('AI-evaluatie');
    expect(text).toContain('5/5 geslaagd');
    expect(text).toContain('Volgende stap');
    expect(text).toContain('Exact operator title <script>alert(1)</script>');
    expect(text).toContain('Exact impact evidence remains unchanged.');
    expect(text).toContain('Exact next-step evidence remains unchanged.');
    expect(harness.elements.enhancementsList.querySelector('script')).toBeNull();
    expect(harness.elements.enhancementAreaFilter.value).toBe('Security');
    expect([...harness.elements.enhancementAreaFilter.options].map(option => option.textContent)).toEqual([
      'Alle gebieden', 'Resource', 'Security'
    ]);

    harness.state.enhancementSummary.byArea = { Security: 1 };
    harness.controller.render();
    expect([...harness.elements.enhancementAreaFilter.options].map(option => option.textContent)).toEqual([
      'Alle gebieden', 'Resource', 'Security'
    ]);
    harness.dom.window.close();
  });

  test('delegates latest filter selections without granting API authority to the renderer', () => {
    const harness = createHarness('en');
    harness.controller.render();
    const { document } = harness.dom.window;

    document.querySelector('[data-enhancement-priority="all"]').click();
    expect(harness.callbacks.loadEnhancements).not.toHaveBeenCalled();

    document.querySelector('[data-enhancement-priority="P0"]').click();
    expect(harness.state.enhancementPriority).toBe('P0');
    expect(document.querySelector('[data-enhancement-priority="P0"]').classList.contains('active')).toBe(true);

    document.querySelector('[data-enhancement-status="blocked"]').click();
    expect(harness.state.enhancementStatus).toBe('blocked');
    expect(document.querySelector('[data-enhancement-status="blocked"]').classList.contains('active')).toBe(true);

    harness.elements.enhancementAreaFilter.value = 'Resource';
    harness.elements.enhancementAreaFilter.dispatchEvent(new harness.dom.window.Event('change'));
    expect(harness.state.enhancementArea).toBe('Resource');
    expect(harness.callbacks.loadEnhancements).toHaveBeenCalledTimes(3);
    harness.dom.window.close();
  });

  test('renders a bounded localized error and empty state', () => {
    const harness = createHarness('nl');
    harness.state.enhancements = [];
    harness.state.enhancementSummary = {};
    harness.state.recommendationEvaluation = null;
    harness.controller.render('Exact bounded failure');

    expect(harness.elements.enhancementsList.textContent).toContain('Exact bounded failure');
    expect(harness.elements.enhancementsList.textContent).toContain('Niets vereist aandacht.');
    expect(harness.elements.enhancementStatusSummary.textContent).toBe('0 totaal');
    harness.dom.window.close();
  });

  test('keeps every dynamic operator message in the deferred Dutch catalog', () => {
    const runtime = createRuntime({ root: null, language: 'nl', storage: null });
    runtime.registerMessages('nl', NL_MESSAGES);
    const messages = new Set(DYNAMIC_OPERATOR_MESSAGES);
    for (const match of moduleSource.matchAll(/\bt\(\s*'([^']+)'/g)) messages.add(match[1]);
    expect([...messages].filter(message => !runtime.hasTranslation(message))).toEqual([]);
  });

  test('loads on demand with retry, shared fingerprinting, and latest-request-wins reads', () => {
    expect(htmlSource).not.toContain('/enhancementView.js');
    expect(appSource).toContain("loadBrowserModule('/enhancementView.js', 'SneupEnhancementView'");
    expect(appSource).toContain('enhancementViewPromise = null');
    expect(appSource).toContain('const renderer = loadEnhancementView();');
    expect(appSource).toContain("fetchApi('/api/enhancements/evaluations/recommendations', { signal: request.signal })");
    expect(appSource).toContain('state.recommendationEvaluationLoaded');
    expect(appSource).toContain('if (enhancementRequest) enhancementRequest.abort();');
    expect(appSource).toContain('if (enhancementRequest !== request) return;');
    expect(appSource).not.toContain('function renderEnhancements(');
    expect(appSource).not.toContain('function renderEnhancementFilters(');
    expect(moduleSource).not.toMatch(/fetchApi|fetch\(|Authorization|SESSION_TOKEN|localStorage|sessionStorage|document\.cookie/);
  });
});
