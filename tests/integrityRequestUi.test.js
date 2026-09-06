const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const loader = source.slice(source.indexOf('async function loadIntegrityReport('), source.indexOf('async function loadRetentionReport('));
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const harness = () => {
  const state = { activeWorkspaceId: 'a' };
  const els = { integrityScanButton: { disabled: false } };
  const requests = [];
  const fetchApi = jest.fn(() => { const request = deferred(); requests.push(request); return request.promise; });
  const render = jest.fn();
  const notice = jest.fn();
  const load = new Function('state', 'els', 'fetchApi', 'renderIntegrityReport', 'openNotice', `${loader}; return loadIntegrityReport;`)(state, els, fetchApi, render, notice);
  return { state, els, requests, load, render, notice };
};

test('new workspace scan supersedes an older response and its button state', async () => {
  const h = harness();
  const first = h.load();
  h.state.activeWorkspaceId = 'b';
  const second = h.load();
  expect(h.requests).toHaveLength(2);
  h.requests[0].resolve({ report: { workspaceId: 'a' } });
  await first;
  expect(h.state.integrityReport).toBeUndefined();
  expect(h.els.integrityScanButton.disabled).toBe(true);
  h.requests[1].resolve({ report: { workspaceId: 'b' } });
  await second;
  expect(h.state.integrityReport.workspaceId).toBe('b');
  expect(h.els.integrityScanButton.disabled).toBe(false);
  expect(h.render).toHaveBeenCalledTimes(1);
});

test('latest category wins and stale failures do not replace its result', async () => {
  const h = harness();
  const first = h.load({ category: 'invalid_active_approval', announce: true });
  const second = h.load({ category: 'pending_worker_response' });
  expect(h.requests).toHaveLength(2);
  h.requests[1].resolve({ report: { category: 'pending_worker_response' } });
  await second;
  h.requests[0].reject(new Error('Old scan failed'));
  await first;
  expect(h.state.integrityReport.category).toBe('pending_worker_response');
  expect(h.state.integrityError).toBe('');
  expect(h.notice).not.toHaveBeenCalled();
});

test('workspace switch without a new scan discards stale evidence', async () => {
  const h = harness();
  const first = h.load();
  h.state.activeWorkspaceId = 'b';
  h.requests[0].resolve({ report: { workspaceId: 'a' } });
  await first;
  expect(h.state.integrityReport).toBeUndefined();
});
