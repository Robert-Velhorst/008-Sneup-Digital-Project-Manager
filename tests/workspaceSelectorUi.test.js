const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { createController } = require('../public/workspaceView');
const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function harness() {
  const dom = new JSDOM('<select id="workspace"></select>');
  const state = { activeWorkspaceId: 'a', sessionToken: 's', securityContext: { workspaceOverrideAllowed: true } };
  const els = { workspaceSelect: dom.window.document.getElementById('workspace') };
  const controller = createController({ document: dom.window.document, state, elements: els, escapeHtml: String,
    callbacks: {}, t: value => value, plural: (one, many, count) => count === 1 ? one : many });
  const requests = [];
  const fetchApi = jest.fn(url => {
    const request = deferred(); requests.push({ url, ...request }); return request.promise;
  });
  const code = section('function beginWorkspaceRead(', 'function adoptWorkspaceId(')
    + section('async function loadWorkspaceSelector(', 'async function loadFeatureFlags(');
  const load = new Function('state', 'els', 'workspaceViewController', 'fetchApi', `${code}; return loadWorkspaceSelector;`)(state, els, controller, fetchApi);
  return { dom, state, els, requests, fetchApi, load };
}
const catalog = { workspaces: [{ id: 'a', name: 'Workspace A' }, { id: 'b', name: 'Workspace B' }] };

test('selector reloads choices using only the catalog endpoint', async () => {
  const h = harness();
  const pending = h.load();
  expect(h.els.workspaceSelect.disabled).toBe(true);
  expect(h.requests.map(request => request.url)).toEqual(['/api/workspaces?limit=100']);
  h.requests[0].resolve(catalog);
  await pending;
  expect(h.els.workspaceSelect.disabled).toBe(false);
  expect(h.els.workspaceSelect.value).toBe('a');
  expect(h.els.workspaceSelect.options).toHaveLength(2);
  h.dom.window.close();
});

test.each(['workspace', 'session', 'epoch'])('a late selector failure cannot clear choices after %s changes', async change => {
  const h = harness();
  const old = h.load();
  if (change === 'workspace') h.state.activeWorkspaceId = 'b';
  if (change === 'session') h.state.sessionToken = 'new';
  if (change === 'epoch') h.state.workspaceEpoch = 1;
  const current = h.load();
  h.requests[1].resolve(catalog);
  await current;
  h.requests[0].reject(new Error('Old catalog error'));
  await old;
  expect(h.els.workspaceSelect.disabled).toBe(false);
  expect(h.els.workspaceSelect.options).toHaveLength(2);
  expect(h.els.workspaceSelect.title).toBe('');
  h.dom.window.close();
});

test('latest same-context selector read wins', async () => {
  const h = harness();
  const old = h.load();
  const current = h.load();
  h.requests[1].resolve(catalog);
  await current;
  h.requests[0].resolve({ workspaces: [] });
  await old;
  expect(h.els.workspaceSelect.disabled).toBe(false);
  expect(h.els.workspaceSelect.options).toHaveLength(2);
  h.dom.window.close();
});

test('catalog error is visible on a disabled selector and a refresh can retry', async () => {
  const h = harness();
  const failed = h.load();
  h.requests[0].reject(new Error('Catalog unavailable'));
  await failed;
  expect(h.els.workspaceSelect.disabled).toBe(true);
  expect(h.els.workspaceSelect.title).toBe('Catalog unavailable');
  expect(h.els.workspaceSelect.value).toBe('a');
  const retry = h.load();
  h.requests[1].resolve(catalog);
  await retry;
  expect(h.els.workspaceSelect.disabled).toBe(false);
  expect(h.els.workspaceSelect.title).toBe('');
  h.dom.window.close();
});

test('the current workspace remains selected when absent from the bounded catalog', async () => {
  const h = harness();
  h.state.activeWorkspaceId = 'outside-page';
  const pending = h.load();
  h.requests[0].resolve(catalog);
  await pending;
  expect(h.els.workspaceSelect.value).toBe('outside-page');
  expect(h.els.workspaceSelect.options).toHaveLength(3);
  expect(h.state.workspaces).toEqual(catalog.workspaces);
  h.dom.window.close();
});

test('locked sessions do not fetch an override catalog', async () => {
  const h = harness();
  h.state.securityContext.workspaceOverrideAllowed = false;
  await h.load();
  expect(h.fetchApi).not.toHaveBeenCalled();
  expect(h.els.workspaceSelect.disabled).toBe(true);
  expect(h.els.workspaceSelect.value).toBe('a');
  h.dom.window.close();
});

test.each(['reports', 'workspaces'])('refresh in %s uses only the necessary selector path', async view => {
  const state = { activeWorkspaceId: 'a', sessionToken: 's', loadedViews: new Set() };
  const loadView = jest.fn();
  const loadWorkspaceSelector = jest.fn();
  const bindings = { state, loadView, loadWorkspaceSelector, workspaceViewController: {},
    loadSecurityContext: async () => true, loadFeatureFlags: async () => {}, markDeferredViewCounts: jest.fn(),
    document: { querySelector: () => ({ dataset: { viewButton: view } }) } };
  const code = section('function beginWorkspaceRead(', 'function adoptWorkspaceId(')
    + section('async function loadAll(', 'async function loadWorkspaceSelector(');
  const loadAll = new Function(...Object.keys(bindings), `${code}; return loadAll;`)(...Object.values(bindings));
  await loadAll({ force: true });
  expect(loadView).toHaveBeenCalledWith(view, { force: true });
  expect(loadWorkspaceSelector).toHaveBeenCalledTimes(view === 'reports' ? 1 : 0);
});
