const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { createRuntime } = require('../public/i18n');
const {
  createController,
  DYNAMIC_OPERATOR_MESSAGES,
  NL_MESSAGES: WORK_SIGNALS_NL_MESSAGES
} = require('../public/workSignalsView');

const rootDir = path.join(__dirname, '..');
const moduleSource = fs.readFileSync(path.join(rootDir, 'public', 'workSignalsView.js'), 'utf8');
const appSource = fs.readFileSync(path.join(rootDir, 'public', 'app.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const safeExternalUrl = (value) => {
  if (!value) return '';
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : '';
  } catch (error) {
    return '';
  }
};

const elementIds = [
  'workSignalCount', 'workSignalMetrics', 'workSignalList', 'workSignalContractCount',
  'workSignalContracts', 'connectorModal', 'modalTitle', 'modalBody'
];

const makeCallbacks = () => ({
  openGraphItemDetail: jest.fn(),
  queueGraphDecision: jest.fn(),
  reviewGraphDependency: jest.fn(),
  closeModal: jest.fn()
});

function createHarness(locale = 'nl') {
  const dom = new JSDOM(`<!doctype html><html><body>
    <button data-signal-filter="all"></button>
    <button data-signal-filter="blocked"></button>
    ${elementIds.map(id => `<div id="${id}"></div>`).join('')}
  </body></html>`, { url: 'http://127.0.0.1:3211/' });
  const i18n = createRuntime({ root: null, language: locale, storage: null });
  i18n.registerMessages('nl', WORK_SIGNALS_NL_MESSAGES);
  const callbacks = makeCallbacks();
  const state = {
    signalFilter: 'all',
    accounts: [{ id: 'account-1', connectorId: 'github' }],
    workSignalError: '',
    workSignals: [{
      id: 'signal-1',
      title: 'Exact provider title remains unchanged',
      description: 'Exact provider description remains unchanged.',
      provider: 'GitHub Enterprise Evidence',
      sourceType: 'issue',
      status: 'in_progress',
      priority: 'critical',
      owners: ['Provider Owner Evidence'],
      dueAt: '2026-08-10T10:00:00.000Z',
      url: 'https://github.com/example/repository/issues/1',
      evidenceRefs: [{ label: 'Exact evidence label' }]
    }],
    workSignalContracts: [{
      connectorId: 'github',
      connectorName: 'GitHub Contract Evidence',
      category: 'development',
      authType: 'oauth2',
      outputModel: 'WorkSignal',
      adapterStatus: 'implemented',
      syncTargets: ['issues', 'pull requests'],
      safeWritePolicy: 'Provider writes remain blocked evidence.'
    }],
    workGraph: {
      counts: { items: 2, actors: 1, containers: 1, dependencies: 1, events: 2 },
      reviewMetrics: { pendingReview: 1, reviewCoverage: 50, confirmed: 1 },
      providerReviewQuality: [{ provider: 'GitHub Enterprise Evidence', stale: 1, pendingReview: 1 }]
    },
    workGraphCandidates: [{
      workItemId: 'item-1',
      title: 'Exact decision evidence title',
      description: 'Exact decision evidence description.',
      sourceProvider: 'GitHub Enterprise Evidence',
      findingType: 'missing_next_action',
      ownerType: 'robert',
      riskLevel: 'high',
      graphScore: 87,
      dependencySummary: { dependencyCount: 1, blockingCount: 1, blockedByCount: 0, relatedCount: 0 }
    }]
  };
  const elements = Object.fromEntries(elementIds.map(id => [id, dom.window.document.getElementById(id)]));
  elements.modal = elements.connectorModal;
  const controller = createController({
    document: dom.window.document,
    window: dom.window,
    state,
    elements,
    callbacks,
    t: i18n.t,
    plural: i18n.plural,
    escapeHtml,
    formatDate: i18n.formatDate,
    severityClass: value => ['critical', 'high'].includes(value) ? value : 'review',
    signalClass: signal => signal.priority === 'critical' || signal.status === 'blocked' ? 'critical' : 'review',
    isFeatureEnabled: key => key === 'work_graph_decisions',
    safeExternalUrl
  });
  return { dom, i18n, state, elements, callbacks, controller };
}

describe('demand-loaded Work Signals view', () => {
  test('renders Dutch operator chrome while preserving provider and evidence text', () => {
    const harness = createHarness('nl');
    harness.controller.render();
    const text = harness.dom.window.document.body.textContent;

    expect(text).toContain('Signalen');
    expect(text).toContain('Graafafhankelijkheden');
    expect(text).toContain('Graafbeslissingen: 1 Robert, 0 VA, 0 team.');
    expect(text).toContain('kritiek');
    expect(text).toContain('bezig');
    expect(text).toContain('Graaf bekijken');
    expect(text).toContain('Ja/Nee in wachtrij plaatsen');
    expect(text).toContain('Exact provider title remains unchanged');
    expect(text).toContain('Exact provider description remains unchanged.');
    expect(text).toContain('GitHub Enterprise Evidence');
    expect(text).toContain('Provider Owner Evidence');
    expect(text).toContain('Exact evidence label');
    expect(text).toContain('Provider writes remain blocked evidence.');
    expect(harness.elements.workSignalList.querySelector('a').href).toBe('https://github.com/example/repository/issues/1');
    harness.dom.window.close();
  });

  test('delegates graph detail, queue, and dependency review actions to guarded callbacks', () => {
    const harness = createHarness('en');
    harness.controller.render();
    const { document } = harness.dom.window;

    document.querySelector('[data-graph-detail="item-1"]').click();
    document.querySelector('[data-graph-queue="item-1"]').click();
    expect(harness.callbacks.openGraphItemDetail).toHaveBeenCalledWith('item-1');
    expect(harness.callbacks.queueGraphDecision).toHaveBeenCalledWith('item-1');

    harness.elements.modalBody.innerHTML = harness.controller.renderGraphDependency({
      id: 'dependency-1',
      dependencyType: 'blocks',
      direction: 'outbound',
      freshnessStatus: 'stale',
      peerItem: { id: 'item-2', title: 'Dependency Evidence', sourceProvider: 'GitHub' }
    });
    harness.controller.bindGraphActions();
    document.querySelector('[data-graph-dependency-action="confirm"]').click();
    document.querySelector('[data-graph-dependency-action="refresh"]').click();
    document.querySelector('[data-graph-dependency-action="dismiss"]').click();
    expect(harness.callbacks.reviewGraphDependency.mock.calls).toEqual([
      ['dependency-1', 'confirm'],
      ['dependency-1', 'refresh'],
      ['dependency-1', 'dismiss']
    ]);
    harness.dom.window.close();
  });

  test('rejects non-HTTPS and credential-bearing graph links without hiding evidence labels', () => {
    const harness = createHarness('en');
    harness.state.workSignals = [
      { title: 'HTTP evidence', provider: 'Provider A', status: 'open', url: 'http://example.com/item' },
      { title: 'Credential evidence', provider: 'Provider B', status: 'open', url: 'https://user:secret@example.com/item' },
      { title: 'Script evidence', provider: 'Provider C', status: 'open', url: 'javascript:alert(1)' }
    ];
    harness.state.workGraphCandidates = [];
    harness.controller.render();
    expect(harness.elements.workSignalList.querySelectorAll('a')).toHaveLength(0);
    expect(harness.elements.workSignalList.textContent).toContain('HTTP evidence');
    expect(harness.elements.workSignalList.textContent).toContain('Credential evidence');
    expect(harness.elements.workSignalList.textContent).toContain('Script evidence');

    harness.elements.modalBody.innerHTML = harness.controller.renderGraphDependency({
      dependencyType: 'blocks',
      freshnessStatus: 'fresh',
      sourceItem: { title: 'Source evidence', url: 'http://example.com/source' },
      targetItem: { title: 'Target evidence', url: 'https://user:secret@example.com/target' }
    });
    expect(harness.elements.modalBody.querySelectorAll('a')).toHaveLength(0);
    expect(harness.elements.modalBody.textContent).toContain('Target evidence');
    harness.dom.window.close();
  });

  test('filters graph-ledger rows locally without API or provider work', () => {
    const harness = createHarness('nl');
    harness.elements.modalBody.innerHTML = harness.controller.renderGraphLedgerContext({
      counts: { items: 2, dependencies: 1, decisions: 1, recommendations: 0 },
      filters: { providers: ['GitHub', 'Linear'], dependencyTypes: ['blocks'], directions: ['outbound'] },
      items: [
        { id: 'github-item', title: 'GitHub item', sourceProvider: 'GitHub' },
        { id: 'linear-item', title: 'Linear item', sourceProvider: 'Linear' }
      ],
      dependencies: [{ id: 'dependency-1', dependencyType: 'blocks', direction: 'outbound', sourceProvider: 'GitHub', peerItem: { title: 'Dependency item', sourceProvider: 'GitHub' } }]
    });
    harness.controller.bindGraphLedgerFilters();
    const githubFilter = harness.dom.window.document.querySelector('[data-graph-filter="provider"][data-graph-filter-value="GitHub"]');
    githubFilter.click();
    const rows = [...harness.elements.modalBody.querySelectorAll('[data-graph-ledger-row]')];
    expect(rows.filter(row => !row.classList.contains('graph-hidden'))).toHaveLength(2);
    expect(harness.elements.modalBody.querySelector('[data-graph-filter-count]').textContent).toBe('2 zichtbare graafrijen');
    expect(harness.callbacks.openGraphItemDetail).not.toHaveBeenCalled();
    harness.dom.window.close();
  });

  test('renders graph detail without changing exact source evidence', () => {
    const harness = createHarness('nl');
    harness.controller.renderGraphItemDetailModal({
      item: {
        id: 'item-1', title: 'Exact graph detail title', description: 'Exact graph detail evidence.',
        sourceProvider: 'Provider Identity Evidence', externalId: 'PROVIDER-123', status: 'blocked', priority: 'critical',
        dueAt: '2026-08-10T10:00:00.000Z', url: 'https://example.com/item/123'
      },
      dependencySummary: { dependencyCount: 1, blockingCount: 1 },
      events: [{ summary: 'Exact graph event evidence', eventType: 'status_changed', sourceProvider: 'Provider Identity Evidence' }]
    });
    const text = harness.elements.modalBody.textContent;
    expect(harness.elements.modalTitle.textContent).toBe('Werkgraafdetail');
    expect(text).toContain('Exact graph detail title');
    expect(text).toContain('Exact graph detail evidence.');
    expect(text).toContain('Provider Identity Evidence');
    expect(text).toContain('PROVIDER-123');
    expect(text).toContain('Exact graph event evidence');
    harness.dom.window.document.getElementById('graphDetailQueue').click();
    expect(harness.callbacks.queueGraphDecision).toHaveBeenCalledWith('item-1');
    harness.dom.window.close();
  });

  test('keeps every Work Signals operator message in the lazy Dutch catalog', () => {
    const runtime = createRuntime({ root: null, language: 'nl', storage: null });
    runtime.registerMessages('nl', WORK_SIGNALS_NL_MESSAGES);
    const messages = new Set(DYNAMIC_OPERATOR_MESSAGES);
    for (const match of moduleSource.matchAll(/\b(?:t|et)\(\s*'([^']+)'/g)) messages.add(match[1]);
    for (const match of moduleSource.matchAll(/\b(?:plural|ep)\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
      messages.add(match[1]);
      messages.add(match[2]);
    }
    expect([...messages].filter(message => !runtime.hasTranslation(message))).toEqual([]);
  });

  test('loads only on Work Signals entry, shares the fingerprint, and retries module failures', () => {
    expect(htmlSource).not.toContain('/workSignalsView.js');
    expect(appSource).toContain("loadBrowserModule('/workSignalsView.js', 'SneupWorkSignalsView'");
    expect(appSource).toContain("i18n.registerMessages('nl', module.NL_MESSAGES)");
    expect(appSource).toContain('workSignalsViewPromise = null');
    expect(appSource).toContain('workSignalsViewController = null');
    expect(appSource).toContain('const renderer = loadWorkSignalsView();');
    expect(appSource).toContain('graphDecisionData, controller] = await Promise.all([');
    expect(appSource).toContain('await Promise.all([loadApprovalView(), loadWorkSignalsView()]);');
    expect(appSource).toContain('function openGraphItemDetail(');
    expect(appSource).toContain('function queueGraphDecision(');
    expect(appSource).toContain('function reviewGraphDependency(');
    expect(appSource).not.toContain('function renderGraphReviewQuality(');
    expect(appSource).not.toContain('function renderGraphDependency(');
    expect(moduleSource).not.toContain('fetchApi(');
    expect(moduleSource).not.toContain('SESSION_TOKEN');
    expect(moduleSource).not.toContain('localStorage');
  });
});
