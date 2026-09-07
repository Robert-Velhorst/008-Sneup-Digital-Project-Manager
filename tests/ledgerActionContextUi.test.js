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

function harness() {
  const dom = new JSDOM('<div id="modal"><h2 id="modalTitle"></h2><div id="modalBody"></div></div>');
  const document = dom.window.document;
  const els = Object.fromEntries(['modal', 'modalTitle', 'modalBody'].map(id => [id, document.getElementById(id)]));
  const state = { activeWorkspaceId: 'a', sessionToken: 'session', workspaceEpoch: 0, loadedViews: new Set(['approvals']),
    ledger: { followUps: [{ _id: 'item', interventionId: 'intervention' }] } };
  const requests = [];
  const bindings = { state, els, document, FormData: dom.window.FormData, t: value => value, et: value => value,
    escapeHtml: value => String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    getId: value => typeof value === 'object' ? value?._id || value?.id : value,
    cancelReportDownloads: jest.fn(), resetDashboardViews: jest.fn(), workspaceViewController: null,
    localStorage: { setItem: jest.fn(), removeItem: jest.fn() },
    fetchApi: jest.fn((url, options) => { const request = deferred(); requests.push({ url, options, ...request }); return request.promise; }),
    loadOperationsLedger: jest.fn().mockResolvedValue(), openNotice: jest.fn(),
    closeModal: jest.fn(new Function('state', 'els', `${section('function closeModal(', 'function inviteTokenFromUrl(')}; return closeModal;`)(state, els))
  };
  const code = section('function beginWorkspaceRead(', 'async function loadSecurityContext(')
    + section('async function runDecisionAction(', 'async function runJobAction(')
    + section('function openTrelloActionReconciliation(', 'async function openNotificationPolicy(');
  const api = new Function(...Object.keys(bindings), `${code}; return { runDecisionAction, runFollowUpAction, openWorkerResponseRecorder, runOutcomeEvaluation, adoptWorkspaceContext, openTrelloActionReconciliation };`)(...Object.values(bindings));
  const submit = async form => { form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })); await flush(); };
  return { dom, state, els, requests, bindings, submit, ...api };
}

function reconciliationHarness() {
  const h = harness();
  h.state.ledger.actions = [{ _id: 'attempt', actionType: 'move_card', status: 'in_progress' }];
  h.open = () => {
    h.openTrelloActionReconciliation('attempt');
    const form = h.els.modalBody.querySelector('form');
    form.querySelector('[name="outcome"]').value = 'failed';
    form.querySelector('[name="evidence"]').value = 'Provider evidence';
    return form;
  };
  return h;
}

test('a recorded provider result with pending internal effects is not reported as fully finalized', async () => {
  const h = reconciliationHarness();
  await h.submit(h.open());
  h.requests[0].resolve({ effectsCompleted: false, auditRecorded: true });
  await flush();
  expect(h.bindings.openNotice).toHaveBeenCalledWith('Ledger reconciled', expect.stringContaining('remains pending'));
  expect(h.state.pendingLedgerActions.size).toBe(0);
  h.dom.window.close();
});

test.each(['workspace', 'session', 'epoch', 'closed', 'replaced'])('a %s reconciliation form cannot submit', async transition => {
  const h = reconciliationHarness();
  const form = h.open();
  if (transition === 'workspace') h.state.activeWorkspaceId = 'b';
  if (transition === 'session') h.state.sessionToken = 'replacement';
  if (transition === 'epoch') h.state.workspaceEpoch++;
  if (transition === 'closed') h.bindings.closeModal();
  if (transition === 'replaced') h.els.modalBody.replaceChildren();
  await h.submit(form);
  expect(h.requests).toHaveLength(0);
  h.dom.window.close();
});

test('reconciliation retains evidence on a failed request and permits an exact retry', async () => {
  const h = reconciliationHarness();
  const form = h.open();
  await h.submit(form);
  h.requests[0].reject(new Error('Database write uncertain'));
  await flush();
  expect(form.querySelector('[name="evidence"]').value).toBe('Provider evidence');
  expect(form.querySelector('[role="alert"]').textContent).toBe('Database write uncertain');
  expect(h.bindings.openNotice).not.toHaveBeenCalled();
  await h.submit(form);
  expect(h.requests).toHaveLength(2);
  expect(h.requests[1].options.body).toBe(h.requests[0].options.body);
  h.requests[1].resolve({ auditRecorded: true });
  await flush();
  h.dom.window.close();
});

test('reconciliation uses recorded evidence when resuming an interrupted finalization', async () => {
  const h = reconciliationHarness();
  const decision = { outcome: 'failed', evidence: '<script>Recorded evidence</script>', reason: 'Recorded note' };
  h.state.ledger.actions[0].recommendationId = { status: 'executing', reconciliationDecision: decision };
  h.openTrelloActionReconciliation('attempt');
  const form = h.els.modalBody.querySelector('form');
  expect(form.querySelector('script')).toBeNull();
  expect(form.querySelector('[name="outcome"]').disabled).toBe(true);
  expect(form.querySelector('[name="evidence"]').readOnly).toBe(true);
  await h.submit(form);
  expect(JSON.parse(h.requests[0].options.body)).toMatchObject(decision);
  h.requests[0].resolve({});
  await flush();
  h.dom.window.close();
});

test('reconciliation is single-flight across reopening and ignores an old dialog completion', async () => {
  const h = reconciliationHarness();
  await h.submit(h.open());
  await h.submit(h.open());
  expect(h.requests).toHaveLength(1);
  h.requests[0].resolve({});
  await flush();
  expect(h.bindings.openNotice).not.toHaveBeenCalled();
  expect(h.state.pendingLedgerActions.size).toBe(0);
  h.dom.window.close();
});

test.each(['resolve', 'reject'])('a late reconciliation %s cannot disturb another workspace', async settle => {
  const h = reconciliationHarness();
  await h.submit(h.open());
  h.state.activeWorkspaceId = 'b';
  h.requests[0][settle](settle === 'resolve' ? {} : new Error('Rejected'));
  await flush();
  expect(h.bindings.loadOperationsLedger).not.toHaveBeenCalled();
  expect(h.bindings.openNotice).not.toHaveBeenCalled();
  expect(h.state.pendingLedgerActions.size).toBe(0);
  h.dom.window.close();
});

test('a reconciliation write receipt is distinguished from a failed ledger refresh', async () => {
  const h = reconciliationHarness();
  h.bindings.loadOperationsLedger.mockRejectedValue(new Error('Read unavailable'));
  await h.submit(h.open());
  h.requests[0].resolve({});
  await flush();
  expect(h.bindings.loadOperationsLedger).toHaveBeenCalledWith({ throwOnError: true });
  expect(h.bindings.openNotice).toHaveBeenCalledWith('Ledger reconciled', expect.stringContaining('recorded'));
  expect(h.state.loadedViews.has('approvals')).toBe(false);
  h.dom.window.close();
});

const actions = [
  ['decision', h => h.runDecisionAction('item', 'snooze'), 'Decision updated'],
  ['follow-up', h => h.runFollowUpAction('item', 'resolved'), 'Follow-up updated'],
  ['outcome', h => h.runOutcomeEvaluation('item'), 'Outcome evidence refreshed']
];

describe.each(actions)('%s action ownership', (name, run, title) => {
  test.each(['resolve', 'reject'])('ignores %s after changing workspace', async result => {
    const h = harness();
    const pending = run(h);
    h.state.activeWorkspaceId = 'b';
    h.requests[0][result](result === 'resolve' ? {} : new Error('Rejected'));
    await pending;
    expect(h.bindings.loadOperationsLedger).not.toHaveBeenCalled();
    expect(h.bindings.openNotice).not.toHaveBeenCalled();
    h.dom.window.close();
  });

  test('suppresses overlapping requests on the same record', async () => {
    const h = harness();
    const first = run(h);
    const second = run(h);
    expect(h.requests).toHaveLength(1);
    h.requests[0].resolve({});
    await Promise.all([first, second]);
    h.dom.window.close();
  });

  test('reports a committed action separately from a failed refresh and permits reopening', async () => {
    const h = harness();
    h.bindings.loadOperationsLedger.mockRejectedValue(new Error('Read failed'));
    const pending = run(h);
    h.requests[0].resolve({});
    await pending;
    expect(h.bindings.openNotice).toHaveBeenLastCalledWith(title, expect.stringContaining('recorded'));
    expect(h.state.loadedViews.has('approvals')).toBe(false);
    h.dom.window.close();
  });

  test('does not reopen a closed modal but refreshes the unchanged workspace', async () => {
    const h = harness();
    h.els.modal.classList.add('open');
    const pending = run(h);
    h.bindings.closeModal();
    h.requests[0].resolve({});
    await pending;
    expect(h.bindings.loadOperationsLedger).toHaveBeenCalledWith({ throwOnError: true });
    expect(h.bindings.openNotice).not.toHaveBeenCalled();
    h.dom.window.close();
  });

  test('retains the active request until refresh settles and ignores its late notice', async () => {
    const h = harness();
    const refresh = deferred();
    h.bindings.loadOperationsLedger.mockReturnValue(refresh.promise);
    const first = run(h);
    h.requests[0].resolve({});
    await flush();
    await run(h);
    expect(h.requests).toHaveLength(1);
    h.els.modalBody.innerHTML = '<p>New dialog</p>';
    refresh.resolve();
    await first;
    expect(h.bindings.openNotice).not.toHaveBeenCalled();
    h.dom.window.close();
  });

  test('ordinary success refreshes once, shows its result, and releases the action', async () => {
    const h = harness();
    const first = run(h);
    h.requests[0].resolve({});
    await first;
    expect(h.bindings.loadOperationsLedger).toHaveBeenCalledTimes(1);
    expect(h.bindings.openNotice).toHaveBeenCalledWith(title, expect.any(String));
    const retry = run(h);
    h.requests[1].reject(new Error('Rejected retry'));
    await retry;
    expect(h.requests).toHaveLength(2);
    expect(h.bindings.openNotice).toHaveBeenLastCalledWith(expect.any(String), 'Rejected retry');
    h.dom.window.close();
  });
});

test('invalid decision and follow-up actions never default to another mutation', async () => {
  const h = harness();
  await h.runDecisionAction('item', 'unknown');
  await h.runFollowUpAction('item', 'unknown');
  expect(h.requests).toHaveLength(0);
  h.dom.window.close();
});

test.each(actions)('%s retains pending ownership across A-B-A while permitting B actions', async (name, run) => {
  const h = harness();
  const first = run(h);
  h.adoptWorkspaceContext('b', 'session');
  const otherWorkspace = run(h);
  expect(h.requests).toHaveLength(2);
  h.adoptWorkspaceContext('a', 'session');
  await run(h);
  expect(h.requests).toHaveLength(2);
  h.requests[0].resolve({});
  h.requests[1].resolve({});
  await Promise.all([first, otherWorkspace]);
  expect(h.bindings.openNotice).not.toHaveBeenCalled();
  expect(h.state.pendingLedgerActions.size).toBe(0);
  h.dom.window.close();
});

test.each(['worker-first', 'manual-first'])('worker recording and follow-up resolution exclude each other: %s', async order => {
  const h = harness();
  let manual;
  h.openWorkerResponseRecorder('intervention');
  if (order === 'worker-first') {
    await h.submit(h.els.modalBody.querySelector('form'));
    manual = h.runFollowUpAction('item', 'resolved');
  } else {
    manual = h.runFollowUpAction('item', 'resolved');
    await h.submit(h.els.modalBody.querySelector('form'));
  }
  expect(h.requests).toHaveLength(1);
  h.requests[0].resolve({ response: { _id: 'response', responseType: 'blocked' } });
  await manual;
  await flush();
  expect(h.state.pendingLedgerActions.size).toBe(0);
  h.dom.window.close();
});

test.each(['decision', 'follow-up'])('opposing %s actions share one pending claim', async kind => {
  const h = harness();
  const first = kind === 'decision' ? h.runDecisionAction('item', 'snooze') : h.runFollowUpAction('item', 'resolved');
  await (kind === 'decision' ? h.runDecisionAction('item', 'delegate-va') : h.runFollowUpAction('item', 'escalated'));
  expect(h.requests).toHaveLength(1);
  h.requests[0].resolve({});
  await first;
  h.dom.window.close();
});

test.each(['workspace', 'session', 'epoch', 'closed', 'replaced'])('a %s worker-response form cannot submit', async transition => {
  const h = harness();
  h.openWorkerResponseRecorder('intervention');
  const form = h.els.modalBody.querySelector('form');
  if (transition === 'workspace') h.state.activeWorkspaceId = 'b';
  if (transition === 'session') h.state.sessionToken = 'replacement';
  if (transition === 'epoch') h.state.workspaceEpoch++;
  if (transition === 'closed') h.bindings.closeModal();
  if (transition === 'replaced') h.els.modalBody.replaceChildren();
  await h.submit(form);
  expect(h.requests).toHaveLength(0);
  h.dom.window.close();
});

test('worker-response choices match the intervention API', () => {
  const h = harness();
  h.openWorkerResponseRecorder('intervention');
  expect([...h.els.modalBody.querySelector('select[name="responseType"]').options].map(o => o.value))
    .toEqual(['acknowledged', 'completed', 'blocked', 'needs_help', 'ignored']);
  h.dom.window.close();
});

test('worker-response submission is single-flight across form reopenings', async () => {
  const h = harness();
  h.openWorkerResponseRecorder('intervention');
  await h.submit(h.els.modalBody.querySelector('form'));
  h.openWorkerResponseRecorder('intervention');
  await h.submit(h.els.modalBody.querySelector('form'));
  expect(h.requests).toHaveLength(1);
  h.requests[0].resolve({ response: { _id: 'response', responseType: 'acknowledged' } });
  await flush();
  expect(h.bindings.openNotice).not.toHaveBeenCalled();
  h.dom.window.close();
});

test('worker recording stays single-flight across a real A-B-A adoption', async () => {
  const h = harness();
  h.openWorkerResponseRecorder('intervention');
  await h.submit(h.els.modalBody.querySelector('form'));
  h.adoptWorkspaceContext('b', 'session');
  h.adoptWorkspaceContext('a', 'session');
  h.openWorkerResponseRecorder('intervention');
  await h.submit(h.els.modalBody.querySelector('form'));
  expect(h.requests).toHaveLength(1);
  h.requests[0].resolve({ response: { _id: 'response', responseType: 'completed' } });
  await flush();
  expect(h.state.pendingLedgerActions.size).toBe(0);
  expect(h.bindings.openNotice).not.toHaveBeenCalled();
  h.dom.window.close();
});

test.each(['resolve', 'reject'])('worker-response %s cannot disturb a replacement workspace', async result => {
  const h = harness();
  h.openWorkerResponseRecorder('intervention');
  await h.submit(h.els.modalBody.querySelector('form'));
  h.state.activeWorkspaceId = 'b';
  h.requests[0][result](result === 'resolve' ? { response: { _id: 'response', responseType: 'completed' } } : new Error('Rejected'));
  await flush();
  expect(h.bindings.loadOperationsLedger).not.toHaveBeenCalled();
  expect(h.bindings.closeModal).not.toHaveBeenCalled();
  expect(h.bindings.openNotice).not.toHaveBeenCalled();
  h.dom.window.close();
});

test('a worker response remains recorded when its subsequent refresh fails', async () => {
  const h = harness();
  h.openWorkerResponseRecorder('intervention');
  h.bindings.loadOperationsLedger.mockRejectedValue(new Error('Read unavailable'));
  await h.submit(h.els.modalBody.querySelector('form'));
  h.requests[0].resolve({ response: { _id: 'response', responseType: 'completed' } });
  await flush();
  expect(h.bindings.openNotice).toHaveBeenLastCalledWith('Worker response recorded', expect.stringContaining('refresh'));
  expect(h.state.loadedViews.has('approvals')).toBe(false);
  h.dom.window.close();
});

test('ignored responses are not reported as resolved follow-ups', async () => {
  const h = harness();
  h.openWorkerResponseRecorder('intervention');
  const form = h.els.modalBody.querySelector('form');
  form.elements.responseType.value = 'ignored';
  await h.submit(form);
  h.requests[0].resolve({ response: { _id: 'response', responseType: 'ignored', followUpResolution: { modifiedCount: 0, status: 'open' } } });
  await flush();
  expect(h.bindings.openNotice).toHaveBeenLastCalledWith('Worker response recorded', expect.stringContaining('No follow-up was changed'));
  h.dom.window.close();
});

test.each([
  [{ modifiedCount: 1, status: 'escalated' }, 'escalated for review'],
  [{ modifiedCount: 1, status: 'resolved' }, 'ledger were updated'],
  [undefined, 'Review the ledger for the current follow-up status']
])('worker success uses the actual follow-up receipt %j', async (followUpResolution, message) => {
  const h = harness();
  h.openWorkerResponseRecorder('intervention');
  const form = h.els.modalBody.querySelector('form');
  form.elements.responseText.value = 'Observed synthetic response';
  await h.submit(form);
  expect(JSON.parse(h.requests[0].options.body)).toEqual({ responseType: 'acknowledged', responseText: 'Observed synthetic response', source: 'manual', actor: 'local-user' });
  h.requests[0].resolve({ response: { _id: 'response', responseType: 'acknowledged', followUpResolution } });
  await flush();
  expect(h.bindings.closeModal).toHaveBeenCalledTimes(1);
  expect(h.bindings.openNotice).toHaveBeenLastCalledWith('Worker response recorded', expect.stringContaining(message));
  h.dom.window.close();
});

test.each(['workspace', 'session', 'epoch', 'closed', 'replaced'])('worker refresh cannot disturb a %s context', async transition => {
  const h = harness();
  const refresh = deferred();
  h.bindings.loadOperationsLedger.mockReturnValue(refresh.promise);
  h.openWorkerResponseRecorder('intervention');
  await h.submit(h.els.modalBody.querySelector('form'));
  h.requests[0].resolve({ response: { _id: 'response', responseType: 'completed' } });
  await flush();
  if (transition === 'workspace') h.state.activeWorkspaceId = 'b';
  if (transition === 'session') h.state.sessionToken = 'replacement';
  if (transition === 'epoch') h.state.workspaceEpoch++;
  if (transition === 'closed') h.bindings.closeModal();
  if (transition === 'replaced') h.els.modalBody.innerHTML = '<p>Replacement dialog</p>';
  h.bindings.closeModal.mockClear();
  refresh.resolve();
  await flush();
  expect(h.bindings.closeModal).not.toHaveBeenCalled();
  expect(h.bindings.openNotice).not.toHaveBeenCalled();
  h.dom.window.close();
});
