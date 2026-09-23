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
  const dom = new JSDOM('<!doctype html><section id="modal"><h2 id="modalTitle"></h2><div id="modalBody"></div></section>');
  const state = {
    activeWorkspaceId: 'workspace-a',
    sessionToken: 'session-a',
    workspaceEpoch: 1,
    workspaceReads: new Map(),
    modalEpoch: 0
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
  const renderGraphItemDetailModal = jest.fn();
  const renderEvidenceModal = jest.fn();
  const openNotice = jest.fn();
  const beginWorkspaceRead = new Function('state',
    `${section('function beginWorkspaceRead(', 'function captureWorkspaceContext(')}; return beginWorkspaceRead;`)(state);
  const code = section('async function openRecommendationEvidence(', 'function renderEvidenceModal(')
    + section('async function openGraphItemDetail(', 'async function queueGraphDecision(');
  const api = new Function('state', 'els', 'beginWorkspaceRead', 'fetchApi', 'renderGraphItemDetailModal',
    'renderEvidenceModal', 'openNotice', 't', `${code}; return { openRecommendationEvidence, openGraphItemDetail };`)(
    state, els, beginWorkspaceRead, fetchApi, renderGraphItemDetailModal, renderEvidenceModal, openNotice, value => value
  );
  return { dom, state, els, requests, fetchApi, renderGraphItemDetailModal, renderEvidenceModal, openNotice, ...api };
}

function startRead(h, kind, id) {
  return kind === 'graph' ? h.openGraphItemDetail(id) : h.openRecommendationEvidence(id);
}

function resultFor(kind, id) {
  return kind === 'graph' ? { detail: { id } } : { evidence: { recommendation: { id } } };
}

function renderedFor(h, kind) {
  return kind === 'graph' ? h.renderGraphItemDetailModal : h.renderEvidenceModal;
}

function changeOwner(h, owner) {
  if (owner === 'workspace') {
    h.state.activeWorkspaceId = 'workspace-b';
    h.state.workspaceEpoch += 1;
  } else if (owner === 'session') {
    h.state.sessionToken = 'session-b';
  } else {
    h.state.modalEpoch += 1;
    h.els.modalBody.innerHTML = '<div id="replacement-dialog">Current dialog</div>';
    h.els.modal.classList.add('open');
  }
}

const detailKinds = ['graph', 'evidence'];
const staleOwners = ['workspace', 'session', 'modal'];

test.each(detailKinds.flatMap(kind => staleOwners.map(owner => [kind, owner])))('%s detail success cannot render after its %s changes', async (kind, owner) => {
  const h = harness();
  const pending = startRead(h, kind, 'item-1');
  changeOwner(h, owner);
  h.requests[0].resolve(resultFor(kind, 'item-1'));
  await pending;

  expect(renderedFor(h, kind)).not.toHaveBeenCalled();
  expect(h.openNotice).not.toHaveBeenCalled();
  h.dom.window.close();
});

test.each(detailKinds.flatMap(kind => staleOwners.map(owner => [kind, owner])))('%s detail failure cannot replace a dialog after its %s changes', async (kind, owner) => {
  const h = harness();
  const pending = startRead(h, kind, 'item-1');
  changeOwner(h, owner);
  h.requests[0].reject(new Error('Old detail request failed'));
  await pending;

  expect(renderedFor(h, kind)).not.toHaveBeenCalled();
  expect(h.openNotice).not.toHaveBeenCalled();
  h.dom.window.close();
});

test.each(detailKinds)('%s detail keeps only the newest overlapping request', async kind => {
  const h = harness();
  const first = startRead(h, kind, 'item-1');
  const second = startRead(h, kind, 'item-2');
  h.requests[1].resolve(resultFor(kind, 'item-2'));
  await second;
  h.requests[0].resolve(resultFor(kind, 'item-1'));
  await first;

  expect(renderedFor(h, kind)).toHaveBeenCalledTimes(1);
  expect(renderedFor(h, kind)).toHaveBeenCalledWith(kind === 'graph'
    ? { id: 'item-2' }
    : { recommendation: { id: 'item-2' } });
  h.dom.window.close();
});

test.each(detailKinds)('%s detail encodes its item identifier in the request path', async kind => {
  const h = harness();
  const pending = startRead(h, kind, 'item/with space?');

  expect(h.requests[0].url).toBe(kind === 'graph'
    ? '/api/work-signals/graph/items/item%2Fwith%20space%3F'
    : '/api/recommendations/item%2Fwith%20space%3F/evidence');
  h.requests[0].resolve(resultFor(kind, 'item-1'));
  await pending;
  h.dom.window.close();
});
