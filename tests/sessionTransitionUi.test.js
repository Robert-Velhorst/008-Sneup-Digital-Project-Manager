const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const flush = async () => { for (let n = 0; n < 16; n++) await Promise.resolve(); };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function harness() {
  const dom = new JSDOM(fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8'));
  const document = dom.window.document;
  const els = Object.fromEntries([...document.querySelectorAll('[id]')].map(element => [element.id, element]));
  els.modal = els.connectorModal;
  const storage = { setItem: jest.fn(), removeItem: jest.fn() };
  const state = new Function('localStorage', 'sessionStorage', 'SESSION_TOKEN_KEY', 'FIRST_RUN_SETUP_KEY',
    `${section('const state = {', 'const els = {')}; return state;`)(
    { getItem: () => '' }, { getItem: () => '' }, 'session', 'setup');
  Object.assign(state, { activeWorkspaceId: 'a', sessionToken: 'old-session',
    currentWorkspace: { id: 'a', name: 'Old workspace', slug: 'old', status: 'archived' },
    securityContext: { roles: ['owner'], permissions: ['identity:manage'] },
    snapshot: { marker: 'old' }, reports: [{ marker: 'old' }], workspaceUsers: [{ marker: 'old' }] });
  state.loadedViews.add('reports');
  const requests = [];
  const notice = jest.fn();
  const closeModal = jest.fn(() => els.modal.classList.remove('open'));
  const bindings = { state, els, document, FormData: dom.window.FormData,
    fetchApi: jest.fn((url, options) => { const request = deferred(); requests.push({ url, options, ...request }); return request.promise; }),
    localStorage: storage, sessionStorage: storage, SESSION_TOKEN_KEY: 'session',
    cancelReportDownloads: jest.fn(), updateApprovalCount: jest.fn(), renderWorkspaces: jest.fn(),
    workspaceViewController: {}, connectorViewController: null, enhancementViewController: null,
    reportViewController: null, forecastViewController: null, workSignalsViewController: null, approvalViewController: null,
    closeModal, openNotice: notice, t: value => value, et: value => value, escapeHtml: String,
    loadAll: jest.fn(), showView: jest.fn()
  };
  const code = section('function resetDashboardViews(', 'async function loadSecurityContext(')
    + section('function openWorkspaceDeletion(', 'async function openWorkspaceInvite(')
    + section('function beginInvitationForm(', 'function listOrEmpty(');
  const api = new Function(...Object.keys(bindings), 'enhancementRequest', 'connectorSearchTimer', `${code}; return { acceptWorkspaceInvitation, openWorkspaceDeletion, reloadAfterInvitationAcceptance, beginInvitationForm };`)(...Object.values(bindings), null, null);
  const submitDeletion = async () => {
    document.getElementById('workspaceDeletionForm').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flush();
  };
  return { dom, state, els, storage, requests, notice, closeModal, bindings, submitDeletion, ...api };
}
const accepted = id => ({ workspace: { id }, sessionToken: 'new-session' });

function invitationController(h) {
  return require('../public/workspaceView').createController({
    document: h.dom.window.document, window: h.dom.window, state: h.state, elements: h.els,
    t: value => value, plural: (one, many, count) => count === 1 ? one : many, escapeHtml: String,
    callbacks: { beginInvitationForm: h.beginInvitationForm, acceptWorkspaceInvitation: h.acceptWorkspaceInvitation,
      reloadAfterInvitationAcceptance: h.reloadAfterInvitationAcceptance, closeModal: h.closeModal, openNotice: h.notice }
  });
}

async function submitInvitation(h, controller) {
  controller.openInviteAcceptance('synthetic-invite');
  const form = h.dom.window.document.getElementById('acceptWorkspaceInviteForm');
  form.elements.displayName.value = 'Synthetic person';
  form.dispatchEvent(new h.dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await flush();
}

test.each(['a', 'b'])('accepting workspace %s clears the previous session data and permissions', async id => {
  const h = harness();
  const pending = h.acceptWorkspaceInvitation('synthetic-invite', 'Synthetic person');
  h.requests[0].resolve(accepted(id));
  await pending;
  expect(h.state.activeWorkspaceId).toBe(id);
  expect(h.state.sessionToken).toBe('new-session');
  expect(h.state.securityContext).toBeNull();
  expect(h.state.snapshot).toBeNull();
  expect(h.state.reports).toEqual([]);
  expect(h.state.workspaceUsers).toEqual([]);
  expect(h.state.loadedViews.size).toBe(0);
  h.dom.window.close();
});

test('a late invitation response cannot replace a newer session', async () => {
  const h = harness();
  const pending = h.acceptWorkspaceInvitation('synthetic-invite', 'Synthetic person');
  h.state.sessionToken = 'newer-session';
  h.requests[0].resolve(accepted('b'));
  await pending;
  expect(h.state.sessionToken).toBe('newer-session');
  expect(h.storage.setItem).not.toHaveBeenCalled();
  h.dom.window.close();
});

test('a malformed acceptance response does not erase the existing session', async () => {
  const h = harness();
  const pending = h.acceptWorkspaceInvitation('synthetic-invite', 'Synthetic person');
  h.requests[0].resolve({ workspace: { id: 'b' } });
  await expect(pending).rejects.toThrow();
  expect(h.state.sessionToken).toBe('old-session');
  expect(h.storage.setItem).not.toHaveBeenCalled();
  h.dom.window.close();
});

test('storage failure after acceptance preserves the new in-memory session and cleared caches', async () => {
  const h = harness();
  h.storage.setItem.mockImplementation(() => { throw new Error('Storage unavailable'); });
  const pending = h.acceptWorkspaceInvitation('synthetic-invite', 'Synthetic person');
  h.requests[0].resolve(accepted('b'));
  const result = await pending;
  expect(result.sessionPersisted).toBe(false);
  expect(h.state.sessionToken).toBe('new-session');
  expect(h.state.reports).toEqual([]);
  h.dom.window.close();
});

test('storage failure after acknowledged deletion is not reported as failed deletion', async () => {
  const h = harness();
  h.storage.removeItem.mockImplementation(() => { throw new Error('Storage unavailable'); });
  h.openWorkspaceDeletion();
  await h.submitDeletion();
  h.requests[0].resolve({ receipt: { deletionId: 'synthetic-receipt', status: 'completed' } });
  await flush();
  expect(h.state.sessionToken).toBe('');
  expect(h.state.securityContext).toBeNull();
  expect(h.state.snapshot).toBeNull();
  expect(h.state.reports).toEqual([]);
  expect(h.notice).not.toHaveBeenCalledWith('Workspace deletion failed', expect.anything());
  expect(h.notice).toHaveBeenCalledWith('Workspace deleted', expect.anything());
  h.dom.window.close();
});

test('late deletion completion does not sign out a newer session', async () => {
  const h = harness();
  h.openWorkspaceDeletion();
  await h.submitDeletion();
  h.state.sessionToken = 'newer-session';
  h.requests[0].resolve({ receipt: { deletionId: 'synthetic-receipt', status: 'completed' } });
  await flush();
  expect(h.state.sessionToken).toBe('newer-session');
  expect(h.notice).not.toHaveBeenCalled();
  h.dom.window.close();
});

test('a deletion form from another session cannot submit and duplicate submits are ignored', async () => {
  const h = harness();
  h.openWorkspaceDeletion();
  h.state.sessionToken = 'newer-session';
  await h.submitDeletion();
  expect(h.requests).toHaveLength(0);
  h.openWorkspaceDeletion();
  await h.submitDeletion();
  await h.submitDeletion();
  expect(h.requests).toHaveLength(1);
  h.requests[0].resolve({ receipt: { deletionId: 'synthetic-receipt', status: 'completed' } });
  await flush();
  h.dom.window.close();
});

test('a dismissed invitation form ignores late failure without changing identity or newer content', async () => {
  const h = harness();
  await submitInvitation(h, invitationController(h));
  h.els.modalBody.innerHTML = '<div data-invitation-status>New details</div>';
  h.requests[0].reject(new Error('Old invitation failure'));
  await flush();
  expect(h.state.sessionToken).toBe('old-session');
  expect(h.els.modalBody.textContent).toBe('New details');
  expect(h.notice).not.toHaveBeenCalled();
  expect(h.closeModal).not.toHaveBeenCalled();
  h.dom.window.close();
});

test('closing an invitation form does not lose a committed single-use session', async () => {
  const h = harness();
  h.bindings.loadAll.mockImplementation(async () => { h.state.securityContext = { workspaceId: 'b' }; });
  await submitInvitation(h, invitationController(h));
  h.closeModal();
  h.requests[0].resolve(accepted('b'));
  await flush();
  expect(h.state.sessionToken).toBe('new-session');
  expect(h.storage.setItem).toHaveBeenCalledWith('session', 'new-session');
  expect(h.state.reports).toEqual([]);
  expect(h.bindings.showView).toHaveBeenCalledWith('overview');
  h.dom.window.close();
});

test.each([false, true])('closing a deletion form does not skip cleanup (reopened: %s)', async reopen => {
  const h = harness();
  h.openWorkspaceDeletion();
  await h.submitDeletion();
  h.closeModal();
  if (reopen) h.openWorkspaceDeletion();
  h.requests[0].resolve({ receipt: { deletionId: 'synthetic-receipt', status: 'completed' } });
  await flush();
  expect(h.state.sessionToken).toBe('');
  expect(h.state.activeWorkspaceId).toBe('');
  expect(h.storage.removeItem).toHaveBeenCalledWith('session');
  expect(h.notice).toHaveBeenCalledWith('Workspace deleted', expect.anything());
  expect(h.requests).toHaveLength(1);
  h.dom.window.close();
});

test('composed invitation acceptance clears old data before confirming and loading the new session', async () => {
  const h = harness();
  h.bindings.loadAll.mockImplementation(async () => {
    expect(h.state.reports).toEqual([]);
    expect(h.state.securityContext).toBeNull();
    h.state.securityContext = { workspaceId: 'b' };
  });
  await submitInvitation(h, invitationController(h));
  h.requests[0].resolve(accepted('b'));
  await flush();
  expect(h.state.sessionToken).toBe('new-session');
  expect(h.bindings.showView).toHaveBeenCalledWith('overview');
  expect(h.notice).not.toHaveBeenCalled();
  h.dom.window.close();
});

test.each(['session', 'modal'])('accepted-session reload cannot replace newer %s state', async change => {
  const h = harness();
  const reload = deferred();
  h.bindings.loadAll.mockReturnValue(reload.promise);
  await submitInvitation(h, invitationController(h));
  h.requests[0].resolve(accepted('b'));
  await flush();
  if (change === 'session') h.state.sessionToken = 'newer-session';
  else h.els.modalBody.innerHTML = '<div>New dialog</div>';
  reload.reject(new Error('Old reload error'));
  await flush();
  expect(h.notice).not.toHaveBeenCalled();
  expect(h.bindings.showView).not.toHaveBeenCalled();
  h.dom.window.close();
});

test('an incomplete deletion receipt leaves the existing session intact and reports uncertainty', async () => {
  const h = harness();
  h.openWorkspaceDeletion();
  await h.submitDeletion();
  h.requests[0].resolve({ receipt: { deletionId: 'synthetic-receipt', status: 'failed' } });
  await flush();
  expect(h.state.sessionToken).toBe('old-session');
  expect(h.storage.removeItem).not.toHaveBeenCalled();
  expect(h.notice).toHaveBeenCalledWith('Deletion result unconfirmed', expect.anything());
  h.dom.window.close();
});
