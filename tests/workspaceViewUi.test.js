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
  openInviteRevocationConfirmation: jest.fn(),
  openInviteDeliveryRetryConfirmation: jest.fn(),
  openPolicyRuleEditor: jest.fn(),
  openFeatureFlagEditor: jest.fn(),
  openFeatureFlagHistory: jest.fn(),
  loadPolicyHistory: jest.fn(),
  closeModal: jest.fn(),
  enhanceForm: jest.fn()
});

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

  test('delegates every consequential action to the existing guarded controller', () => {
    const harness = createHarness('en');
    harness.controller.render();
    const { document } = harness.dom.window;

    document.querySelector('[data-workspace-user-sessions]').click();
    document.querySelector('[data-retry-workspace-invite-delivery]').click();
    document.querySelector('[data-revoke-workspace-invite]').click();
    document.querySelector('[data-policy-rule]').click();
    document.querySelector('[data-feature-history]').click();
    document.querySelector('[data-feature-flag]').click();
    document.querySelector('[data-integrity-repair]').click();
    document.querySelector('[data-retention-configure]').click();
    document.querySelector('[data-retention-apply]').click();

    expect(harness.callbacks.openWorkspaceUserSessions).toHaveBeenCalledWith('user-1');
    expect(harness.callbacks.openInviteDeliveryRetryConfirmation).toHaveBeenCalledWith(harness.state.workspaceInvitations[0]);
    expect(harness.callbacks.openInviteRevocationConfirmation).toHaveBeenCalledWith(harness.state.workspaceInvitations[0]);
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
    const range = appSource.slice(appSource.indexOf('function openIntegrityRepair'), appSource.indexOf('function renderEnhancements'));
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
    expect(appSource).toContain("els.modalTitle.textContent = t('Retry invitation email?')");
    expect(appSource).toContain("els.modalTitle.textContent = t('Revoke session?')");
    expect(appSource).toContain("i18n.registerMessages('nl', module.NL_MESSAGES)");
    expect(appSource).toContain("submitButton.textContent = t('Create invitation')");
    expect(appSource).toContain("button.textContent = t('Revoke session')");
    expect(appSource).toContain("submitButton.textContent = t('Join workspace')");
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
    expect(appSource).not.toContain('function renderWorkspace(workspace)');
    expect(moduleSource).toContain('id="policyRuleForm"');
    expect(moduleSource).not.toContain('fetchApi(');
    expect(moduleSource).not.toMatch(/SESSION_TOKEN|localStorage|sessionStorage|document\.cookie/);
  });
});
