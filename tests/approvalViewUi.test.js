const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { createRuntime } = require('../public/i18n');
const { createController, DYNAMIC_OPERATOR_MESSAGES, NL_MESSAGES: APPROVAL_NL_MESSAGES } = require('../public/approvalView');

const rootDir = path.join(__dirname, '..');
const moduleSource = fs.readFileSync(path.join(rootDir, 'public', 'approvalView.js'), 'utf8');
const appSource = fs.readFileSync(path.join(rootDir, 'public', 'app.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const elementIds = [
  'modal', 'modalTitle', 'modalBody',
  'approvalCount', 'ledgerMetrics', 'notificationPolicyButton', 'decisionQueue',
  'recommendationCount', 'recommendationList', 'findingsCount', 'findingsList',
  'timelineCount', 'operationsTimeline', 'boardHealthCount', 'boardHealthList',
  'trelloAttemptCount', 'trelloAttempts', 'notificationPolicyCount', 'notificationPolicies',
  'notificationDeliveryCount', 'notificationDeliveries', 'followUpCount', 'followUps',
  'accountabilityCount', 'accountabilityList', 'outcomeCount', 'outcomeList',
  'auditCount', 'auditTrail'
];

const makeCallbacks = () => ({
  runRecommendationAction: jest.fn(),
  runDecisionAction: jest.fn(),
  runFollowUpAction: jest.fn(),
  openWorkerResponseRecorder: jest.fn(),
  editRecommendationPayload: jest.fn(),
  openRecommendationEvidence: jest.fn(),
  openTrelloActionReconciliation: jest.fn(),
  runOutcomeEvaluation: jest.fn(),
  saveNotificationPolicy: jest.fn().mockResolvedValue({ policy: { id: 'policy-1' } }),
  setNotificationPolicyStatus: jest.fn().mockResolvedValue({ policy: { id: 'policy-1' } }),
  sendNotificationPolicyTest: jest.fn().mockResolvedValue({ status: 'delivered' }),
  loadOperationsLedger: jest.fn().mockResolvedValue(undefined),
  closeModal: jest.fn(),
  openNotice: jest.fn(),
  openNotificationDeliveryEvidence: jest.fn(),
  bindLedgerDrilldownActions: jest.fn(),
  bindGraphActions: jest.fn()
});

function createHarness(locale = 'nl') {
  const dom = new JSDOM(`<!doctype html><html><body>
    <button data-queue-filter="all"></button>
    ${elementIds.map(id => ['notificationPolicyButton'].includes(id) ? `<button id="${id}"></button>` : `<div id="${id}"></div>`).join('')}
  </body></html>`, { url: 'http://127.0.0.1:3211/' });
  const i18n = createRuntime({ root: null, language: locale, storage: null });
  i18n.registerMessages('nl', APPROVAL_NL_MESSAGES);
  const callbacks = makeCallbacks();
  const state = {
    queueFilter: 'all',
    notificationJobHealth: [{ jobName: 'notifications.reconciliation_alerts', status: 'healthy', lastRunAt: '2026-08-09T09:00:00.000Z' }],
    ledger: {
      demoMode: false,
      errors: [],
      decisions: [{
        _id: 'decision-1', recommendationId: 'recommendation-1', ownerType: 'robert', riskLevel: 'high',
        question: 'Evidence question remains verbatim?', reason: 'Evidence decision reason remains verbatim.',
        recommendedAnswer: 'yes', sourceEvidence: [{ type: 'card', label: 'Decision Evidence', url: 'https://trello.com/c/abc123/evidence' }]
      }],
      recommendations: [{
        _id: 'recommendation-1', title: 'Recommendation Evidence Title', status: 'pending',
        actionType: 'comment', ownerType: 'robert', riskLevel: 'high', confidence: 0.91,
        approvalReason: 'Approval evidence remains verbatim.', actionPayload: { cardTrelloId: 'abc123', commentText: 'Exact payload evidence.' },
        sourceEvidence: [{ type: 'card', label: 'Recommendation Evidence', url: 'https://trello.com/c/abc123/evidence' }]
      }],
      actions: [{
        _id: 'attempt-1', actionType: 'comment', status: 'in_progress', createdAt: '2026-08-09T10:00:00.000Z',
        errorMessage: 'Provider error evidence remains verbatim.', payload: { commentText: 'Attempt evidence.' },
        reconciliation: { status: 'required', reason: 'Provider result evidence remains verbatim.', confirmedSteps: [], pendingSteps: ['comment_posted'] }
      }],
      auditEvents: [{
        action: 'audit_action_evidence', source: 'approval_source_evidence', actor: 'Audit Actor Evidence',
        entityType: 'recommendation', riskLevel: 'high', createdAt: '2026-08-09T10:30:00.000Z'
      }],
      followUps: [{
        _id: 'follow-up-1', interventionId: 'intervention-1', reason: 'Follow-up evidence remains verbatim.',
        status: 'due', dueAt: '2026-08-10T10:00:00.000Z', nextAction: 'Next-action evidence remains verbatim.'
      }],
      workerResponses: [{ _id: 'response-1' }],
      accountability: {
        summary: { members: 1, overdueFollowUps: 1, membersNeedingAttention: 1 },
        members: [{ name: 'Worker Identity Evidence', attention: 'needs_attention', workloadLevel: 'high', followUpsCreated: 2, responseCount: 1, responseCoverage: 50, overdueFollowUps: 1, escalatedFollowUps: 1, blockedResponses: 0, ignoredResponses: 0 }]
      },
      outcomes: [{
        status: 'awaiting_evidence', actionType: 'comment', evaluatedAt: '2026-08-09T11:00:00.000Z',
        summary: 'Outcome evidence remains verbatim.', recommendationId: { _id: 'recommendation-1', title: 'Outcome Recommendation Evidence' }
      }],
      findings: [{
        title: 'Finding Evidence Title', severity: 'critical', findingType: 'stale_card', waitingOn: 'team',
        signalScore: 88, recommendedAction: 'Finding action evidence remains verbatim.',
        boardId: { name: 'Board Identity Evidence' }, cardId: { _id: 'card-1', name: 'Card Identity Evidence' }
      }],
      healthSnapshots: [{
        boardId: { name: 'Health Board Evidence' }, healthStatus: 'at_risk', healthScore: 42,
        counts: { findings: 3, robertQueueCandidates: 1, vaReadyCandidates: 2 }, summary: 'Health summary evidence remains verbatim.'
      }],
      reconciliationHealth: { summary: { requiresOperator: 1, critical: 1, warning: 0 }, thresholds: { warningHours: 4, criticalHours: 24 }, items: [{ severity: 'critical', actionType: 'comment', message: 'Reconciliation evidence remains verbatim.' }] },
      notificationPolicies: [{
        id: 'policy-1', name: 'Policy Identity Evidence', status: 'active', channel: 'slack_webhook',
        destinationLabel: 'Destination Identity Evidence', destinationConfigured: true, minimumSeverity: 'warning',
        eventTypes: ['reconciliation_alert'], quietHours: { enabled: false }, digest: { enabled: false }
      }],
      notificationDeliveries: [{
        id: 'delivery-1', policyId: 'policy-1', title: 'Delivery Evidence Title', status: 'delivered', severity: 'warning',
        deliveredAt: '2026-08-09T11:30:00.000Z', message: 'Delivery evidence remains verbatim.',
        sourceEvidence: [{ sourceType: 'card', label: 'Delivery Source Evidence', url: 'https://trello.com/c/abc123/evidence' }]
      }],
      timeline: [{ title: 'Timeline Evidence Title', status: 'recorded', severity: 'high', type: 'approval_event', occurredAt: '2026-08-09T12:00:00.000Z', meta: ['Timeline meta remains verbatim.'] }]
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
    severityClass: value => ['critical', 'high'].includes(value) ? value : 'review',
    getId: value => typeof value === 'string' ? value : value?._id || value?.id || '',
    canEditPayload: () => true
  });
  return { dom, state, elements, callbacks, controller, i18n };
}

describe('demand-loaded approval view', () => {
  test('renders Dutch operator chrome while preserving identities, evidence, errors, and exact payloads', () => {
    const harness = createHarness('nl');
    harness.controller.render();
    const text = harness.dom.window.document.body.textContent;

    expect(text).toContain('Robert-beslissingen');
    expect(text).toContain('Payload beoordelen');
    expect(text).toContain('Resultaat afstemmen');
    expect(text).toContain('Reactie vastleggen');
    expect(text).toContain('Bewerken');
    expect(text).toContain('Geen datum');
    expect(text).toContain('Antwoord: ja');
    expect(text).toContain('verouderde kaart');
    expect(text).toContain('Slack-webhook');
    expect(text).toContain('goedkeuringsgebeurtenis');
    expect(text).toContain('Recommendation Evidence Title');
    expect(text).toContain('Approval evidence remains verbatim.');
    expect(text).toContain('Provider error evidence remains verbatim.');
    expect(text).toContain('Provider result evidence remains verbatim.');
    expect(text).toContain('reactie geplaatst');
    expect(text).toContain('Worker Identity Evidence');
    expect(text).toContain('Audit Actor Evidence');
    expect(text).toContain('audit_action_evidence');
    expect(text).toContain('Exact payload evidence.');
    expect(text).toContain('Destination Identity Evidence');
    expect(harness.elements.decisionQueue.querySelector('.evidence-link').title).toBe('kaart-bewijs');
    harness.dom.window.close();
  });

  test('delegates every consequential command to the guarded app controller', async () => {
    const harness = createHarness('en');
    harness.controller.render();
    const { document } = harness.dom.window;

    document.querySelector('[data-recommendation-action="approve"]').click();
    document.querySelector('[data-decision-action="snooze"]').click();
    document.querySelector('[data-payload-edit]').click();
    document.querySelector('[data-recommendation-evidence]').click();
    document.querySelector('[data-trello-action-reconcile]').click();
    document.querySelector('[data-followup-response]').click();
    document.querySelector('[data-followup-action="resolved"]').click();
    document.querySelector('[data-outcome-evaluate]').click();
    document.querySelector('[data-notification-policy-edit]').click();
    document.querySelector('[data-notification-policy-pause]').click();
    document.querySelector('[data-notification-policy-test]').click();
    document.querySelector('[data-notification-delivery-evidence]').click();

    expect(harness.callbacks.runRecommendationAction).toHaveBeenCalledWith('recommendation-1', 'approve');
    expect(harness.callbacks.runDecisionAction).toHaveBeenCalledWith('decision-1', 'snooze');
    expect(harness.callbacks.editRecommendationPayload).toHaveBeenCalledWith('recommendation-1');
    expect(harness.callbacks.openRecommendationEvidence).toHaveBeenCalledWith('recommendation-1');
    expect(harness.callbacks.openTrelloActionReconciliation).toHaveBeenCalledWith('attempt-1');
    expect(harness.callbacks.openWorkerResponseRecorder).toHaveBeenCalledWith('intervention-1');
    expect(harness.callbacks.runFollowUpAction).toHaveBeenCalledWith('follow-up-1', 'resolved');
    expect(harness.callbacks.runOutcomeEvaluation).toHaveBeenCalledWith('recommendation-1');
    await Promise.resolve();
    expect(harness.callbacks.setNotificationPolicyStatus).toHaveBeenCalledWith('policy-1', 'paused');
    expect(document.getElementById('notificationTestForm')).not.toBeNull();
    expect(harness.callbacks.openNotificationDeliveryEvidence).toHaveBeenCalledWith('delivery-1');
    expect(harness.callbacks.bindLedgerDrilldownActions).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.bindGraphActions).toHaveBeenCalledTimes(1);
    harness.dom.window.close();
  });

  test('renders and saves a bounded Dutch daily-brief policy once with guarded values', async () => {
    const harness = createHarness('nl');
    const policy = {
      id: 'policy/1',
      name: 'Daily evidence policy',
      status: 'paused',
      channel: 'email',
      destinationLabel: 'Operations mailbox',
      destinationConfigured: true,
      minimumSeverity: 'critical',
      eventTypes: ['reconciliation_alert', 'weekly_status_report', 'daily_operations_brief'],
      quietHours: { enabled: true, startHourUtc: 19, endHourUtc: 7 },
      digest: { enabled: true, hourUtc: 9, maximumItems: 12 },
      reportSchedule: { enabled: true, dayOfWeekUtc: 2, hourUtc: 11 },
      dailyBriefSchedule: { enabled: true, hourUtc: 10 }
    };
    let resolveSave;
    harness.callbacks.saveNotificationPolicy.mockImplementation(() => new Promise(resolve => { resolveSave = resolve; }));

    expect(harness.controller.openNotificationPolicyForm(policy)).toBe(true);
    const { document, Event } = harness.dom.window;
    const form = document.getElementById('notificationPolicyForm');
    expect(harness.elements.modalTitle.textContent).toBe('Afleverbeleid bewerken');
    expect(form.elements.dailyBriefHourUtc.value).toBe('10');
    expect(document.getElementById('notificationDailyBriefSettings').hidden).toBe(false);
    expect(form.elements.destinationEmail.required).toBe(false);
    form.elements.name.value = 'Updated policy evidence';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(harness.callbacks.saveNotificationPolicy).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.saveNotificationPolicy).toHaveBeenCalledWith('policy/1', expect.objectContaining({
      name: 'Updated policy evidence',
      channel: 'email',
      destinationValue: '',
      eventTypes: ['reconciliation_alert', 'weekly_status_report', 'daily_operations_brief'],
      quietStartHourUtc: 19,
      quietEndHourUtc: 7,
      digestMaximumItems: 12,
      reportDayOfWeekUtc: 2,
      reportHourUtc: 11,
      dailyBriefHourUtc: 10
    }));

    resolveSave({ policy: { id: 'policy/1' } });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(harness.callbacks.closeModal).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.loadOperationsLedger).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.openNotice).toHaveBeenCalledWith('Beleid opgeslagen', 'De wijzigingen in het afleverbeleid zijn opgeslagen met auditbewijs.');
    harness.dom.window.close();
  });

  test('keeps a failed policy save retryable and a committed save truthful when refresh fails', async () => {
    const harness = createHarness('en');
    harness.callbacks.saveNotificationPolicy.mockRejectedValueOnce(new Error('Save rejected')).mockResolvedValueOnce({ policy: { id: 'policy-new' } });
    harness.callbacks.loadOperationsLedger.mockRejectedValueOnce(new Error('Refresh unavailable'));
    harness.controller.openNotificationPolicyForm();
    const { document, Event } = harness.dom.window;
    const form = document.getElementById('notificationPolicyForm');
    form.elements.name.value = 'Operations policy';
    form.elements.destinationLabel.value = 'Operations';
    form.elements.destinationUrl.value = 'https://example.com/hook';
    const submit = form.querySelector('button[type="submit"]');

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(submit.disabled).toBe(false);
    expect(harness.callbacks.closeModal).not.toHaveBeenCalled();
    expect(harness.callbacks.openNotice).toHaveBeenCalledWith('Policy not saved', 'Save rejected');

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(harness.callbacks.saveNotificationPolicy).toHaveBeenCalledTimes(2);
    expect(harness.callbacks.closeModal).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.openNotice).toHaveBeenLastCalledWith(
      'Policy saved',
      'The policy change was saved, but the operations ledger could not refresh. Reopen Approvals to load the latest state.'
    );
    harness.dom.window.close();
  });

  test('closes a delivered external test before reporting a refresh failure and never resubmits', async () => {
    const harness = createHarness('en');
    harness.callbacks.loadOperationsLedger.mockRejectedValue(new Error('Refresh unavailable'));
    const policy = harness.state.ledger.notificationPolicies[0];
    harness.controller.openNotificationTest(policy);
    const { document, Event } = harness.dom.window;
    const form = document.getElementById('notificationTestForm');
    form.elements.confirmDelivery.checked = true;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(harness.callbacks.sendNotificationPolicyTest).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.sendNotificationPolicyTest).toHaveBeenCalledWith('policy-1');
    expect(harness.callbacks.closeModal).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.openNotice).toHaveBeenLastCalledWith(
      'Test delivered',
      'The test was delivered, but the operations ledger could not refresh. Reopen Approvals to load the latest evidence.'
    );
    harness.dom.window.close();
  });

  test('activates a policy once, closes the confirmation, and keeps the success notice visible', async () => {
    const harness = createHarness('en');
    const policy = { ...harness.state.ledger.notificationPolicies[0], status: 'paused' };
    harness.controller.openNotificationActivation(policy);
    const { document, Event } = harness.dom.window;
    const form = document.getElementById('activateNotificationPolicyForm');
    form.elements.confirmActivation.checked = true;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(harness.callbacks.setNotificationPolicyStatus).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.setNotificationPolicyStatus).toHaveBeenCalledWith('policy-1', 'active');
    expect(harness.callbacks.closeModal).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.loadOperationsLedger).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.openNotice).toHaveBeenLastCalledWith('Policy activated', 'The delivery policy is active with audit evidence.');
    harness.dom.window.close();
  });

  test('keeps unsafe or credential-bearing evidence URLs inert', () => {
    const harness = createHarness('en');
    harness.state.ledger.decisions[0].sourceEvidence = [
      { type: 'card', label: 'HTTP evidence', url: 'http://trello.com/c/abc123' },
      { type: 'card', label: 'Credential evidence', url: 'https://user:secret@trello.com/c/abc123' }
    ];
    harness.controller.render();
    expect(harness.elements.decisionQueue.querySelectorAll('a')).toHaveLength(0);
    expect(harness.elements.decisionQueue.textContent).toContain('HTTP evidence');
    expect(harness.elements.decisionQueue.textContent).toContain('Credential evidence');
    harness.dom.window.close();
  });

  test('keeps every approval operator message in the Dutch catalog', () => {
    const runtime = createRuntime({ root: null, language: 'nl', storage: null });
    runtime.registerMessages('nl', APPROVAL_NL_MESSAGES);
    const messages = new Set(DYNAMIC_OPERATOR_MESSAGES);
    for (const match of moduleSource.matchAll(/\b(?:t|et)\(\s*'([^']+)'/g)) messages.add(match[1]);
    for (const match of moduleSource.matchAll(/\b(?:plural|ep)\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
      messages.add(match[1]);
      messages.add(match[2]);
    }
    [
      'The approval view loaded without its runtime. Try again.',
      'The approval view could not be loaded. Check the connection and try again.'
    ].forEach(message => messages.add(message));
    expect([...messages].filter(message => !runtime.hasTranslation(message))).toEqual([]);
  });

  test('keeps exact-payload, evidence, reconciliation, and delivery modals localized', () => {
    const runtime = createRuntime({ root: null, language: 'nl', storage: null });
    runtime.registerMessages('nl', APPROVAL_NL_MESSAGES);
    const ranges = [
      appSource.slice(appSource.indexOf('async function runRecommendationAction'), appSource.indexOf('async function openOperatingLedger')),
      appSource.slice(appSource.indexOf('function openTrelloActionReconciliation'), appSource.indexOf('function closeModal'))
    ].join('\n');
    const messages = new Set([
      'Comment text', 'Follow-up text', 'Notification text', 'Target Trello list',
      'New accountable owner', 'Optional reassignment note', 'Escalation text', 'Label name',
      'Label color', 'Due date (ISO 8601)', 'Checklist name', 'Checklist items (one per line)',
      'yellow', 'purple', 'blue', 'red', 'green', 'orange', 'black', 'sky', 'pink', 'lime'
    ]);
    for (const match of ranges.matchAll(/\b(?:t|et)\(\s*'([^']+)'/g)) messages.add(match[1]);
    for (const match of ranges.matchAll(/\btp\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
      messages.add(match[1]);
      messages.add(match[2]);
    }
    expect([...messages].filter(message => !runtime.hasTranslation(message))).toEqual([]);
    expect(appSource).toContain("openNotice(t('Recommendation updated')");
    expect(appSource).toContain("els.modalTitle.textContent = t('Reconcile {action}'");
    expect(moduleSource).toContain("elements.modalTitle.textContent = t(isEdit ? 'Edit delivery policy' : 'Add delivery policy')");
  });

  test('loads on approval entry, shares the asset fingerprint, and retries a failed module fetch', () => {
    expect(htmlSource).not.toContain('/approvalView.js');
    expect(appSource).toContain("loadBrowserModule('/approvalView.js', 'SneupApprovalView'");
    expect(appSource).toContain("i18n.registerMessages('nl', module.NL_MESSAGES)");
    expect(appSource).toContain('approvalViewPromise = null');
    expect(appSource).toContain('loadNotificationDeliveryHealth(),\n    loadApprovalView()');
    expect(appSource).toContain('function runRecommendationAction(');
    expect(appSource).toContain('function openTrelloActionReconciliation(');
    expect(moduleSource).toContain('function openNotificationActivation(');
    expect(moduleSource).not.toContain('fetchApi(');
    expect(moduleSource).not.toMatch(/sessionStorage|localStorage|document\.cookie|SESSION_TOKEN/);
    expect(appSource).toContain("function buildNotificationPolicyBody(draft = {})");
    expect(appSource).toContain("dailyBriefSchedule: {");
    expect(appSource).toContain("/api/notifications/policies/${encodeURIComponent(policyId)}");
    expect(appSource).toContain("status === 'active' ? { confirmActivation: true } : {}");
    expect(appSource).not.toContain('function openNotificationPolicyForm(');
    expect(appSource).not.toContain('function renderDecisionItem(');
  });
});
