const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { createRuntime } = require('../public/i18n');
const {
  createController,
  SELECTION_FORMS,
  SYNC_COUNT_FIELDS,
  DYNAMIC_OPERATOR_MESSAGES,
  NL_MESSAGES
} = require('../public/connectorView');

const rootDir = path.join(__dirname, '..');
const moduleSource = fs.readFileSync(path.join(rootDir, 'public', 'connectorView.js'), 'utf8');
const appSource = fs.readFileSync(path.join(rootDir, 'public', 'app.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const makeCallbacks = () => ({
  loadConnectors: jest.fn(),
  startConnection: jest.fn(),
  syncConnectorAccount: jest.fn(),
  openNotice: jest.fn(),
  closeModal: jest.fn(),
  saveConnectorSelection: jest.fn().mockResolvedValue({}),
  openWorkerResponseBindingsModal: jest.fn(),
  openJiraSiteModal: jest.fn(),
  openConfluenceSiteModal: jest.fn(),
  openAsanaWorkspaceModal: jest.fn(),
  openBasecampAccountModal: jest.fn(),
  openResourceGuruAccountModal: jest.fn(),
  openFigmaTeamModal: jest.fn(),
  openSharePointSiteModal: jest.fn(),
  openMuralWorkspaceModal: jest.fn(),
  openXeroTenantModal: jest.fn(),
  openProcoreCompanyModal: jest.fn()
});

const createHarness = (locale = 'nl') => {
  const dom = new JSDOM(`<!doctype html><html><body>
    <span id="connectorCount"></span>
    <span id="connectedCount"></span>
    <div id="categoryList"></div>
    <h2 id="connectorHeading"></h2>
    <div id="connectorSafety"></div>
    <div id="connectorGrid"></div>
    <div id="connectorPagination"></div>
    <div id="modal"><h2 id="modalTitle"></h2><div id="modalBody"></div></div>
    <button data-connector-readiness="all"></button>
    <button data-connector-readiness="ready"></button>
    <button data-connector-readiness="catalog_only"></button>
  </body></html>`, { url: 'http://127.0.0.1:3211/' });
  const i18n = createRuntime({ root: null, language: locale, storage: null });
  i18n.registerMessages('nl', NL_MESSAGES);
  const callbacks = makeCallbacks();
  const state = {
    connectors: [{
      id: 'trello',
      name: 'Trello',
      categoryName: 'Project and work management',
      description: 'Provider description must remain verbatim.',
      auth: { configured: true, type: 'api_key', displayType: 'API key' },
      safety: { scopeRisk: 'review', summary: 'Provider safety evidence must remain verbatim.' },
      syncReadiness: { accountConnectionAvailable: true, availabilityStatus: 'ready' },
      sync: ['boards', 'cards', 'members']
    }],
    categories: [{ id: 'work_management', name: 'Project and work management', count: 1 }],
    accounts: [{
      id: 'account-1',
      connectorId: 'trello',
      status: 'active',
      consent: { acknowledgedAt: '2026-08-09T08:30:00.000Z', acknowledgedBy: 'Robert' },
      credentialRotation: { required: true, status: 'overdue', daysUntilDue: -2 },
      syncFreshness: { status: 'stale', hoursUntilDue: -3 },
      metadata: {
        fields: {},
        lastWorkSignalSync: {
          source: 'trello_api',
          finishedAt: '2026-08-09T09:00:00.000Z',
          signalCount: 5,
          boards: 2
        }
      }
    }],
    connectorSafety: { providerWritesBlocked: 117, scopeReviews: 12, providerScopeReviews: 3 },
    connectorSyncReadiness: { ready: 113 },
    connectorCatalogTotal: 117,
    connectorTotal: 2,
    category: 'work_management',
    connectorReadiness: 'ready'
  };
  const elements = Object.fromEntries([
    'connectorCount', 'connectedCount', 'categoryList', 'connectorHeading',
    'connectorSafety', 'connectorGrid', 'connectorPagination', 'modal', 'modalTitle', 'modalBody'
  ].map(id => [id, dom.window.document.getElementById(id)]));
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
    isFeatureEnabled: () => true
  });
  return { dom, state, elements, callbacks, controller, i18n };
};

describe('demand-loaded connector view', () => {
  test('renders complete Dutch operator chrome while preserving provider evidence', () => {
    const harness = createHarness('nl');
    harness.controller.render();

    expect(harness.elements.connectedCount.textContent).toBe('1 gekoppeld account');
    expect(harness.elements.connectorHeading.textContent).toBe('Project- en werkbeheer - gereed om te koppelen');
    expect(harness.elements.connectorSafety.textContent).toContain('117 tools hebben schrijfblokkering');
    expect(harness.elements.connectorSafety.textContent).toContain('113 providersynchronisatie-adapters zijn actief');
    expect(harness.elements.connectorGrid.textContent).toContain('Provider description must remain verbatim.');
    expect(harness.elements.connectorGrid.textContent).toContain('Provider safety evidence must remain verbatim.');
    expect(harness.elements.connectorGrid.textContent).toContain('bereikcontrole');
    expect(harness.elements.connectorGrid.textContent).toContain('Het vervangen van de inloggegevens is 2 dagen te laat.');
    expect(harness.elements.connectorGrid.textContent).toContain('De synchronisatiecontrole is 3 uur te laat.');
    expect(harness.elements.connectorGrid.textContent).toContain('5 signalen');
    expect(harness.elements.connectorGrid.textContent).toContain('2 borden');
    expect(harness.elements.connectorGrid.textContent).toContain('Nu synchroniseren');
    expect(harness.elements.connectorGrid.textContent).toContain('Inloggegevens vervangen');
    expect(harness.elements.connectorPagination.textContent).toContain('1 van 2 tools worden getoond');
    expect(harness.elements.connectorPagination.textContent).toContain('Meer tonen');
    harness.dom.window.close();
  });

  test('binds category, pagination, synchronization, and credential actions once per render', () => {
    const harness = createHarness('en');
    harness.controller.render();

    harness.dom.window.document.querySelector('[data-category="all"]').click();
    expect(harness.state.category).toBe('all');
    expect(harness.callbacks.loadConnectors).toHaveBeenCalledWith();

    harness.dom.window.document.querySelector('[data-load-more-connectors]').click();
    expect(harness.callbacks.loadConnectors).toHaveBeenCalledWith({ append: true });

    harness.dom.window.document.querySelector('[data-connector-sync]').click();
    expect(harness.callbacks.syncConnectorAccount).toHaveBeenCalledWith('account-1');

    harness.dom.window.document.querySelector('[data-rotate-credential]').click();
    expect(harness.callbacks.startConnection).toHaveBeenCalledWith('trello', { account: harness.state.accounts[0] });
    harness.dom.window.close();
  });

  test('renders and submits every provider selection form through the guarded API callback', async () => {
    const cases = [
      { kind: 'figma_team', field: 'figmaTeamId', value: '12345', metadata: { figmaTeamId: '12345' } },
      { kind: 'sharepoint_site', field: 'sharePointSiteId', value: 'site-1', metadata: {}, data: { sites: [{ sharePointSiteId: 'site-1', name: 'Site <one>' }] } },
      { kind: 'mural_workspace', field: 'muralWorkspaceId', value: 'mural-1', metadata: {}, data: { workspaces: [{ muralWorkspaceId: 'mural-1', name: 'Studio' }] } },
      { kind: 'xero_tenant', field: 'xeroTenantId', value: 'tenant-1', metadata: {}, data: { tenants: [{ xeroTenantId: 'tenant-1', name: 'Organisation' }] } },
      { kind: 'procore_company', field: 'procoreCompanyId', value: '9876', metadata: { procoreCompanyId: '9876' } },
      { kind: 'resource_guru_account', field: 'resourceGuruAccountId', value: 'rg-1', metadata: {}, data: { accounts: [{ resourceGuruAccountId: 'rg-1', name: 'Resources' }] } },
      { kind: 'basecamp_account', field: 'basecampAccountId', value: 'base-1', metadata: {}, data: { accounts: [{ basecampAccountId: 'base-1', name: 'Basecamp' }] } },
      { kind: 'asana_workspace', field: 'workspaceGid', value: 'asana-1', metadata: {}, data: { workspaces: [{ workspaceGid: 'asana-1', name: 'Asana', organization: true }] } },
      { kind: 'confluence_site', field: 'cloudId', value: 'conf-1', metadata: {}, data: { sites: [{ cloudId: 'conf-1', name: 'Docs', url: 'https://docs.example.test/?q=<unsafe>' }] } },
      { kind: 'jira_site', field: 'cloudId', value: 'jira-1', metadata: {}, data: { sites: [{ cloudId: 'jira-1', name: 'Delivery', url: 'https://jira.example.test/' }] } }
    ];

    for (const testCase of cases) {
      const harness = createHarness('nl');
      const account = { id: 'account-1', metadata: { fields: testCase.metadata } };
      expect(harness.controller.openSelectionForm({ kind: testCase.kind, accountId: account.id, account, data: testCase.data })).toBe(true);
      const config = SELECTION_FORMS[testCase.kind];
      const form = harness.dom.window.document.getElementById('connectorSelectionForm');
      expect(harness.elements.modalTitle.textContent).toBe(harness.i18n.t(config.title));
      expect(form.elements[testCase.field].value).toBe(testCase.value);
      expect(form.textContent).toContain(harness.i18n.t(config.notice));
      if (config.input?.placeholder) expect(form.elements[testCase.field].placeholder).toBe(harness.i18n.t(config.input.placeholder));
      expect(form.hasAttribute('data-draft-key')).toBe(false);
      expect(form.querySelector('img')).toBeNull();

      form.dispatchEvent(new harness.dom.window.Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new harness.dom.window.Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
      expect(harness.callbacks.saveConnectorSelection).toHaveBeenCalledTimes(1);
      expect(harness.callbacks.saveConnectorSelection).toHaveBeenCalledWith(testCase.kind, account.id, { [testCase.field]: testCase.value });
      expect(harness.callbacks.closeModal).toHaveBeenCalledTimes(1);
      expect(harness.callbacks.loadConnectors).toHaveBeenCalledTimes(1);
      harness.dom.window.close();
    }
  });

  test('keeps empty provider choices localized and non-operational', () => {
    const harness = createHarness('nl');
    const account = { id: 'account-1', metadata: { fields: {} } };
    expect(harness.controller.openSelectionForm({ kind: 'sharepoint_site', accountId: account.id, account, data: { sites: [] } })).toBe(false);
    expect(harness.callbacks.openNotice).toHaveBeenCalledWith(
      'SharePoint-siteselectie',
      'Er zijn geen gevolgde SharePoint-sites beschikbaar voor dit account. Volg een site in SharePoint en koppel daarna opnieuw met het goedgekeurde alleen-lezen bereik.'
    );
    expect(harness.elements.modal.classList.contains('open')).toBe(false);
    harness.dom.window.close();
  });

  test('delegates cancellation and restores a failed selection form for an explicit retry', async () => {
    const harness = createHarness('nl');
    const account = { id: 'account-1', metadata: { fields: { figmaTeamId: '12345' } } };
    harness.controller.openSelectionForm({ kind: 'figma_team', accountId: account.id, account });
    harness.dom.window.document.getElementById('cancelConnectorSelection').click();
    expect(harness.callbacks.closeModal).toHaveBeenCalledTimes(1);

    harness.callbacks.closeModal.mockClear();
    harness.callbacks.saveConnectorSelection.mockRejectedValueOnce(new Error('Provider validation failed'));
    harness.controller.openSelectionForm({ kind: 'figma_team', accountId: account.id, account });
    const form = harness.dom.window.document.getElementById('connectorSelectionForm');
    const submitButton = form.querySelector('button[type="submit"]');
    form.dispatchEvent(new harness.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();
    expect(submitButton.disabled).toBe(false);
    expect(submitButton.textContent).toBe('Dit team gebruiken');
    expect(harness.callbacks.openNotice).toHaveBeenCalledWith('Figma-teamconfiguratie', 'Provider validation failed');

    form.dispatchEvent(new harness.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();
    expect(harness.callbacks.saveConnectorSelection).toHaveBeenCalledTimes(2);
    expect(harness.callbacks.closeModal).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.loadConnectors).toHaveBeenCalledTimes(1);
    harness.dom.window.close();
  });

  test('keeps every connector operator message in the Dutch catalog', () => {
    const runtime = createRuntime({ root: null, language: 'nl', storage: null });
    runtime.registerMessages('nl', NL_MESSAGES);
    const messages = new Set(DYNAMIC_OPERATOR_MESSAGES);
    for (const match of moduleSource.matchAll(/\b(?:t|et)\(\s*'([^']+)'/g)) messages.add(match[1]);
    for (const match of moduleSource.matchAll(/\b(?:plural|ep)\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
      messages.add(match[1]);
      messages.add(match[2]);
    }
    SYNC_COUNT_FIELDS.flat().filter(value => typeof value === 'string' && value.includes('{count}')).forEach(message => messages.add(message));
    Object.values(SELECTION_FORMS).forEach((config) => {
      ['title', 'fieldLabel', 'placeholder', 'notice', 'submitLabel', 'successTitle', 'successMessage', 'errorTitle', 'emptyMessage']
        .map(field => config[field])
        .filter(Boolean)
        .forEach(message => messages.add(message));
      if (config.input?.placeholder) messages.add(config.input.placeholder);
    });
    [
      'The connector view loaded without its runtime. Try again.',
      'The connector view could not be loaded. Check the connection and try again.'
    ].forEach(message => messages.add(message));
    expect([...messages].filter(message => !runtime.hasTranslation(message))).toEqual([]);
  });

  test('loads the module only on demand with the current asset fingerprint and retry reset', () => {
    expect(htmlSource).not.toContain('/connectorView.js');
    expect(appSource).toContain("loadBrowserModule('/connectorView.js', 'SneupConnectorView', {");
    expect(appSource).toContain("if (appAssetVersion) url.searchParams.set('v', appAssetVersion)");
    expect(appSource).toContain('connectorViewPromise = null');
    expect(appSource).toContain('const [data, connectorView] = await Promise.all([');
    expect(appSource).not.toContain('function renderConnectors()');
  });

  test('keeps selection markup capability-poor and API authority in the application controller', () => {
    expect(moduleSource).toContain('function openSelectionForm(');
    expect(moduleSource).toContain('callbacks.saveConnectorSelection(kind, accountId, body)');
    expect(moduleSource).not.toMatch(/\bfetchApi\b|\bfetch\s*\(|sessionStorage|localStorage|document\.cookie/);
    expect(appSource).toContain('const CONNECTOR_SELECTION_API = Object.freeze({');
    expect(appSource).toContain('return fetchApi(`/api/connectors/accounts/${encodeURIComponent(accountId)}/${config.saveSuffix}`');
    expect(appSource).not.toContain('<form id="figmaTeamForm">');
    expect(appSource).not.toContain('<form id="jiraSiteForm">');
    expect(appSource).not.toContain('Sneup verifies project-read access before saving this company.');
  });
});
