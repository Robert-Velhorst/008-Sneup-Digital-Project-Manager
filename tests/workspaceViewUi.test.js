const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { createRuntime } = require('../public/i18n');
const { createController, DYNAMIC_OPERATOR_MESSAGES, NL_MESSAGES: WORKSPACE_NL_MESSAGES } = require('../public/workspaceView');

const rootDir = path.join(__dirname, '..');
const moduleSource = fs.readFileSync(path.join(rootDir, 'public', 'workspaceView.js'), 'utf8');
const appSource = fs.readFileSync(path.join(rootDir, 'public', 'app.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const makeCallbacks = () => ({
  openIntegrityRepair: jest.fn(),
  openRetentionPolicy: jest.fn(),
  openRetentionApply: jest.fn(),
  openWorkspaceUserSessions: jest.fn(),
  openPolicyRuleEditor: jest.fn(),
  openFeatureFlagEditor: jest.fn(),
  openFeatureFlagHistory: jest.fn(),
  loadPolicyHistory: jest.fn(),
  createWorkspaceInvitation: jest.fn().mockResolvedValue({
    inviteUrl: 'https://sneup.example.test/?invite=created-token',
    delivery: { status: 'manual' }
  }),
  revokeWorkspaceInvitation: jest.fn().mockResolvedValue({ success: true }),
  retryWorkspaceInvitationDelivery: jest.fn().mockResolvedValue({
    inviteUrl: 'https://sneup.example.test/?invite=replacement-token',
    delivery: { status: 'sent' }
  }),
  acceptWorkspaceInvitation: jest.fn().mockResolvedValue({ sessionPersisted: true }),
  refreshWorkspaceAdmin: jest.fn().mockResolvedValue(undefined),
  reloadAfterInvitationAcceptance: jest.fn().mockResolvedValue(undefined),
  closeModal: jest.fn(),
  openNotice: jest.fn(),
  enhanceForm: jest.fn()
});

const settle = () => new Promise(resolve => setImmediate(resolve));

const elementIds = [
  'workspaceCount', 'workspaceMetrics', 'workspaceMode', 'workspaceList', 'workspaceSelect',
  'workspaceExportButton', 'workspaceDeleteButton', 'workspaceUserCount', 'workspaceUsers',
  'workspaceInviteCount', 'workspaceInvitations', 'workspaceInviteButton', 'policyRuleCount',
  'policyRuleList', 'policyHistoryCount', 'policyHistoryList', 'policyHistoryActionFilter',
  'policyHistoryActorFilter', 'policyHistoryRangeFilter', 'featureFlagCount', 'featureFlagList',
  'integrityCount', 'integrityList', 'retentionCount', 'retentionList',
  'modal', 'modalTitle', 'modalBody'
];

const createHarness = (locale = 'nl') => {
  const controls = new Set([
    'workspaceSelect', 'policyHistoryActionFilter', 'policyHistoryRangeFilter'
  ]);
  const inputs = new Set(['policyHistoryActorFilter']);
  const buttons = new Set(['workspaceExportButton', 'workspaceDeleteButton', 'workspaceInviteButton']);
  const markup = elementIds.map((id) => {
    if (controls.has(id)) return `<select id="${id}"><option value="all">all</option><option value="30">30</option></select>`;
    if (inputs.has(id)) return `<input id="${id}">`;
    if (buttons.has(id)) return `<button id="${id}"></button>`;
    return `<div id="${id}"></div>`;
  }).join('');
  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`, {
    url: 'http://127.0.0.1:3211/'
  });
  const i18n = createRuntime({ root: null, language: locale, storage: null });
  i18n.registerMessages('nl', WORKSPACE_NL_MESSAGES);
  const callbacks = makeCallbacks();
  const state = {
    activeWorkspaceId: 'workspace-1',
    currentWorkspace: null,
    workspaces: [{ id: 'workspace-1', name: 'Evidence Workspace', slug: 'evidence', plan: 'pro', status: 'active' }],
    workspaceUsers: [{
      id: 'user-1', displayName: 'Robert Evidence', role: 'owner', status: 'active',
      provider: 'Provider Identity', email: 'owner@example.test'
    }],
    workspaceInvitations: [{
      id: 'invite-1', displayName: 'Invite Evidence', email: 'invite@example.test', role: 'member',
      status: 'pending', expiresAt: '2026-08-15T12:00:00.000Z',
      delivery: { mode: 'email', status: 'failed' }
    }],
    policyRules: [{
      actionType: 'move_card', label: 'Custom policy evidence', enabled: true, configured: true,
      policyKind: 'provider_action', riskLevel: 'high', ownerType: 'robert'
    }],
    policyRuleError: '',
    policyHistory: [{
      createdAt: '2026-08-09T10:00:00.000Z', actor: 'Audit Actor Evidence',
      beforeState: { label: 'Custom policy evidence', riskLevel: 'medium' },
      afterState: { label: 'Custom policy evidence', riskLevel: 'high', enabled: true }
    }],
    policyHistoryError: '',
    policyHistoryFilters: { actionType: '', actor: '', rangeDays: 'all' },
    featureFlags: [{
      key: 'connector_sync', label: 'Feature Evidence', description: 'Description remains verbatim.',
      reason: 'Operator reason remains verbatim.', enabled: true, effective: true, configured: true,
      rolloutPercentage: 50, rolloutSubject: 'workspace', revision: 3, updatedAt: '2026-08-09T11:00:00.000Z'
    }],
    featureFlagError: '',
    integrityReport: {
      scannedAt: '2026-08-09T11:30:00.000Z', truncated: false,
      summary: { findings: 1, repairable: 1, reviewRequired: 0 },
      findings: [{
        label: 'Integrity Evidence', reason: 'Integrity reason remains verbatim.', category: 'list_count',
        entityType: 'List', repairable: true, severity: 'medium'
      }]
    },
    integrityError: '',
    retentionReport: {
      summary: { due: 2 },
      policy: { enabled: true, operationalDays: 90, performanceDays: 365, notificationDays: 180, credentialDays: 90 },
      categories: [{
        key: 'history', label: 'Retention Evidence', due: 2, truncated: false,
        retentionDays: 90, cutoff: '2026-05-01T00:00:00.000Z'
      }]
    },
    retentionError: '',
    securityContext: {
      demoMode: false,
      workspaceOverrideAllowed: true,
      displayName: 'Current Actor Evidence',
      roles: ['owner'],
      permissions: [
        'identity:manage', 'policy-rules:manage', 'feature-flags:manage', 'audit:read',
        'integrity:repair', 'data-retention:manage'
      ]
    }
  };
  const elements = Object.fromEntries(elementIds.map(id => [id, dom.window.document.getElementById(id)]));
  const controller = createController({
    document: dom.window.document,
    window: dom.window,
    state,
    elements,
    callbacks,
    t: i18n.t,
    plural: i18n.plural,
    escapeHtml,
    formatDate: i18n.formatDate,
    severityClass: value => ['critical', 'high'].includes(value) ? value : 'review'
  });
  return { dom, state, elements, callbacks, controller, i18n };
};

describe('demand-loaded workspace view', () => {
  test('renders complete Dutch operator chrome while preserving workspace and audit evidence', () => {
    const harness = createHarness('nl');
    harness.controller.render();
    const text = harness.dom.window.document.body.textContent;

    expect(harness.elements.workspaceMode.textContent).toBe('wisselbaar');
    expect(harness.elements.workspaceUserCount.textContent).toBe('1 gebruiker');
    expect(harness.elements.workspaceInviteCount.textContent).toBe('1 openstaande uitnodiging');
    expect(harness.elements.policyRuleCount.textContent).toBe('1 actie');
    expect(harness.elements.integrityCount.textContent).toBe('1 bevinding');
    expect(harness.elements.retentionCount.textContent).toBe('2 te verwijderen records');
    expect(text).toContain('Sessies beoordelen');
    expect(text).toContain('E-mail opnieuw verzenden');
    expect(text).toContain('Uitnodiging intrekken');
    expect(text).toContain('Afgeleide status herstellen');
    expect(text).toContain('Vervallen records verwijderen');
    expect(text).toContain('50% uitrol per werkruimte');
    expect(text).toContain('Evidence Workspace');
    expect(text).toContain('Custom policy evidence');
    expect(text).toContain('Audit Actor Evidence');
    expect(text).toContain('Description remains verbatim.');
    expect(text).toContain('Operator reason remains verbatim.');
    expect(text).toContain('Integrity reason remains verbatim.');
    harness.dom.window.close();
  });

  test('delegates guarded workspace actions and owns invitation confirmations without API authority', () => {
    const harness = createHarness('en');
    harness.controller.render();
    const { document } = harness.dom.window;

    document.querySelector('[data-workspace-user-sessions]').click();
    document.querySelector('[data-retry-workspace-invite-delivery]').click();
    expect(harness.elements.modalTitle.textContent).toBe('Retry invitation email?');
    document.getElementById('cancelInviteDeliveryRetry').click();
    document.querySelector('[data-revoke-workspace-invite]').click();
    expect(harness.elements.modalTitle.textContent).toBe('Revoke invitation?');
    document.getElementById('cancelInviteRevoke').click();
    document.querySelector('[data-policy-rule]').click();
    document.querySelector('[data-feature-history]').click();
    document.querySelector('[data-feature-flag]').click();
    document.querySelector('[data-integrity-repair]').click();
    document.querySelector('[data-retention-configure]').click();
    document.querySelector('[data-retention-apply]').click();

    expect(harness.callbacks.openWorkspaceUserSessions).toHaveBeenCalledWith('user-1');
    expect(harness.callbacks.openPolicyRuleEditor).toHaveBeenCalledWith('move_card');
    expect(harness.callbacks.openFeatureFlagHistory).toHaveBeenCalledWith('connector_sync');
    expect(harness.callbacks.openFeatureFlagEditor).toHaveBeenCalledWith('connector_sync');
    expect(harness.callbacks.openIntegrityRepair).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.openRetentionPolicy).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.openRetentionApply).toHaveBeenCalledTimes(1);

    harness.elements.policyHistoryRangeFilter.value = '30';
    harness.elements.policyHistoryRangeFilter.dispatchEvent(new harness.dom.window.Event('change'));
    expect(harness.state.policyHistoryFilters.rangeDays).toBe('30');
    expect(harness.callbacks.loadPolicyHistory).toHaveBeenCalledTimes(1);
    harness.dom.window.close();
  });

  test('builds all five localized policy forms without gaining API authority', () => {
    const harness = createHarness('nl');
    const variants = [
      {
        actionType: 'scheduled_intervention_timing', label: 'Timing evidence', policyKind: 'workflow',
        workflowType: 'scheduled_intervention_timing', followUpAfterHours: 36, escalationAfterHours: 72,
        expectedKind: 'scheduled_intervention_timing', field: 'followUpAfterHours', value: '36'
      },
      {
        actionType: 'scheduled_intervention_cooldown', label: 'Cooldown evidence', policyKind: 'workflow',
        workflowType: 'scheduled_intervention_cooldown', cooldownHoursByTrigger: { no_activity: 72 },
        expectedKind: 'scheduled_intervention_cooldown', field: 'no_activityCooldownHours', value: '72'
      },
      {
        actionType: 'decision_queue_routing', label: 'Routing evidence', policyKind: 'workflow',
        workflowType: 'decision_queue_routing', routingByRisk: {
          low: { ownerType: 'va', escalationHours: 12 }, medium: { ownerType: 'team', escalationHours: 24 },
          high: { ownerType: 'robert', escalationHours: 48 }, critical: { ownerType: 'robert', escalationHours: 8 }
        },
        expectedKind: 'decision_queue_routing', field: 'lowOwnerType', value: 'va'
      },
      {
        actionType: 'decision_queue_snooze', label: 'Snooze evidence', policyKind: 'workflow',
        defaultSnoozeHours: 48, expectedKind: 'decision_queue_snooze', field: 'defaultSnoozeHours', value: '48'
      },
      {
        actionType: 'move_card', label: 'Move evidence', policyKind: 'provider_action', enabled: false,
        baselineRiskLevel: 'medium', baselineOwnerType: 'team', riskLevel: 'high', ownerType: 'robert',
        expectedKind: 'provider_action', field: 'riskLevel', value: 'high'
      }
    ];

    variants.forEach((variant) => {
      harness.state.policyRules = [variant];
      const opened = harness.controller.openPolicyRuleForm(variant.actionType);
      expect(opened.kind).toBe(variant.expectedKind);
      expect(opened.form.dataset.draftKey).toBe(`policy-rule:${variant.actionType}`);
      expect(opened.form.elements[variant.field].value).toBe(variant.value);
      expect(harness.callbacks.enhanceForm).toHaveBeenLastCalledWith(opened.form);
    });

    const text = harness.elements.modalBody.textContent;
    expect(harness.elements.modalTitle.textContent).toBe('Actieveiligheid: Move evidence');
    expect(text).toContain('Elke Trello-schrijfactie blijft goedkeuringsplichtig.');
    harness.dom.window.document.getElementById('cancelPolicyRule').click();
    expect(harness.callbacks.closeModal).toHaveBeenCalledTimes(1);
    expect(harness.controller.openPolicyRuleForm('unknown')).toBeNull();
    harness.dom.window.close();
  });

  test('keeps a failed invitation creation retryable and preserves the one-time link when refresh fails', async () => {
    const harness = createHarness('en');
    harness.callbacks.createWorkspaceInvitation
      .mockRejectedValueOnce(new Error('Temporary invitation failure'))
      .mockResolvedValueOnce({
        inviteUrl: 'https://sneup.example.test/?invite=one-time-evidence',
        delivery: { status: 'manual' }
      });
    harness.callbacks.refreshWorkspaceAdmin.mockRejectedValueOnce(new Error('Workspace refresh unavailable'));

    expect(harness.controller.openWorkspaceInvite()).toBe(true);
    let form = harness.dom.window.document.getElementById('workspaceInviteForm');
    form.elements.email.value = 'person@example.test';
    form.elements.displayName.value = 'Invitation Person';
    form.dispatchEvent(new harness.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await settle();

    expect(harness.callbacks.createWorkspaceInvitation).toHaveBeenCalledTimes(1);
    expect(form.elements.email.value).toBe('person@example.test');
    expect(form.querySelector('button[type="submit"]').disabled).toBe(false);
    expect(form.querySelector('[data-invitation-status]').textContent).toBe('Temporary invitation failure');

    form.dispatchEvent(new harness.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await settle();

    expect(harness.callbacks.createWorkspaceInvitation).toHaveBeenCalledTimes(2);
    expect(harness.callbacks.refreshWorkspaceAdmin).toHaveBeenCalledTimes(1);
    expect(harness.dom.window.document.getElementById('workspaceInviteUrl').value).toBe('https://sneup.example.test/?invite=one-time-evidence');
    expect(harness.dom.window.document.getElementById('workspaceInviteRefreshStatus').textContent)
      .toBe('The invitation was created, but Workspace administration could not refresh. The secure link below is still valid.');
    expect(harness.callbacks.openNotice).not.toHaveBeenCalled();
    harness.dom.window.close();
  });

  test('locks duplicate invitation submits and renders a replacement link before refreshing', async () => {
    const harness = createHarness('en');
    let resolveCreate;
    harness.callbacks.createWorkspaceInvitation.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    harness.controller.openWorkspaceInvite();
    const form = harness.dom.window.document.getElementById('workspaceInviteForm');
    form.elements.email.value = 'person@example.test';
    form.elements.displayName.value = 'Invitation Person';
    const submit = new harness.dom.window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submit);
    form.dispatchEvent(new harness.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(harness.callbacks.createWorkspaceInvitation).toHaveBeenCalledTimes(1);

    resolveCreate({
      inviteUrl: 'https://sneup.example.test/?invite=single-submit',
      delivery: { status: 'sent' }
    });
    await settle();
    expect(harness.dom.window.document.getElementById('workspaceInviteUrl').value).toContain('single-submit');
    expect(harness.callbacks.refreshWorkspaceAdmin).toHaveBeenCalledTimes(1);
    harness.dom.window.close();
  });

  test('keeps resend and revoke commit outcomes truthful when workspace refresh fails', async () => {
    const retryHarness = createHarness('en');
    retryHarness.callbacks.refreshWorkspaceAdmin.mockRejectedValueOnce(new Error('Workspace refresh unavailable'));
    retryHarness.controller.openInviteDeliveryRetryConfirmation(retryHarness.state.workspaceInvitations[0]);
    retryHarness.dom.window.document.getElementById('confirmInviteDeliveryRetry').click();
    await settle();
    expect(retryHarness.callbacks.retryWorkspaceInvitationDelivery).toHaveBeenCalledTimes(1);
    expect(retryHarness.dom.window.document.getElementById('workspaceInviteUrl').value).toContain('replacement-token');
    expect(retryHarness.dom.window.document.getElementById('workspaceInviteRefreshStatus').textContent)
      .toContain('secure link below is still valid');
    retryHarness.dom.window.close();

    const revokeHarness = createHarness('en');
    revokeHarness.callbacks.revokeWorkspaceInvitation
      .mockRejectedValueOnce(new Error('Revocation temporarily unavailable'))
      .mockResolvedValueOnce({ success: true });
    revokeHarness.callbacks.refreshWorkspaceAdmin.mockRejectedValueOnce(new Error('Workspace refresh unavailable'));
    revokeHarness.controller.openInviteRevocationConfirmation(revokeHarness.state.workspaceInvitations[0]);
    let button = revokeHarness.dom.window.document.getElementById('confirmInviteRevoke');
    button.click();
    await settle();
    expect(button.disabled).toBe(false);
    expect(revokeHarness.dom.window.document.querySelector('[data-invitation-status]').textContent)
      .toBe('Revocation temporarily unavailable');
    button.click();
    await settle();
    expect(revokeHarness.callbacks.revokeWorkspaceInvitation).toHaveBeenCalledTimes(2);
    expect(revokeHarness.callbacks.openNotice).toHaveBeenCalledWith(
      'Invitation revoked',
      'The invitation was revoked, but Workspace administration could not refresh. Reopen Workspaces to load the latest state.'
    );
    revokeHarness.dom.window.close();
  });

  test('separates invitation acceptance, session persistence, and workspace reload outcomes', async () => {
    const harness = createHarness('en');
    harness.callbacks.acceptWorkspaceInvitation
      .mockRejectedValueOnce(new Error('Invitation not accepted'))
      .mockResolvedValueOnce({ sessionPersisted: false });
    harness.controller.openInviteAcceptance('raw-one-time-token');
    let form = harness.dom.window.document.getElementById('acceptWorkspaceInviteForm');
    form.elements.displayName.value = 'Accepted Person';
    form.dispatchEvent(new harness.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await settle();
    expect(form.elements.displayName.value).toBe('Accepted Person');
    expect(form.querySelector('button[type="submit"]').disabled).toBe(false);
    expect(form.querySelector('[data-invitation-status]').textContent).toBe('Invitation not accepted');

    form.dispatchEvent(new harness.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await settle();
    expect(harness.callbacks.acceptWorkspaceInvitation).toHaveBeenCalledTimes(2);
    expect(harness.callbacks.reloadAfterInvitationAcceptance).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.openNotice).toHaveBeenCalledWith(
      'Workspace joined',
      'This workspace is open in the current window, but Sneup could not retain the session. Sign in again after restarting Sneup.'
    );
    harness.dom.window.close();

    const staleHarness = createHarness('en');
    staleHarness.callbacks.reloadAfterInvitationAcceptance.mockRejectedValueOnce(new Error('Workspace reload unavailable'));
    staleHarness.controller.openInviteAcceptance('another-one-time-token');
    form = staleHarness.dom.window.document.getElementById('acceptWorkspaceInviteForm');
    form.elements.displayName.value = 'Accepted Person';
    form.dispatchEvent(new staleHarness.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await settle();
    expect(staleHarness.callbacks.acceptWorkspaceInvitation).toHaveBeenCalledTimes(1);
    expect(staleHarness.callbacks.openNotice).toHaveBeenCalledWith(
      'Workspace joined',
      'The invitation was accepted, but Sneup could not load the workspace. Restart Sneup or refresh this page to continue.'
    );
    staleHarness.dom.window.close();
  });

  test('keeps every workspace operator message in the Dutch catalog', () => {
    const runtime = createRuntime({ root: null, language: 'nl', storage: null });
    runtime.registerMessages('nl', WORKSPACE_NL_MESSAGES);
    const messages = new Set(DYNAMIC_OPERATOR_MESSAGES);
    for (const match of moduleSource.matchAll(/\b(?:t|et)\(\s*'([^']+)'/g)) messages.add(match[1]);
    for (const match of moduleSource.matchAll(/\b(?:plural|ep)\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
      messages.add(match[1]);
      messages.add(match[2]);
    }
    [
      'The workspace view loaded without its runtime. Try again.',
      'The workspace view could not be loaded. Check the connection and try again.'
    ].forEach(message => messages.add(message));
    expect([...messages].filter(message => !runtime.hasTranslation(message))).toEqual([]);
  });

  test('keeps consequential workspace forms and confirmations localized', () => {
    const runtime = createRuntime({ root: null, language: 'nl', storage: null });
    runtime.registerMessages('nl', WORKSPACE_NL_MESSAGES);
    const range = appSource.slice(appSource.indexOf('function openIntegrityRepair'), appSource.indexOf('function renderWorkSignals'));
    const messages = new Set([
      'Stuck card', 'No activity', 'Overdue card', 'Member overloaded', 'Blocking other work',
      'No response to follow-up', 'Performance milestone', 'Low-risk queue', 'Medium-risk queue',
      'High-risk queue', 'Critical queue', 'system', 'user', 'enabled', 'paused'
    ]);
    for (const match of range.matchAll(/\b(?:t|et)\(\s*'([^']+)'/g)) messages.add(match[1]);
    for (const match of range.matchAll(/\btp\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
      messages.add(match[1]);
      messages.add(match[2]);
    }
    expect([...messages].filter(message => !runtime.hasTranslation(message))).toEqual([]);
    expect(appSource).toContain("els.modalTitle.textContent = t('Delete archived workspace?')");
    expect(moduleSource).toContain("elements.modalTitle.textContent = t('Retry invitation email?')");
    expect(appSource).toContain("els.modalTitle.textContent = t('Revoke session?')");
    expect(appSource).toContain("i18n.registerMessages('nl', module.NL_MESSAGES)");
    expect(moduleSource).toContain("submitButton.textContent = t('Create invitation')");
    expect(appSource).toContain("button.textContent = t('Revoke session')");
    expect(moduleSource).toContain("submitButton.textContent = t('Join workspace')");
  });

  test('loads the renderer only with the workspace view and retries a failed module fetch', () => {
    expect(htmlSource).not.toContain('/workspaceView.js');
    expect(appSource).toContain("loadBrowserModule('/workspaceView.js', 'SneupWorkspaceView'");
    expect(appSource).toContain('workspaceViewPromise = null');
    expect(appSource).toContain("fetchApi('/api/workspaces/current'),\n      loadWorkspaceView()");
    expect(appSource).toContain('function openIntegrityRepair()');
    expect(appSource).toContain('function openRetentionPolicy()');
    expect(appSource).toContain('function openRetentionApply()');
    expect(appSource).toContain('function buildPolicyRuleUpdateBody(');
    expect(appSource).toContain('workspaceViewController?.openPolicyRuleForm(actionType)');
    expect(appSource).toContain("fetchApi(`/api/policy-rules/${encodeURIComponent(actionType)}`");
    expect(appSource).toContain("ownerType: ['high', 'critical'].includes(risk) ? 'robert'");
    expect(appSource).not.toContain('id="policyRuleForm"');
    expect(appSource).not.toContain('id="workspaceInviteForm"');
    expect(appSource).not.toContain('id="acceptWorkspaceInviteForm"');
    expect(appSource).toContain("fetchApi(`/api/workspaces/${encodeURIComponent(workspaceId)}/invitations`");
    expect(appSource).toContain("fetchApi('/api/workspaces/invitations/accept'");
    expect(appSource).toContain('sessionStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken)');
    const acceptanceSource = appSource.slice(
      appSource.indexOf('async function acceptWorkspaceInvitation('),
      appSource.indexOf('async function reloadAfterInvitationAcceptance(')
    );
    expect(acceptanceSource.indexOf("fetchApi('/api/workspaces/invitations/accept'")).toBeLessThan(
      acceptanceSource.indexOf('sessionStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken)')
    );
    expect(acceptanceSource).toContain('sessionPersisted = false');
    expect(acceptanceSource).toContain('return { sessionPersisted };');
    expect(appSource).not.toContain('function renderWorkspace(workspace)');
    expect(moduleSource).toContain('id="policyRuleForm"');
    expect(moduleSource).toContain('id="workspaceInviteForm"');
    expect(moduleSource).toContain('id="acceptWorkspaceInviteForm"');
    expect(moduleSource).not.toContain('fetchApi(');
    expect(moduleSource).not.toMatch(/Authorization|Bearer|sessionToken/);
    expect(moduleSource).not.toMatch(/SESSION_TOKEN|localStorage|sessionStorage|document\.cookie/);
  });
});
