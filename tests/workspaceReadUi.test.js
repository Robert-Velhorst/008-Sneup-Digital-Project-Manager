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
const harness = () => {
  const state = { activeWorkspaceId: 'a', sessionToken: 'session-a', loadedViews: new Set(), policyHistoryFilters: {} };
  const requests = [];
  const fetchApi = jest.fn(url => { const pending = deferred(); requests.push({ url, ...pending }); return pending.promise; });
  const render = jest.fn();
  const notice = jest.fn();
  const els = { retentionScanButton: {}, integrityScanButton: {}, workspaceList: {} };
  const bindings = {
    state, fetchApi, els, renderWorkspaces: render, renderIntegrityReport: render,
    renderRetentionReport: render, openNotice: notice, loadWorkspaceView: async () => ({}),
    workspaceViewController: {}, escapeHtml: String, localStorage: { setItem: jest.fn() },
    cancelReportDownloads: jest.fn()
  };
  const code = [
    source.includes('function beginWorkspaceRead(') ? section('function beginWorkspaceRead(', 'async function loadSecurityContext(') : '',
    section('async function loadSecurityContext(', 'async function loadMissionControl('),
    section('async function loadFeatureFlags(', 'function isFeatureEnabled('),
    section('async function loadWorkspaceAdmin(', 'async function loadOperationsLedger(')
  ].join('\n');
  const api = new Function(...Object.keys(bindings), `${code}; return { loadWorkspaceAdmin, loadRetentionReport, loadPolicyHistory, loadSecurityContext, loadFeatureFlags };`)(...Object.values(bindings));
  return { state, requests, render, notice, els, storage: bindings.localStorage, ...api };
};
const current = (id = 'a', auth = {}) => ({ workspace: { id }, auth });

test.each(['workspace', 'session', 'epoch'])('discard current-workspace response after %s changes', async field => {
  const h = harness();
  const pending = h.loadWorkspaceAdmin();
  if (field === 'workspace') h.state.activeWorkspaceId = 'b';
  if (field === 'session') h.state.sessionToken = 'session-b';
  if (field === 'epoch') h.state.workspaceEpoch = 1;
  h.requests[0].resolve(current());
  await pending;
  expect(h.requests).toHaveLength(1);
  expect(h.state.currentWorkspace).toBeUndefined();
  expect(h.render).not.toHaveBeenCalled();
});

test('older workspace refresh cannot overwrite a newer completed demo refresh', async () => {
  const h = harness();
  const first = h.loadWorkspaceAdmin();
  const second = h.loadWorkspaceAdmin();
  h.requests[1].resolve({ workspace: { id: 'a', name: 'new' }, auth: { demoMode: true } });
  await second;
  h.requests[0].reject(new Error('old failure'));
  await first;
  expect(h.state.currentWorkspace.name).toBe('new');
  expect(h.state.policyRuleError).toBe('');
  expect(h.render).toHaveBeenCalledTimes(1);
});

test('workspace transition during scans stops subsequent policy and membership reads', async () => {
  const h = harness();
  const pending = h.loadWorkspaceAdmin();
  h.requests[0].resolve(current());
  await flush();
  expect(h.requests).toHaveLength(3);
  h.state.activeWorkspaceId = 'b';
  for (const request of h.requests.slice(1)) request.resolve({ report: {} });
  await pending;
  expect(h.requests).toHaveLength(3);
  expect(h.state.retentionReport).toBeUndefined();
  expect(h.state.policyRules).toBeUndefined();
  expect(h.render).not.toHaveBeenCalled();
});

test('server-owned workspace is adopted before any dependent scoped reads', async () => {
  const h = harness();
  const pending = h.loadWorkspaceAdmin();
  h.requests[0].resolve(current('b'));
  await flush();
  expect(h.state.activeWorkspaceId).toBe('b');
  // Finish whatever dependent reads the loader starts, without external services.
  let handled = 1;
  for (let round = 0; round < 8; round++) {
    for (const request of h.requests.slice(handled)) request.resolve({ report: {}, flags: [], policies: [], history: [] });
    handled = h.requests.length;
    await flush();
  }
  await pending;
  expect(h.state.currentWorkspace.id).toBe('b');
});

test.each(['loadRetentionReport', 'loadPolicyHistory', 'loadSecurityContext', 'loadFeatureFlags'])('%s ignores a late failure after session change', async method => {
  const h = harness();
  const pending = h[method]({ announce: true });
  h.state.sessionToken = 'session-b';
  h.requests[0].reject(new Error('old session failure'));
  await pending;
  expect(h.state.retentionError).toBeUndefined();
  expect(h.state.policyHistoryError).toBeUndefined();
  expect(h.state.securityContext).toBeUndefined();
  expect(h.state.featureFlagError).toBeUndefined();
  expect(h.notice).not.toHaveBeenCalled();
  expect(h.render).not.toHaveBeenCalled();
});

test('latest retention scan owns its pending button and result', async () => {
  const h = harness();
  const first = h.loadRetentionReport();
  const second = h.loadRetentionReport();
  h.requests[0].resolve({ report: { version: 'old' } });
  await first;
  expect(h.els.retentionScanButton.disabled).toBe(true);
  h.requests[1].resolve({ report: { version: 'new' } });
  await second;
  expect(h.els.retentionScanButton.disabled).toBe(false);
  expect(h.state.retentionReport.version).toBe('new');
  expect(h.render).toHaveBeenCalledTimes(1);
});

test.each(['policy', 'catalog', 'membership'])('workspace change during %s phase prevents late administration updates', async phase => {
  const h = harness();
  const pending = h.loadWorkspaceAdmin();
  h.requests[0].resolve(current('a', { workspaceOverrideAllowed: true }));
  await flush();
  h.requests[1].resolve({ report: {} });
  h.requests[2].resolve({ report: {} });
  await flush();
  if (phase !== 'policy') {
    h.requests[3].resolve({ policies: [] });
    h.requests[4].resolve({ history: [] });
    await flush();
  }
  if (phase === 'membership') {
    h.requests[5].resolve({ workspaces: [{ id: 'a' }] });
    await flush();
  }
  const count = h.requests.length;
  h.state.activeWorkspaceId = 'b';
  for (const request of h.requests.slice(phase === 'policy' ? 3 : phase === 'catalog' ? 5 : 6)) {
    request.resolve({ policies: [{ id: 'old' }], history: [{ id: 'old' }], workspaces: [{ id: 'old' }], users: [{ id: 'old' }], invitations: [{ id: 'old' }] });
  }
  await pending;
  expect(h.requests).toHaveLength(count);
  expect(h.state.activeWorkspaceId).toBe('b');
  expect(h.state.workspaceUsers).toBeUndefined();
  expect(h.render).not.toHaveBeenCalled();
});

test('view loading does not reuse or mark an old workspace request complete', async () => {
  const state = { activeWorkspaceId: 'a', sessionToken: 's', viewLoads: new Map(), loadedViews: new Set() };
  const requests = [];
  const viewLoaders = { workspaces: jest.fn(() => { const request = deferred(); requests.push(request); return request.promise; }) };
  const code = section('async function loadView(', 'async function loadAll(');
  const loadView = new Function('state', 'viewLoaders', `${code}; return loadView;`)(state, viewLoaders);
  const first = loadView('workspaces');
  await flush();
  state.activeWorkspaceId = 'b';
  const second = loadView('workspaces');
  await flush();
  expect(requests).toHaveLength(2);
  requests[0].resolve();
  await first;
  expect(state.loadedViews.has('workspaces')).toBe(false);
  expect(state.viewLoads.has('workspaces')).toBe(true);
  requests[1].resolve();
  await second;
  expect(state.loadedViews.has('workspaces')).toBe(true);
  expect(state.viewLoads.size).toBe(0);
});

test('filtered policy history supersedes the administration refresh history', async () => {
  const h = harness();
  const admin = h.loadWorkspaceAdmin();
  h.requests[0].resolve(current());
  await flush();
  h.requests[1].resolve({ report: {} });
  h.requests[2].resolve({ report: {} });
  await flush();
  const filtered = h.loadPolicyHistory();
  h.requests[5].resolve({ history: [{ id: 'filtered' }] });
  await filtered;
  h.requests[3].resolve({ policies: [] });
  h.requests[4].resolve({ history: [{ id: 'old' }] });
  await admin;
  expect(h.state.policyHistory).toEqual([{ id: 'filtered' }]);
});

test('canonical adoption clears old permissions and obtains fresh security context despite storage failure', async () => {
  const h = harness();
  h.state.securityContext = { workspaceId: 'a', roles: ['owner'] };
  h.state.workspaceUsers = [{ id: 'old-user' }];
  h.state.policyHistory = [{ id: 'old-history' }];
  h.storage.setItem.mockImplementation(() => { throw new Error('Storage denied'); });
  const pending = h.loadWorkspaceAdmin();
  h.requests[0].resolve(current('b'));
  await flush();
  expect(h.state.securityContext).toBeNull();
  expect(h.state.workspaceUsers).toEqual([]);
  expect(h.state.policyHistory).toEqual([]);
  expect(h.render).toHaveBeenCalledTimes(1);
  expect(h.requests[1].url).toBe('/api/security/context');
  h.requests[1].resolve({ context: { workspaceId: 'b', roles: ['viewer'] } });
  await flush();
  let handled = 2;
  for (let round = 0; round < 8; round++) {
    for (const request of h.requests.slice(handled)) request.resolve({ report: {}, flags: [], policies: [], history: [] });
    handled = h.requests.length;
    await flush();
  }
  await pending;
  expect(h.state.securityContext).toEqual({ workspaceId: 'b', roles: ['viewer'] });
  expect(h.render).toHaveBeenCalledTimes(2);
});

test('catalog failure cannot erase independently refreshed history', async () => {
  const h = harness();
  const pending = h.loadWorkspaceAdmin();
  h.requests[0].resolve(current('a', { workspaceOverrideAllowed: true }));
  await flush();
  h.requests[1].resolve({ report: {} });
  h.requests[2].resolve({ report: {} });
  await flush();
  h.requests[3].resolve({ policies: [] });
  h.requests[4].resolve({ history: [] });
  await flush();
  const filtered = h.loadPolicyHistory();
  h.requests[6].resolve({ history: [{ id: 'filtered' }] });
  await filtered;
  h.requests[5].reject(new Error('Catalog unavailable'));
  await pending;
  expect(h.state.policyHistory).toEqual([{ id: 'filtered' }]);
  expect(h.state.policyHistoryError).toBe('');
});

test('same-context repeated navigation still shares one view read', async () => {
  const state = { activeWorkspaceId: 'a', sessionToken: 's', viewLoads: new Map(), loadedViews: new Set() };
  const pending = deferred();
  const viewLoaders = { workspaces: jest.fn(() => pending.promise) };
  const loadView = new Function('state', 'viewLoaders', `${section('async function loadView(', 'async function loadAll(')}; return loadView;`)(state, viewLoaders);
  const first = loadView('workspaces');
  const second = loadView('workspaces', { force: true });
  await flush();
  expect(viewLoaders.workspaces).toHaveBeenCalledTimes(1);
  pending.resolve();
  await Promise.all([first, second]);
  expect(state.viewLoads.size).toBe(0);
});

test.each(['security', 'flags'])('refresh stops when its %s stage belongs to a superseded context', async stage => {
  const state = { activeWorkspaceId: 'a', sessionToken: 's', loadedViews: new Set() };
  const security = deferred();
  const flags = deferred();
  const loadFeatureFlags = jest.fn(() => flags.promise);
  const loadView = jest.fn();
  const bindings = {
    state, loadFeatureFlags, loadView, loadSecurityContext: () => security.promise,
    markDeferredViewCounts: jest.fn(), document: { querySelector: () => ({ dataset: { viewButton: 'workspaces' } }) }
  };
  const code = section('function beginWorkspaceRead(', 'function adoptWorkspaceId(')
    + section('async function loadAll(', 'async function loadFeatureFlags(');
  const loadAll = new Function(...Object.keys(bindings), `${code}; return loadAll;`)(...Object.values(bindings));
  const pending = loadAll({ force: true });
  security.resolve(stage !== 'security');
  await flush();
  state.activeWorkspaceId = 'b';
  flags.resolve();
  await pending;
  expect(loadFeatureFlags).toHaveBeenCalledTimes(stage === 'security' ? 0 : 1);
  expect(loadView).not.toHaveBeenCalled();
});
