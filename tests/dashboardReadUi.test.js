const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const loaders = [
  ['loadMissionControl', 'snapshot', 'loadOperationsBrief'],
  ['loadOperationsBrief', 'operationsBrief', 'loadJobDashboard'],
  ['loadJobDashboard', 'jobDashboard', 'loadNotificationDeliveryHealth'],
  ['loadNotificationDeliveryHealth', 'notificationJobHealth', 'loadConnectors'],
  ['loadConnectors', 'connectors', 'loadWorkSignals'],
  ['loadWorkSignals', 'workSignals', 'loadWorkspaceAdmin'],
  ['loadReports', 'reports', 'loadForecast'],
  ['loadForecast', 'forecast', 'renderForecast'],
  ['loadEnhancements', 'enhancements', 'apiOptions'],
  ['loadOperationsLedger', 'ledger', 'renderOverview']
];
const payload = tag => ({
  snapshot: { tag }, brief: { tag }, dashboard: { tag }, health: [tag],
  connectors: [tag], accounts: [tag], signals: [tag], reports: [tag], forecast: { tag },
  enhancements: [tag], report: { tag }, ledger: { decisions: [tag] }
});
const harness = (name, field, end, delayedRenderer = false) => {
  const state = { activeWorkspaceId: 'a', sessionToken: 's', category: 'all', connectorReadiness: 'all',
    enhancementPriority: 'all', enhancementArea: 'all', enhancementStatus: 'all', [field]: { tag: 'before' } };
  const requests = [];
  const render = jest.fn();
  const renderer = deferred();
  if (!delayedRenderer) renderer.resolve({ render });
  const fetchApi = jest.fn(() => { const request = deferred(); requests.push(request); return request.promise; });
  const els = Object.fromEntries(['brief', 'operationsBriefCount', 'operationsBriefItems', 'jobHealthCount', 'jobHealthList',
    'connectorGrid', 'workSignalList', 'reportList', 'portfolioForecast', 'enhancementsList'].map(key => [key, {}]));
  const bindings = { state, els, fetchApi, renderOverview: render, renderOperationsBrief: render, renderJobDashboard: render,
    renderOperationsLedger: render, updateApprovalCount: jest.fn(), escapeHtml: String, renderConfidence: () => '',
    loadReportView: () => renderer.promise, loadForecastView: () => renderer.promise,
    loadConnectorView: () => renderer.promise, loadWorkSignalsView: () => renderer.promise,
    loadEnhancementView: () => renderer.promise, isFeatureEnabled: () => true, CONNECTOR_PAGE_SIZE: 24 };
  const start = source.indexOf(`async function ${name}(`);
  const endIndex = source.indexOf(`function ${end}(`, start);
  const code = source.slice(start, source.lastIndexOf('\n', endIndex));
  const helper = section('function beginWorkspaceRead(', 'function adoptWorkspaceId(');
  const load = new Function(...Object.keys(bindings), `let enhancementRequest = null; ${helper}\n${code}\nreturn ${name};`)(...Object.values(bindings));
  return { state, requests, render, renderer, load, els };
};

describe('operations ledger availability', () => {
  const complete = () => ({ decisions: [], recommendations: [], actions: [], auditEvents: [], followUps: [],
    workerResponses: [], accountability: { summary: { members: 0, overdueFollowUps: 0, membersNeedingAttention: 0 }, members: [] }, outcomes: [], findings: [], healthSnapshots: [],
    reconciliationHealth: { summary: { unresolved: 0, requiresOperator: 0, critical: 0, warning: 0 }, items: [], thresholds: { warningHours: 4, criticalHours: 24 } }, notificationPolicies: [], notificationDeliveries: [], timeline: [], errors: [] });
  test('a healthy empty response is complete, not unavailable', async () => {
    const h = harness('loadOperationsLedger', 'ledger', 'renderOverview');
    const pending = h.load({ throwOnError: true });
    h.requests[0].resolve({ ledger: complete() });
    await expect(pending).resolves.toBe(true);
    expect(h.state.ledger.unavailableSections).toEqual([]);
  });
  test.each(['actions', 'recommendations', 'reconciliationHealth', 'accountability', 'workerResponses'])(
    'partial %s errors retain section identity and other evidence, invalidate cache, and reject refresh', async sectionName => {
      const h = harness('loadOperationsLedger', 'ledger', 'renderOverview');
      h.state.loadedViews = new Set(['approvals']);
      const ledger = complete();
      ledger.decisions = [{ _id: 'live-decision' }];
      ledger.errors = [{ section: sectionName, message: '<untrusted error>' }];
      const pending = h.load({ throwOnError: true });
      h.requests[0].resolve({ ledger });
      await expect(pending).rejects.toThrow('Operations ledger is incomplete');
      expect(h.state.ledger.unavailableSections).toEqual([sectionName]);
      expect(h.state.ledger.decisions).toEqual([{ _id: 'live-decision' }]);
      expect(h.state.loadedViews.has('approvals')).toBe(false);
      expect(h.render).toHaveBeenCalledTimes(1);
    });
  test.each(['missing', 'invalid', 'null'])('%s data is not accepted as a healthy empty section', async kind => {
    const h = harness('loadOperationsLedger', 'ledger', 'renderOverview');
    const ledger = complete();
    if (kind === 'missing') delete ledger.actions;
    if (kind === 'invalid') ledger.actions = {};
    if (kind === 'null') ledger.actions = null;
    const pending = h.load();
    h.requests[0].resolve({ ledger });
    await expect(pending).resolves.toBe(false);
    expect(h.state.ledger.unavailableSections).toContain('actions');
    expect(h.state.ledger.actions).toEqual([]);
  });
  test('whole-read failure clears evidence, and a successful retry restores availability', async () => {
    const h = harness('loadOperationsLedger', 'ledger', 'renderOverview');
    const failed = h.load();
    h.requests[0].reject(new Error('Offline'));
    await expect(failed).resolves.toBe(false);
    expect(h.state.ledger.unavailableSections).toEqual(['*']);
    expect(h.state.ledger.errors).toEqual(['Offline']);
    const retry = h.load();
    h.requests[1].resolve({ ledger: complete() });
    await expect(retry).resolves.toBe(true);
    expect(h.state.ledger.unavailableSections).toEqual([]);
    expect(h.state.ledger.errors).toEqual([]);
  });
  test.each(['accountability', 'reconciliationHealth'])('malformed %s summaries and collections remain unavailable', async sectionName => {
    for (const value of [{}, { summary: {} }, { summary: { members: '0', unresolved: -1 } },
      { ...complete()[sectionName], [sectionName === 'accountability' ? 'members' : 'items']: null },
      ...(sectionName === 'reconciliationHealth' ? [
        { ...complete()[sectionName], thresholds: { warningHours: '4', criticalHours: 24 } },
        { ...complete()[sectionName], thresholds: { warningHours: 4, criticalHours: 0 } }
      ] : [])]) {
      const h = harness('loadOperationsLedger', 'ledger', 'renderOverview');
      const pending = h.load({ throwOnError: true });
      h.requests[0].resolve({ ledger: { ...complete(), [sectionName]: value } });
      await expect(pending).rejects.toThrow('Operations ledger is incomplete');
      expect(h.state.ledger.unavailableSections).toEqual([sectionName]);
      expect(h.state.ledger[sectionName]).toBeNull();
    }
  });
});

describe.each(loaders)('%s request ownership', (name, field, end) => {
  test.each(['workspace', 'session', 'generation'])('ignores late success after %s changes', async change => {
    const h = harness(name, field, end);
    const before = h.state[field];
    const pending = h.load();
    if (change === 'workspace') h.state.activeWorkspaceId = 'b';
    if (change === 'session') h.state.sessionToken = 'other';
    if (change === 'generation') h.state.workspaceEpoch = 1;
    h.requests.forEach(request => request.resolve(payload('late')));
    await pending;
    expect(h.state[field]).toBe(before);
    expect(h.render).not.toHaveBeenCalled();
  });

  test('ignores a late failure from the previous workspace', async () => {
    const h = harness(name, field, end);
    const before = h.state[field];
    const pending = h.load();
    h.state.activeWorkspaceId = 'b';
    h.requests.forEach(request => request.reject(new Error('previous workspace failure')));
    await pending;
    expect(h.state[field]).toBe(before);
    expect(h.render).not.toHaveBeenCalled();
    expect(Object.values(h.els).some(element => element.innerHTML)).toBe(false);
  });

  test('a newer same-workspace read wins over an older success', async () => {
    const h = harness(name, field, end);
    const first = h.load();
    const split = h.requests.length;
    const second = h.load();
    h.requests.slice(split).forEach(request => request.resolve(payload('newest')));
    await second;
    const newest = h.state[field];
    h.requests.slice(0, split).forEach(request => request.resolve(payload('oldest')));
    await first;
    expect(h.state[field]).toBe(newest);
    expect(JSON.stringify(newest)).toContain('newest');
    expect(h.render).toHaveBeenCalledTimes(1);
  });
});

test.each(loaders.filter(([name]) => ['loadReports', 'loadForecast', 'loadEnhancements', 'loadWorkSignals'].includes(name)))('%s ignores delayed error rendering after workspace change', async (name, field, end) => {
  const h = harness(name, field, end, true);
  const pending = h.load();
  h.requests.forEach(request => request.reject(new Error('Read failed')));
  await flush();
  h.state.activeWorkspaceId = 'b';
  h.renderer.resolve({ render: h.render });
  await pending;
  expect(h.render).not.toHaveBeenCalled();
});

test.each(loaders.filter(([name]) => ['loadReports', 'loadForecast', 'loadEnhancements', 'loadWorkSignals'].includes(name)))('%s suppresses a stale module failure instead of replacing the current UI', async (name, field, end) => {
  const h = harness(name, field, end, true);
  const pending = h.load();
  h.requests.forEach(request => request.reject(new Error('Read failed')));
  await flush();
  h.state.activeWorkspaceId = 'b';
  h.renderer.reject(new Error('Old module failed'));
  await expect(pending).resolves.toBeUndefined();
  expect(h.render).not.toHaveBeenCalled();
  expect(Object.values(h.els).some(element => element.innerHTML)).toBe(false);
});

test.each(['navigation', 'workspace'])('late approval navigation cannot steal focus after %s changes', async change => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<button data-view-button="approvals"></button><button data-view-button="reports"></button><h1 id="pageTitle"></h1><div id="approvalsView" class="view"><div id="decisionQueue"></div></div><div id="reportsView" class="view"></div>');
  const document = dom.window.document;
  const state = { activeWorkspaceId: 'a', sessionToken: 's' };
  const requests = [];
  const render = jest.fn();
  const target = document.getElementById('decisionQueue');
  target.scrollIntoView = jest.fn();
  target.focus = jest.fn();
  const code = section('function beginWorkspaceRead(', 'function adoptWorkspaceId(')
    + section('async function showView(', 'async function openDecisionQueue(');
  const showView = new Function('state', 'document', 't', 'loadView', 'renderOperationsLedger', `${code}; return showView;`)(
    state, document, value => value, () => { const request = deferred(); requests.push(request); return request.promise; }, render);
  const old = showView('approvals', { focusElementId: 'decisionQueue' });
  if (change === 'workspace') state.activeWorkspaceId = 'b';
  else {
    const current = showView('reports');
    requests[1].resolve();
    await current;
  }
  requests[0].resolve();
  await old;
  expect(render).not.toHaveBeenCalled();
  expect(target.focus).not.toHaveBeenCalled();
  expect(target.scrollIntoView).not.toHaveBeenCalled();
  dom.window.close();
});

test('current approvals render when a shared lazy module arrives after both workspaces finish reading', async () => {
  const state = { activeWorkspaceId: 'a', sessionToken: 's', loadedViews: new Set(), viewLoads: new Map() };
  const module = deferred();
  const rendered = [];
  let controllerReady = false;
  const noop = () => {};
  const bindings = { state, loadMissionControl: noop, loadOperationsBrief: noop, loadJobDashboard: noop,
    loadConnectors: noop, loadEnhancements: noop, loadWorkSignals: noop, loadForecast: noop,
    loadReports: noop, loadWorkspaceAdmin: noop, loadNotificationDeliveryHealth: noop,
    loadOperationsLedger: () => { state.ledger = state.activeWorkspaceId; },
    loadApprovalView: () => module.promise.then(() => { controllerReady = true; }),
    renderOperationsLedger: () => { if (controllerReady) rendered.push(state.ledger); }
  };
  const code = section('function beginWorkspaceRead(', 'function adoptWorkspaceId(')
    + section('const viewLoaders = {', 'const deferredViewCounts = {')
    + section('async function loadView(', 'async function loadAll(');
  const loadView = new Function(...Object.keys(bindings), `${code}; return loadView;`)(...Object.values(bindings));
  const old = loadView('approvals');
  await flush();
  state.activeWorkspaceId = 'b';
  const current = loadView('approvals');
  await flush();
  expect(state.ledger).toBe('b');
  expect(rendered).toEqual([]);
  module.resolve();
  await Promise.all([old, current]);
  expect(rendered).toEqual(['b']);
  expect(state.loadedViews.has('approvals')).toBe(true);
});

test('a delayed module cannot recache Approvals after a newer ledger failure', async () => {
  const state = { activeWorkspaceId: 'a', sessionToken: 's', loadedViews: new Set(), viewLoads: new Map(), ledger: { unavailableSections: [] } };
  const module = deferred();
  const noop = () => {};
  const loadOperationsLedger = jest.fn().mockResolvedValue(true);
  const bindings = { state, loadMissionControl: noop, loadOperationsBrief: noop, loadJobDashboard: noop,
    loadConnectors: noop, loadEnhancements: noop, loadWorkSignals: noop, loadForecast: noop,
    loadReports: noop, loadWorkspaceAdmin: noop, loadNotificationDeliveryHealth: noop,
    loadOperationsLedger, loadApprovalView: () => module.promise, renderOperationsLedger: noop };
  const code = section('function beginWorkspaceRead(', 'function adoptWorkspaceId(')
    + section('const viewLoaders = {', 'const deferredViewCounts = {')
    + section('async function loadView(', 'async function loadAll(');
  const loadView = new Function(...Object.keys(bindings), `${code}; return loadView;`)(...Object.values(bindings));
  const initial = loadView('approvals');
  await flush();
  state.ledger = { unavailableSections: ['*'] };
  state.loadedViews.delete('approvals');
  module.resolve();
  await initial;
  expect(state.loadedViews.has('approvals')).toBe(false);
  loadOperationsLedger.mockImplementation(async () => { state.ledger = { unavailableSections: [] }; return true; });
  await loadView('approvals');
  expect(loadOperationsLedger).toHaveBeenCalledTimes(2);
  expect(state.loadedViews.has('approvals')).toBe(true);
});
