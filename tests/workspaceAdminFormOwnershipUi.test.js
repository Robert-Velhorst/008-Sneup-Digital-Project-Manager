const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let count = 0; count < 20; count++) await Promise.resolve(); };

function harness() {
  const dom = new JSDOM('<div id="modal"><h2 id="title"></h2><div id="body"></div></div>');
  const document = dom.window.document;
  const els = {
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('title'),
    modalBody: document.getElementById('body')
  };
  const state = {
    activeWorkspaceId: 'workspace-a',
    sessionToken: 'session-a',
    workspaceEpoch: 0,
    loadedViews: new Set(['workspaces']),
    retentionReport: {
      workspaceSlug: 'workspace-a',
      policy: { enabled: true, operationalDays: 90, performanceDays: 365, notificationDays: 365, credentialDays: 90 },
      summary: { due: 1 },
      limit: 50,
      categories: [{ key: 'operational', due: 1 }]
    },
    featureFlags: [{ key: 'connector_sync', label: 'Connector sync', enabled: false, rolloutPercentage: 0, revision: 2, reason: '' }]
  };
  const requests = [];
  const fetchApi = jest.fn((url, options) => {
    const request = deferred();
    requests.push({ url, options, ...request });
    return request.promise;
  });
  const formPersistence = { enhanceForm: jest.fn(), markSaved: jest.fn() };
  const workspaceViewController = {
    openPolicyRuleForm: jest.fn(() => {
      const form = document.createElement('form');
      form.innerHTML = '<input name="defaultSnoozeHours" value="24"><textarea name="reason">Reviewed</textarea><button type="submit">Save</button>';
      els.modalBody.replaceChildren(form);
      els.modal.classList.add('open');
      return { form, kind: 'decision_queue_snooze', submitLabel: 'Save', blockedTitle: 'Policy update blocked' };
    })
  };
  const bindings = {
    document,
    els,
    state,
    FormData: dom.window.FormData,
    fetchApi,
    formPersistence,
    workspaceViewController,
    closeModal: jest.fn(() => els.modal.classList.remove('open')),
    loadRetentionReport: jest.fn().mockResolvedValue(undefined),
    loadWorkspaceAdmin: jest.fn().mockResolvedValue(undefined),
    renderWorkspaces: jest.fn(),
    openNotice: jest.fn(),
    t: value => value,
    et: value => value,
    escapeHtml: value => String(value ?? '')
  };
  const code = section('function captureWorkspaceContext()', 'function ledgerPendingKey(')
    + section('function openRetentionPolicy()', 'async function openFeatureFlagHistory(')
    + section('function openFeatureFlagEditor(', 'function buildPolicyRuleUpdateBody(')
    + section('function buildPolicyRuleUpdateBody(', 'async function downloadWorkspaceExport(');
  const api = new Function(...Object.keys(bindings), `${code}; return { openRetentionPolicy, openRetentionApply, openFeatureFlagEditor, openPolicyRuleEditor };`)(...Object.values(bindings));

  const openers = {
    'retention-policy': () => api.openRetentionPolicy(),
    'retention-apply': () => api.openRetentionApply(),
    'feature-flag': () => api.openFeatureFlagEditor('connector_sync'),
    'policy-rule': () => api.openPolicyRuleEditor('decision_queue_snooze')
  };
  const urls = {
    'retention-policy': '/api/data-retention/policy',
    'retention-apply': '/api/data-retention/apply',
    'feature-flag': '/api/feature-flags/connector_sync',
    'policy-rule': '/api/policy-rules/decision_queue_snooze'
  };
  const submit = async form => {
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flush();
  };
  return { dom, document, els, state, requests, fetchApi, formPersistence, bindings, openers, urls, submit };
}

const formKinds = ['retention-policy', 'retention-apply', 'feature-flag', 'policy-rule'];

describe.each(formKinds)('%s workspace administration form ownership', formKind => {
  let h;

  beforeEach(() => {
    h = harness();
    h.openers[formKind]();
  });

  afterEach(() => h.dom.window.close());

  test.each(['workspace', 'session', 'epoch', 'closed', 'replaced'])('does not submit after %s ownership changes', async change => {
    const form = h.els.modalBody.querySelector('form');
    if (change === 'workspace') h.state.activeWorkspaceId = 'workspace-b';
    if (change === 'session') h.state.sessionToken = 'session-b';
    if (change === 'epoch') h.state.workspaceEpoch += 1;
    if (change === 'closed') h.els.modal.classList.remove('open');
    if (change === 'replaced') h.els.modalBody.innerHTML = '<p>Replacement dialog</p>';

    await h.submit(form);

    expect(h.fetchApi).not.toHaveBeenCalled();
  });

  test('does not let a late success alter a replacement workspace dialog', async () => {
    const form = h.els.modalBody.querySelector('form');
    await h.submit(form);
    expect(h.requests[0].url).toBe(h.urls[formKind]);

    h.state.activeWorkspaceId = 'workspace-b';
    h.state.workspaceEpoch += 1;
    h.els.modalBody.innerHTML = '<p>Current workspace dialog</p>';
    h.els.modal.classList.add('open');
    const featureFlagsBefore = h.state.featureFlags;
    h.requests[0].resolve({ result: { deleted: 1 }, flag: { key: 'connector_sync', enabled: true } });
    await flush();

    expect(h.els.modalBody.textContent).toBe('Current workspace dialog');
    expect(h.bindings.closeModal).not.toHaveBeenCalled();
    expect(h.bindings.openNotice).not.toHaveBeenCalled();
    expect(h.formPersistence.markSaved).not.toHaveBeenCalled();
    expect(h.bindings.loadRetentionReport).not.toHaveBeenCalled();
    expect(h.bindings.loadWorkspaceAdmin).not.toHaveBeenCalled();
    expect(h.bindings.renderWorkspaces).not.toHaveBeenCalled();
    expect(h.state.featureFlags).toBe(featureFlagsBefore);
  });

  test('current-context success still completes the existing flow', async () => {
    const form = h.els.modalBody.querySelector('form');
    await h.submit(form);
    h.requests[0].resolve({ result: { deleted: 1 }, flag: { key: 'connector_sync', enabled: true } });
    await flush();

    expect(h.bindings.closeModal).toHaveBeenCalledTimes(1);
    if (formKind === 'retention-policy' || formKind === 'feature-flag' || formKind === 'policy-rule') {
      expect(h.formPersistence.markSaved).toHaveBeenCalledTimes(1);
    }
    if (formKind === 'retention-policy' || formKind === 'retention-apply') {
      expect(h.bindings.loadRetentionReport).toHaveBeenCalledTimes(1);
    }
    if (formKind === 'feature-flag') expect(h.bindings.renderWorkspaces).toHaveBeenCalledTimes(1);
    if (formKind === 'policy-rule') expect(h.bindings.loadWorkspaceAdmin).toHaveBeenCalledTimes(1);
  });

  test('duplicate submissions start one mutation', async () => {
    const form = h.els.modalBody.querySelector('form');
    await h.submit(form);
    await h.submit(form);
    expect(h.requests).toHaveLength(1);
    h.requests[0].resolve({ result: { deleted: 1 }, flag: { key: 'connector_sync', enabled: true } });
    await flush();
  });

  test('a late failure cannot replace a newer modal', async () => {
    await h.submit(h.els.modalBody.querySelector('form'));
    h.els.modalBody.innerHTML = '<p>New dialog</p>';
    h.requests[0].reject(new Error('Old failure'));
    await flush();
    expect(h.bindings.openNotice).not.toHaveBeenCalled();
    expect(h.bindings.closeModal).not.toHaveBeenCalled();
  });

  test('closing and reopening the same form does not restore its authority', async () => {
    const form = h.els.modalBody.querySelector('form');
    h.state.modalEpoch = 1;
    h.els.modal.classList.remove('open');
    h.els.modal.classList.add('open');
    await h.submit(form);
    expect(h.requests).toHaveLength(0);
  });

  if (formKind !== 'feature-flag') {
    test('an acknowledged mutation is retained when refresh fails', async () => {
      const reader = formKind === 'policy-rule' ? h.bindings.loadWorkspaceAdmin : h.bindings.loadRetentionReport;
      reader.mockRejectedValue(new Error('Refresh failed'));
      await h.submit(h.els.modalBody.querySelector('form'));
      h.requests[0].resolve({ result: { deleted: 1 } });
      await flush();
      expect(reader).toHaveBeenCalledWith({ throwOnError: true });
      expect(h.bindings.openNotice).toHaveBeenCalledWith(expect.stringMatching(/saved|complete/), expect.stringContaining('could not'));
      expect(h.state.loadedViews.has('workspaces')).toBe(false);
      expect(h.requests).toHaveLength(1);
    });

    test('switching during refresh suppresses a late completion', async () => {
      const refresh = deferred();
      const reader = formKind === 'policy-rule' ? h.bindings.loadWorkspaceAdmin : h.bindings.loadRetentionReport;
      reader.mockReturnValue(refresh.promise);
      await h.submit(h.els.modalBody.querySelector('form'));
      h.requests[0].resolve({ result: { deleted: 1 } });
      await flush();
      h.state.sessionToken = 'session-b';
      refresh.resolve();
      await flush();
      expect(h.bindings.openNotice).not.toHaveBeenCalled();
      expect(h.bindings.closeModal).not.toHaveBeenCalled();
    });
  }
});

test('the actual retention reader propagates requested refresh failures and keeps retry state', async () => {
  const state = { activeWorkspaceId: 'workspace-a', sessionToken: 'session-a' };
  const bindings = { state, els: { retentionScanButton: { disabled: false } },
    fetchApi: jest.fn().mockRejectedValue(new Error('Retention unavailable')),
    openNotice: jest.fn(), renderRetentionReport: jest.fn() };
  const code = section('function beginWorkspaceRead(', 'function captureWorkspaceContext(')
    + section('async function loadRetentionReport(', 'function buildPolicyHistoryEndpoint(');
  const read = new Function(...Object.keys(bindings), `${code}; return loadRetentionReport;`)(...Object.values(bindings));
  await expect(read({ throwOnError: true })).rejects.toThrow('Retention unavailable');
  expect(state.retentionReport).toBeNull();
  expect(state.retentionError).toBe('Retention unavailable');
  expect(bindings.els.retentionScanButton.disabled).toBe(false);
  expect(bindings.renderRetentionReport).toHaveBeenCalledTimes(1);
});
