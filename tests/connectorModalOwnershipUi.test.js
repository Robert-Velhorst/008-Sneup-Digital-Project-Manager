const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const section = (start, end) => {
  const startAt = source.indexOf(start);
  const endAt = source.indexOf(end, startAt);
  if (startAt < 0 || endAt < 0) throw new Error(`Could not locate ${start} through ${end}`);
  return source.slice(startAt, endAt);
};
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function harness() {
  const dom = new JSDOM('<!doctype html><section id="modal"><h2 id="modalTitle"></h2><div id="modalBody"><div id="prior-content"></div></div></section>');
  const state = {
    activeWorkspaceId: 'workspace-a',
    sessionToken: 'session-a',
    workspaceEpoch: 1,
    workspaceReads: new Map(),
    modalEpoch: 0,
    accounts: [{ id: 'account-1', provider: 'sharepoint' }]
  };
  const els = {
    modal: dom.window.document.getElementById('modal'),
    modalTitle: dom.window.document.getElementById('modalTitle'),
    modalBody: dom.window.document.getElementById('modalBody')
  };
  const requests = [];
  const fetchApi = jest.fn(url => {
    const request = deferred();
    requests.push({ url, ...request });
    return request.promise;
  });
  const connectorView = {
    openWorkerResponseBindings: jest.fn(),
    openSelectionForm: jest.fn()
  };
  const loadConnectorView = jest.fn().mockResolvedValue(connectorView);
  const loadWorkerResponseOptions = jest.fn(accountId => fetchApi(`/api/connectors/accounts/${accountId}/options`));
  const openNotice = jest.fn();
  const beginWorkspaceRead = new Function('state',
    `${section('function beginWorkspaceRead(', 'function captureWorkspaceContext(')}; return beginWorkspaceRead;`)(state);
  const code = section('async function openWorkerResponseBindingsModal(', 'function loadWorkerResponseOptions(')
    + section('const CONNECTOR_SELECTION_API = Object.freeze(', 'function saveConnectorSelection(');
  const api = new Function('state', 'els', 'beginWorkspaceRead', 'fetchApi', 'loadWorkerResponseOptions',
    'loadConnectorView', 'openNotice', 't', `${code}; return { openWorkerResponseBindingsModal, openConnectorSelection };`)(
    state, els, beginWorkspaceRead, fetchApi, loadWorkerResponseOptions, loadConnectorView, openNotice, value => value
  );
  return { dom, state, els, requests, connectorView, openNotice, ...api };
}

const flows = ['worker-response', 'connector-selection'];
const staleOwners = ['workspace', 'session', 'modal', 'account'];

function startRead(h, flow) {
  return flow === 'worker-response'
    ? h.openWorkerResponseBindingsModal('account-1')
    : h.openConnectorSelection('sharepoint_site', 'account-1');
}

function changeOwner(h, owner) {
  if (owner === 'workspace') {
    h.state.activeWorkspaceId = 'workspace-b';
    h.state.workspaceEpoch += 1;
  } else if (owner === 'session') {
    h.state.sessionToken = 'session-b';
  } else if (owner === 'modal') {
    h.state.modalEpoch += 1;
    h.els.modalBody.innerHTML = '<div id="replacement-dialog">Current dialog</div>';
    h.els.modal.classList.add('open');
  } else {
    h.state.accounts = [];
  }
}

function openCall(h, flow) {
  return flow === 'worker-response'
    ? h.connectorView.openWorkerResponseBindings
    : h.connectorView.openSelectionForm;
}

test.each(flows.flatMap(flow => staleOwners.map(owner => [flow, owner])))('%s modal success is discarded after its %s changes', async (flow, owner) => {
  const h = harness();
  const pending = startRead(h, flow);
  changeOwner(h, owner);
  h.requests.forEach(request => request.resolve({}));
  await pending;

  expect(openCall(h, flow)).not.toHaveBeenCalled();
  expect(h.openNotice).not.toHaveBeenCalled();
  h.dom.window.close();
});

test.each(flows.flatMap(flow => staleOwners.map(owner => [flow, owner])))('%s modal failure is discarded after its %s changes', async (flow, owner) => {
  const h = harness();
  const pending = startRead(h, flow);
  changeOwner(h, owner);
  h.requests.forEach(request => request.reject(new Error('Old account request failed')));
  await pending;

  expect(openCall(h, flow)).not.toHaveBeenCalled();
  expect(h.openNotice).not.toHaveBeenCalled();
  h.dom.window.close();
});

test.each(flows)('%s modal keeps only the newest overlapping request', async flow => {
  const h = harness();
  const first = startRead(h, flow);
  const firstRequestCount = h.requests.length;
  const second = startRead(h, flow);
  h.requests.slice(firstRequestCount).forEach(request => request.resolve({ request: 'new' }));
  await second;
  h.requests.slice(0, firstRequestCount).forEach(request => request.resolve({ request: 'old' }));
  await first;

  expect(openCall(h, flow)).toHaveBeenCalledTimes(1);
  h.dom.window.close();
});

test.each(flows)('%s modal uses the refreshed account record', async flow => {
  const h = harness();
  const pending = startRead(h, flow);
  h.state.accounts = [{ id: 'account-1', provider: 'sharepoint', name: 'Current account' }];
  h.requests.forEach(request => request.resolve({}));
  await pending;

  expect(openCall(h, flow)).toHaveBeenCalledWith(expect.objectContaining({ account: h.state.accounts[0] }));
  h.dom.window.close();
});
