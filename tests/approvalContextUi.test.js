const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const flush = async () => { for (let n = 0; n < 20; n++) await Promise.resolve(); };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function harness(actionType = 'comment') {
  const dom = new JSDOM('<div id="modal"><h2 id="modalTitle"></h2><div id="modalBody"></div></div>');
  const document = dom.window.document;
  const els = Object.fromEntries(['modal', 'modalTitle', 'modalBody'].map(id => [id, document.getElementById(id)]));
  const state = { activeWorkspaceId: 'a', sessionToken: 'same-session', workspaceEpoch: 0, workspaceReadRequests: new Map(), loadedViews: new Set(['approvals']),
    ledger: { recommendations: [{ _id: 'rec', __v: 7, boardId: 'board-a', actionType, actionPayload: { commentText: 'Original', cardTrelloId: 'card-a' } }] } };
  const requests = [];
  const bindings = { state, els, document, FormData: dom.window.FormData,
    cancelReportDownloads: jest.fn(), resetDashboardViews: jest.fn(), workspaceViewController: null,
    localStorage: { setItem: jest.fn(), removeItem: jest.fn() },
    fetchApi: jest.fn((url, options) => { const pending = deferred(); requests.push({ url, options, ...pending }); return pending.promise; }),
    loadOperationsLedger: jest.fn().mockResolvedValue(undefined), openNotice: jest.fn(),
    closeModal: jest.fn(new Function('state', 'els', `${section('function closeModal(', 'function inviteTokenFromUrl(')}; return closeModal;`)(state, els)),
    loadApprovalView: jest.fn().mockResolvedValue(), loadWorkSignalsView: jest.fn().mockResolvedValue(), renderOperatingLedgerModal: jest.fn(),
    t: value => value, et: value => value, escapeHtml: String,
    getId: value => typeof value === 'object' ? value?._id || value?.id : value
  };
  const code = section('function beginWorkspaceRead(', 'async function loadSecurityContext(')
    + section('async function runRecommendationAction(', 'async function runDecisionAction(')
    + section('async function editRecommendationPayload(', 'async function openRecommendationEvidence(')
    + section('async function openOperatingLedger(', 'function renderOperatingLedgerModal(');
  const api = new Function(...Object.keys(bindings), `${code}; return { runRecommendationAction, editRecommendationPayload, openOperatingLedger, adoptWorkspaceContext };`)(...Object.values(bindings));
  const submit = async form => {
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flush();
  };
  return { dom, state, els, requests, bindings, submit, ...api };
}

test('payload context from a previous workspace cannot open a review form', async () => {
  const h = harness('move_card');
  const opening = h.editRecommendationPayload('rec', 7);
  h.state.activeWorkspaceId = 'b';
  h.requests[0].resolve({ board: { lists: [{ trelloId: 'old-list', name: 'Old list' }] } });
  await opening;
  expect(h.els.modalBody.querySelector('form')).toBeNull();
  expect(h.bindings.openNotice).not.toHaveBeenCalled();
  h.dom.window.close();
});

test.each(['workspace', 'closed', 'replaced'])('a %s payload form cannot submit', async transition => {
  const h = harness();
  await h.editRecommendationPayload('rec', 7);
  const form = h.els.modalBody.querySelector('form');
  if (transition === 'workspace') h.state.activeWorkspaceId = 'b';
  if (transition === 'closed') h.els.modal.classList.remove('open');
  if (transition === 'replaced') h.els.modalBody.innerHTML = '<p>New modal</p>';
  await h.submit(form);
  expect(h.requests).toHaveLength(0);
  h.dom.window.close();
});

test('payload submit is single-flight and retains exact revision and target lock', async () => {
  const h = harness();
  await h.editRecommendationPayload('rec', 7);
  const form = h.els.modalBody.querySelector('form');
  form.elements.commentText.value = 'Reviewed text';
  await h.submit(form);
  await h.submit(form);
  expect(h.requests).toHaveLength(1);
  expect(JSON.parse(h.requests[0].options.body)).toEqual({ updatedBy: 'robert', expectedRevision: 7, actionPayload: { commentText: 'Reviewed text' } });
  h.requests[0].resolve({ recommendation: { status: 'pending' } });
  await flush();
  expect(h.bindings.openNotice).toHaveBeenCalledWith('Payload saved', expect.anything());
  h.dom.window.close();
});

test('a committed payload with failed refresh is still reported as saved', async () => {
  const h = harness();
  await h.editRecommendationPayload('rec', 7);
  h.bindings.loadOperationsLedger.mockRejectedValue(new Error('Refresh unavailable'));
  await h.submit(h.els.modalBody.querySelector('form'));
  h.requests[0].resolve({ recommendation: { status: 'pending' } });
  await flush();
  expect(h.bindings.openNotice).toHaveBeenLastCalledWith('Payload saved', expect.stringContaining('refresh'));
  expect(h.bindings.openNotice).not.toHaveBeenCalledWith('Payload update failed', expect.anything());
  expect(h.state.loadedViews.has('approvals')).toBe(false);
  h.dom.window.close();
});

test.each(['resolve', 'reject'])('a recommendation %s cannot act on the replacement workspace', async outcome => {
  const h = harness();
  const pending = h.runRecommendationAction('rec', 'approve', 7);
  h.state.activeWorkspaceId = 'b';
  if (outcome === 'resolve') h.requests[0].resolve({ message: 'Approved' });
  else h.requests[0].reject(Object.assign(new Error('Conflict'), { code: 'SNEUP_RECOMMENDATION_REVIEW_CONFLICT' }));
  await pending;
  expect(h.bindings.loadOperationsLedger).not.toHaveBeenCalled();
  expect(h.bindings.openNotice).not.toHaveBeenCalled();
  h.dom.window.close();
});

test('opposing actions for the same recommendation cannot overlap', async () => {
  const h = harness();
  const pending = h.runRecommendationAction('rec', 'approve', 7);
  await h.runRecommendationAction('rec', 'reject', 7);
  expect(h.requests).toHaveLength(1);
  h.requests[0].resolve({ message: 'Approved' });
  await pending;
  h.dom.window.close();
});

test('payload editing and approval cannot overlap for the same recommendation', async () => {
  const h = harness();
  await h.editRecommendationPayload('rec', 7);
  await h.submit(h.els.modalBody.querySelector('form'));
  await h.runRecommendationAction('rec', 'approve', 7);
  expect(h.requests).toHaveLength(1);
  h.requests[0].resolve({ recommendation: { status: 'pending' } });
  await flush();
  h.dom.window.close();
});

test.each(['approval', 'payload'])('%s pending ownership survives a real A-B-A adoption', async mode => {
  const h = harness();
  let action;
  if (mode === 'approval') action = h.runRecommendationAction('rec', 'approve', 7);
  else {
    await h.editRecommendationPayload('rec', 7);
    await h.submit(h.els.modalBody.querySelector('form'));
  }
  h.adoptWorkspaceContext('b', 'same-session');
  h.adoptWorkspaceContext('a', 'same-session');
  await h.runRecommendationAction('rec', 'reject', 7);
  await h.editRecommendationPayload('rec', 7);
  await h.submit(h.els.modalBody.querySelector('form'));
  expect(h.requests).toHaveLength(1);
  h.requests[0].resolve({ recommendation: { status: 'pending' } });
  await action;
  await flush();
  expect(h.state.pendingRecommendationActions.size).toBe(0);
  expect(h.bindings.openNotice).not.toHaveBeenCalled();
  h.dom.window.close();
});

test.each(['action', 'drilldown'])('closing a pending %s invalidates its modal result', async mode => {
  const h = harness();
  h.els.modalBody.innerHTML = '<p>Original modal</p>';
  h.els.modal.classList.add('open');
  const pending = mode === 'action' ? h.runRecommendationAction('rec', 'approve', 7) : h.openOperatingLedger('board', 'board-a');
  await flush();
  h.bindings.closeModal();
  h.requests[0].resolve({ message: 'Approved', ledger: {} });
  await pending;
  expect(h.bindings.openNotice).not.toHaveBeenCalled();
  expect(h.bindings.renderOperatingLedgerModal).not.toHaveBeenCalled();
  h.dom.window.close();
});

test('an action refresh failure permits reopening Approvals to fetch again', async () => {
  const h = harness();
  h.bindings.loadOperationsLedger.mockRejectedValue(new Error('Unavailable'));
  const pending = h.runRecommendationAction('rec', 'approve', 7);
  h.requests[0].resolve({ message: 'Approved' });
  await pending;
  expect(h.state.loadedViews.has('approvals')).toBe(false);
  expect(h.bindings.openNotice).toHaveBeenLastCalledWith('Recommendation updated', expect.stringContaining('Reopen Approvals'));
  h.dom.window.close();
});
