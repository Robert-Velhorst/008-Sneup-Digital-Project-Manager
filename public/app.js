const FIRST_RUN_SETUP_KEY = 'sneup.firstRun.v1';
const SESSION_TOKEN_KEY = 'sneup.sessionToken.v1';
const CONNECTOR_PAGE_SIZE = 24;
let connectorSearchTimer;
const i18n = window.SneupI18n || {
  t: value => value,
  plural: (singular, pluralMessage, count) => String(count === 1 ? singular : pluralMessage).replace('{count}', count),
  formatDate: value => new Date(value).toLocaleString(),
  getLocale: () => 'en',
  setLocale: () => 'en'
};
const t = (message, params) => i18n.t(message, params);
const tp = (singular, pluralMessage, count, params) => i18n.plural(singular, pluralMessage, count, params);
const et = (message, params) => escapeHtml(t(message, params));
const appAssetVersion = (() => {
  try {
    return new URL(document.currentScript?.src || '', window.location.href).searchParams.get('v') || '';
  } catch (error) {
    return '';
  }
})();
let connectorViewPromise;
let workspaceViewPromise;
let workspaceViewController;
let approvalViewPromise;
let approvalViewController;
let workSignalsViewPromise;
let workSignalsViewController;

function loadBrowserModule(path, globalName, messages = {}) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const url = new URL(path, window.location.href);
    if (appAssetVersion) url.searchParams.set('v', appAssetVersion);
    script.src = url.toString();
    script.async = true;
    script.dataset.sneupModule = globalName;
    script.addEventListener('load', () => {
      if (window[globalName]) {
        resolve(window[globalName]);
        return;
      }
      script.remove();
      reject(new Error(t(messages.runtime || 'This view loaded without its runtime. Try again.')));
    }, { once: true });
    script.addEventListener('error', () => {
      script.remove();
      reject(new Error(t(messages.load || 'This view could not be loaded. Check the connection and try again.')));
    }, { once: true });
    document.head.appendChild(script);
  });
}

function loadConnectorView() {
  if (!connectorViewPromise) {
    connectorViewPromise = loadBrowserModule('/connectorView.js', 'SneupConnectorView', {
      runtime: 'The connector view loaded without its runtime. Try again.',
      load: 'The connector view could not be loaded. Check the connection and try again.'
    })
      .then(module => module.createController({
        document,
        window,
        state,
        elements: els,
        t,
        plural: tp,
        escapeHtml,
        formatDate,
        isFeatureEnabled,
        callbacks: {
          loadConnectors,
          startConnection,
          syncConnectorAccount,
          openNotice,
          openWorkerResponseBindingsModal,
          openJiraSiteModal,
          openConfluenceSiteModal,
          openAsanaWorkspaceModal,
          openBasecampAccountModal,
          openResourceGuruAccountModal,
          openFigmaTeamModal,
          openSharePointSiteModal,
          openMuralWorkspaceModal,
          openXeroTenantModal,
          openProcoreCompanyModal
        }
      }))
      .catch((error) => {
        connectorViewPromise = null;
        throw error;
      });
  }
  return connectorViewPromise;
}

function loadWorkspaceView() {
  if (!workspaceViewPromise) {
    workspaceViewPromise = loadBrowserModule('/workspaceView.js', 'SneupWorkspaceView', {
      runtime: 'The workspace view loaded without its runtime. Try again.',
      load: 'The workspace view could not be loaded. Check the connection and try again.'
    })
      .then((module) => {
        i18n.registerMessages('nl', module.NL_MESSAGES);
        return module.createController({
          document,
          state,
          elements: els,
          t,
          plural: tp,
          escapeHtml,
          formatDate,
          severityClass,
          callbacks: {
            openIntegrityRepair,
            openRetentionPolicy,
            openRetentionApply,
            openWorkspaceUserSessions,
            openInviteRevocationConfirmation,
            openInviteDeliveryRetryConfirmation,
            openPolicyRuleEditor,
            openFeatureFlagEditor,
            openFeatureFlagHistory,
            loadPolicyHistory
          }
        });
      })
      .then((controller) => {
        workspaceViewController = controller;
        return controller;
      })
      .catch((error) => {
        workspaceViewPromise = null;
        workspaceViewController = null;
        throw error;
      });
  }
  return workspaceViewPromise;
}

function loadApprovalView() {
  if (!approvalViewPromise) {
    approvalViewPromise = loadBrowserModule('/approvalView.js', 'SneupApprovalView', {
      runtime: 'The approval view loaded without its runtime. Try again.',
      load: 'The approval view could not be loaded. Check the connection and try again.'
    })
      .then((module) => {
        i18n.registerMessages('nl', module.NL_MESSAGES);
        return module.createController({
          document,
          state,
          elements: els,
          t,
          plural: tp,
          escapeHtml,
          formatDate,
          severityClass,
          getId,
          canEditPayload: recommendation => getPayloadReviewFields(recommendation).length > 0,
          callbacks: {
            runRecommendationAction,
            runDecisionAction,
            runFollowUpAction,
            openWorkerResponseRecorder,
            editRecommendationPayload,
            openRecommendationEvidence,
            openTrelloActionReconciliation,
            runOutcomeEvaluation,
            openNotificationPolicyEditor,
            openNotificationActivation,
            updateNotificationPolicy,
            openNotificationTest,
            openNotificationDeliveryEvidence,
            bindLedgerDrilldownActions,
            bindGraphActions
          }
        });
      })
      .then((controller) => {
        approvalViewController = controller;
        return controller;
      })
      .catch((error) => {
        approvalViewPromise = null;
        approvalViewController = null;
        throw error;
      });
  }
  return approvalViewPromise;
}

function loadWorkSignalsView() {
  if (!workSignalsViewPromise) {
    workSignalsViewPromise = loadBrowserModule('/workSignalsView.js', 'SneupWorkSignalsView', {
      runtime: 'The Work Signals view loaded without its runtime. Try again.',
      load: 'The Work Signals view could not be loaded. Check the connection and try again.'
    })
      .then((module) => {
        i18n.registerMessages('nl', module.NL_MESSAGES);
        return module.createController({
          document,
          window,
          state,
          elements: els,
          t,
          plural: tp,
          escapeHtml,
          formatDate,
          severityClass,
          signalClass,
          isFeatureEnabled,
          safeExternalUrl,
          callbacks: {
            openGraphItemDetail,
            queueGraphDecision,
            reviewGraphDependency,
            closeModal
          }
        });
      })
      .then((controller) => {
        workSignalsViewController = controller;
        return controller;
      })
      .catch((error) => {
        workSignalsViewPromise = null;
        workSignalsViewController = null;
        throw error;
      });
  }
  return workSignalsViewPromise;
}

const state = {
  snapshot: null,
  operationsBrief: null,
  jobDashboard: null,
  notificationJobHealth: [],
  responseTiming: null,
  rateLimitMetrics: null,
  connectors: [],
  categories: [],
  accounts: [],
  connectorSafety: null,
  connectorTotal: 0,
  connectorCatalogTotal: 0,
  connectorSyncReadiness: null,
  workSignals: [],
  workGraph: null,
  workGraphCandidates: [],
  workSignalContracts: [],
  workSignalError: '',
  securityContext: null,
  currentWorkspace: null,
  workspaces: [],
  workspaceUsers: [],
  workspaceInvitations: [],
  policyRules: [],
  policyRuleError: '',
  policyHistory: [],
  policyHistoryError: '',
  featureFlags: [],
  featureFlagError: '',
  integrityReport: null,
  integrityError: '',
  retentionReport: null,
  retentionError: '',
  policyHistoryFilters: {
    actionType: '',
    actor: '',
    rangeDays: 'all'
  },
  activeWorkspaceId: localStorage.getItem('sneup.workspaceId') || '',
  sessionToken: sessionStorage.getItem(SESSION_TOKEN_KEY) || '',
  enhancements: [],
  enhancementSummary: {},
  recommendationEvaluation: null,
  enhancementPriority: 'all',
  enhancementArea: 'all',
  enhancementStatus: 'all',
  reports: [],
  forecast: null,
  loadedViews: new Set(),
  viewLoads: new Map(),
  connectorRequest: null,
  ledger: {
    decisions: [],
    recommendations: [],
    actions: [],
    auditEvents: [],
    followUps: [],
    workerResponses: [],
    accountability: null,
    outcomes: [],
    findings: [],
    healthSnapshots: [],
    reconciliationHealth: null,
    notificationPolicies: [],
    notificationDeliveries: [],
    timeline: [],
    errors: []
  },
  category: 'all',
  connectorReadiness: 'all',
  search: '',
  queueFilter: 'all',
  signalFilter: 'all',
  setupMode: localStorage.getItem(FIRST_RUN_SETUP_KEY) || '',
  activeView: 'overview',
  runtimeMode: 'unknown',
  runtimeDiagnostics: null,
  modalCleanup: null,
  commandPaletteLastFocused: null
};

const els = {
  timestamp: document.getElementById('timestamp'),
  metrics: document.getElementById('metrics'),
  brief: document.getElementById('brief'),
  operationsBriefItems: document.getElementById('operationsBriefItems'),
  operationsBriefCount: document.getElementById('operationsBriefCount'),
  jobHealthList: document.getElementById('jobHealthList'),
  jobHealthCount: document.getElementById('jobHealthCount'),
  commandQueue: document.getElementById('commandQueue'),
  commandMode: document.getElementById('commandMode'),
  automationCount: document.getElementById('automationCount'),
  dailyPlan: document.getElementById('dailyPlan'),
  focusQueue: document.getElementById('focusQueue'),
  focusCount: document.getElementById('focusCount'),
  teamLoad: document.getElementById('teamLoad'),
  teamCount: document.getElementById('teamCount'),
  boards: document.getElementById('boards'),
  boardCount: document.getElementById('boardCount'),
  riskCount: document.getElementById('riskCount'),
  approvalCount: document.getElementById('approvalCount'),
  ledgerMetrics: document.getElementById('ledgerMetrics'),
  decisionQueue: document.getElementById('decisionQueue'),
  recommendationList: document.getElementById('recommendationList'),
  recommendationCount: document.getElementById('recommendationCount'),
  trelloAttempts: document.getElementById('trelloAttempts'),
  trelloAttemptCount: document.getElementById('trelloAttemptCount'),
  notificationPolicies: document.getElementById('notificationPolicies'),
  notificationPolicyCount: document.getElementById('notificationPolicyCount'),
  notificationPolicyButton: document.getElementById('notificationPolicyButton'),
  notificationDeliveries: document.getElementById('notificationDeliveries'),
  notificationDeliveryCount: document.getElementById('notificationDeliveryCount'),
  findingsList: document.getElementById('findingsList'),
  findingsCount: document.getElementById('findingsCount'),
  operationsTimeline: document.getElementById('operationsTimeline'),
  timelineCount: document.getElementById('timelineCount'),
  boardHealthList: document.getElementById('boardHealthList'),
  boardHealthCount: document.getElementById('boardHealthCount'),
  followUps: document.getElementById('followUps'),
  followUpCount: document.getElementById('followUpCount'),
  accountabilityList: document.getElementById('accountabilityList'),
  accountabilityCount: document.getElementById('accountabilityCount'),
  outcomeList: document.getElementById('outcomeList'),
  outcomeCount: document.getElementById('outcomeCount'),
  auditTrail: document.getElementById('auditTrail'),
  auditCount: document.getElementById('auditCount'),
  connectorCount: document.getElementById('connectorCount'),
  connectorGrid: document.getElementById('connectorGrid'),
  connectorPagination: document.getElementById('connectorPagination'),
  categoryList: document.getElementById('categoryList'),
  connectorSearch: document.getElementById('connectorSearch'),
  connectorHeading: document.getElementById('connectorHeading'),
  connectedCount: document.getElementById('connectedCount'),
  connectorSafety: document.getElementById('connectorSafety'),
  enhancementCount: document.getElementById('enhancementCount'),
  enhancementMetrics: document.getElementById('enhancementMetrics'),
  enhancementStatusSummary: document.getElementById('enhancementStatusSummary'),
  enhancementsList: document.getElementById('enhancementsList'),
  enhancementAreaFilter: document.getElementById('enhancementAreaFilter'),
  reportCount: document.getElementById('reportCount'),
  reportMode: document.getElementById('reportMode'),
  reportList: document.getElementById('reportList'),
  forecastCount: document.getElementById('forecastCount'),
  forecastMetrics: document.getElementById('forecastMetrics'),
  forecastMode: document.getElementById('forecastMode'),
  forecastCapacityCount: document.getElementById('forecastCapacityCount'),
  forecastCapacity: document.getElementById('forecastCapacity'),
  portfolioForecast: document.getElementById('portfolioForecast'),
  forecastBoardCount: document.getElementById('forecastBoardCount'),
  forecastBoards: document.getElementById('forecastBoards'),
  workSignalCount: document.getElementById('workSignalCount'),
  workSignalMetrics: document.getElementById('workSignalMetrics'),
  workSignalList: document.getElementById('workSignalList'),
  workSignalContractCount: document.getElementById('workSignalContractCount'),
  workSignalContracts: document.getElementById('workSignalContracts'),
  workspaceSelect: document.getElementById('workspaceSelect'),
  languageSelect: document.getElementById('languageSelect'),
  workspaceCount: document.getElementById('workspaceCount'),
  workspaceMetrics: document.getElementById('workspaceMetrics'),
  workspaceMode: document.getElementById('workspaceMode'),
  workspaceList: document.getElementById('workspaceList'),
  workspaceExportButton: document.getElementById('workspaceExportButton'),
  workspaceDeleteButton: document.getElementById('workspaceDeleteButton'),
  workspaceUserCount: document.getElementById('workspaceUserCount'),
  workspaceUsers: document.getElementById('workspaceUsers'),
  workspaceInviteCount: document.getElementById('workspaceInviteCount'),
  workspaceInvitations: document.getElementById('workspaceInvitations'),
  workspaceInviteButton: document.getElementById('workspaceInviteButton'),
  policyRuleCount: document.getElementById('policyRuleCount'),
  policyRuleList: document.getElementById('policyRuleList'),
  policyHistoryCount: document.getElementById('policyHistoryCount'),
  policyHistoryList: document.getElementById('policyHistoryList'),
  policyHistoryActionFilter: document.getElementById('policyHistoryActionFilter'),
  policyHistoryActorFilter: document.getElementById('policyHistoryActorFilter'),
  policyHistoryRangeFilter: document.getElementById('policyHistoryRangeFilter'),
  featureFlagCount: document.getElementById('featureFlagCount'),
  featureFlagList: document.getElementById('featureFlagList'),
  integrityCount: document.getElementById('integrityCount'),
  integrityList: document.getElementById('integrityList'),
  integrityScanButton: document.getElementById('integrityScanButton'),
  retentionCount: document.getElementById('retentionCount'),
  retentionList: document.getElementById('retentionList'),
  retentionScanButton: document.getElementById('retentionScanButton'),
  setupButton: document.getElementById('setupButton'),
  commandPaletteButton: document.getElementById('commandPaletteButton'),
  commandPalette: document.getElementById('commandPalette'),
  commandPaletteSearch: document.getElementById('commandPaletteSearch'),
  commandPaletteList: document.getElementById('commandPaletteList'),
  modal: document.getElementById('connectorModal'),
  modalTitle: document.getElementById('modalTitle'),
  modalBody: document.getElementById('modalBody')
};

const formPersistence = window.SneupFormPersistence?.init({
  getScope: () => state.activeWorkspaceId || state.currentWorkspace?.id || 'current'
});

window.SneupHelpCenter?.init({
  getContext: () => state.activeView,
  beforeOpen: () => {
    closeCommandPalette();
    if (els.modal.classList.contains('open')) closeModal();
  },
  onAction: (actionId) => {
    if (actionId === 'setup') {
      openFirstRunSetup();
      return;
    }
    if (actionId === 'view:approvals') {
      openDecisionQueue('robert');
      return;
    }
    if (actionId.startsWith('view:')) showView(actionId.slice(5));
  }
});

document.querySelectorAll('[data-view-button]').forEach((button) => {
  button.addEventListener('click', () => showView(button.dataset.viewButton));
});

document.getElementById('refreshButton').addEventListener('click', () => loadAll({ force: true }));
document.getElementById('approvalButton').addEventListener('click', () => openDecisionQueue('robert'));
document.getElementById('connectorButton').addEventListener('click', () => showView('connectors'));
els.setupButton.addEventListener('click', () => openFirstRunSetup());
els.commandPaletteButton.addEventListener('click', openCommandPalette);
document.getElementById('closeCommandPalette').addEventListener('click', closeCommandPalette);
els.commandPalette.addEventListener('click', (event) => {
  if (event.target === els.commandPalette) closeCommandPalette();
});
els.commandPaletteSearch.addEventListener('input', renderCommandPalette);
els.commandPaletteList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-command-palette-action]');
  if (!button) return;
  await runCommandPaletteAction(button.dataset.commandPaletteAction);
});
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (els.commandPalette.classList.contains('open')) {
      closeCommandPalette();
    } else {
      openCommandPalette();
    }
    return;
  }
  if (event.key === 'Escape' && els.commandPalette.classList.contains('open')) {
    event.preventDefault();
    closeCommandPalette();
  }
});
els.notificationPolicyButton.addEventListener('click', openNotificationPolicy);
els.workspaceInviteButton.addEventListener('click', openWorkspaceInvite);
els.workspaceExportButton.addEventListener('click', downloadWorkspaceExport);
els.workspaceDeleteButton.addEventListener('click', openWorkspaceDeletion);
els.integrityScanButton.addEventListener('click', () => loadIntegrityReport({ announce: true }));
els.retentionScanButton.addEventListener('click', () => loadRetentionReport({ announce: true }));
els.workspaceSelect.addEventListener('change', async (event) => {
  state.activeWorkspaceId = event.target.value;
  if (state.activeWorkspaceId) {
    localStorage.setItem('sneup.workspaceId', state.activeWorkspaceId);
  } else {
    localStorage.removeItem('sneup.workspaceId');
  }
  await loadAll({ force: true });
});
els.languageSelect?.addEventListener('change', (event) => {
  i18n.setLocale(event.target.value, { notify: false });
  window.location.reload();
});
document.getElementById('closeModal').addEventListener('click', closeModal);
els.modal.addEventListener('click', (event) => {
  if (event.target === els.modal) closeModal();
});
els.connectorSearch.addEventListener('input', (event) => {
  state.search = event.target.value.toLowerCase();
  clearTimeout(connectorSearchTimer);
  connectorSearchTimer = setTimeout(() => loadConnectors(), 180);
});
document.querySelectorAll('[data-connector-readiness]').forEach((button) => {
  button.addEventListener('click', () => {
    state.connectorReadiness = button.dataset.connectorReadiness;
    loadConnectors();
  });
});
document.querySelectorAll('[data-queue-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    state.queueFilter = button.dataset.queueFilter;
    renderOperationsLedger();
  });
});
document.querySelectorAll('[data-signal-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    state.signalFilter = button.dataset.signalFilter;
    renderWorkSignals();
  });
});
document.querySelectorAll('[data-enhancement-priority]').forEach((button) => {
  button.addEventListener('click', () => {
    state.enhancementPriority = button.dataset.enhancementPriority;
    renderEnhancementFilters();
    loadEnhancements();
  });
});
document.querySelectorAll('[data-enhancement-status]').forEach((button) => {
  button.addEventListener('click', () => {
    state.enhancementStatus = button.dataset.enhancementStatus;
    renderEnhancementFilters();
    loadEnhancements();
  });
});
els.enhancementAreaFilter.addEventListener('change', () => {
  state.enhancementArea = els.enhancementAreaFilter.value;
  loadEnhancements();
});

async function showView(viewName, options = {}) {
  if (viewName === 'approvals' && ['all', 'robert', 'team', 'va'].includes(options.queueFilter)) {
    state.queueFilter = options.queueFilter;
  }
  document.querySelectorAll('[data-view-button]').forEach((button) => {
    button.classList.toggle('active', button.dataset.viewButton === viewName);
  });
  document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
  document.getElementById(`${viewName}View`).classList.add('active');
  state.activeView = viewName;
  const titles = {
    overview: 'Autonomous project command',
    approvals: 'Approval and operations ledger',
    connectors: 'Account connectors',
    enhancements: 'Enhancement backlog',
    signals: 'Cross-tool work signals',
    forecasts: 'Capacity and delivery forecasts',
    reports: 'Stakeholder reports',
    workspaces: 'Workspace administration'
  };
  document.getElementById('pageTitle').textContent = t(titles[viewName] || titles.overview);
  await loadView(viewName);
  if (viewName === 'approvals') {
    renderOperationsLedger();
    if (options.focusElementId) {
      const focusTarget = document.getElementById(options.focusElementId);
      if (focusTarget) {
        focusTarget.tabIndex = -1;
        focusTarget.scrollIntoView({ block: 'start' });
        focusTarget.focus({ preventScroll: true });
      }
    }
  }
}

async function openDecisionQueue(ownerType = 'robert') {
  await showView('approvals', { queueFilter: ownerType, focusElementId: 'decisionQueue' });
}

const COMMAND_PALETTE_ACTIONS = [
  { id: 'overview', title: 'Open overview', detail: 'Mission control, focus, team load, and board health' },
  { id: 'approvals', title: 'Review approvals', detail: 'Decision queue and approval ledger' },
  { id: 'connectors', title: 'Open account connectors', detail: 'Connected tools and access reviews' },
  { id: 'signals', title: 'Open cross-tool signals', detail: 'Normalized provider work and dependencies' },
  { id: 'forecasts', title: 'Open capacity forecasts', detail: 'What-if delivery and workload scenarios' },
  { id: 'reports', title: 'Open stakeholder reports', detail: 'Status, stand-up, risk, and client exports' },
  { id: 'enhancements', title: 'Open enhancement backlog', detail: 'Prioritized product improvements' },
  { id: 'workspaces', title: 'Open workspace administration', detail: 'Users, sessions, invitations, and action safety' },
  { id: 'refresh', title: 'Refresh command center', detail: 'Reload current workspace data' }
];

function openCommandPalette() {
  state.commandPaletteLastFocused = document.activeElement;
  els.commandPaletteSearch.value = '';
  renderCommandPalette();
  els.commandPalette.classList.add('open');
  els.commandPalette.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => els.commandPaletteSearch.focus());
}

function closeCommandPalette() {
  if (!els.commandPalette.classList.contains('open')) return;
  els.commandPalette.classList.remove('open');
  els.commandPalette.setAttribute('aria-hidden', 'true');
  state.commandPaletteLastFocused?.focus?.();
  state.commandPaletteLastFocused = null;
}

function renderCommandPalette() {
  const query = els.commandPaletteSearch.value.trim().toLowerCase();
  const actions = COMMAND_PALETTE_ACTIONS.filter((action) => {
    const searchable = `${t(action.title)} ${t(action.detail)}`.toLowerCase();
    return searchable.includes(query);
  });
  els.commandPaletteList.innerHTML = actions.length
    ? actions.map((action) => `
        <button class="command-palette-action" data-command-palette-action="${escapeHtml(action.id)}" type="button" role="option">
          <strong>${et(action.title)}</strong>
          <span>${et(action.detail)}</span>
        </button>
      `).join('')
    : `<p class="command-palette-empty">${et('No matching command.')}</p>`;
}

async function runCommandPaletteAction(actionId) {
  closeCommandPalette();
  if (actionId === 'refresh') {
    await loadAll({ force: true });
    return;
  }
  if (actionId === 'approvals') {
    await openDecisionQueue('robert');
    return;
  }
  await showView(actionId);
}

async function openLedgerSection(options = {}) {
  await showView('approvals', options);
}

const setupDiagnosticsMarkup = (canCreateSupportBundle) => `
  <section class="setup-diagnostics" aria-labelledby="setupDiagnosticsTitle">
    <div class="setup-diagnostics-head">
      <div>
        <strong id="setupDiagnosticsTitle">${et('Current runtime check')}</strong>
        <span>${et('Configuration and safety status')}</span>
      </div>
      <div class="toolbar">
        <button class="button" type="button" id="refreshSetupDiagnostics">${et('Check again')}</button>
        ${canCreateSupportBundle ? `<button class="button" type="button" id="createSetupSupportBundle">${et('Support file')}</button>` : ''}
      </div>
    </div>
    <div id="setupDiagnosticsResult" class="setup-diagnostics-result" aria-live="polite">
      <p class="setup-check-loading">${et('Checking this runtime...')}</p>
    </div>
    <p class="setup-support-result" id="setupSupportResult" aria-live="polite"></p>
  </section>
`;

function renderSetupDiagnostics(report) {
  const target = document.getElementById('setupDiagnosticsResult');
  if (!target) return;
  state.runtimeDiagnostics = report;
  state.runtimeMode = report.mode || state.runtimeMode;
  const errorCount = Number(report.counts?.error) || 0;
  const warningCount = Number(report.counts?.warning) || 0;
  const summary = report.liveCriticalPathReady
    ? t('Live workspace prerequisites are ready.')
    : report.mode === 'demo' && report.ready
      ? t('The read-only demo workspace is ready.')
      : errorCount
        ? tp('{count} check needs attention.', '{count} checks need attention.', errorCount)
        : tp('{count} check needs attention.', '{count} checks need attention.', warningCount);
  const labels = { ok: t('Ready'), warning: t('Review'), error: t('Required') };
  target.innerHTML = `
    <div class="setup-diagnostics-summary status-${escapeHtml(report.status)}">
      <strong>${escapeHtml(summary)}</strong>
      ${report.nextAction ? `<span>${et('Next: {action}', { action: report.nextAction.action })}</span>` : ''}
    </div>
    <ul class="setup-check-list">
      ${(report.checks || []).map((check) => `
        <li class="setup-check status-${escapeHtml(check.status)}">
          <span class="setup-check-status">${escapeHtml(labels[check.status] || t(check.status))}</span>
          <div>
            <strong>${escapeHtml(check.title)}</strong>
            <span>${escapeHtml(check.summary)}</span>
            ${check.action ? `<small>${escapeHtml(check.action)}</small>` : ''}
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

async function loadSetupDiagnostics() {
  const refresh = document.getElementById('refreshSetupDiagnostics');
  if (refresh) {
    refresh.disabled = true;
    refresh.textContent = t('Checking...');
  }
  try {
    const data = await fetchApi('/api/security/diagnostics');
    renderSetupDiagnostics(data.diagnostics);
  } catch (error) {
    const target = document.getElementById('setupDiagnosticsResult');
    if (target) target.innerHTML = `<div class="notice">${et('Runtime check unavailable.')} ${escapeHtml(error.message)}</div>`;
  } finally {
    if (refresh) {
      refresh.disabled = false;
      refresh.textContent = t('Check again');
    }
  }
}

function bindSetupDiagnostics(canCreateSupportBundle) {
  document.getElementById('refreshSetupDiagnostics')?.addEventListener('click', loadSetupDiagnostics);
  if (!canCreateSupportBundle) return;
  document.getElementById('createSetupSupportBundle')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const result = document.getElementById('setupSupportResult');
    button.disabled = true;
    button.textContent = t('Creating...');
    if (result) result.textContent = '';
    try {
      const bundle = await window.sneupDesktop.createSupportBundle();
      if (result) result.textContent = t('{fileName} was created and opened in File Explorer.', { fileName: bundle.fileName });
    } catch (error) {
      if (result) result.textContent = t('Support file failed: {message}', { message: error.message || t('Sneup could not create the file.') });
    } finally {
      button.disabled = false;
      button.textContent = t('Support file');
    }
  });
}

function openFirstRunSetup() {
  const isDesktopRuntime = Boolean(window.sneupDesktop?.saveStartupMode && window.sneupDesktop?.restart);
  const canCreateSupportBundle = typeof window.sneupDesktop?.createSupportBundle === 'function';
  if (!isDesktopRuntime) {
    const isDemoRuntime = state.runtimeMode === 'demo';
    els.modalTitle.textContent = t(isDemoRuntime ? 'Demo workspace' : 'Connected workspace');
    els.modalBody.innerHTML = `
      <div class="setup-flow">
        <p class="setup-intro">${isDemoRuntime
    ? et('Sneup is running its local demo workspace. No provider account is connected.')
    : et('Sneup is connected to its running workspace. Account connections and approval controls use this active runtime.')}</p>
        <div class="notice">${et('Runtime mode is selected when Sneup starts. This browser reflects that active mode and does not change it.')}</div>
        ${setupDiagnosticsMarkup(false)}
        <div class="toolbar modal-actions">
          <button class="button primary" type="button" id="openRuntimeConnectors">${et('Connect tools')}</button>
        </div>
      </div>
    `;
    els.modal.classList.add('open');
    bindSetupDiagnostics(false);
    loadSetupDiagnostics();
    document.getElementById('openRuntimeConnectors').addEventListener('click', () => {
      closeModal();
      showView('connectors');
    });
    return;
  }

  let selectedMode = state.setupMode || 'demo';
  const modeDetails = {
    demo: {
      title: 'Demo workspace',
      copy: 'Explore Sneup with local sample activity. No provider account is connected.'
    },
    live: {
      title: 'Connect workspace',
      copy: 'Sneup will restart and attempt your database-backed workspace. If MongoDB is unavailable, live mode stops and offers a read-only demo restart.'
    }
  };

  const renderSelection = () => {
    const detail = modeDetails[selectedMode];
    document.querySelectorAll('[data-setup-mode]').forEach((button) => {
      const isSelected = button.dataset.setupMode === selectedMode;
      button.classList.toggle('active', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
    const title = document.getElementById('setupModeTitle');
    const copy = document.getElementById('setupModeCopy');
    if (title) title.textContent = t(detail.title);
    if (copy) copy.textContent = t(detail.copy);
  };

  els.modalTitle.textContent = t('Set up Sneup');
  els.modalBody.innerHTML = `
    <div class="setup-flow">
      <p class="setup-intro">${et('Choose how this device starts. You can return here whenever your workspace is ready.')}</p>
      <div class="segmented setup-mode" role="group" aria-label="${et('Sneup startup mode')}">
        <button data-setup-mode="demo" type="button">${et('Demo workspace')}</button>
        <button data-setup-mode="live" type="button">${et('Connect workspace')}</button>
      </div>
      <div class="setup-selection" aria-live="polite">
        <strong id="setupModeTitle"></strong>
        <p id="setupModeCopy"></p>
      </div>
      <div class="notice">${et('This device stores only the startup mode. Sneup does not collect credentials during setup.')}</div>
      ${setupDiagnosticsMarkup(canCreateSupportBundle)}
      <div class="toolbar modal-actions">
        <button class="button primary" type="button" id="completeSetup">${et(window.sneupDesktop?.saveStartupMode ? 'Save and restart' : 'Continue')}</button>
      </div>
    </div>
  `;
  els.modal.classList.add('open');
  renderSelection();
  bindSetupDiagnostics(canCreateSupportBundle);
  loadSetupDiagnostics();

  document.querySelectorAll('[data-setup-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedMode = button.dataset.setupMode;
      renderSelection();
    });
  });
  document.getElementById('completeSetup').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    state.setupMode = selectedMode;
    localStorage.setItem(FIRST_RUN_SETUP_KEY, selectedMode);

    if (window.sneupDesktop?.saveStartupMode && window.sneupDesktop?.restart) {
      button.disabled = true;
      button.textContent = t('Restarting...');
      try {
        await window.sneupDesktop.saveStartupMode(selectedMode);
        await window.sneupDesktop.restart();
        return;
      } catch (error) {
        button.disabled = false;
        button.textContent = t('Save and restart');
        openNotice(t('Startup preference failed'), error.message || t('Sneup could not save this startup mode.'));
        return;
      }
    }

    closeModal();
    if (selectedMode === 'live') showView('connectors');
  });
}

const viewLoaders = {
  overview: () => Promise.all([
    loadMissionControl(),
    loadOperationsBrief(),
    loadJobDashboard()
  ]),
  approvals: () => Promise.all([
    loadOperationsLedger(),
    loadNotificationDeliveryHealth(),
    loadApprovalView()
  ]),
  connectors: loadConnectors,
  enhancements: loadEnhancements,
  signals: loadWorkSignals,
  forecasts: loadForecast,
  reports: loadReports,
  workspaces: loadWorkspaceAdmin
};

const deferredViewCounts = {
  approvals: els.approvalCount,
  connectors: els.connectorCount,
  enhancements: els.enhancementCount,
  signals: els.workSignalCount,
  forecasts: els.forecastCount,
  reports: els.reportCount,
  workspaces: els.workspaceCount
};

function markDeferredViewCounts() {
  Object.entries(deferredViewCounts).forEach(([viewName, element]) => {
    if (!state.loadedViews.has(viewName)) element.textContent = '...';
  });
}

async function loadView(viewName, options = {}) {
  const loader = viewLoaders[viewName];
  if (!loader || (!options.force && state.loadedViews.has(viewName))) return;

  // Repeated navigation and refresh clicks should share an in-progress view load.
  const inFlight = state.viewLoads.get(viewName);
  if (inFlight) return inFlight;

  const load = Promise.resolve()
    .then(loader)
    .then(() => state.loadedViews.add(viewName))
    .finally(() => state.viewLoads.delete(viewName));
  state.viewLoads.set(viewName, load);
  return load;
}

async function loadAll(options = {}) {
  await loadSecurityContext();
  await loadFeatureFlags();
  renderEnhancementFilters();
  if (options.force) state.loadedViews.clear();
  if (options.force || state.loadedViews.size === 0) markDeferredViewCounts();
  const activeView = document.querySelector('[data-view-button].active')?.dataset.viewButton || 'overview';
  await loadView(activeView, { force: options.force });
}

async function loadFeatureFlags() {
  try {
    const data = await fetchApi('/api/feature-flags');
    state.featureFlags = data.flags || [];
    state.featureFlagError = '';
  } catch (error) {
    state.featureFlags = [];
    state.featureFlagError = error.message;
  }
}

function isFeatureEnabled(key) {
  if (state.featureFlagError) return false;
  const flag = state.featureFlags.find(item => item.key === key);
  return flag ? flag.effective === true : false;
}

async function loadReports() {
  try {
    const data = await fetchApi('/api/reports');
    state.reports = data.reports || [];
    renderReports();
  } catch (error) {
    state.reports = [];
    renderReports(error.message);
  }
}

async function loadForecast() {
  try {
    const data = await fetchApi('/api/forecasts');
    state.forecast = data.forecast || null;
    renderForecast();
  } catch (error) {
    state.forecast = null;
    renderForecast(error.message);
  }
}

function renderForecast(errorMessage = '') {
  const forecast = state.forecast;
  if (!forecast) {
    els.forecastCount.textContent = '0';
    els.forecastMode.textContent = 'unavailable';
    els.forecastMode.className = 'pill critical';
    els.forecastMetrics.innerHTML = '';
    els.portfolioForecast.innerHTML = `<div class="empty">${escapeHtml(errorMessage || 'Forecast unavailable')}</div>`;
    els.forecastCapacity.innerHTML = '';
    els.forecastBoards.innerHTML = '';
    return;
  }

  const portfolio = forecast.portfolio || {};
  const members = forecast.memberCapacity || [];
  const boards = forecast.boards || [];
  const utilization = forecast.dataQuality?.utilization || {};
  const allocations = forecast.dataQuality?.allocations || {};
  const calendar = forecast.dataQuality?.calendar || {};
  const scenario = forecast.scenario || null;
  els.forecastCount.textContent = String(boards.filter(board => board.health !== 'on_track').length);
  els.forecastMode.textContent = forecast.mode === 'demo' ? 'demo' : scenario?.active ? 'scenario' : 'analysis only';
  els.forecastMode.className = `pill ${forecast.mode === 'demo' || scenario?.active ? 'review' : 'healthy'}`;
  els.forecastCapacityCount.textContent = `${members.length} people`;
  els.forecastBoardCount.textContent = `${boards.length} boards`;
  els.forecastMetrics.innerHTML = [
    ['P50 delivery', formatForecastDate(portfolio.p50?.date)],
    ['P80 delivery', formatForecastDate(portfolio.p80?.date)],
    ['Forecast confidence', `${portfolio.confidence || 0}%`],
    ['Open cards', portfolio.openCards || 0],
    ['Weekly capacity', `${portfolio.weeklyAvailableHours || 0}h`],
    ['Estimated work', `${portfolio.workHours || 0}h`],
    ['Tracked utilization', utilization.entries ? `${utilization.weeklyHours || 0}h/week, ${(utilization.activeProviders || []).length} source${(utilization.activeProviders || []).length === 1 ? '' : 's'}` : 'No data'],
    ['Mapped allocations', allocations.matchedEntries ? `${allocations.matchedWeeklyHours || 0}h/week` : 'No data'],
    ['Board-mapped schedule', allocations.mappedProjectEntries ? `${allocations.mappedProjectWeeklyHours || 0}h/week` : 'No mapping'],
    ['Mapped calendar', calendar.matchedEntries ? `${calendar.matchedWeeklyHours || 0}h/week` : 'No data']
  ].map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
  els.portfolioForecast.innerHTML = renderForecastSummary(portfolio, scenario);
  els.forecastCapacity.innerHTML = listOrEmpty(members, renderCapacityMember);
  els.forecastBoards.innerHTML = listOrEmpty(boards, renderBoardForecast);
  document.querySelectorAll('[data-capacity-member]').forEach((button) => {
    button.addEventListener('click', () => openCapacityEditor(button.dataset.capacityMember));
  });
  document.querySelectorAll('[data-board-project-mappings]').forEach((button) => {
    button.addEventListener('click', () => openBoardProjectMappingsEditor(button.dataset.boardProjectMappings));
  });
  document.querySelectorAll('[data-forecast-scenario]').forEach((button) => {
    button.addEventListener('click', openForecastScenario);
  });
  document.querySelectorAll('[data-forecast-scenario-reset]').forEach((button) => {
    button.addEventListener('click', async () => {
      await loadForecast();
      openNotice('Scenario reset', 'Sneup restored the live analysis without changing any capacity profile.');
    });
  });
}

function formatForecastDate(value) {
  if (!value) return 'Needs capacity';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Needs capacity' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatProviderNames(providers = []) {
  const labels = providers.map(provider => ({ harvest: 'Harvest', everhour: 'Everhour', timeneye: 'Lucen Track', toggl_track: 'Toggl Track', clockify: 'Clockify', float: 'Float', resource_guru: 'Resource Guru', motion: 'Motion', google_workspace: 'Google Workspace', microsoft_365: 'Microsoft 365' }[provider] || provider)).filter(Boolean);
  if (labels.length <= 1) return labels[0] || 'connected time tools';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function renderForecastSummary(forecast = {}, scenario = null) {
  const canManageCapacity = forecast.mode !== 'demo' && state.securityContext?.permissions?.includes('capacity:manage');
  const canRunScenarios = canManageCapacity && isFeatureEnabled('forecast_scenarios');
  return `
    <div class="item forecast-summary">
      <div class="item-title">
        <strong>${escapeHtml(forecast.boardName || 'Portfolio')}</strong>
        <span class="pill ${forecast.health === 'at_risk' ? 'high' : forecast.health === 'watch' ? 'review' : 'healthy'}">${escapeHtml(forecast.health || 'unknown')}</span>
      </div>
      <div class="meta"><span>P50 ${escapeHtml(formatForecastDate(forecast.p50?.date))}</span><span>P80 ${escapeHtml(formatForecastDate(forecast.p80?.date))}</span><span>${forecast.openCards || 0} open cards</span><span>${forecast.utilizationPercent ?? 'n/a'}% modeled load</span></div>
      <div class="meta">${escapeHtml(forecast.confidenceLabel || 'low evidence')} confidence: forecast uses explicit capacity and uncertainty assumptions.</div>
      ${(forecast.risks || []).length ? `<div class="forecast-risks">${forecast.risks.map(risk => `<span class="pill high">${escapeHtml(risk)}</span>`).join('')}</div>` : ''}
      <details class="payload"><summary>Assumptions</summary><div class="forecast-assumptions">${(forecast.assumptions || []).map(item => `<p>${escapeHtml(item)}</p>`).join('')}</div></details>
      ${scenario?.active ? `<div class="notice">Temporary scenario for ${scenario.overrideCount || 0} contributor${scenario.overrideCount === 1 ? '' : 's'}. It does not change a capacity profile, provider, work item, or decision.</div>` : ''}
      ${canManageCapacity && !canRunScenarios ? '<div class="notice">Capacity scenarios are paused by this workspace rollout.</div>' : ''}
      ${canRunScenarios ? `<div class="item-actions">${scenario?.active ? '<button class="button" data-forecast-scenario-reset type="button">Reset scenario</button>' : ''}<button class="button primary" data-forecast-scenario type="button">Explore capacity scenario</button></div>` : ''}
    </div>
  `;
}

function openForecastScenario() {
  const members = (state.forecast?.memberCapacity || []).filter(member => member.memberId);
  if (!members.length) {
    openNotice('Capacity scenario unavailable', 'Sneup needs at least one active team member in the live workspace.');
    return;
  }
  const selected = members[0];
  els.modalTitle.textContent = 'Explore capacity scenario';
  els.modalBody.innerHTML = `
    <form id="forecastScenarioForm" data-draft-key="forecast-scenario" data-draft-fields="memberId,weeklyHours,allocationPercent,focusHoursPerWeek,timeOff" data-template-fields="weeklyHours,allocationPercent,focusHoursPerWeek">
      <div class="notice">This is a temporary what-if analysis. It does not save a capacity profile, change provider data, update work, or queue a decision.</div>
      <div class="field"><label for="forecastScenarioMember">Contributor</label><select id="forecastScenarioMember" name="memberId">${members.map(member => `<option value="${escapeHtml(member.memberId)}">${escapeHtml(member.name || 'Team member')}</option>`).join('')}</select></div>
      <div class="field"><label for="forecastScenarioWeeklyHours">Weekly hours</label><input id="forecastScenarioWeeklyHours" name="weeklyHours" type="number" min="1" max="80" value="${escapeHtml(selected.weeklyHours || 32)}" required></div>
      <div class="field"><label for="forecastScenarioAllocation">Allocation percentage</label><input id="forecastScenarioAllocation" name="allocationPercent" type="number" min="0" max="100" value="${escapeHtml(selected.allocationPercent ?? 100)}" required></div>
      <div class="field"><label for="forecastScenarioFocus">Focus hours per week</label><input id="forecastScenarioFocus" name="focusHoursPerWeek" type="number" min="0" max="80" value="${escapeHtml(selected.focusHoursPerWeek || 0)}" required></div>
      <div class="field"><label for="forecastScenarioTimeOff">Temporary time off (one YYYY-MM-DD to YYYY-MM-DD range per line)</label><textarea id="forecastScenarioTimeOff" name="timeOff">${escapeHtml((selected.timeOff || []).map(item => `${String(item.startDate || '').slice(0, 10)} to ${String(item.endDate || '').slice(0, 10)}${item.label ? ` | ${item.label}` : ''}`).join('\n'))}</textarea></div>
      <div class="toolbar modal-actions"><button class="button" type="button" id="cancelForecastScenario">Cancel</button><button class="button primary" type="submit">Run scenario</button></div>
    </form>
  `;
  els.modal.classList.add('open');
  const form = document.getElementById('forecastScenarioForm');
  formPersistence?.enhanceForm(form);
  const syncMemberInputs = () => {
    const member = members.find(item => String(item.memberId) === String(form.elements.memberId.value));
    if (!member) return;
    form.elements.weeklyHours.value = member.weeklyHours || 32;
    form.elements.allocationPercent.value = member.allocationPercent ?? 100;
    form.elements.focusHoursPerWeek.value = member.focusHoursPerWeek || 0;
    form.elements.timeOff.value = (member.timeOff || []).map(item => `${String(item.startDate || '').slice(0, 10)} to ${String(item.endDate || '').slice(0, 10)}${item.label ? ` | ${item.label}` : ''}`).join('\n');
  };
  document.getElementById('cancelForecastScenario').addEventListener('click', closeModal);
  form.elements.memberId.addEventListener('change', syncMemberInputs);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const timeOff = form.elements.timeOff.value.split('\n').map((line) => {
        const [range, label] = line.split('|');
        const [startDate, endDate] = range.split(/\s+to\s+/i).map(value => value.trim());
        return startDate && endDate ? { startDate, endDate, label: label?.trim() || '' } : null;
      }).filter(Boolean);
      const data = await fetchApi('/api/forecasts/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overrides: [{
            memberId: form.elements.memberId.value,
            weeklyHours: form.elements.weeklyHours.value,
            allocationPercent: form.elements.allocationPercent.value,
            focusHoursPerWeek: form.elements.focusHoursPerWeek.value,
            timeOff
          }]
        })
      });
      state.forecast = data.forecast || null;
      formPersistence?.markSaved(form);
      closeModal();
      renderForecast();
      openNotice('Scenario ready', 'Sneup calculated this temporary delivery range without changing live capacity.');
    } catch (error) {
      submit.disabled = false;
      openNotice('Scenario failed', error.message);
    }
  });
}

function renderBoardForecast(forecast = {}) {
  const editable = Boolean(state.securityContext?.permissions?.includes('capacity:manage'));
  return `
    <article class="connector-card forecast-card">
      <div class="connector-top"><div><h3>${escapeHtml(forecast.boardName || 'Board')}</h3><p>${forecast.openCards || 0} open cards and ${forecast.workHours || 0} modeled work hours.</p></div><span class="pill ${forecast.health === 'at_risk' ? 'high' : forecast.health === 'watch' ? 'review' : 'healthy'}">${escapeHtml(forecast.health || 'unknown')}</span></div>
      <div class="forecast-dates"><span><strong>P50</strong>${escapeHtml(formatForecastDate(forecast.p50?.date))}</span><span><strong>P80</strong>${escapeHtml(formatForecastDate(forecast.p80?.date))}</span><span><strong>Confidence</strong>${forecast.confidence || 0}%</span></div>
      <div class="meta">${(forecast.risks || []).slice(0, 2).map(escapeHtml).join(' | ') || 'No material delivery risk detected.'}</div>
      <div class="meta">${forecast.mappedProjectScheduleEntriesNext28Days ? `Mapped project schedule: ${escapeHtml(forecast.mappedProjectScheduleWeeklyHours || 0)}h/week.` : 'No provider project schedule is mapped to this board.'}</div>
      ${editable && forecast.boardId ? `<div class="connector-actions"><button class="button" type="button" data-board-project-mappings="${escapeHtml(forecast.boardId)}">Map provider projects</button></div>` : ''}
    </article>
  `;
}

function openBoardProjectMappingsEditor(boardId) {
  const board = (state.forecast?.boards || []).find(item => String(item.boardId) === String(boardId));
  if (!board) return;
  const mappings = (board.externalProjectMappings || []).map(item => `${item.provider}: ${item.projectId}`).join('\n');
  els.modalTitle.textContent = `Project mappings: ${board.boardName || 'board'}`;
  els.modalBody.innerHTML = `
    <form id="boardProjectMappingsForm" data-draft-key="board-project-mappings:${escapeHtml(boardId)}" data-draft-fields="externalProjectMappings">
      <div class="notice">Only explicit Float, Resource Guru, or Motion project IDs scope schedule evidence to this board. Mapped schedules remain analysis-only and do not change provider data or delivery capacity.</div>
      <div class="field"><label for="boardProjectMappings">Provider project IDs (one provider: ID per line)</label><textarea id="boardProjectMappings" name="externalProjectMappings" placeholder="float: 123&#10;resource_guru: 456&#10;motion: project_123">${escapeHtml(mappings)}</textarea></div>
      <div class="toolbar modal-actions"><button class="button" type="button" id="cancelBoardProjectMappings">Cancel</button><button class="button primary" type="submit">Save project mappings</button></div>
    </form>
  `;
  els.modal.classList.add('open');
  const form = document.getElementById('boardProjectMappingsForm');
  formPersistence?.enhanceForm(form);
  document.getElementById('cancelBoardProjectMappings').addEventListener('click', closeModal);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await fetchApi(`/api/forecasts/boards/${boardId}/project-mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalProjectMappings: form.elements.externalProjectMappings.value.split('\n').map((line) => {
            const separator = line.indexOf(':');
            return separator > 0 ? { provider: line.slice(0, separator).trim(), projectId: line.slice(separator + 1).trim() } : null;
          }).filter(Boolean)
        })
      });
      formPersistence?.markSaved(form);
      closeModal();
      await loadForecast();
      openNotice('Project mappings saved', 'Sneup refreshed board-scoped schedule evidence without changing provider data.');
    } catch (error) {
      submit.disabled = false;
      openNotice('Project mapping update failed', error.message);
    }
  });
}

function renderCapacityMember(member = {}) {
  const editable = Boolean(state.securityContext?.permissions?.includes('capacity:manage'));
  return `
    <div class="item">
      <div class="item-title"><strong>${escapeHtml(member.name || 'Team member')}</strong><span class="pill ${member.configured ? 'healthy' : 'review'}">${member.configured ? 'configured' : 'default'}</span></div>
      <div class="meta"><span>${member.weeklyAvailableHours || 0}h/week</span><span>${member.dailyAvailableHours || 0}h/day</span><span>${member.allocationPercent || 0}% allocation</span><span>${member.focusHoursPerWeek || 0}h focus</span>${member.timeOffHours ? `<span>${member.timeOffHours}h planned time off</span>` : ''}</div>
      <div class="meta">Historical card effort: ${member.historicalCardHours || 0}h. ${member.trackedTimeEntriesLast28Days ? `${escapeHtml(formatProviderNames(member.trackedTimeProvidersLast28Days))} tracked ${member.trackedTimeWeeklyHours || 0}h/week recently.` : 'No matched tracked-time evidence.'} ${member.scheduledAllocationEntriesNext28Days ? `${escapeHtml(formatProviderNames(member.scheduledAllocationProvidersNext28Days))} schedules ${member.scheduledAllocationWeeklyHours || 0}h/week.` : 'No mapped allocation evidence.'} ${member.calendarEventsNext28Days ? `Mapped calendar blocks ${member.calendarBusyWeeklyHours || 0}h/week.` : 'No mapped calendar evidence.'} ${(member.skills || []).map(escapeHtml).join(' | ') || 'No skills recorded.'}</div>
      ${editable ? `<div class="item-actions"><button class="button" type="button" data-capacity-member="${escapeHtml(member.memberId)}">Edit capacity</button></div>` : ''}
    </div>
  `;
}

function openCapacityEditor(memberId) {
  const member = (state.forecast?.memberCapacity || []).find(item => String(item.memberId) === String(memberId));
  if (!member) return;
  const externalIdentities = (member.externalIdentities || []).map(item => `${item.provider}: ${item.externalId}`).join('\n');
  els.modalTitle.textContent = `Capacity: ${member.name || 'team member'}`;
  els.modalBody.innerHTML = `
    <form id="capacityProfileForm" data-draft-key="capacity-profile:${escapeHtml(memberId)}" data-draft-fields="weeklyHours,allocationPercent,focusHoursPerWeek,skills,externalIdentities,timeOff" data-template-fields="weeklyHours,allocationPercent,focusHoursPerWeek">
      <div class="notice">Capacity updates are analysis inputs only. They do not change any provider account or work item.</div>
      <div class="field"><label for="capacityWeeklyHours">Weekly hours</label><input id="capacityWeeklyHours" name="weeklyHours" type="number" min="1" max="80" value="${escapeHtml(member.weeklyHours || 32)}" required></div>
      <div class="field"><label for="capacityAllocation">Allocation percentage</label><input id="capacityAllocation" name="allocationPercent" type="number" min="0" max="100" value="${escapeHtml(member.allocationPercent ?? 100)}" required></div>
      <div class="field"><label for="capacityFocus">Focus hours per week</label><input id="capacityFocus" name="focusHoursPerWeek" type="number" min="0" max="80" value="${escapeHtml(member.focusHoursPerWeek || 0)}" required></div>
      <div class="field"><label for="capacitySkills">Skills (comma-separated)</label><input id="capacitySkills" name="skills" type="text" value="${escapeHtml((member.skills || []).join(', '))}"></div>
      <div class="field"><label for="capacityExternalIdentities">Capacity evidence IDs (one provider: ID per line)</label><textarea id="capacityExternalIdentities" name="externalIdentities" placeholder="float: 123&#10;motion: user_123&#10;google_workspace: person@example.com">${escapeHtml(externalIdentities)}</textarea></div>
      <div class="field"><label for="capacityTimeOff">Planned time off (one YYYY-MM-DD to YYYY-MM-DD range per line)</label><textarea id="capacityTimeOff" name="timeOff">${escapeHtml((member.timeOff || []).map(item => `${String(item.startDate || '').slice(0, 10)} to ${String(item.endDate || '').slice(0, 10)}${item.label ? ` | ${item.label}` : ''}`).join('\n'))}</textarea></div>
      <div class="toolbar modal-actions"><button class="button" type="button" id="cancelCapacityEdit">Cancel</button><button class="button primary" type="submit">Save capacity</button></div>
    </form>
  `;
  els.modal.classList.add('open');
  const form = document.getElementById('capacityProfileForm');
  formPersistence?.enhanceForm(form);
  document.getElementById('cancelCapacityEdit').addEventListener('click', closeModal);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await fetchApi(`/api/forecasts/capacity/${memberId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weeklyHours: form.elements.weeklyHours.value,
          allocationPercent: form.elements.allocationPercent.value,
          focusHoursPerWeek: form.elements.focusHoursPerWeek.value,
          skills: form.elements.skills.value.split(',').map(skill => skill.trim()).filter(Boolean),
          externalIdentities: form.elements.externalIdentities.value.split('\n').map((line) => {
            const separator = line.indexOf(':');
            return separator > 0 ? { provider: line.slice(0, separator).trim(), externalId: line.slice(separator + 1).trim() } : null;
          }).filter(Boolean),
          timeOff: form.elements.timeOff.value.split('\n').map((line) => {
            const [range, label] = line.split('|');
            const [startDate, endDate] = range.split(/\s+to\s+/i).map(value => value.trim());
            return startDate && endDate ? { startDate, endDate, label: label?.trim() || '' } : null;
          }).filter(Boolean)
        })
      });
      formPersistence?.markSaved(form);
      closeModal();
      await loadForecast();
      openNotice('Capacity saved', 'Sneup refreshed the analysis-only delivery forecast.');
    } catch (error) {
      submit.disabled = false;
      openNotice('Capacity update failed', error.message);
    }
  });
}

function renderReports(errorMessage = '') {
  els.reportCount.textContent = state.reports.length || 0;
  els.reportMode.textContent = errorMessage ? 'unavailable' : 'read-only';
  els.reportMode.className = `pill ${errorMessage ? 'critical' : 'healthy'}`;
  els.reportList.innerHTML = errorMessage
    ? `<div class="empty">${escapeHtml(errorMessage)}</div>`
    : listOrEmpty(state.reports, (report) => `
      <div class="item report-item">
        <div class="item-title">
          <strong>${escapeHtml(report.label)}</strong>
          <span class="pill review">read-only</span>
        </div>
        <div class="meta">Uses current command, risk, decision, owner, date, and source-evidence context.</div>
        <div class="item-actions">
          <button class="button" data-report-download="${escapeHtml(report.id)}" data-report-format="markdown" type="button">Markdown</button>
          <button class="button primary" data-report-download="${escapeHtml(report.id)}" data-report-format="pdf" type="button">PDF</button>
        </div>
      </div>
    `);

  document.querySelectorAll('[data-report-download]').forEach((button) => {
    button.addEventListener('click', () => downloadReport(button.dataset.reportDownload, button.dataset.reportFormat));
  });
}

function downloadReport(reportType, format) {
  const report = state.reports.find(item => item.id === reportType);
  if (!report || !['markdown', 'pdf'].includes(format)) return;
  const url = `/api/reports/${encodeURIComponent(reportType)}?format=${encodeURIComponent(format)}`;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${report.filename || reportType}.${format === 'markdown' ? 'md' : 'pdf'}`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

function renderEnhancementFilters() {
  document.querySelectorAll('[data-enhancement-priority]').forEach((button) => {
    button.classList.toggle('active', button.dataset.enhancementPriority === state.enhancementPriority);
  });
  document.querySelectorAll('[data-enhancement-status]').forEach((button) => {
    button.classList.toggle('active', button.dataset.enhancementStatus === state.enhancementStatus);
  });
}

async function loadEnhancements() {
  try {
    const params = new URLSearchParams();
    if (state.enhancementPriority !== 'all') params.set('priority', state.enhancementPriority);
    if (state.enhancementArea !== 'all') params.set('area', state.enhancementArea);
    if (state.enhancementStatus !== 'all') params.set('status', state.enhancementStatus);
    const [response, evaluationResponse] = await Promise.all([
      fetchApi(`/api/enhancements${params.toString() ? `?${params}` : ''}`),
      fetchApi('/api/enhancements/evaluations/recommendations')
    ]);
    state.enhancements = response.enhancements || [];
    state.enhancementSummary = response.summary || {};
    state.recommendationEvaluation = evaluationResponse.report || null;
    renderEnhancements();
  } catch (error) {
    state.enhancements = [];
    state.enhancementSummary = {};
    state.recommendationEvaluation = null;
    renderEnhancements(error.message);
  }
}

function apiOptions(options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (state.activeWorkspaceId) {
    headers['X-Sneup-Workspace-Id'] = state.activeWorkspaceId;
  }

  if (state.sessionToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${state.sessionToken}`;
  }

  return {
    ...options,
    headers
  };
}

function versionedApiUrl(url) {
  if (typeof url !== 'string' || !url.startsWith('/api/') || url.startsWith('/api/v1/')) return url;
  return `/api/v1/${url.slice('/api/'.length)}`;
}

function apiErrorMessage(data, fallback) {
  if (typeof data?.error === 'string') return data.error;
  if (data?.error?.message) return data.error.message;
  return data?.message || fallback;
}

async function apiFetch(url, options) {
  return fetch(versionedApiUrl(url), apiOptions(options));
}

async function readApiResponse(response, url) {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Sneup returned an invalid response for ${url}`);
  }

  if (typeof data?.ok === 'boolean' && data.meta?.apiVersion === 'v1') {
    if (!data.ok) {
      const error = new Error(apiErrorMessage(data, `Request failed: ${url}`));
      error.code = data.error?.code;
      error.requestId = data.meta?.requestId;
      throw error;
    }
    if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      return { success: true, ...data.data };
    }
    return { success: true, data: data.data };
  }

  if (!response.ok || !data.success) {
    throw new Error(apiErrorMessage(data, `Request failed: ${url}`));
  }
  return data;
}

async function fetchApi(url, options) {
  const response = await apiFetch(url, options);
  return readApiResponse(response, url);
}

async function loadSecurityContext() {
  try {
    const data = await fetchApi('/api/security/context');
    state.securityContext = data.context;
    state.runtimeMode = data.controls?.demoMode ? 'demo' : 'live';
    if (!state.activeWorkspaceId && data.context?.workspaceId) {
      state.activeWorkspaceId = data.context.workspaceId;
    }
  } catch (error) {
    state.securityContext = null;
    state.runtimeMode = 'unknown';
  }
}

async function loadMissionControl() {
  try {
    const data = await fetchApi('/api/autopilot/mission-control');
    state.snapshot = data.snapshot;
    renderOverview();
  } catch (error) {
    els.brief.innerHTML = `<h2>Mission control unavailable</h2><p>${escapeHtml(error.message)}</p>${renderConfidence(0)}`;
  }
}

async function loadOperationsBrief() {
  try {
    const data = await fetchApi('/api/autopilot/operations-brief');
    state.operationsBrief = data.brief;
    renderOperationsBrief();
  } catch (error) {
    state.operationsBrief = null;
    els.operationsBriefCount.textContent = '0 decisions';
    els.operationsBriefItems.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
}

async function loadJobDashboard() {
  try {
    const [data, timing] = await Promise.all([
      fetchApi('/api/jobs'),
      fetchApi('/api/security/response-timing').catch(() => ({ timing: null }))
    ]);
    state.jobDashboard = data.dashboard;
    state.responseTiming = timing.timing || null;
    state.rateLimitMetrics = timing.rateLimit || null;
    renderJobDashboard();
  } catch (error) {
    state.jobDashboard = null;
    state.responseTiming = null;
    state.rateLimitMetrics = null;
    els.jobHealthCount.textContent = '0 tracked';
    els.jobHealthList.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
}

async function loadNotificationDeliveryHealth() {
  try {
    const data = await fetchApi('/api/jobs/health');
    state.notificationJobHealth = data.health || [];
  } catch (error) {
    // Delivery configuration remains usable when observability is temporarily unavailable.
    state.notificationJobHealth = [];
  }
  renderOperationsLedger();
}

async function loadConnectors({ append = false } = {}) {
  if (state.connectorRequest) state.connectorRequest.abort();
  const request = new AbortController();
  state.connectorRequest = request;

  try {
    const offset = append ? state.connectors.length : 0;
    const query = new URLSearchParams({
      limit: String(CONNECTOR_PAGE_SIZE),
      offset: String(offset)
    });
    if (state.category !== 'all') query.set('category', state.category);
    if (state.connectorReadiness !== 'all') query.set('readiness', state.connectorReadiness);
    if (state.search) query.set('search', state.search);

    const [data, connectorView] = await Promise.all([
      fetchApi(`/api/connectors?${query}`, { signal: request.signal }),
      loadConnectorView()
    ]);
    if (state.connectorRequest !== request) return;
    const connectors = data.connectors || [];
    state.connectors = append ? [...state.connectors, ...connectors] : connectors;
    state.categories = data.categories || [];
    state.accounts = data.accounts || [];
    state.connectorSafety = data.safety || null;
    state.connectorTotal = data.total || 0;
    state.connectorCatalogTotal = data.catalogTotal || state.connectorTotal;
    state.connectorSyncReadiness = data.syncReadiness || null;
    connectorView.render();
  } catch (error) {
    if (error.name === 'AbortError' || state.connectorRequest !== request) return;
    els.connectorGrid.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  } finally {
    if (state.connectorRequest === request) state.connectorRequest = null;
  }
}

async function loadWorkSignals() {
  const renderer = loadWorkSignalsView();
  try {
    const graphDecisionsEnabled = isFeatureEnabled('work_graph_decisions');
    const [signalsData, contractsData, graphData, graphDecisionData, controller] = await Promise.all([
      fetchApi('/api/work-signals?limit=100'),
      fetchApi('/api/work-signals/contracts'),
      fetchApi('/api/work-signals/graph?limit=20'),
      graphDecisionsEnabled
        ? fetchApi('/api/work-signals/graph/decisions?limit=20')
        : Promise.resolve({ candidates: [] }),
      renderer
    ]);
    state.workSignals = signalsData.signals || [];
    state.workSignalContracts = contractsData.contracts || [];
    state.workGraph = graphData.graph || null;
    state.workGraphCandidates = graphDecisionData.candidates || [];
    state.workSignalError = '';
    controller.render();
  } catch (error) {
    state.workSignals = [];
    state.workGraph = null;
    state.workGraphCandidates = [];
    state.workSignalContracts = [];
    state.workSignalError = error.message;
    try {
      const controller = await renderer;
      controller.render();
    } catch (moduleError) {
      els.workSignalList.innerHTML = `<div class="empty">${escapeHtml(moduleError.message)}</div>`;
      throw moduleError;
    }
  }
}

async function loadWorkspaceAdmin() {
  try {
    const [current] = await Promise.all([
      fetchApi('/api/workspaces/current'),
      loadWorkspaceView()
    ]);
    state.currentWorkspace = current.workspace;
    if (current.auth?.demoMode) {
      state.activeWorkspaceId = current.workspace.id;
      state.workspaces = [current.workspace];
      state.workspaceUsers = [];
      state.workspaceInvitations = [];
      state.policyRules = [];
      state.policyRuleError = '';
      state.policyHistory = [];
      state.policyHistoryError = '';
      state.integrityReport = null;
      state.integrityError = 'Demo workspace is read-only.';
      state.retentionReport = null;
      state.retentionError = 'Demo workspace is read-only.';
      renderWorkspaces();
      return;
    }
    await Promise.all([
      loadIntegrityReport({ render: false }),
      loadRetentionReport({ render: false })
    ]);
    try {
      const [policyData, historyData] = await Promise.all([
        fetchApi('/api/policy-rules'),
        fetchApi(buildPolicyHistoryEndpoint())
      ]);
      state.policyRules = policyData.policies || [];
      state.policyRuleError = '';
      state.policyHistory = historyData.history || [];
      state.policyHistoryError = '';
    } catch (error) {
      state.policyRules = [];
      state.policyRuleError = error.message;
      state.policyHistory = [];
      state.policyHistoryError = error.message;
    }

    if (!current.auth?.workspaceOverrideAllowed) {
      state.workspaces = [current.workspace];
      state.workspaceUsers = [];
      state.workspaceInvitations = [];
      renderWorkspaces();
      return;
    }

    const workspaceData = await fetchApi('/api/workspaces?limit=100');
    state.workspaces = workspaceData.workspaces || [];
    const selectedWorkspace = state.workspaces.find(workspace => workspace.id === state.activeWorkspaceId)
      || state.workspaces.find(workspace => workspace.id === current.workspace?.id)
      || state.workspaces[0]
      || current.workspace;
    const workspaceSelectionChanged = selectedWorkspace?.id && state.activeWorkspaceId !== selectedWorkspace.id;
    if (workspaceSelectionChanged) {
      state.activeWorkspaceId = selectedWorkspace.id;
      localStorage.setItem('sneup.workspaceId', state.activeWorkspaceId);
      await loadFeatureFlags();
    }

    const [userData, invitationData] = selectedWorkspace?.id
      ? await Promise.all([
        fetchApi(`/api/workspaces/${selectedWorkspace.id}/users?limit=100`),
        fetchApi(`/api/workspaces/${selectedWorkspace.id}/invitations?limit=100`)
      ])
      : [{ users: [] }, { invitations: [] }];
    state.workspaceUsers = userData.users || [];
    state.workspaceInvitations = invitationData.invitations || [];
    renderWorkspaces();
  } catch (error) {
    state.workspaceUsers = [];
    state.workspaceInvitations = [];
    state.policyRules = [];
    state.policyRuleError = error.message;
    state.policyHistory = [];
    state.policyHistoryError = error.message;
    state.workspaces = state.currentWorkspace ? [state.currentWorkspace] : [];
    if (workspaceViewController) {
      renderWorkspaces(error.message);
    } else {
      els.workspaceList.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    }
  }
}

async function loadIntegrityReport(options = {}) {
  els.integrityScanButton.disabled = true;
  try {
    const data = await fetchApi('/api/integrity?limit=200');
    state.integrityReport = data.report;
    state.integrityError = '';
    if (options.announce) openNotice('Integrity scan complete', `${data.report.summary.findings} finding(s), ${data.report.summary.repairable} safely repairable.`);
  } catch (error) {
    state.integrityReport = null;
    state.integrityError = error.message;
    if (options.announce) openNotice('Integrity scan failed', error.message);
  } finally {
    els.integrityScanButton.disabled = false;
    if (options.render !== false) renderIntegrityReport();
  }
}

async function loadRetentionReport(options = {}) {
  els.retentionScanButton.disabled = true;
  try {
    const data = await fetchApi('/api/data-retention?limit=200');
    state.retentionReport = data.report;
    state.retentionError = '';
    if (options.announce) openNotice('Retention scan complete', `${data.report.summary.due} old record(s) are currently due.`);
  } catch (error) {
    state.retentionReport = null;
    state.retentionError = error.message;
    if (options.announce) openNotice('Retention scan failed', error.message);
  } finally {
    els.retentionScanButton.disabled = false;
    if (options.render !== false) renderRetentionReport();
  }
}

function buildPolicyHistoryEndpoint() {
  const params = new URLSearchParams({ limit: '25' });
  const actionType = String(state.policyHistoryFilters?.actionType || '').trim();
  const actor = String(state.policyHistoryFilters?.actor || '').trim();
  const rangeDays = Number.parseInt(state.policyHistoryFilters?.rangeDays, 10);
  if (actionType) params.set('actionType', actionType);
  if (actor) params.set('actor', actor);
  if (Number.isInteger(rangeDays) && rangeDays > 0) {
    params.set('from', new Date(Date.now() - (rangeDays * 24 * 60 * 60 * 1000)).toISOString());
  }
  return `/api/policy-rules/history?${params.toString()}`;
}

async function loadPolicyHistory() {
  if (state.securityContext?.demoMode || state.currentWorkspace?.demoMode) return;
  try {
    const data = await fetchApi(buildPolicyHistoryEndpoint());
    state.policyHistory = data.history || [];
    state.policyHistoryError = '';
  } catch (error) {
    state.policyHistory = [];
    state.policyHistoryError = error.message;
  }
  renderWorkspaces();
}

async function loadOperationsLedger() {
  try {
    const data = await fetchApi('/api/operations-ledger');
    const ledger = data.ledger || {};
    state.ledger = {
      decisions: ledger.decisions || [],
      recommendations: ledger.recommendations || [],
      actions: ledger.actions || [],
      auditEvents: ledger.auditEvents || [],
      followUps: ledger.followUps || [],
      workerResponses: ledger.workerResponses || [],
      accountability: ledger.accountability || null,
      outcomes: ledger.outcomes || [],
      findings: ledger.findings || [],
      healthSnapshots: ledger.healthSnapshots || [],
      reconciliationHealth: ledger.reconciliationHealth || null,
      notificationPolicies: ledger.notificationPolicies || [],
      notificationDeliveries: ledger.notificationDeliveries || [],
      timeline: ledger.timeline || [],
      demoMode: Boolean(ledger.demoMode),
      errors: (ledger.errors || []).map((error) => error.message || String(error))
    };
  } catch (error) {
    state.ledger = {
      ...state.ledger,
      decisions: [],
      recommendations: [],
      actions: [],
      auditEvents: [],
      followUps: [],
      workerResponses: [],
      accountability: null,
      outcomes: [],
      findings: [],
      healthSnapshots: [],
      reconciliationHealth: null,
      notificationPolicies: [],
      notificationDeliveries: [],
      timeline: [],
      demoMode: false,
      errors: [error.message]
    };
  }

  updateApprovalCount();
  renderOperationsLedger();
}

function renderOverview() {
  const snapshot = state.snapshot;
  if (!snapshot) return;

  const generatedAt = new Date(snapshot.generatedAt);
  els.timestamp.textContent = t('{mode} updated {date}', {
    mode: t(snapshot.mode === 'demo' ? 'Demo mode' : 'Live mode'),
    date: i18n.formatDate(generatedAt)
  });
  els.riskCount.textContent = snapshot.signals.activeRisks;
  els.commandMode.textContent = snapshot.autonomy.level;

  const metrics = [
    ['Boards', snapshot.signals.boards],
    ['Active cards', snapshot.signals.activeCards],
    ['Overdue', snapshot.signals.overdueCards],
    ['High risk', snapshot.signals.highRiskCards],
    ['Unassigned', snapshot.signals.unassignedCards],
    ['Overloaded', snapshot.signals.overloadedMembers],
    ['Graph decisions', snapshot.signals.graphDecisions || 0]
  ];
  els.metrics.innerHTML = metrics.map(([label, value]) => `
    <div class="metric">
      <span>${et(label)}</span>
      <strong>${value}</strong>
    </div>
  `).join('');

  const confidence = snapshot.brief.confidence || 0;
  els.brief.innerHTML = `
    <h2>${escapeHtml(snapshot.brief.headline)}</h2>
    <p>${escapeHtml(snapshot.brief.narrative)}</p>
    <p><strong>${et('Next decision:')}</strong> ${escapeHtml(snapshot.brief.decision)}</p>
    ${renderConfidence(confidence)}
  `;

  els.commandQueue.innerHTML = listOrEmpty(snapshot.commandQueue, renderCommand);
  bindAutopilotCommandActions();
  els.automationCount.textContent = tp('{count} ready item', '{count} ready items', snapshot.dailyPlan.automation.ready);
  els.dailyPlan.innerHTML = listOrEmpty(snapshot.dailyPlan.firstHour.map((item, index) => ({
    title: item,
    meta: t('Step {count}', { count: index + 1 })
  })), (item) => `
    <div class="item">
      <div class="item-title"><strong>${escapeHtml(item.title)}</strong><span class="pill review">${escapeHtml(item.meta)}</span></div>
    </div>
  `);

  els.focusCount.textContent = tp('{count} item', '{count} items', snapshot.focus.length);
  els.focusQueue.innerHTML = listOrEmpty(snapshot.focus, renderFocus);
  els.teamCount.textContent = tp('{count} person', '{count} people', snapshot.teamLoad.length);
  els.teamLoad.innerHTML = listOrEmpty(snapshot.teamLoad, renderTeamMember);
  els.boardCount.textContent = tp('{count} board', '{count} boards', snapshot.boardSummaries.length);
  els.boards.innerHTML = listOrEmpty(snapshot.boardSummaries, renderBoard);
  bindLedgerDrilldownActions();
  renderOperationsBrief();
  renderJobDashboard();
}

function renderOperationsBrief() {
  const brief = state.operationsBrief;
  if (!brief) return;

  const counts = brief.counts || {};
  const robertDecisionCount = counts.robertDecisions || 0;
  const graphDecisionCount = counts.graphDecisions || 0;
  els.operationsBriefCount.textContent = graphDecisionCount > 0
    ? t('{robert} Robert, {graph} graph', { robert: robertDecisionCount, graph: graphDecisionCount })
    : tp('{count} decision', '{count} decisions', robertDecisionCount);

  const items = [
    ...(brief.robertDecisions || []),
    ...(brief.vaReady || []),
    ...(brief.teamQueue || []),
    ...(brief.externalWaits || []),
    ...(brief.failedActions || []),
    ...(brief.dueFollowUps || []),
    ...(brief.boardHealth || [])
  ].slice(0, 8);

  els.operationsBriefItems.innerHTML = `
    <div class="item">
      <div class="item-title">
        <strong>${escapeHtml(brief.headline)}</strong>
        <span class="pill ${brief.mode === 'demo' ? 'review' : 'healthy'}">${escapeHtml(brief.mode)}</span>
      </div>
      <div class="meta">${escapeHtml(brief.narrative)}</div>
      <div class="meta"><span>${et('Next:')} ${escapeHtml(brief.nextDecision)}</span></div>
      ${renderConfidence(brief.confidence || 0)}
      ${robertDecisionCount > 0 ? `<div class="item-actions"><button class="button primary" type="button" data-brief-action="review-robert">${et('Review Robert decision')}</button></div>` : ''}
    </div>
    ${listOrEmpty(items, renderOperationsBriefItem)}
    <div class="item">
      <div class="item-title"><strong>${et('Morning plan')}</strong><span class="pill review">${et('read-only')}</span></div>
      <div class="meta">${(brief.morningPlan || []).map(step => `<span>${escapeHtml(step)}</span>`).join('')}</div>
    </div>
  `;
  bindOperationsBriefActions();
}

function bindOperationsBriefActions() {
  document.querySelectorAll('[data-brief-action="review-robert"]').forEach((button) => {
    button.addEventListener('click', () => openDecisionQueue('robert'));
  });
  document.querySelectorAll('[data-brief-route]').forEach((button) => {
    button.addEventListener('click', () => openBriefRoute(button.dataset.briefRoute));
  });
}

function openBriefRoute(route) {
  const routes = {
    robert_decision: { queueFilter: 'robert', focusElementId: 'decisionQueue' },
    va_ready: { queueFilter: 'va', focusElementId: 'findingsList' },
    team_queue: { queueFilter: 'team', focusElementId: 'decisionQueue' },
    external_wait: { focusElementId: 'findingsList' },
    follow_up_due: { focusElementId: 'followUps' },
    failed_action: { focusElementId: 'trelloAttempts' },
    board_health: { focusElementId: 'boardHealthList' }
  };
  const target = routes[route];
  if (target) openLedgerSection(target);
}

function operationsBriefRoute(item = {}) {
  const routes = {
    robert_decision: { label: 'Review Robert decision', route: 'robert_decision' },
    va_ready: { label: 'Open VA work', route: 'va_ready' },
    team_queue: { label: 'Open team queue', route: 'team_queue' },
    external_wait: { label: 'Review external wait', route: 'external_wait' },
    follow_up_due: { label: 'Review follow-up', route: 'follow_up_due' },
    failed_action: { label: 'Review failed action', route: 'failed_action' },
    board_health: { label: 'Review board health', route: 'board_health' }
  };
  const route = routes[item.type] || null;
  return route ? { ...route, label: t(route.label) } : null;
}

function renderJobDashboard() {
  const dashboard = state.jobDashboard;
  if (!dashboard) return;

  const summary = dashboard.summary || {};
  const health = dashboard.health || [];
  const observabilityEvidenceJobs = health.filter(job =>
    job.status === 'healthy' && (
      Number(job.metadata?.dependencyFreshness?.providerCount) > 0
      || Number(job.metadata?.syncRegressionWatch?.signalCount) > 0
      || Number(job.metadata?.trelloBoardCount) > 0
    )
  ).slice(0, 2);
  const problemJobs = health
    .filter(job => ['failed', 'stale', 'paused'].includes(job.status))
    .slice(0, observabilityEvidenceJobs.length > 0 ? 8 - observabilityEvidenceJobs.length : 8);
  const displayJobs = problemJobs.length > 0
    ? [...problemJobs, ...observabilityEvidenceJobs]
    : health.slice(0, 5);

  els.jobHealthCount.textContent = tp('{count} tracked job', '{count} tracked jobs', summary.trackedJobs || health.length || 0);
  els.jobHealthList.innerHTML = `
    <div class="item">
      <div class="item-title">
        <strong>${summary.failedJobs || 0} failed, ${summary.staleJobs || 0} stale</strong>
        <span class="pill ${dashboard.mode === 'demo' ? 'review' : 'healthy'}">${escapeHtml(dashboard.mode)}</span>
      </div>
      <div class="meta">
        <span>${summary.healthyJobs || 0} healthy</span>
        <span>${summary.pausedJobs || 0} paused</span>
        <span>${summary.runningJobs || 0} running</span>
        <span>${summary.activeLeases || 0} protected runs</span>
        <span>${summary.failedRuns || 0} failed runs</span>
        <span>${summary.skippedRuns || 0} skipped runs</span>
        ${summary.unobservedJobs ? `<span>${summary.unobservedJobs} awaiting first run</span>` : ''}
      </div>
    </div>
    ${renderResponseTiming()}
    ${listOrEmpty(displayJobs, renderJobHealthItem)}
  `;

  document.querySelectorAll('[data-job-action]').forEach((button) => {
    button.addEventListener('click', () => runJobAction(button.dataset.jobName, button.dataset.jobAction));
  });
}

function renderResponseTiming() {
  const timing = state.responseTiming;
  const rateLimit = state.rateLimitMetrics;
  const views = (timing?.views || []).filter(view => view.samples > 0).slice(0, 8);
  if ((!timing || views.length === 0) && !rateLimit) return '';
  return `
    <div class="item">
      <div class="item-title"><strong>Command-center response timing</strong><span class="pill healthy">bounded</span></div>
      <div class="meta">Recent in-memory samples only. No request bodies, identifiers, query strings, or credentials are retained.</div>
      ${views.length > 0 ? `<div class="meta">${views.map(view => `<span>${escapeHtml(view.view)}: p50 ${view.p50Ms}ms, p95 ${view.p95Ms}ms (${view.samples})</span>`).join('')}</div>` : ''}
      ${rateLimit ? `<div class="meta"><span>Rate-limit buckets: ${rateLimit.bucketCount}/${rateLimit.maxBuckets} (${rateLimit.utilizationPercent}%)</span><span>${rateLimit.leastRecentlyUsedBucketsPruned} pressure pruned</span><span>${rateLimit.rejectedRequests} rejected</span></div>` : ''}
    </div>
  `;
}

function renderOperationsLedger() {
  approvalViewController?.render();
}

function updateApprovalCount() {
  const decisions = state.ledger?.decisions || [];
  const recommendations = state.ledger?.recommendations || [];
  const openRobert = decisions.filter(item => item.ownerType === 'robert').length;
  const pending = recommendations.filter(item => ['pending', 'approved', 'change_requested'].includes(item.status)).length;
  els.approvalCount.textContent = openRobert + pending;
}
function renderOperationsBriefItem(item) {
  const route = operationsBriefRoute(item);
  return `
    <div class="item">
      <div class="item-title">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="pill ${severityClass(item.riskLevel)}">${escapeHtml(item.type || item.status || 'item')}</span>
      </div>
      <div class="meta">
        <span>${escapeHtml(item.reason || 'Review evidence')}</span>
        ${item.ownerType ? `<span>Owner: ${escapeHtml(item.ownerType)}</span>` : ''}
        ${item.boardName ? `<span>${escapeHtml(item.boardName)}</span>` : ''}
        ${item.cardName ? `<span>${escapeHtml(item.cardName)}</span>` : ''}
        ${item.sourceCount ? `<span>${item.sourceCount} sources</span>` : ''}
        ${item.sourceProvider ? `<span>${escapeHtml(item.sourceProvider)}</span>` : ''}
        ${item.draftOnly ? '<span>draft-only</span>' : ''}
      </div>
      ${item.providerUrl ? `<div class="meta"><a href="${escapeHtml(item.providerUrl)}" rel="noreferrer" target="_blank">Open source</a></div>` : ''}
      ${route ? `<div class="item-actions"><button class="button" type="button" data-brief-route="${route.route}">${escapeHtml(route.label)}</button></div>` : ''}
    </div>
  `;
}

function renderJobHealthItem(job) {
  const statusClass = job.status === 'failed'
    ? 'critical'
    : job.status === 'stale'
      ? 'high'
      : job.status === 'paused'
        ? 'review'
        : job.status === 'unobserved'
          ? 'review'
        : 'healthy';
  const jobName = escapeHtml(job.jobName);
  const controlsDisabled = state.jobDashboard?.mode !== 'live';
  const canTrigger = job.manualTriggerAllowed && !job.paused && !job.leaseActive && !controlsDisabled;
  const pauseResumeAction = job.paused ? 'resume' : 'pause';
  const pauseResumeLabel = job.paused ? 'Resume' : 'Pause';
  const connectorRetries = Number(job.metadata?.retryCount) || 0;
  const connectorPacingMs = Number(job.metadata?.rateLimitWaitMs) || 0;
  const providerQueueCount = Number(job.metadata?.providerQueueCount) || 0;
  const connectorConcurrency = Number(job.metadata?.concurrency) || 0;
  const scheduledWorkspaceCount = Number(job.metadata?.scheduledWorkspaceCount) || 0;
  const scheduledWorkspaceConcurrency = Number(job.metadata?.scheduledWorkspaceConcurrency) || 0;
  const trelloBoardCount = Number(job.metadata?.trelloBoardCount) || 0;
  const boardSyncConcurrency = Number(job.metadata?.boardSyncConcurrency) || 0;
  const signalWriteBatchCount = Number(job.metadata?.signalWriteBatchCount) || 0;
  const signalWriteBatchSize = Number(job.metadata?.signalWriteBatchSize) || 0;
  const dependencyFreshness = job.metadata?.dependencyFreshness;
  const freshnessProviders = Number(dependencyFreshness?.providerCount) || 0;
  const staleDependencies = Number(dependencyFreshness?.markedStale) || 0;
  const freshnessFailures = Number(dependencyFreshness?.failureCount) || 0;
  const freshnessHorizons = Object.values(dependencyFreshness?.byProvider || {})
    .map(provider => Number(provider?.staleAfterDays))
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  const freshnessHorizon = freshnessHorizons.length > 0
    ? `${freshnessHorizons[0]}${freshnessHorizons[0] === freshnessHorizons.at(-1) ? '' : `-${freshnessHorizons.at(-1)}`} day horizon`
    : '';
  const syncRegressionWatch = job.metadata?.syncRegressionWatch || {};
  const skippedReason = job.metadata?.skippedReason || '';
  const syncRegressionSignals = Number(syncRegressionWatch.signalCount) || 0;
  const syncRegressionProviders = Array.isArray(syncRegressionWatch.providers)
    ? syncRegressionWatch.providers
    : [];
  const syncRegressionDetails = syncRegressionProviders.map(provider => {
    const labels = (provider.signals || []).map(signal => signal === 'pacing_spike'
      ? 'pacing spike'
      : 'new failures').join(', ');
    return `${provider.provider}: ${labels}`;
  });
  const unobservedDetail = state.jobDashboard?.mode === 'demo'
    ? 'No demo run is retained for this job. Sneup will start monitoring it after the live workspace records its first run.'
    : 'No run has been recorded for this workspace yet. Sneup will start monitoring freshness after the first scheduled or manual run.';
  const statusLabel = job.unobserved ? 'awaiting first run' : job.status;
  return `
    <div class="item">
      <div class="item-title">
        <strong>${escapeHtml(job.label || job.jobName)}</strong>
        <span class="pill ${statusClass}">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="meta">
        <span>${escapeHtml(job.jobType || 'job')}</span>
        <span>Last run: ${job.unobserved ? 'Awaiting first run' : formatDate(job.lastRunAt)}</span>
        <span>${Math.round((job.lastDurationMs || 0) / 1000)}s</span>
        <span>${job.processedCount || 0} processed</span>
      </div>
      ${connectorRetries || connectorPacingMs ? `<div class="meta"><span>${connectorRetries} provider retries</span><span>${Math.round(connectorPacingMs / 1000)}s provider pacing</span></div>` : ''}
      ${providerQueueCount || connectorConcurrency ? `<div class="meta"><span>${providerQueueCount} provider queues</span><span>up to ${connectorConcurrency || 1} in parallel</span></div>` : ''}
      ${scheduledWorkspaceCount ? `<div class="meta"><span>${scheduledWorkspaceCount} scheduled ${scheduledWorkspaceCount === 1 ? 'workspace' : 'workspaces'}</span><span>up to ${scheduledWorkspaceConcurrency || 1} at once</span></div>` : ''}
      ${trelloBoardCount ? `<div class="meta"><span>${trelloBoardCount} Trello ${trelloBoardCount === 1 ? 'board' : 'boards'}</span><span>up to ${boardSyncConcurrency || 1} at once</span></div>` : ''}
      ${signalWriteBatchCount ? `<div class="meta"><span>${signalWriteBatchCount} signal write ${signalWriteBatchCount === 1 ? 'batch' : 'batches'}</span><span>up to ${signalWriteBatchSize || 1} signals each</span></div>` : ''}
      ${freshnessProviders || staleDependencies || freshnessFailures ? `<div class="meta"><span>Graph freshness: ${freshnessProviders} providers checked</span><span>${staleDependencies} stale edges marked</span>${freshnessHorizon ? `<span>${freshnessHorizon}</span>` : ''}${freshnessFailures ? `<span>${freshnessFailures} freshness checks failed</span>` : ''}</div>` : ''}
      ${syncRegressionSignals ? `<div class="meta"><span>Sync regression watch: ${syncRegressionSignals} ${syncRegressionSignals === 1 ? 'signal' : 'signals'} across ${syncRegressionProviders.length} ${syncRegressionProviders.length === 1 ? 'provider' : 'providers'}</span><span>${escapeHtml(syncRegressionDetails.join(' | '))}</span></div>` : ''}
      ${job.unobserved ? `<div class="meta">${unobservedDetail}</div>` : ''}
      ${job.leaseActive ? `<div class="meta"><span>Protected run active until ${formatDate(job.leaseExpiresAt)}</span></div>` : ''}
      ${skippedReason ? `<div class="meta"><span>${escapeHtml(skippedReason)}</span></div>` : ''}
      ${job.pausedReason ? `<div class="meta">${escapeHtml(job.pausedReason)}</div>` : ''}
      ${job.lastError ? `<div class="meta">${escapeHtml(job.lastError)}</div>` : ''}
      <div class="item-actions">
        <button class="button" data-job-name="${jobName}" data-job-action="${pauseResumeAction}" type="button" ${controlsDisabled ? 'disabled' : ''}>${pauseResumeLabel}</button>
        <button class="button primary" data-job-name="${jobName}" data-job-action="trigger" type="button" ${canTrigger ? '' : 'disabled'}>Run now</button>
      </div>
    </div>
  `;
}

function renderRecommendation(recommendation) {
  return approvalViewController?.renderRecommendation(recommendation) || '';
}

function renderFinding(finding) {
  return approvalViewController?.renderFinding(finding) || '';
}

function renderTrelloAttempt(attempt) {
  return approvalViewController?.renderTrelloAttempt(attempt) || '';
}

function renderInterventionOutcome(outcome) {
  return approvalViewController?.renderInterventionOutcome(outcome) || '';
}

function renderAuditEvent(event) {
  return approvalViewController?.renderAuditEvent(event) || '';
}

function notificationDeliverySourceEvidence(delivery = {}) {
  return approvalViewController?.notificationDeliverySourceEvidence(delivery) || [];
}
function renderSourceEvidence(sourceEvidence = []) {
  if (!sourceEvidence || sourceEvidence.length === 0) return '';
  const visibleRefs = sourceEvidence.slice(0, 3);
  const remainingCount = Math.max(0, sourceEvidence.length - visibleRefs.length);
  return `
    <div class="source-evidence" aria-label="Source evidence">
      ${visibleRefs.map(renderSourceEvidenceRef).join('')}
      ${remainingCount ? `<span class="evidence-ref">+${remainingCount} more</span>` : ''}
    </div>
  `;
}

function renderSourceEvidenceRef(item = {}) {
  const label = escapeHtml(item.label || item.type || 'Evidence');
  const sourceUrl = safeExternalUrl(item.url);
  const title = escapeHtml(`${item.type || 'source'} evidence`);
  return sourceUrl
    ? `<a class="evidence-ref evidence-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer" title="${title}">${label}</a>`
    : `<span class="evidence-ref" title="${title}">${label}</span>`;
}

function safeExternalUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value));
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    return url.toString();
  } catch (error) {
    return '';
  }
}

async function runRecommendationAction(recommendationId, action) {
  if (!recommendationId) return;

  const endpoint = `/api/recommendations/${recommendationId}/${action}`;
  const body = action === 'approve'
    ? { decidedBy: 'robert', decisionReason: 'Approved from Sneup command center' }
    : action === 'reject'
      ? { decidedBy: 'robert', decisionReason: 'Rejected from Sneup command center' }
      : action === 'change'
        ? { decidedBy: 'robert', decisionReason: 'Change requested from Sneup command center' }
        : { actor: 'robert' };

  try {
    const data = await fetchApi(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    openNotice(t('Recommendation updated'), data.message || t('Action completed: {action}', { action: t(String(action).replaceAll('-', ' ')) }));
    await loadOperationsLedger();
  } catch (error) {
    openNotice(t('Recommendation action failed'), error.message);
  }
}
async function runDecisionAction(itemId, action) {
  if (!itemId) return;

  const endpoint = action === 'snooze'
    ? `/api/decision-queue/${itemId}/snooze`
    : `/api/decision-queue/${itemId}/delegate`;
  const body = action === 'snooze'
    ? {
      snoozedBy: 'robert',
      reason: 'Snoozed from Sneup command center'
    }
    : {
      delegatedBy: 'robert',
      ownerType: action === 'delegate-va' ? 'va' : 'team',
      delegatedTo: action === 'delegate-va' ? 'va' : 'team',
      reason: `Delegated from Sneup command center to ${action === 'delegate-va' ? 'VA' : 'team'}`
    };

  try {
    await fetchApi(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    openNotice(t('Decision updated'), t(action === 'snooze' ? 'Decision snoozed using this workspace default.' : 'Decision delegated.'));
    await loadOperationsLedger();
  } catch (error) {
    openNotice(t('Decision update failed'), error.message);
  }
}

async function runFollowUpAction(followUpId, action) {
  if (!followUpId) return;

  const status = action === 'escalated' ? 'escalated' : 'resolved';
  const body = {
    status,
    resolvedBy: 'robert',
    outcome: status === 'escalated' ? 'needs_attention' : 'manual',
    resolutionNote: status === 'escalated'
      ? 'Escalated from Sneup command center'
      : 'Resolved from Sneup command center'
  };

  try {
    await fetchApi(`/api/follow-ups/${followUpId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    openNotice(t('Follow-up updated'), t(status === 'escalated' ? 'Follow-up escalated.' : 'Follow-up resolved.'));
    await loadOperationsLedger();
  } catch (error) {
    openNotice(t('Follow-up update failed'), error.message);
  }
}

function openWorkerResponseRecorder(interventionId) {
  if (!interventionId) return;

  els.modalTitle.textContent = t('Record worker response');
  els.modalBody.innerHTML = `
    <form id="workerResponseForm" class="notice-stack">
      <div class="notice">${et('Record an observed response to the executed communication. Sneup will update the matching internal follow-up and accountability ledger, but it will not send a provider message.')}</div>
      <label>${et('Response type')}
        <select name="responseType" required>
          <option value="acknowledged">${et('Acknowledged')}</option>
          <option value="completed">${et('Completed')}</option>
          <option value="blocked">${et('Blocked')}</option>
          <option value="needs_help">${et('Needs help')}</option>
          <option value="ignored">${et('Ignored')}</option>
          <option value="other">${et('Other')}</option>
        </select>
      </label>
      <label>${et('Observed through')}
        <select name="source" required>
          <option value="manual">${et('Manual observation')}</option>
          <option value="email">${et('Email')}</option>
          <option value="slack">${et('Slack')}</option>
          <option value="web_chat">${et('Web chat')}</option>
          <option value="trello_comment">${et('Trello comment')}</option>
        </select>
      </label>
      <label>${et('Response note (optional)')}
        <textarea name="responseText" rows="4" maxlength="2000" placeholder="${et('Record only the context needed to explain the response')}"></textarea>
      </label>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelWorkerResponse">${et('Cancel')}</button>
        <button class="button primary" type="submit">${et('Record response')}</button>
      </div>
    </form>
  `;
  els.modal.classList.add('open');
  document.getElementById('cancelWorkerResponse').addEventListener('click', closeModal);
  document.getElementById('workerResponseForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    submitButton.disabled = true;
    submitButton.textContent = t('Recording...');
    try {
      const data = await fetchApi(`/api/interventions/${encodeURIComponent(interventionId)}/record-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseType: values.get('responseType'),
          source: values.get('source'),
          responseText: values.get('responseText'),
          actor: state.securityContext?.actorId || 'local-user'
        })
      });
      closeModal();
      await loadOperationsLedger();
      openNotice(t('Worker response recorded'), t(data.response?.responseType === 'blocked' || data.response?.responseType === 'needs_help'
        ? 'The matching follow-up was escalated for review.'
        : 'The matching follow-up and accountability ledger were updated.'));
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = t('Record response');
      openNotice(t('Worker response blocked'), error.message);
    }
  });
}

async function runOutcomeEvaluation(recommendationId) {
  if (!recommendationId) return;

  try {
    const result = await fetchApi(`/api/outcomes/recommendations/${recommendationId}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    openNotice('Outcome evidence refreshed', result.outcome?.summary || 'Sneup refreshed the available outcome evidence.');
    await loadOperationsLedger();
  } catch (error) {
    openNotice('Outcome evaluation failed', error.message);
  }
}

async function runJobAction(jobName, action) {
  if (!jobName || !action) return;

  const actionLabels = {
    pause: 'paused',
    resume: 'resumed',
    trigger: 'triggered'
  };

  try {
    await fetchApi(`/api/jobs/${encodeURIComponent(jobName)}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: action === 'pause' ? 'Paused from Sneup command center' : undefined
      })
    });
    await loadJobDashboard();
    openNotice('Job control updated', `${jobName} ${actionLabels[action] || 'updated'}.`);
  } catch (error) {
    openNotice('Job control failed', error.message);
  }
}

async function editRecommendationPayload(recommendationId) {
  const recommendation = (state.ledger.recommendations || []).find(item => getId(item._id) === recommendationId);
  if (!recommendation) return;
  const fields = getPayloadReviewFields(recommendation);
  if (fields.length === 0) return;

  const payload = recommendation.actionPayload || {};
  let context = {};
  try {
    context = await loadPayloadReviewContext(recommendation, fields);
  } catch (error) {
    openNotice(t('Payload review unavailable'), error.message);
    return;
  }
  const reviewReady = isPayloadReviewReady(fields, context);
  els.modalTitle.textContent = t('Review {action} payload', {
    action: t(String(recommendation.actionType || 'action').replaceAll('_', ' '))
  });
  els.modalBody.innerHTML = `
    <form id="payloadReviewForm">
      <div class="notice">${et('The Trello target and action type are locked. Saving changes returns this recommendation to pending so the exact revised payload must be approved again.')}</div>
      <div class="payload-target">${renderProtectedPayloadSummary(payload)}</div>
      ${reviewReady ? '' : `<div class="notice">${et('Sneup needs the current board members or lists before this payload can be prepared.')}</div>`}
      ${fields.map((field) => renderPayloadReviewField(field, payload, context)).join('')}
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelPayloadReview">${et('Cancel')}</button>
        <button class="button primary" type="submit" ${reviewReady ? '' : 'disabled'}>${et('Save for approval')}</button>
      </div>
    </form>
  `;
  els.modal.classList.add('open');
  document.getElementById('cancelPayloadReview').addEventListener('click', closeModal);
  document.getElementById('payloadReviewForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const actionPayload = {};
    for (const field of fields) {
      const input = form.elements[field.key];
      const value = input?.value || '';
      if (field.kind === 'checklist') {
        actionPayload[field.key] = value.split('\n').map(item => item.trim()).filter(Boolean);
      } else if (field.kind === 'member') {
        const selected = input?.options?.[input.selectedIndex];
        actionPayload.toMemberId = value;
        actionPayload.toMemberTrelloId = selected?.dataset.trelloId || '';
      } else {
        actionPayload[field.key] = value;
      }
    }
    submitButton.disabled = true;
    try {
      await fetchApi(`/api/recommendations/${recommendationId}/payload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedBy: 'robert', actionPayload })
      });
      closeModal();
      openNotice(t('Payload saved'), t('The revised action is pending a fresh Yes/No approval.'));
      await loadOperationsLedger();
    } catch (error) {
      submitButton.disabled = false;
      openNotice(t('Payload update failed'), error.message);
    }
  });
}

const PAYLOAD_REVIEW_FIELDS = Object.freeze({
  comment: [{ key: 'commentText', label: 'Comment text', kind: 'textarea', required: true }],
  follow_up: [{ key: 'commentText', label: 'Follow-up text', kind: 'textarea', required: true }],
  performance_notification: [{ key: 'commentText', label: 'Notification text', kind: 'textarea', required: true }],
  move_card: [{ key: 'targetListId', label: 'Target Trello list', kind: 'list', required: true }],
  reassign: [
    { key: 'targetMember', label: 'New accountable owner', kind: 'member', required: true },
    { key: 'commentText', label: 'Optional reassignment note', kind: 'textarea', required: false }
  ],
  escalate: [{ key: 'commentText', label: 'Escalation text', kind: 'textarea', required: true }],
  add_label: [
    { key: 'labelName', label: 'Label name', kind: 'text', required: true },
    { key: 'labelColor', label: 'Label color', kind: 'labelColor', required: true }
  ],
  set_due_date: [{ key: 'due', label: 'Due date (ISO 8601)', kind: 'text', required: true }],
  add_checklist: [
    { key: 'checklistName', label: 'Checklist name', kind: 'text', required: true },
    { key: 'checkItems', label: 'Checklist items (one per line)', kind: 'checklist', required: true }
  ]
});

function getPayloadReviewFields(recommendation = {}) {
  const payload = recommendation.actionPayload || {};
  if (payload.externalProviderWriteBlocked === true || payload.source === 'work_graph') return [];
  return PAYLOAD_REVIEW_FIELDS[recommendation.actionType] || [];
}

async function loadPayloadReviewContext(recommendation, fields) {
  if (!fields.some((field) => field.kind === 'member' || field.kind === 'list')) return {};
  const boardId = getId(recommendation.boardId);
  if (!boardId) throw new Error(t('This recommendation does not have a board target to verify.'));
  const data = await fetchApi(`/api/boards/${boardId}`);
  return {
    members: data.board?.members || [],
    lists: data.lists || []
  };
}

function isPayloadReviewReady(fields, context = {}) {
  return fields.every((field) => {
    if (field.kind === 'member') return (context.members || []).length > 0;
    if (field.kind === 'list') return (context.lists || []).length > 0;
    return true;
  });
}

function renderPayloadReviewField(field, payload = {}, context = {}) {
  const required = field.required ? 'required' : '';
  const value = field.key === 'targetMember' ? payload.toMemberId : payload[field.key];
  if (field.kind === 'textarea' || field.kind === 'checklist') {
    const text = field.kind === 'checklist' && Array.isArray(value) ? value.join('\n') : value || '';
    return `<div class="field"><label for="payloadField${escapeHtml(field.key)}">${et(field.label)}</label><textarea id="payloadField${escapeHtml(field.key)}" name="${escapeHtml(field.key)}" ${required}>${escapeHtml(text)}</textarea></div>`;
  }
  if (field.kind === 'member') {
    const members = context.members || [];
    return `<div class="field"><label for="payloadField${escapeHtml(field.key)}">${et(field.label)}</label><select id="payloadField${escapeHtml(field.key)}" name="${escapeHtml(field.key)}" ${required}>${members.map((member) => {
      const memberId = getId(member._id || member.id);
      const label = member.fullName || member.username || memberId;
      return `<option value="${escapeHtml(memberId)}" data-trello-id="${escapeHtml(member.trelloId || '')}" ${String(memberId) === String(value || '') ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }).join('')}</select></div>`;
  }
  if (field.kind === 'list') {
    const lists = context.lists || [];
    return `<div class="field"><label for="payloadField${escapeHtml(field.key)}">${et(field.label)}</label><select id="payloadField${escapeHtml(field.key)}" name="${escapeHtml(field.key)}" ${required}>${lists.map((list) => {
      const listId = list.trelloId || getId(list._id || list.id);
      return `<option value="${escapeHtml(listId)}" ${String(listId) === String(value || '') ? 'selected' : ''}>${escapeHtml(list.name || listId)}</option>`;
    }).join('')}</select></div>`;
  }
  if (field.kind === 'labelColor') {
    const selected = String(value || 'red').toLowerCase();
    const options = ['yellow', 'purple', 'blue', 'red', 'green', 'orange', 'black', 'sky', 'pink', 'lime'];
    return `<div class="field"><label for="payloadField${escapeHtml(field.key)}">${et(field.label)}</label><select id="payloadField${escapeHtml(field.key)}" name="${escapeHtml(field.key)}" ${required}>${options.map(color => `<option value="${color}" ${color === selected ? 'selected' : ''}>${et(color)}</option>`).join('')}</select></div>`;
  }
  return `<div class="field"><label for="payloadField${escapeHtml(field.key)}">${et(field.label)}</label><input id="payloadField${escapeHtml(field.key)}" name="${escapeHtml(field.key)}" type="text" value="${escapeHtml(value || '')}" ${required}></div>`;
}

function renderProtectedPayloadSummary(payload = {}) {
  const fields = [
    ['Card', payload.cardTrelloId],
    ['Board', payload.boardId],
    ['Current owner', payload.fromMemberTrelloId],
    ['Source', payload.source]
  ].filter(([, value]) => value);
  if (fields.length === 0) return '';
  return `<div class="meta">${fields.map(([label, value]) => `<span>${et(label)}: ${escapeHtml(value)}</span>`).join('')}</div>`;
}

async function openRecommendationEvidence(recommendationId) {
  if (!recommendationId) return;

  try {
    const data = await fetchApi(`/api/recommendations/${recommendationId}/evidence`);
    renderEvidenceModal(data.evidence);
  } catch (error) {
    openNotice(t('Evidence unavailable'), error.message);
  }
}

function renderEvidenceModal(bundle = {}) {
  const recommendation = bundle.recommendation || {};
  const summary = bundle.summary || {};
  els.modalTitle.textContent = t('Recommendation evidence');
  els.modalBody.innerHTML = `
    <div class="notice-stack">
      <div class="item">
        <div class="item-title">
          <strong>${escapeHtml(recommendation.title || recommendation.recommendedAction || t('Recommendation'))}</strong>
          <span class="pill ${severityClass(recommendation.riskLevel)}">${et(String(recommendation.status || 'pending').replaceAll('_', ' '))}</span>
        </div>
        <div class="meta">
          <span>${tp('{count} source ref', '{count} source refs', summary.sourceEvidenceCount || 0)}</span>
          <span>${tp('{count} decision', '{count} decisions', summary.decisionCount || 0)}</span>
          <span>${tp('{count} approval', '{count} approvals', summary.approvalCount || 0)}</span>
          <span>${tp('{count} Trello attempt', '{count} Trello attempts', summary.trelloActionCount || 0)}</span>
          <span>${tp('{count} audit event', '{count} audit events', summary.auditEventCount || 0)}</span>
          <span>${et('Newest {date}', { date: formatDate(summary.newestEvidenceAt) })}</span>
        </div>
      </div>
      ${renderEvidenceSection('Source Evidence', bundle.sourceEvidence || [], renderEvidenceRef)}
      ${renderEvidenceSection('Trello Action Evidence', bundle.trelloActions || [], renderEvidenceAction)}
      ${renderEvidenceSection('Audit Trail', bundle.auditEvents || [], renderEvidenceAudit)}
      <div class="toolbar modal-actions">
        <button class="button primary" type="button" id="evidenceClose">${et('Done')}</button>
      </div>
    </div>
  `;
  els.modal.classList.add('open');
  document.getElementById('evidenceClose').addEventListener('click', closeModal);
}

function openNotificationDeliveryEvidence(deliveryId) {
  const delivery = (state.ledger.notificationDeliveries || [])
    .find(item => getId(item.id || item._id) === deliveryId);
  if (!delivery) return;

  const sourceEvidence = notificationDeliverySourceEvidence(delivery);
  if (sourceEvidence.length === 0) {
    openNotice(t('Notification sources'), t('This delivery has no validated source links.'));
    return;
  }

  els.modalTitle.textContent = t('Notification sources');
  els.modalBody.innerHTML = `
    <div class="notice-stack">
      <div class="item">
        <div class="item-title">
          <strong>${escapeHtml(delivery.title || t('Notification delivery'))}</strong>
          <span class="pill ${['delivered', 'digested'].includes(delivery.status) ? 'healthy' : delivery.status === 'failed' ? 'critical' : 'review'}">${et(String(delivery.status || 'recorded').replaceAll('_', ' '))}</span>
        </div>
        <div class="meta">
          <span>${tp('{count} source ref', '{count} source refs', sourceEvidence.length)}</span>
          <span>${formatDate(delivery.deliveredAt || delivery.failedAt || delivery.createdAt)}</span>
        </div>
      </div>
      <section>
        <div class="panel-head evidence-head">
          <h2>${et('Source evidence')}</h2>
          <span class="pill review">${sourceEvidence.length}</span>
        </div>
        <div class="list">${sourceEvidence.map(renderEvidenceRef).join('')}</div>
      </section>
      <div class="toolbar modal-actions">
        <button class="button primary" type="button" id="notificationEvidenceClose">${et('Done')}</button>
      </div>
    </div>
  `;
  els.modal.classList.add('open');
  document.getElementById('notificationEvidenceClose').addEventListener('click', closeModal);
}

function bindLedgerDrilldownActions() {
  document.querySelectorAll('[data-board-ledger]').forEach((button) => {
    button.addEventListener('click', () => openOperatingLedger('board', button.dataset.boardLedger));
  });
  document.querySelectorAll('[data-card-ledger]').forEach((button) => {
    button.addEventListener('click', () => openOperatingLedger('card', button.dataset.cardLedger));
  });
}

async function openOperatingLedger(type, entityId) {
  if (!entityId) return;
  await Promise.all([loadApprovalView(), loadWorkSignalsView()]);

  if (state.snapshot?.mode === 'demo' || state.ledger.demoMode) {
    openNotice(
      'Read-only demo ledger',
      'Board and card drill-downs need live workspace data. Review the approval ledger for representative demo evidence.'
    );
    return;
  }

  const endpoint = type === 'board'
    ? `/api/boards/${entityId}/operating-ledger`
    : `/api/cards/${entityId}/operating-ledger`;

  try {
    const data = await fetchApi(endpoint);
    renderOperatingLedgerModal(type, data.ledger || {});
  } catch (error) {
    openNotice('Operating ledger unavailable', error.message);
  }
}

function renderOperatingLedgerModal(type, ledger = {}) {
  const graphContext = ledger.graphContext || {};
  const title = type === 'board' ? 'Board operating ledger' : 'Card operating ledger';
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = `
    <div class="notice-stack">
      <div class="item">
        <div class="item-title">
          <strong>${escapeHtml(graphContext.sourceName || title)}</strong>
          <span class="pill review">${escapeHtml(graphContext.contextType || type)}</span>
        </div>
        <div class="meta">
          <span>${(ledger.recommendations || []).length} recommendations</span>
          <span>${(ledger.decisions || []).length} decisions</span>
          <span>${(ledger.actions || []).length} Trello attempts</span>
          <span>${(ledger.auditEvents || []).length} audit events</span>
          <span>${(ledger.followUps || []).length} follow-ups</span>
          <span>${(ledger.outcomes || []).length} outcomes</span>
          <span>${(ledger.timeline || []).length} timeline events</span>
        </div>
      </div>
      ${renderLedgerTimeline(ledger.timeline || [])}
      ${renderGraphLedgerContext(graphContext)}
      ${renderLedgerSection('Open Findings', ledger.findings || [], renderFinding)}
      ${renderLedgerSection('Recent Recommendations', ledger.recommendations || [], renderRecommendation)}
      ${renderLedgerSection('Trello Action Attempts', ledger.actions || [], renderTrelloAttempt)}
      ${renderLedgerSection('Intervention Outcomes', ledger.outcomes || [], renderInterventionOutcome)}
      ${renderLedgerSection('Audit Trail', ledger.auditEvents || [], renderAuditEvent)}
      <div class="toolbar modal-actions">
        <button class="button primary" type="button" id="ledgerClose">Done</button>
      </div>
    </div>
  `;
  els.modal.classList.add('open');
  document.getElementById('ledgerClose').addEventListener('click', closeModal);
  bindLedgerDrilldownActions();
  bindGraphActions();
  bindGraphLedgerFilters();
  document.querySelectorAll('[data-recommendation-action]').forEach((button) => {
    button.addEventListener('click', () => runRecommendationAction(
      button.dataset.recommendationId,
      button.dataset.recommendationAction
    ));
  });
  document.querySelectorAll('[data-recommendation-evidence]').forEach((button) => {
    button.addEventListener('click', () => openRecommendationEvidence(button.dataset.recommendationEvidence));
  });
  document.querySelectorAll('[data-payload-edit]').forEach((button) => {
    button.addEventListener('click', () => editRecommendationPayload(button.dataset.payloadEdit));
  });
  document.querySelectorAll('[data-outcome-evaluate]').forEach((button) => {
    button.addEventListener('click', () => runOutcomeEvaluation(button.dataset.outcomeEvaluate));
  });
}

function renderLedgerTimeline(items = []) {
  return renderLedgerSection('Operational Timeline', items, renderLedgerTimelineItem);
}

function renderLedgerTimelineItem(entry = {}) {
  const meta = (entry.meta || []).filter(Boolean);
  return `
    <div class="item">
      <div class="item-title">
        <strong>${escapeHtml(entry.title || 'Ledger event')}</strong>
        <span class="pill ${severityClass(entry.severity)}">${escapeHtml(entry.status || 'recorded')}</span>
      </div>
      <div class="meta">
        <span>${formatDate(entry.occurredAt)}</span>
        <span>${escapeHtml((entry.type || 'event').replaceAll('_', ' '))}</span>
        ${meta.map(item => `<span>${escapeHtml(item)}</span>`).join('')}
      </div>
    </div>
  `;
}

function renderLedgerSection(title, items, renderer) {
  return `
    <section>
      <div class="panel-head evidence-head">
        <h2>${et(title)}</h2>
        <span class="pill review">${items.length}</span>
      </div>
      <div class="list">${listOrEmpty(items.slice(0, 5), renderer)}</div>
    </section>
  `;
}

function renderGraphLedgerContext(graphContext = {}) {
  return workSignalsViewController?.renderGraphLedgerContext(graphContext) || '';
}

function bindGraphActions() {
  workSignalsViewController?.bindGraphActions();
}

function bindGraphLedgerFilters() {
  workSignalsViewController?.bindGraphLedgerFilters();
}

function renderEvidenceSection(title, items, renderer) {
  return `
    <section>
      <div class="panel-head evidence-head">
        <h2>${escapeHtml(title)}</h2>
        <span class="pill review">${items.length}</span>
      </div>
      <div class="list">${listOrEmpty(items.slice(0, 8), renderer)}</div>
    </section>
  `;
}

function renderEvidenceRef(item) {
  const sourceUrl = safeExternalUrl(item.url);
  return `
    <div class="item">
      <div class="item-title">
        <strong>${escapeHtml(item.label || item.type || t('Evidence'))}</strong>
        <span class="pill review">${escapeHtml(item.type || 'system')}</span>
      </div>
      <div class="meta">
        <span>${formatDate(item.observedAt)}</span>
        ${sourceUrl ? `<a class="evidence-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${et('Open source')}</a>` : ''}
      </div>
      ${item.data ? `<details class="payload"><summary>${et('Evidence data')}</summary><pre>${escapeHtml(JSON.stringify(item.data, null, 2))}</pre></details>` : ''}
    </div>
  `;
}

function renderEvidenceAction(action) {
  return `
    <div class="item">
      <div class="item-title">
        <strong>${et(String(action.actionType || 'Trello action').replaceAll('_', ' '))}</strong>
        <span class="pill ${action.status === 'failed' ? 'critical' : action.status === 'succeeded' ? 'healthy' : 'review'}">${et(String(action.status || 'pending').replaceAll('_', ' '))}</span>
      </div>
      <div class="meta">
        <span>${formatDate(action.finishedAt || action.startedAt || action.createdAt)}</span>
        <span>${escapeHtml(action.errorMessage || t('No error recorded'))}</span>
      </div>
    </div>
  `;
}

function renderEvidenceAudit(event) {
  return `
    <div class="item">
      <div class="item-title">
        <strong>${escapeHtml(event.action || t('Audit event'))}</strong>
        <span class="pill ${severityClass(event.riskLevel)}">${escapeHtml(event.source || 'system')}</span>
      </div>
      <div class="meta">
        <span>${formatDate(event.createdAt)}</span>
        <span>${escapeHtml(event.actor || 'sneup')}</span>
      </div>
    </div>
  `;
}
function renderCommand(command) {
  const readOnlyDemo = state.snapshot?.mode === 'demo' || state.securityContext?.demoMode;
  return `
    <div class="item">
      <div class="item-title">
        <strong>${escapeHtml(command.title)}</strong>
        <span class="pill ${severityClass(command.severity)}">${et(command.severity)}</span>
      </div>
      <div class="meta">
        <span>${escapeHtml(command.target)}</span>
        <span>${escapeHtml(command.owner)}</span>
        <span>${command.automatable ? et('{count} min saved', { count: command.minutesSaved }) : et('review')}</span>
      </div>
      <div class="meta">${escapeHtml(command.reason)}</div>
      ${renderSourceEvidence(command.sourceEvidence)}
      <div class="item-actions">
        ${readOnlyDemo
          ? `<span class="meta">${et('Read-only demo preview')}</span>`
          : `<button class="button primary" data-command-id="${escapeHtml(command.id)}" type="button">${et('Queue for approval')}</button>`}
      </div>
    </div>
  `;
}

function bindAutopilotCommandActions() {
  document.querySelectorAll('[data-command-id]').forEach((button) => {
    button.addEventListener('click', () => queueAutopilotCommand(button.dataset.commandId));
  });
}

async function queueAutopilotCommand(commandId) {
  if (state.snapshot?.mode === 'demo' || state.securityContext?.demoMode) {
    openNotice('Read-only demo', 'Connect a database-backed workspace before queuing approval requests.');
    return;
  }

  const command = (state.snapshot?.commandQueue || []).find(item => item.id === commandId);
  if (!command) return;

  try {
    const data = await fetchApi('/api/autopilot/commands/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: 'robert', command })
    });
    openNotice('Command queued', data.message || 'Autopilot command queued for approval');
    await loadOperationsLedger();
  } catch (error) {
    openNotice('Command queue failed', error.message);
  }
}

function renderFocus(item) {
  const cardId = getId(item.id);
  return `
    <div class="item">
      <div class="item-title">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="pill ${severityClass(item.riskLevel)}">${item.priorityScore}</span>
      </div>
      <div class="meta">
        <span>${escapeHtml(item.boardName)}</span>
        <span>${escapeHtml(item.listName)}</span>
        <span>${escapeHtml(item.members.join(', ') || t('Unassigned'))}</span>
      </div>
      <div class="meta">${item.reasons.map(escapeHtml).join('  |  ')}</div>
      ${renderSourceEvidence(item.sourceEvidence)}
      ${cardId ? `<div class="item-actions"><button class="button" data-card-ledger="${escapeHtml(cardId)}" type="button">${et('Card ledger')}</button></div>` : ''}
    </div>
  `;
}

function renderTeamMember(member) {
  return `
    <div class="item">
      <div class="item-title">
        <strong>${escapeHtml(member.fullName || member.username)}</strong>
        <span class="pill ${member.capacityState === 'overloaded' ? 'critical' : member.capacityState === 'heavy' ? 'high' : 'healthy'}">${et(member.capacityState)}</span>
      </div>
      <div class="meta">
        <span>${et('{count} assigned', { count: member.assignedCards })}</span>
        <span>${et('{count} urgent', { count: member.urgentCards })}</span>
        <span>${et('{count} overdue', { count: member.overdueCards })}</span>
      </div>
      <div class="meta">${(member.specialties || []).map(escapeHtml).join('  |  ') || et('No specialty signal yet')}</div>
    </div>
  `;
}

function renderBoard(board) {
  const maxCount = Math.max(...board.flow.map(step => step.count), 1);
  const boardId = getId(board.id);
  return `
    <div class="connector-card">
      <div class="connector-top">
        <div>
          <h3>${escapeHtml(board.name)}</h3>
          <p>${et('{active} active | {overdue} overdue | {unassigned} unassigned', {
    active: board.activeCards,
    overdue: board.overdueCards,
    unassigned: board.unassignedCards
  })}</p>
        </div>
        <span class="pill ${board.health === 'healthy' ? 'healthy' : board.health === 'critical' ? 'critical' : 'high'}">${et(board.health)}</span>
      </div>
      <div class="flow">
        ${board.flow.map(step => `
          <div class="flow-row">
            <span>${escapeHtml(step.name)}</span>
            ${renderBar(Math.max(6, (step.count / maxCount) * 100), `${step.name} flow share`)}
            <span>${step.count}</span>
          </div>
        `).join('')}
      </div>
      <div class="meta">
        <span>${et('{count} cards/week', { count: board.velocity.cardsPerWeek })}</span>
        <span>${et('{count} blocked', { count: board.blockedCards })}</span>
      </div>
      ${boardId ? `<div class="connector-actions"><button class="button" data-board-ledger="${escapeHtml(boardId)}" type="button">${et('Operating ledger')}</button></div>` : ''}
    </div>
  `;
}

function renderWorkspaces(errorMessage = '') {
  workspaceViewController?.render(errorMessage);
}

function renderIntegrityReport() {
  workspaceViewController?.renderIntegrityReport();
}

function renderRetentionReport() {
  workspaceViewController?.renderRetentionReport();
}

function openIntegrityRepair() {
  const repairable = (state.integrityReport?.findings || []).filter(item => item.repairable);
  if (repairable.length === 0) return;
  els.modalTitle.textContent = t('Repair derived state');
  els.modalBody.innerHTML = `
    <div class="notice-stack">
      <div class="notice">${et('This repairs {count} current list or member cache finding(s). It does not contact Trello, retry notifications, alter approvals, or resolve ambiguous executions.', { count: repairable.length })}</div>
      <div class="toolbar modal-actions">
        <button class="button" id="cancelIntegrityRepair" type="button">${et('Cancel')}</button>
        <button class="button primary" id="confirmIntegrityRepair" type="button">${et('Repair {count}', { count: repairable.length })}</button>
      </div>
    </div>`;
  els.modal.classList.add('open');
  document.getElementById('cancelIntegrityRepair').addEventListener('click', closeModal);
  document.getElementById('confirmIntegrityRepair').addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = t('Repairing...');
    try {
      const data = await fetchApi('/api/integrity/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: 'repair-derived-state',
          limit: state.integrityReport.limit,
          fingerprints: repairable.map(item => item.fingerprint)
        })
      });
      closeModal();
      await loadIntegrityReport();
      openNotice(t('Repair complete'), t('{repaired} repaired, {skipped} skipped because their state changed.', data.result));
    } catch (error) {
      event.currentTarget.disabled = false;
      event.currentTarget.textContent = t('Repair {count}', { count: repairable.length });
      openNotice(t('Repair failed'), error.message);
    }
  });
}


function openRetentionPolicy() {
  const policy = state.retentionReport?.policy;
  if (!policy) return;
  els.modalTitle.textContent = t('Data retention policy');
  els.modalBody.innerHTML = `
    <form class="form-grid" id="retentionPolicyForm" data-draft-key="retention-policy" data-draft-fields="enabled,operationalDays,performanceDays,notificationDays,credentialDays" data-template-fields="enabled,operationalDays,performanceDays,notificationDays,credentialDays">
      <label class="checkbox-row"><input id="retentionEnabled" name="enabled" type="checkbox" ${policy.enabled ? 'checked' : ''}> <span>${et('Run scheduled retention')}</span></label>
      <label>${et('Operational history days')}<input id="retentionOperationalDays" name="operationalDays" type="number" min="30" max="730" value="${policy.operationalDays}" required></label>
      <label>${et('Performance history days')}<input id="retentionPerformanceDays" name="performanceDays" type="number" min="180" max="2555" value="${policy.performanceDays}" required></label>
      <label>${et('Notification receipt days')}<input id="retentionNotificationDays" name="notificationDays" type="number" min="90" max="2555" value="${policy.notificationDays}" required></label>
      <label>${et('Revoked credential days')}<input id="retentionCredentialDays" name="credentialDays" type="number" min="30" max="730" value="${policy.credentialDays}" required></label>
      <div class="toolbar modal-actions"><button class="button" id="cancelRetentionPolicy" type="button">${et('Cancel')}</button><button class="button primary" type="submit">${et('Save policy')}</button></div>
    </form>`;
  els.modal.classList.add('open');
  const form = document.getElementById('retentionPolicyForm');
  formPersistence?.enhanceForm(form);
  document.getElementById('cancelRetentionPolicy').addEventListener('click', closeModal);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      await fetchApi('/api/data-retention/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: document.getElementById('retentionEnabled').checked,
          operationalDays: Number(document.getElementById('retentionOperationalDays').value),
          performanceDays: Number(document.getElementById('retentionPerformanceDays').value),
          notificationDays: Number(document.getElementById('retentionNotificationDays').value),
          credentialDays: Number(document.getElementById('retentionCredentialDays').value)
        })
      });
      formPersistence?.markSaved(form);
      closeModal();
      await loadRetentionReport();
      openNotice(t('Retention policy saved'), t('The workspace retention policy is active with the reviewed limits.'));
    } catch (error) {
      submit.disabled = false;
      openNotice(t('Policy update failed'), error.message);
    }
  });
}

function openRetentionApply() {
  const report = state.retentionReport;
  if (!report?.policy?.enabled || report.summary.due === 0) return;
  els.modalTitle.textContent = t('Prune expired history');
  els.modalBody.innerHTML = `
    <form class="form-grid" id="retentionApplyForm">
      <div class="notice">${et('This permanently removes up to {count} due operational record(s). Provider actions, approvals, audit events, active credentials, pending notifications, and current project data are excluded.', { count: report.summary.due })}</div>
      <label>${et('Workspace slug')}<input id="retentionWorkspaceConfirmation" type="text" autocomplete="off" placeholder="${escapeHtml(report.workspaceSlug)}" required></label>
      <div class="toolbar modal-actions"><button class="button" id="cancelRetentionApply" type="button">${et('Cancel')}</button><button class="button danger" type="submit">${et('Prune due records')}</button></div>
    </form>`;
  els.modal.classList.add('open');
  document.getElementById('cancelRetentionApply').addEventListener('click', closeModal);
  document.getElementById('retentionApplyForm').addEventListener('submit', async event => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const data = await fetchApi('/api/data-retention/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: 'prune-expired-history',
          workspaceConfirmation: document.getElementById('retentionWorkspaceConfirmation').value,
          limit: report.limit,
          categories: report.categories.filter(item => item.due > 0).map(item => item.key)
        })
      });
      closeModal();
      await loadRetentionReport();
      openNotice(t('Retention complete'), t('{count} old record(s) removed with audit evidence.', { count: data.result.deleted }));
    } catch (error) {
      submit.disabled = false;
      openNotice(t('Retention failed'), error.message);
    }
  });
}


async function openFeatureFlagHistory(key) {
  const flag = (state.featureFlags || []).find(item => item.key === key);
  if (!flag) return;
  els.modalTitle.textContent = t('{label} history', { label: flag.label });
  els.modalBody.innerHTML = `<div class="notice">${et('Loading rollout history...')}</div>`;
  els.modal.classList.add('open');
  try {
    const result = await fetchApi(`/api/feature-flags/${encodeURIComponent(key)}/history?limit=25`);
    els.modalBody.innerHTML = `
      <div class="notice-stack">
        ${listOrEmpty(result.history || [], entry => `
          <div class="item">
            <div class="item-title">
              <strong>${et('Revision {revision}', { revision: entry.revision })}</strong>
              <span class="pill ${entry.enabled ? 'healthy' : 'critical'}">${et(entry.enabled ? 'enabled' : 'paused')}</span>
            </div>
            <div class="meta">
              <span>${et('{count}% rollout', { count: entry.rolloutPercentage })}</span>
              <span>${escapeHtml(entry.actor)}</span>
              <span>${escapeHtml(formatDate(entry.changedAt))}</span>
            </div>
            ${entry.reason ? `<p>${escapeHtml(entry.reason)}</p>` : ''}
          </div>
        `)}
        <div class="toolbar modal-actions"><button class="button" type="button" id="closeFeatureHistory">${et('Close')}</button></div>
      </div>
    `;
    document.getElementById('closeFeatureHistory').addEventListener('click', closeModal);
  } catch (error) {
    els.modalBody.innerHTML = `<div class="notice">${escapeHtml(error.message)}</div>`;
  }
}

function openFeatureFlagEditor(key) {
  const flag = (state.featureFlags || []).find(item => item.key === key);
  if (!flag) return;
  els.modalTitle.textContent = flag.label;
  els.modalBody.innerHTML = `
    <form id="featureFlagForm" class="notice-stack" data-draft-key="feature-flag:${escapeHtml(flag.key)}" data-draft-fields="enabled,rolloutPercentage,reason" data-template-fields="enabled,rolloutPercentage">
      <div class="notice">${et('Rollout controls can pause optional workloads or expose them gradually. They cannot grant permissions, approve recommendations, execute Trello writes, disable audits, or weaken workspace isolation.')}</div>
      <label class="checkbox-row"><input name="enabled" type="checkbox" ${flag.enabled ? 'checked' : ''}> ${et('Enable this capability')}</label>
      <label>${et('Rollout percentage')}
        <input id="featureFlagRollout" name="rolloutPercentage" type="range" min="0" max="100" step="1" value="${escapeHtml(flag.rolloutPercentage)}">
        <output id="featureFlagRolloutValue" for="featureFlagRollout">${escapeHtml(flag.rolloutPercentage)}%</output>
      </label>
      <label>${et('Reason')}<textarea name="reason" rows="3" maxlength="500" placeholder="${et('Why this rollout is changing')}">${escapeHtml(flag.reason || '')}</textarea></label>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelFeatureFlag">${et('Cancel')}</button>
        <button class="button primary" type="submit">${et('Save rollout')}</button>
      </div>
    </form>
  `;
  els.modal.classList.add('open');
  const form = document.getElementById('featureFlagForm');
  formPersistence?.enhanceForm(form);
  const rollout = document.getElementById('featureFlagRollout');
  const rolloutValue = document.getElementById('featureFlagRolloutValue');
  const syncRolloutValue = () => { rolloutValue.textContent = `${rollout.value}%`; };
  rollout.addEventListener('input', syncRolloutValue);
  form.addEventListener('sneup:preset-applied', syncRolloutValue);
  syncRolloutValue();
  document.getElementById('cancelFeatureFlag').addEventListener('click', closeModal);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    submitButton.disabled = true;
    submitButton.textContent = t('Saving...');
    try {
      const result = await fetchApi(`/api/feature-flags/${encodeURIComponent(flag.key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: values.get('enabled') === 'on',
          rolloutPercentage: Number(values.get('rolloutPercentage')),
          reason: values.get('reason'),
          expectedRevision: flag.revision
        })
      });
      state.featureFlags = state.featureFlags.map(item => item.key === flag.key ? result.flag : item);
      formPersistence?.markSaved(form);
      closeModal();
      renderWorkspaces();
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = t('Save rollout');
      openNotice(t('Rollout update blocked'), error.message);
    }
  });
}

function openPolicyRuleEditor(actionType) {
  const policy = (state.policyRules || []).find(item => item.actionType === actionType);
  if (!policy) return;

  if (policy.workflowType === 'scheduled_intervention_timing') {
    els.modalTitle.textContent = policy.label;
    els.modalBody.innerHTML = `
      <form id="policyRuleForm" class="notice-stack" data-draft-key="policy-rule:${escapeHtml(actionType)}" data-draft-fields="followUpAfterHours,escalationAfterHours,reason" data-template-fields="followUpAfterHours,escalationAfterHours">
        <div class="notice">${et('This policy only controls when Sneup creates internal follow-up or escalation candidates. It can retain or lengthen the 24-hour follow-up and 48-hour escalation baselines up to 7 days. Escalation cannot precede follow-up, and this policy never prepares or performs a provider write.')}</div>
        <div class="workflow-routing-grid">
          <fieldset class="workflow-routing-row">
            <legend>${et('Follow-up candidate')}</legend>
            <label>${et('Create after no response (hours)')}
              <input name="followUpAfterHours" type="number" min="24" max="168" step="1" value="${escapeHtml(String(policy.followUpAfterHours || 24))}" required>
            </label>
          </fieldset>
          <fieldset class="workflow-routing-row">
            <legend>${et('Escalation candidate')}</legend>
            <label>${et('Create after no response (hours)')}
              <input name="escalationAfterHours" type="number" min="48" max="168" step="1" value="${escapeHtml(String(policy.escalationAfterHours || 48))}" required>
            </label>
          </fieldset>
        </div>
        <label>${et('Reason')}<textarea name="reason" rows="3" maxlength="500" placeholder="${et('Why this workspace needs longer follow-up timing')}">${escapeHtml(policy.reason || '')}</textarea></label>
        <div class="toolbar modal-actions">
          <button class="button" type="button" id="cancelPolicyRule">${et('Cancel')}</button>
          <button class="button primary" type="submit">${et('Save timing defaults')}</button>
        </div>
      </form>
    `;
    els.modal.classList.add('open');
    const form = document.getElementById('policyRuleForm');
    formPersistence?.enhanceForm(form);
    document.getElementById('cancelPolicyRule').addEventListener('click', closeModal);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submitButton = form.querySelector('button[type="submit"]');
      const values = new FormData(form);
      submitButton.disabled = true;
      submitButton.textContent = t('Saving...');
      try {
        await fetchApi(`/api/policy-rules/${encodeURIComponent(actionType)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            followUpAfterHours: Number(values.get('followUpAfterHours')),
            escalationAfterHours: Number(values.get('escalationAfterHours')),
            reason: values.get('reason')
          })
        });
        formPersistence?.markSaved(form);
        closeModal();
        await loadWorkspaceAdmin();
      } catch (error) {
        submitButton.disabled = false;
        submitButton.textContent = t('Save timing defaults');
        openNotice(t('Timing defaults blocked'), error.message);
      }
    });
    return;
  }

  if (policy.workflowType === 'scheduled_intervention_cooldown') {
    const cooldowns = policy.cooldownHoursByTrigger || {};
    const labels = {
      card_stuck: 'Stuck card',
      no_activity: 'No activity',
      overdue: 'Overdue card',
      member_overloaded: 'Member overloaded',
      blocking_others: 'Blocking other work',
      no_response_to_followup: 'No response to follow-up',
      performance_milestone: 'Performance milestone'
    };
    const triggers = Object.keys(labels);
    const cooldownFields = triggers.map(trigger => `${trigger}CooldownHours`);
    const rows = triggers.map((trigger) => `
      <fieldset class="workflow-routing-row">
        <legend>${et(labels[trigger])}</legend>
        <label>${et('Suppress equivalent scheduled recommendations for (hours)')}
          <input name="${trigger}CooldownHours" type="number" min="24" max="168" step="1" value="${escapeHtml(String(cooldowns[trigger] || 24))}" required>
        </label>
      </fieldset>
    `).join('');
    els.modalTitle.textContent = policy.label;
    els.modalBody.innerHTML = `
      <form id="policyRuleForm" class="notice-stack" data-draft-key="policy-rule:${escapeHtml(actionType)}" data-draft-fields="${cooldownFields.join(',')},reason" data-template-fields="${cooldownFields.join(',')}">
        <div class="notice">${et('This policy only suppresses duplicate scheduled intervention candidates. It can lengthen the 24-hour baseline up to 7 days, never shortens it, and never prepares or performs a provider write. Manual requests are not suppressed.')}</div>
        <div class="workflow-routing-grid">${rows}</div>
        <label>${et('Reason')}<textarea name="reason" rows="3" maxlength="500" placeholder="${et('Why this workspace needs longer signal cooldowns')}">${escapeHtml(policy.reason || '')}</textarea></label>
        <div class="toolbar modal-actions">
          <button class="button" type="button" id="cancelPolicyRule">${et('Cancel')}</button>
          <button class="button primary" type="submit">${et('Save cooldown defaults')}</button>
        </div>
      </form>
    `;
    els.modal.classList.add('open');
    const form = document.getElementById('policyRuleForm');
    formPersistence?.enhanceForm(form);
    document.getElementById('cancelPolicyRule').addEventListener('click', closeModal);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submitButton = form.querySelector('button[type="submit"]');
      const values = new FormData(form);
      submitButton.disabled = true;
      submitButton.textContent = t('Saving...');
      try {
        await fetchApi(`/api/policy-rules/${encodeURIComponent(actionType)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cooldownHoursByTrigger: Object.fromEntries(triggers.map(trigger => [
              trigger,
              Number(values.get(`${trigger}CooldownHours`))
            ])),
            reason: values.get('reason')
          })
        });
        formPersistence?.markSaved(form);
        closeModal();
        await loadWorkspaceAdmin();
      } catch (error) {
        submitButton.disabled = false;
        submitButton.textContent = t('Save cooldown defaults');
        openNotice(t('Cooldown defaults blocked'), error.message);
      }
    });
    return;
  }

  if (policy.workflowType === 'decision_queue_routing') {
    const routing = policy.routingByRisk || {};
    const risks = ['low', 'medium', 'high', 'critical'];
    const routingFields = risks.flatMap(risk => [`${risk}OwnerType`, `${risk}EscalationHours`]);
    const riskLabels = { low: 'Low-risk queue', medium: 'Medium-risk queue', high: 'High-risk queue', critical: 'Critical queue' };
    const rows = risks.map((risk) => {
      const entry = routing[risk] || {};
      const ownerControl = ['high', 'critical'].includes(risk)
        ? `<span class="workflow-fixed-owner">${et('Robert only')}</span>`
        : `<select name="${risk}OwnerType">
            ${['va', 'team', 'robert'].map(owner => `<option value="${owner}" ${owner === entry.ownerType ? 'selected' : ''}>${et(owner)}</option>`).join('')}
          </select>`;
      return `
        <fieldset class="workflow-routing-row">
          <legend>${et(riskLabels[risk])}</legend>
          <label>${et('Decision owner')}${ownerControl}</label>
          <label>${et('Escalate to Robert after (hours)')}
            <input name="${risk}EscalationHours" type="number" min="1" max="168" step="1" value="${escapeHtml(String(entry.escalationHours || 24))}" required>
          </label>
        </fieldset>
      `;
    }).join('');
    els.modalTitle.textContent = policy.label;
    els.modalBody.innerHTML = `
      <form id="policyRuleForm" class="notice-stack" data-draft-key="policy-rule:${escapeHtml(actionType)}" data-draft-fields="${routingFields.join(',')},reason" data-template-fields="${routingFields.join(',')}">
        <div class="notice">${et('This policy only routes internal decision queue items. When a VA or team item reaches its review deadline, Sneup records the escalation and moves it to Robert. It never prepares or performs a provider write.')}</div>
        <div class="workflow-routing-grid">${rows}</div>
        <label>${et('Reason')}<textarea name="reason" rows="3" maxlength="500" placeholder="${et('Why this workspace needs these queue defaults')}">${escapeHtml(policy.reason || '')}</textarea></label>
        <div class="toolbar modal-actions">
          <button class="button" type="button" id="cancelPolicyRule">${et('Cancel')}</button>
          <button class="button primary" type="submit">${et('Save queue defaults')}</button>
        </div>
      </form>
    `;
    els.modal.classList.add('open');
    const form = document.getElementById('policyRuleForm');
    formPersistence?.enhanceForm(form);
    document.getElementById('cancelPolicyRule').addEventListener('click', closeModal);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submitButton = form.querySelector('button[type="submit"]');
      const values = new FormData(form);
      submitButton.disabled = true;
      submitButton.textContent = t('Saving...');
      try {
        await fetchApi(`/api/policy-rules/${encodeURIComponent(actionType)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routingByRisk: Object.fromEntries(risks.map((risk) => [risk, {
              ownerType: ['high', 'critical'].includes(risk) ? 'robert' : values.get(`${risk}OwnerType`),
              escalationHours: Number(values.get(`${risk}EscalationHours`))
            }])),
            reason: values.get('reason')
          })
        });
        formPersistence?.markSaved(form);
        closeModal();
        await loadWorkspaceAdmin();
      } catch (error) {
        submitButton.disabled = false;
        submitButton.textContent = t('Save queue defaults');
        openNotice(t('Queue defaults blocked'), error.message);
      }
    });
    return;
  }

  if (policy.policyKind === 'workflow') {
    els.modalTitle.textContent = policy.label;
    els.modalBody.innerHTML = `
      <form id="policyRuleForm" class="notice-stack" data-draft-key="policy-rule:${escapeHtml(actionType)}" data-draft-fields="defaultSnoozeHours,reason" data-template-fields="defaultSnoozeHours">
        <div class="notice">${et('This default only reschedules internal decision queue items. It never prepares or performs a provider write.')}</div>
        <label>${et('Default snooze duration (hours)')}
          <input name="defaultSnoozeHours" type="number" min="1" max="168" step="1" value="${escapeHtml(String(policy.defaultSnoozeHours || 24))}" required>
          <small>${et('Choose between 1 hour and 7 days. People can still choose an explicit future deadline where the API permits it.')}</small>
        </label>
        <label>${et('Reason')}<textarea name="reason" rows="3" maxlength="500" placeholder="${et('Why this workspace needs this default')}">${escapeHtml(policy.reason || '')}</textarea></label>
        <div class="toolbar modal-actions">
          <button class="button" type="button" id="cancelPolicyRule">${et('Cancel')}</button>
          <button class="button primary" type="submit">${et('Save workflow default')}</button>
        </div>
      </form>
    `;
    els.modal.classList.add('open');
    const form = document.getElementById('policyRuleForm');
    formPersistence?.enhanceForm(form);
    document.getElementById('cancelPolicyRule').addEventListener('click', closeModal);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submitButton = form.querySelector('button[type="submit"]');
      const values = new FormData(form);
      submitButton.disabled = true;
      submitButton.textContent = t('Saving...');
      try {
        await fetchApi(`/api/policy-rules/${encodeURIComponent(actionType)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            defaultSnoozeHours: Number(values.get('defaultSnoozeHours')),
            reason: values.get('reason')
          })
        });
        formPersistence?.markSaved(form);
        closeModal();
        await loadWorkspaceAdmin();
      } catch (error) {
        submitButton.disabled = false;
        submitButton.textContent = t('Save workflow default');
        openNotice(t('Workflow default blocked'), error.message);
      }
    });
    return;
  }

  const riskLevels = ['low', 'medium', 'high', 'critical'];
  const ownerStrictness = { system: 0, va: 1, team: 1, robert: 2 };
  const availableRisks = riskLevels.filter(level => riskLevels.indexOf(level) >= riskLevels.indexOf(policy.baselineRiskLevel));
  const availableOwners = ['system', 'va', 'team', 'robert'].filter(owner => ownerStrictness[owner] >= ownerStrictness[policy.baselineOwnerType]);

  els.modalTitle.textContent = t('Action safety: {label}', { label: policy.label });
  els.modalBody.innerHTML = `
    <form id="policyRuleForm" class="notice-stack" data-draft-key="policy-rule:${escapeHtml(actionType)}" data-draft-fields="enabled,pauseExpiresAt,riskLevel,ownerType,reason" data-template-fields="enabled,pauseExpiresAt,riskLevel,ownerType">
      <div class="notice">${et('Every Trello write remains approval-gated. This workspace rule can pause this action type or make its risk and decision owner stricter.')}</div>
      <label><input name="enabled" type="checkbox" ${policy.enabled ? 'checked' : ''}> ${et('Allow approved {label} actions to execute', { label: policy.label })}</label>
      <label>${et('Pause review time')}
        <input name="pauseExpiresAt" type="datetime-local" value="${escapeHtml(toDateTimeLocalValue(policy.pauseExpiresAt))}">
        <small>${et('An expired pause stays paused until a manager reviews it; Sneup never re-enables it automatically.')}</small>
      </label>
      <label>${et('Risk level')}
        <select name="riskLevel">
          ${availableRisks.map(level => `<option value="${escapeHtml(level)}" ${level === policy.riskLevel ? 'selected' : ''}>${et(level)}</option>`).join('')}
        </select>
      </label>
      <label>${et('Decision owner')}
        <select name="ownerType">
          ${availableOwners.map(owner => `<option value="${escapeHtml(owner)}" ${owner === policy.ownerType ? 'selected' : ''}>${et(owner)}</option>`).join('')}
        </select>
      </label>
      <label>${et('Reason')}<textarea name="reason" rows="3" maxlength="500" placeholder="${et('Why this action needs this safety posture')}">${escapeHtml(policy.reason || '')}</textarea></label>
      <label><input name="confirmRelaxation" type="checkbox"> ${et('I confirm that this may relax an existing workspace safety rule.')}</label>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelPolicyRule">${et('Cancel')}</button>
        <button class="button primary" type="submit">${et('Save safety rule')}</button>
      </div>
    </form>
  `;
  els.modal.classList.add('open');
  const form = document.getElementById('policyRuleForm');
  formPersistence?.enhanceForm(form);
  document.getElementById('cancelPolicyRule').addEventListener('click', closeModal);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    submitButton.disabled = true;
    submitButton.textContent = t('Saving...');
    try {
      await fetchApi(`/api/policy-rules/${encodeURIComponent(actionType)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: values.get('enabled') === 'on',
          riskLevel: values.get('riskLevel'),
          ownerType: values.get('ownerType'),
          reason: values.get('reason'),
          pauseExpiresAt: values.get('pauseExpiresAt') || null,
          confirmRelaxation: values.get('confirmRelaxation') === 'on'
        })
      });
      formPersistence?.markSaved(form);
      closeModal();
      await loadWorkspaceAdmin();
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = t('Save safety rule');
      openNotice(t('Safety rule blocked'), error.message);
    }
  });
}

async function downloadWorkspaceExport() {
  const workspace = (state.workspaces || []).find(item => item.id === state.activeWorkspaceId)
    || state.currentWorkspace;
  if (!workspace?.id || !(state.securityContext?.roles || []).includes('owner')) {
    openNotice(t('Workspace export unavailable'), t('Sign in as the workspace owner before exporting workspace data.'));
    return;
  }

  const safeSlug = String(workspace.slug || workspace.name || 'workspace')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'workspace';
  const suggestedName = `sneup-${safeSlug}-export-${new Date().toISOString().slice(0, 10)}.ndjson`;
  let fileHandle = null;

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName,
        types: [{
          description: t('Sneup workspace export'),
          accept: { 'application/x-ndjson': ['.ndjson'] }
        }]
      });
    } catch (error) {
      if (error.name === 'AbortError') return;
      openNotice(t('Workspace export unavailable'), error.message);
      return;
    }
  }

  els.workspaceExportButton.disabled = true;
  try {
    const response = await apiFetch(`/api/workspaces/${encodeURIComponent(workspace.id)}/export`);
    if (!response.ok) {
      let message = t('Workspace export failed with status {status}', { status: response.status });
      try {
        const data = await response.json();
        message = apiErrorMessage(data, message);
      } catch (error) {
        // The status is enough when a proxy returns a non-JSON error page.
      }
      throw new Error(message);
    }

    if (fileHandle && response.body) {
      const writable = await fileHandle.createWritable();
      await response.body.pipeTo(writable);
    } else {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = suggestedName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    openNotice(t('Workspace export complete'), t('The export contains workspace records and excludes credentials, token hashes, and encrypted notification destinations.'));
  } catch (error) {
    openNotice(t('Workspace export failed'), error.message);
  } finally {
    renderWorkspaces();
  }
}

function openWorkspaceDeletion() {
  const workspace = (state.workspaces || []).find(item => item.id === state.activeWorkspaceId)
    || state.currentWorkspace;
  const isOwner = (state.securityContext?.roles || []).includes('owner');
  if (!workspace?.id || !isOwner || !['archived', 'deleting'].includes(workspace.status)) {
    openNotice(t('Workspace deletion unavailable'), t('Only an archived workspace can be permanently deleted by its owner.'));
    return;
  }

  els.modalTitle.textContent = t('Delete archived workspace?');
  els.modalBody.innerHTML = `
    <form id="workspaceDeletionForm" class="notice-stack">
      <div class="notice critical">${et('This permanently removes Sneup data, account credentials, access tokens, and audit history for this workspace. Connected provider accounts are not changed.')}</div>
      <label>${et('Workspace slug')}<input name="confirmation" type="text" autocomplete="off" required placeholder="${escapeHtml(workspace.slug)}"></label>
      <label><input name="acknowledgePermanentDeletion" type="checkbox" required> ${et('I understand this deletion cannot be undone.')}</label>
      <div class="toolbar modal-actions">
        <button class="button" id="cancelWorkspaceDeletion" type="button">${et('Cancel')}</button>
        <button class="button danger" type="submit">${et('Delete workspace')}</button>
      </div>
    </form>
  `;
  els.modal.classList.add('open');
  document.getElementById('cancelWorkspaceDeletion').addEventListener('click', closeModal);
  document.getElementById('workspaceDeletionForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = t('Deleting...');
    try {
      const data = await fetchApi(`/api/workspaces/${encodeURIComponent(workspace.id)}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: values.get('confirmation'),
          acknowledgePermanentDeletion: values.get('acknowledgePermanentDeletion') === 'on'
        })
      });
      state.sessionToken = '';
      state.activeWorkspaceId = '';
      state.currentWorkspace = null;
      state.workspaces = [];
      state.workspaceUsers = [];
      state.workspaceInvitations = [];
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem('sneup.workspaceId');
      closeModal();
      renderWorkspaces();
      openNotice(t('Workspace deleted'), t('Deletion receipt {id}. Local Sneup data for the workspace has been removed.', { id: data.receipt.deletionId }));
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = t('Delete workspace');
      openNotice(t('Workspace deletion failed'), error.message);
    }
  });
}

function openWorkspaceInvite() {
  const workspaceId = state.activeWorkspaceId || state.currentWorkspace?.id;
  if (!workspaceId) {
    openNotice(t('Invitation unavailable'), t('Choose a workspace before inviting a user.'));
    return;
  }

  els.modalTitle.textContent = t('Invite user');
  els.modalBody.innerHTML = `
    <form id="workspaceInviteForm" class="notice-stack">
      <label>${et('Email')}<input name="email" type="email" autocomplete="email" required></label>
      <label>${et('Name')}<input name="displayName" type="text" autocomplete="name" required></label>
      <label>${et('Role')}
        <select name="role">
          <option value="viewer">${et('Viewer')}</option>
          <option value="operator">${et('Operator')}</option>
          <option value="manager">${et('Manager')}</option>
          <option value="admin">${et('Admin')}</option>
        </select>
      </label>
      <label>${et('Expires in days')}<input name="expiresInDays" type="number" min="1" max="30" value="7" required></label>
      <label>${et('Delivery')}
        <select name="deliveryMode">
          <option value="manual">${et('Secure link')}</option>
          <option value="email">${et('Send email')}</option>
        </select>
      </label>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelWorkspaceInvite">${et('Cancel')}</button>
        <button class="button primary" type="submit">${et('Create invitation')}</button>
      </div>
    </form>
  `;
  els.modal.classList.add('open');
  document.getElementById('cancelWorkspaceInvite').addEventListener('click', closeModal);
  document.getElementById('workspaceInviteForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = t('Creating...');
    const values = new FormData(event.currentTarget);
    try {
      const data = await fetchApi(`/api/workspaces/${encodeURIComponent(workspaceId)}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.get('email'),
          displayName: values.get('displayName'),
          role: values.get('role'),
          expiresInDays: Number(values.get('expiresInDays')),
          deliveryMode: values.get('deliveryMode')
        })
      });
      await loadWorkspaceAdmin();
      renderCreatedInvitation(data);
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = t('Create invitation');
      openNotice(t('Invitation failed'), error.message);
    }
  });
}

function renderCreatedInvitation(data) {
  const delivery = data.delivery?.status === 'sent'
    ? t('Email sent.')
    : data.delivery?.status === 'failed'
      ? t('Email was not sent: {message}.', { message: data.delivery.message || t('provider delivery failed') })
      : t('Secure link created.');
  els.modalTitle.textContent = t('Invitation ready');
  els.modalBody.innerHTML = `
    <div class="notice-stack">
      <div class="notice">${escapeHtml(delivery)}</div>
      <label for="workspaceInviteUrl">${et('Secure invitation link')}</label>
      <textarea id="workspaceInviteUrl" rows="4" readonly>${escapeHtml(data.inviteUrl)}</textarea>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="copyWorkspaceInvite">${et('Copy link')}</button>
        <button class="button primary" type="button" id="closeWorkspaceInvite">${et('Done')}</button>
      </div>
    </div>
  `;
  document.getElementById('copyWorkspaceInvite').addEventListener('click', async (event) => {
    try {
      await navigator.clipboard.writeText(data.inviteUrl);
      event.currentTarget.textContent = t('Copied');
    } catch (error) {
      const input = document.getElementById('workspaceInviteUrl');
      input.focus();
      input.select();
    }
  });
  document.getElementById('closeWorkspaceInvite').addEventListener('click', closeModal);
}

function openInviteRevocationConfirmation(invitation) {
  if (!invitation || invitation.status !== 'pending') return;
  els.modalTitle.textContent = t('Revoke invitation?');
  els.modalBody.innerHTML = `
    <div class="notice-stack">
      <div class="notice">${et('This will invalidate the invitation for {email} immediately.', { email: invitation.email })}</div>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelInviteRevoke">${et('Cancel')}</button>
        <button class="button danger" type="button" id="confirmInviteRevoke">${et('Revoke invitation')}</button>
      </div>
    </div>
  `;
  document.getElementById('cancelInviteRevoke').addEventListener('click', closeModal);
  document.getElementById('confirmInviteRevoke').addEventListener('click', async (event) => {
    const workspaceId = state.activeWorkspaceId || state.currentWorkspace?.id;
    if (!workspaceId) return;
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = t('Revoking...');
    try {
      await fetchApi(`/api/workspaces/${encodeURIComponent(workspaceId)}/invitations/${encodeURIComponent(invitation.id)}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      closeModal();
      await loadWorkspaceAdmin();
    } catch (error) {
      event.currentTarget.disabled = false;
      event.currentTarget.textContent = t('Revoke invitation');
      openNotice(t('Invitation revocation failed'), error.message);
    }
  });
}

function openInviteDeliveryRetryConfirmation(invitation) {
  if (!invitation || invitation.status !== 'pending' || invitation.delivery?.mode !== 'email') return;
  const workspaceId = state.activeWorkspaceId || state.currentWorkspace?.id;
  if (!workspaceId) return;

  els.modalTitle.textContent = t('Retry invitation email?');
  els.modalBody.innerHTML = `
    <div class="notice-stack">
      <div class="notice">${et('Sneup will invalidate the prior secure link, create a fresh one-time link, and send it to {email}. The replacement is recorded in the workspace audit ledger.', { email: invitation.email })}</div>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelInviteDeliveryRetry">${et('Cancel')}</button>
        <button class="button primary" type="button" id="confirmInviteDeliveryRetry">${et('Retry email')}</button>
      </div>
    </div>
  `;
  document.getElementById('cancelInviteDeliveryRetry').addEventListener('click', closeModal);
  document.getElementById('confirmInviteDeliveryRetry').addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = t('Retrying...');
    try {
      const data = await fetchApi(`/api/workspaces/${encodeURIComponent(workspaceId)}/invitations/${encodeURIComponent(invitation.id)}/retry-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      await loadWorkspaceAdmin();
      renderCreatedInvitation(data);
    } catch (error) {
      event.currentTarget.disabled = false;
      event.currentTarget.textContent = t('Retry email');
      openNotice(t('Invitation retry failed'), error.message);
    }
  });
}

async function openWorkspaceUserSessions(userId) {
  const workspaceId = state.activeWorkspaceId || state.currentWorkspace?.id;
  const user = state.workspaceUsers.find(item => item.id === userId);
  if (!workspaceId || !user) {
    openNotice(t('Session access unavailable'), t('Choose a workspace user before reviewing sessions.'));
    return;
  }

  els.modalTitle.textContent = t('Session access');
  els.modalBody.innerHTML = `<div class="notice">${et('Loading active and historical sessions...')}</div>`;
  els.modal.classList.add('open');

  try {
    const data = await fetchApi(`/api/workspaces/${encodeURIComponent(workspaceId)}/users/${encodeURIComponent(user.id)}/sessions?limit=100`);
    renderWorkspaceUserSessions(data.user || user, data.sessions || []);
  } catch (error) {
    openNotice(t('Session access unavailable'), error.message);
  }
}

function renderWorkspaceUserSessions(user, sessions) {
  const activeSessions = sessions.filter(session => session.status === 'active');
  els.modalTitle.textContent = t('{name} sessions', { name: user.displayName });
  els.modalBody.innerHTML = `
    <div class="notice-stack">
      <div class="notice">${et('Review issued access for this user. Revoking a session ends its API access immediately and records a high-risk audit event.')}</div>
      <div class="item">
        <div class="item-title">
          <strong>${escapeHtml(user.displayName)}</strong>
          <span class="pill ${activeSessions.length ? 'review' : 'healthy'}">${tp('{count} active session', '{count} active sessions', activeSessions.length)}</span>
        </div>
        <div class="meta">
          <span>${et(String(user.role || 'user').replaceAll('_', ' '))}</span>
          <span>${escapeHtml(user.email || t('No email'))}</span>
        </div>
      </div>
      <div class="list">
        ${listOrEmpty(sessions, (session) => `
          <div class="item">
            <div class="item-title">
              <strong>${escapeHtml(session.name || t('User session'))}</strong>
              <span class="pill ${session.status === 'active' ? 'review' : 'healthy'}">${et(String(session.status).replaceAll('_', ' '))}</span>
            </div>
            <div class="meta">
              <span>${et('Used {date}', { date: formatDate(session.lastUsedAt || session.createdAt) })}</span>
              <span>${et('Expires {date}', { date: formatDate(session.expiresAt) })}</span>
              <span>${escapeHtml(session.tokenPrefix || t('Token protected'))}</span>
            </div>
            ${session.status === 'active' ? `
              <div class="item-actions">
                <button class="button danger" data-revoke-workspace-session="${escapeHtml(session.id)}" type="button">${et('Revoke session')}</button>
              </div>
            ` : ''}
          </div>
        `)}
      </div>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="closeSessionAccess">${et('Done')}</button>
      </div>
    </div>
  `;
  document.getElementById('closeSessionAccess').addEventListener('click', closeModal);
  document.querySelectorAll('[data-revoke-workspace-session]').forEach((button) => {
    const session = sessions.find(item => item.id === button.dataset.revokeWorkspaceSession);
    button.addEventListener('click', () => openSessionRevocationConfirmation(user, session));
  });
}

function openSessionRevocationConfirmation(user, session) {
  if (!session || session.status !== 'active') return;
  els.modalTitle.textContent = t('Revoke session?');
  els.modalBody.innerHTML = `
    <div class="notice-stack">
      <div class="notice">${et('This immediately ends API access for')} <strong>${escapeHtml(session.name || t('this session'))}</strong> ${et('belonging to {name}. This cannot be undone; issue a new session if access is needed again.', { name: user.displayName })}</div>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelSessionRevoke">${et('Cancel')}</button>
        <button class="button danger" type="button" id="confirmSessionRevoke">${et('Revoke session')}</button>
      </div>
    </div>
  `;
  document.getElementById('cancelSessionRevoke').addEventListener('click', () => openWorkspaceUserSessions(user.id));
  document.getElementById('confirmSessionRevoke').addEventListener('click', async () => {
    const workspaceId = state.activeWorkspaceId || state.currentWorkspace?.id;
    if (!workspaceId) return;
    const button = document.getElementById('confirmSessionRevoke');
    button.disabled = true;
    button.textContent = t('Revoking...');
    try {
      await fetchApi(`/api/workspaces/${encodeURIComponent(workspaceId)}/users/${encodeURIComponent(user.id)}/sessions/${encodeURIComponent(session.id)}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      await openWorkspaceUserSessions(user.id);
    } catch (error) {
      button.disabled = false;
      button.textContent = t('Revoke session');
      openNotice(t('Session revocation failed'), error.message);
    }
  });
}

function renderEnhancements(errorMessage = '') {
  const enhancements = state.enhancements || [];
  const summary = state.enhancementSummary || {};
  const statuses = enhancements.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  if (state.enhancementSummary && state.enhancementSummary.byArea) {
    const currentArea = state.enhancementArea;
    const areaKeys = Object.keys(state.enhancementSummary.byArea).sort();
    const selectedArea = areaKeys.includes(currentArea) ? currentArea : 'all';
    state.enhancementArea = selectedArea;

    if (els.enhancementAreaFilter && (!els.enhancementAreaFilter.dataset.populated || currentArea === 'all')) {
      els.enhancementAreaFilter.dataset.populated = '1';
      const options = ['<option value="all">All areas</option>', ...areaKeys.map(area => {
        return `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`;
      })];
      els.enhancementAreaFilter.innerHTML = options.join('');
    }
    els.enhancementAreaFilter.value = selectedArea;
  }

  const byPriority = summary.byPriority || {};
  const byArea = summary.byArea || {};
  const byStatus = summary.byStatus || {};
  const evaluation = state.recommendationEvaluation;
  els.enhancementCount.textContent = enhancements.length;
  els.enhancementStatusSummary.textContent = `${enhancements.length} total`;

  const notice = errorMessage
    ? `<div class="notice">${escapeHtml(errorMessage)}</div>`
    : '';
  els.enhancementMetrics.innerHTML = [
    ['Total', enhancements.length],
    ['P0', byPriority.P0 || 0],
    ['P1', byPriority.P1 || 0],
    ['P2', byPriority.P2 || 0],
    ['P3', byPriority.P3 || 0],
    ['Ready', byStatus.ready || statuses.ready || 0],
    ['In progress', byStatus['in-progress'] || statuses['in-progress'] || 0],
    ['Needs research', byStatus['needs-research'] || statuses['needs-research'] || 0],
    ['Done', byStatus.done || statuses.done || 0],
    ['Blocked', byStatus.blocked || 0],
    ['AI evaluation', evaluation ? `${evaluation.score}%` : 'not run']
  ].map(([label, value]) => `
    <div class="metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join('');

  const areas = Object.entries(byArea)
    .map(([name, count]) => `${name}: ${count}`)
    .sort((left, right) => left.localeCompare(right))
    .join(' | ');
  if (areas) {
    els.enhancementMetrics.innerHTML += `<div class="metric"><span>By area</span><strong>${escapeHtml(areas)}</strong></div>`;
  }
  if (evaluation) {
    els.enhancementMetrics.innerHTML += `<div class="metric"><span>Evaluation scenarios</span><strong>${escapeHtml(`${evaluation.passed}/${evaluation.total} passed`)}</strong></div>`;
  }

  els.enhancementsList.innerHTML = notice + listOrEmpty(enhancements, renderEnhancement);
}

function renderEnhancement(item) {
  return `
    <div class="item" data-enhancement="${escapeHtml(item.id)}" data-enhancement-status="${escapeHtml(item.status)}">
      <div class="item-title">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="pill ${item.status === 'ready' ? 'healthy' : item.status === 'in-progress' ? 'review' : 'high'}">${escapeHtml(item.status)}</span>
      </div>
      <div class="item-title">
        <span>${escapeHtml(item.id)} - ${escapeHtml(item.area)} - ${escapeHtml(item.priority)}</span>
        <span class="pill ${priorityBadgeClass(item.priority)}">${escapeHtml(item.area)}</span>
      </div>
      <div class="meta">
        <span>Priority ${escapeHtml(item.priority)}</span>
        <span>Status ${escapeHtml(item.status)}</span>
        <span>Effort ${escapeHtml(item.effort)}</span>
      </div>
      <div class="meta">${escapeHtml(item.impact || 'No impact summary yet.')}</div>
      <details class="payload">
        <summary>Next step</summary>
        <pre>${escapeHtml(item.nextStep || 'No next step recorded.')}</pre>
      </details>
    </div>
  `;
}

function renderWorkSignals() {
  workSignalsViewController?.render();
}

async function openGraphItemDetail(itemId) {
  if (!itemId) return;

  try {
    const data = await fetchApi(`/api/work-signals/graph/items/${itemId}`);
    renderGraphItemDetailModal(data.detail);
  } catch (error) {
    openNotice('Graph detail unavailable', error.message);
  }
}

async function queueGraphDecision(itemId) {
  if (!itemId) return;
  if (!isFeatureEnabled('work_graph_decisions')) {
    openNotice('Graph decisions paused', 'This workspace rollout does not currently allow cross-tool decision proposals.');
    return;
  }

  try {
    const data = await fetchApi(`/api/work-signals/graph/items/${itemId}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: 'robert' })
    });
    openNotice('Graph decision queued', data.message || 'Graph decision queued for approval.');
    await Promise.all([loadWorkSignals(), loadOperationsLedger()]);
  } catch (error) {
    openNotice('Graph queue failed', error.message);
  }
}

async function reviewGraphDependency(dependencyId, action) {
  if (!dependencyId || !action) return;
  const labels = {
    confirm: 'Dependency confirmed',
    dismiss: 'Dependency dismissed',
    refresh: 'Dependency refreshed'
  };

  try {
    await fetchApi(`/api/work-signals/graph/dependencies/${dependencyId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        actor: 'robert',
        reason: action === 'dismiss'
          ? 'Dismissed from graph review.'
          : 'Reviewed from graph detail.'
      })
    });
    openNotice(labels[action] || 'Dependency reviewed', 'The graph dependency review was recorded inside Sneup. No provider write was executed.');
    await Promise.all([loadWorkSignals(), loadOperationsLedger()]);
  } catch (error) {
    openNotice('Dependency review failed', error.message);
  }
}

function renderGraphItemDetailModal(detail = {}) {
  workSignalsViewController?.renderGraphItemDetailModal(detail);
}

async function openWorkerResponseBindingsModal(accountId) {
  const account = state.accounts.find(item => item.id === accountId);
  if (!account) return;

  try {
    const [bindingData, optionData] = await Promise.all([
      fetchApi(`/api/connectors/accounts/${accountId}/inbound-worker-response-bindings`),
      fetchApi(`/api/connectors/accounts/${accountId}/inbound-worker-response-options?limit=100`)
    ]);
    let bindings = bindingData.bindings || [];
    let members = optionData.members || [];
    let cards = [];
    let memberSearchTimer;
    let cardSearchTimer;
    let memberOptionRequest = null;
    let cardOptionRequest = null;
    let memberRequestId = 0;
    let cardRequestId = 0;
    const memberNames = new Map(members.map(member => [member.id, member.name]));
    const sourceLabels = {
      slack: 'Slack', teams: 'Microsoft Teams', google_chat: 'Google Chat', discord: 'Discord',
      mattermost: 'Mattermost', webex: 'Webex', email: 'Email'
    };

    els.modalTitle.textContent = 'Configure inbound worker responses';
    els.modalBody.innerHTML = `
      <form id="workerResponseBindingsForm" class="worker-response-bindings-form">
        <div class="notice">A signed response only records accountability against an already-executed Sneup request. It never sends a provider write or creates a task. Each mapping needs an exact source worker and source card identifier.</div>
        <div id="workerResponseBindingList" class="worker-response-binding-list"></div>
        <fieldset class="worker-response-binding-editor">
          <legend>Add exact mapping</legend>
          <label for="workerResponseSource">Source
            <select id="workerResponseSource" required>
              ${Object.entries(sourceLabels).map(([source, label]) => `<option value="${source}">${label}</option>`).join('')}
            </select>
          </label>
          <label for="workerResponseSourceMember">Source worker identifier<input id="workerResponseSourceMember" type="text" maxlength="160" autocomplete="off" required></label>
          <label for="workerResponseSourceCard">Source card identifier<input id="workerResponseSourceCard" type="text" maxlength="160" autocomplete="off" required></label>
          <label for="workerResponseMemberSearch">Find Sneup member<input id="workerResponseMemberSearch" type="search" maxlength="80" autocomplete="off" placeholder="Search name or username"></label>
          <label for="workerResponseMember">Sneup member
            <select id="workerResponseMember" required></select>
          </label>
          <label for="workerResponseCardSearch">Find assigned card<input id="workerResponseCardSearch" type="search" maxlength="80" autocomplete="off" placeholder="Search card name" disabled></label>
          <label for="workerResponseCard">Assigned Sneup card
            <select id="workerResponseCard" required disabled><option value="" selected>Select a member first</option></select>
          </label>
          <button class="button" id="addWorkerResponseBinding" type="button">Add mapping</button>
        </fieldset>
        <div class="toolbar modal-actions">
          <button class="button" id="cancelWorkerResponseBindings" type="button">Cancel</button>
          <button class="button primary" id="saveWorkerResponseBindings" type="submit">Save mappings</button>
        </div>
      </form>
    `;
    els.modal.classList.add('open');

    const list = document.getElementById('workerResponseBindingList');
    const memberSearch = document.getElementById('workerResponseMemberSearch');
    const memberSelect = document.getElementById('workerResponseMember');
    const cardSearch = document.getElementById('workerResponseCardSearch');
    const cardSelect = document.getElementById('workerResponseCard');
    const disposeSearchRequests = () => {
      clearTimeout(memberSearchTimer);
      clearTimeout(cardSearchTimer);
      memberOptionRequest?.abort();
      cardOptionRequest?.abort();
      memberOptionRequest = null;
      cardOptionRequest = null;
    };
    state.modalCleanup = disposeSearchRequests;
    const renderBindings = () => {
      list.innerHTML = bindings.length
        ? bindings.map((binding, index) => `
          <div class="worker-response-binding-row">
            <div>
              <strong>${escapeHtml(sourceLabels[binding.source] || binding.source)}: ${escapeHtml(binding.sourceMemberId)} / ${escapeHtml(binding.sourceCardId)}</strong>
              <span>${escapeHtml(memberNames.get(binding.memberId) || `Member ${binding.memberId}`)} to card ${escapeHtml(binding.cardId)}</span>
            </div>
            <button class="button" data-remove-worker-response-binding="${index}" type="button">Remove</button>
          </div>
        `).join('')
        : '<div class="empty">No inbound worker response mappings are saved for this account.</div>';
      document.querySelectorAll('[data-remove-worker-response-binding]').forEach((button) => {
        button.addEventListener('click', () => {
          bindings = bindings.filter((_, index) => index !== Number(button.dataset.removeWorkerResponseBinding));
          renderBindings();
        });
      });
    };
    const renderMembers = () => {
      memberSelect.innerHTML = `<option value="" selected disabled>${members.length ? 'Select assigned member' : 'No matching members'}</option>${members.map(member => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)}${member.username ? ` (${escapeHtml(member.username)})` : ''}</option>`).join('')}`;
      memberSelect.disabled = members.length === 0;
    };
    const renderCards = () => {
      cardSelect.disabled = cards.length === 0;
      cardSelect.innerHTML = cards.length
        ? `<option value="" selected disabled>Select assigned card</option>${cards.map(card => `<option value="${escapeHtml(card.id)}">${escapeHtml(card.name)}${card.closed ? ' (closed)' : ''}</option>`).join('')}`
        : '<option value="" selected>No assigned cards available</option>';
    };
    const loadMembers = async () => {
      const query = memberSearch.value.trim();
      const requestId = ++memberRequestId;
      memberOptionRequest?.abort();
      const request = new AbortController();
      memberOptionRequest = request;
      memberSelect.disabled = true;
      memberSelect.innerHTML = '<option value="" selected>Loading members...</option>';
      try {
        const data = await fetchApi(`/api/connectors/accounts/${accountId}/inbound-worker-response-options?query=${encodeURIComponent(query)}&limit=100`, { signal: request.signal });
        if (requestId !== memberRequestId || memberOptionRequest !== request) return;
        members = data.members || [];
        members.forEach(member => memberNames.set(member.id, member.name));
        renderMembers();
      } catch (error) {
        if (error.name === 'AbortError' || requestId !== memberRequestId || memberOptionRequest !== request) return;
        members = [];
        renderMembers();
        openNotice('Response mapping members', error.message);
      } finally {
        if (memberOptionRequest === request) memberOptionRequest = null;
      }
    };
    const loadCards = async () => {
      const memberId = memberSelect.value;
      cards = [];
      renderCards();
      cardSearch.disabled = !memberId;
      if (!memberId) return;
      const requestId = ++cardRequestId;
      cardOptionRequest?.abort();
      const request = new AbortController();
      cardOptionRequest = request;
      cardSelect.innerHTML = '<option value="" selected>Loading assigned cards...</option>';
      try {
        const data = await fetchApi(`/api/connectors/accounts/${accountId}/inbound-worker-response-options?memberId=${encodeURIComponent(memberId)}&query=${encodeURIComponent(cardSearch.value.trim())}&limit=100`, { signal: request.signal });
        if (requestId !== cardRequestId || cardOptionRequest !== request) return;
        cards = data.cards || [];
        renderCards();
      } catch (error) {
        if (error.name === 'AbortError' || requestId !== cardRequestId || cardOptionRequest !== request) return;
        cardSelect.innerHTML = '<option value="" selected>Assigned cards unavailable</option>';
        openNotice('Response mapping cards', error.message);
      } finally {
        if (cardOptionRequest === request) cardOptionRequest = null;
      }
    };

    renderBindings();
    renderMembers();
    memberSearch.addEventListener('input', () => {
      clearTimeout(memberSearchTimer);
      memberSearchTimer = setTimeout(() => loadMembers(), 180);
    });
    memberSelect.addEventListener('change', loadCards);
    cardSearch.addEventListener('input', () => {
      clearTimeout(cardSearchTimer);
      cardSearchTimer = setTimeout(() => loadCards(), 180);
    });
    document.getElementById('cancelWorkerResponseBindings').addEventListener('click', closeModal);
    document.getElementById('addWorkerResponseBinding').addEventListener('click', () => {
      const source = document.getElementById('workerResponseSource').value;
      const sourceMemberId = document.getElementById('workerResponseSourceMember').value.trim();
      const sourceCardId = document.getElementById('workerResponseSourceCard').value.trim();
      const memberId = memberSelect.value;
      const cardId = cardSelect.value;
      if (!source || !sourceMemberId || !sourceCardId || !memberId || !cardId) {
        openNotice('Response mapping', 'Choose a source, exact source identifiers, an assigned member, and an assigned card.');
        return;
      }
      if (bindings.some(binding => binding.source === source && binding.sourceMemberId === sourceMemberId && binding.sourceCardId === sourceCardId)) {
        openNotice('Response mapping', 'This source worker and card pair is already mapped.');
        return;
      }
      bindings = [...bindings, { source, sourceMemberId, sourceCardId, memberId, cardId }];
      document.getElementById('workerResponseSourceMember').value = '';
      document.getElementById('workerResponseSourceCard').value = '';
      memberSelect.value = '';
      cardSearch.value = '';
      cardSearch.disabled = true;
      cardOptionRequest?.abort();
      cardRequestId += 1;
      cards = [];
      renderCards();
      renderBindings();
    });
    document.getElementById('workerResponseBindingsForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const result = await fetchApi(`/api/connectors/accounts/${accountId}/inbound-worker-response-bindings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bindings })
        });
        bindings = result.bindings || [];
        closeModal();
        await loadConnectors();
        openNotice('Response mappings saved', `${bindings.length} inbound worker response mapping${bindings.length === 1 ? '' : 's'} saved with audit evidence.`);
      } catch (error) {
        openNotice('Response mappings', error.message);
      }
    });
  } catch (error) {
    openNotice('Inbound worker responses', error.message);
  }
}

async function openFigmaTeamModal(accountId) {
  const account = state.accounts.find(item => item.id === accountId);
  if (!account) return;
  const selectedTeamId = account.metadata?.fields?.figmaTeamId || '';
  els.modalTitle.textContent = 'Configure Figma team';
  els.modalBody.innerHTML = `
    <form id="figmaTeamForm">
      <div class="field">
        <label for="figmaTeamId">Figma team ID</label>
        <input id="figmaTeamId" name="figmaTeamId" inputmode="numeric" pattern="[0-9]{1,24}" maxlength="24" required value="${escapeHtml(selectedTeamId)}" placeholder="Numeric ID from the Figma team URL">
      </div>
      <div class="notice">Sneup uses the selected team's project and file metadata only. It does not read design content, nodes, comments, users, thumbnails, URLs, or versions.</div>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelFigmaTeam">Cancel</button>
        <button class="button primary" type="submit">Use this team</button>
      </div>
    </form>
  `;
  els.modal.classList.add('open');
  document.getElementById('cancelFigmaTeam').addEventListener('click', closeModal);
  document.getElementById('figmaTeamForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target).entries());
    try {
      await fetchApi(`/api/connectors/accounts/${accountId}/figma-team`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      closeModal();
      openNotice('Figma team configured', 'Sneup will use this team for the next read-only metadata sync.');
      await loadConnectors();
    } catch (error) {
      openNotice('Figma team configuration', error.message);
    }
  });
}

async function openSharePointSiteModal(accountId) {
  const account = state.accounts.find(item => item.id === accountId);
  if (!account) return;

  try {
    const data = await fetchApi(`/api/connectors/accounts/${accountId}/sharepoint-sites`);
    const sites = data.sites || [];
    if (sites.length === 0) {
      openNotice('SharePoint site selection', 'No followed SharePoint sites are available for this account. Follow a site in SharePoint, then reconnect it with the approved read-only scope.');
      return;
    }

    const selectedSiteId = account.metadata?.fields?.sharePointSiteId || (sites.length === 1 ? sites[0].sharePointSiteId : '');
    els.modalTitle.textContent = 'Select SharePoint site';
    els.modalBody.innerHTML = `
      <form id="sharePointSiteForm">
        <div class="field">
          <label for="sharePointSiteId">Followed SharePoint site</label>
          <select id="sharePointSiteId" name="sharePointSiteId" required>
            <option value="" ${selectedSiteId ? '' : 'selected'} disabled>Select a site</option>
            ${sites.map(site => `<option value="${escapeHtml(site.sharePointSiteId)}" ${site.sharePointSiteId === selectedSiteId ? 'selected' : ''}>${escapeHtml(site.name)}</option>`).join('')}
          </select>
        </div>
        <div class="notice">Sneup reads only root file and folder metadata from this selected followed site. It does not read contents, links, permissions, pages, lists, versions, or sharing details.</div>
        <div class="toolbar modal-actions">
          <button class="button" type="button" id="cancelSharePointSite">Cancel</button>
          <button class="button primary" type="submit">Use this site</button>
        </div>
      </form>
    `;
    els.modal.classList.add('open');
    document.getElementById('cancelSharePointSite').addEventListener('click', closeModal);
    document.getElementById('sharePointSiteForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(event.target).entries());
      try {
        await fetchApi(`/api/connectors/accounts/${accountId}/sharepoint-site`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        closeModal();
        openNotice('SharePoint site selected', 'Sneup will use this site for the next read-only metadata sync.');
        await loadConnectors();
      } catch (error) {
        openNotice('SharePoint site selection', error.message);
      }
    });
  } catch (error) {
    openNotice('SharePoint site selection', error.message);
  }
}

async function openMuralWorkspaceModal(accountId) {
  const account = state.accounts.find(item => item.id === accountId);
  if (!account) return;

  try {
    const data = await fetchApi(`/api/connectors/accounts/${accountId}/mural-workspaces`);
    const workspaces = data.workspaces || [];
    if (workspaces.length === 0) {
      openNotice('Mural workspace selection', 'No Mural workspaces are available for this account. Reconnect it with the approved read-only scopes.');
      return;
    }

    const selectedWorkspaceId = account.metadata?.fields?.muralWorkspaceId || (workspaces.length === 1 ? workspaces[0].muralWorkspaceId : '');
    els.modalTitle.textContent = 'Select Mural workspace';
    els.modalBody.innerHTML = `
      <form id="muralWorkspaceForm">
        <div class="field">
          <label for="muralWorkspaceId">Mural workspace</label>
          <select id="muralWorkspaceId" name="muralWorkspaceId" required>
            <option value="" ${selectedWorkspaceId ? '' : 'selected'} disabled>Select a workspace</option>
            ${workspaces.map(workspace => `<option value="${escapeHtml(workspace.muralWorkspaceId)}" ${workspace.muralWorkspaceId === selectedWorkspaceId ? 'selected' : ''}>${escapeHtml(workspace.name)}</option>`).join('')}
          </select>
        </div>
        <div class="notice">Sneup reads active mural metadata from this selected workspace only. It does not read mural content, widgets, comments, templates, rooms, people, URLs, or sharing details.</div>
        <div class="toolbar modal-actions">
          <button class="button" type="button" id="cancelMuralWorkspace">Cancel</button>
          <button class="button primary" type="submit">Use this workspace</button>
        </div>
      </form>
    `;
    els.modal.classList.add('open');
    document.getElementById('cancelMuralWorkspace').addEventListener('click', closeModal);
    document.getElementById('muralWorkspaceForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(event.target).entries());
      try {
        await fetchApi(`/api/connectors/accounts/${accountId}/mural-workspace`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        closeModal();
        openNotice('Mural workspace selected', 'Sneup will use this workspace for the next read-only metadata sync.');
        await loadConnectors();
      } catch (error) {
        openNotice('Mural workspace selection', error.message);
      }
    });
  } catch (error) {
    openNotice('Mural workspace selection', error.message);
  }
}

async function openXeroTenantModal(accountId) {
  const account = state.accounts.find(item => item.id === accountId);
  if (!account) return;

  try {
    const data = await fetchApi(`/api/connectors/accounts/${accountId}/xero-tenants`);
    const tenants = data.tenants || [];
    if (tenants.length === 0) {
      openNotice('Xero organisation selection', 'No Xero organisations are available for this account. Reconnect it with the approved invoice read scope.');
      return;
    }

    const selectedTenantId = account.metadata?.fields?.xeroTenantId || (tenants.length === 1 ? tenants[0].xeroTenantId : '');
    els.modalTitle.textContent = 'Select Xero organisation';
    els.modalBody.innerHTML = `
      <form id="xeroTenantForm">
        <div class="field">
          <label for="xeroTenantId">Authorized Xero organisation</label>
          <select id="xeroTenantId" name="xeroTenantId" required>
            <option value="" ${selectedTenantId ? '' : 'selected'} disabled>Select an organisation</option>
            ${tenants.map(tenant => `<option value="${escapeHtml(tenant.xeroTenantId)}" ${tenant.xeroTenantId === selectedTenantId ? 'selected' : ''}>${escapeHtml(tenant.name)}</option>`).join('')}
          </select>
        </div>
        <div class="notice">Sneup reads only capped sales-invoice status and date metadata from this organisation. It does not retain contacts, invoice numbers, amounts, payment details, line items, or links.</div>
        <div class="toolbar modal-actions">
          <button class="button" type="button" id="cancelXeroTenant">Cancel</button>
          <button class="button primary" type="submit">Use this organisation</button>
        </div>
      </form>
    `;
    els.modal.classList.add('open');
    document.getElementById('cancelXeroTenant').addEventListener('click', closeModal);
    document.getElementById('xeroTenantForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(event.target).entries());
      try {
        await fetchApi(`/api/connectors/accounts/${accountId}/xero-tenant`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        closeModal();
        openNotice('Xero organisation selected', 'Sneup will use this organisation for the next read-only invoice metadata sync.');
        await loadConnectors();
      } catch (error) {
        openNotice('Xero organisation selection', error.message);
      }
    });
  } catch (error) {
    openNotice('Xero organisation selection', error.message);
  }
}

async function openProcoreCompanyModal(accountId) {
  const account = state.accounts.find(item => item.id === accountId);
  if (!account) return;

  const selectedCompanyId = account.metadata?.fields?.procoreCompanyId || '';
  els.modalTitle.textContent = 'Select Procore company';
  els.modalBody.innerHTML = `
    <form id="procoreCompanyForm">
      <div class="field">
        <label for="procoreCompanyId">Authorized Procore company ID</label>
        <input id="procoreCompanyId" name="procoreCompanyId" inputmode="numeric" pattern="[0-9]{1,20}" maxlength="20" value="${escapeHtml(selectedCompanyId)}" required>
      </div>
      <div class="notice">Sneup verifies project-read access before saving this company. It then reads only capped active-project name, status, and schedule metadata. Budgets, contracts, RFIs, drawings, people, addresses, descriptions, attachments, links, and provider writes stay out of Sneup.</div>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelProcoreCompany">Cancel</button>
        <button class="button primary" type="submit">Use this company</button>
      </div>
    </form>
  `;
  els.modal.classList.add('open');
  document.getElementById('cancelProcoreCompany').addEventListener('click', closeModal);
  document.getElementById('procoreCompanyForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target).entries());
    try {
      await fetchApi(`/api/connectors/accounts/${accountId}/procore-company`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      closeModal();
      openNotice('Procore company selected', 'Sneup will use this company for the next read-only active-project metadata sync.');
      await loadConnectors();
    } catch (error) {
      openNotice('Procore company selection', error.message);
    }
  });
}

async function openResourceGuruAccountModal(accountId) {
  const account = state.accounts.find(item => item.id === accountId);
  if (!account) return;

  try {
    const data = await fetchApi(`/api/connectors/accounts/${accountId}/resource-guru-accounts`);
    const accounts = data.accounts || [];
    if (accounts.length === 0) {
      openNotice('Resource Guru account selection', 'No Resource Guru accounts are currently authorized for this connection. Reconnect it with Resource Guru access.');
      return;
    }

    const selectedAccountId = account.metadata?.fields?.resourceGuruAccountId || (accounts.length === 1 ? accounts[0].resourceGuruAccountId : '');
    els.modalTitle.textContent = 'Select Resource Guru account';
    els.modalBody.innerHTML = `
      <form id="resourceGuruAccountForm">
        <div class="field">
          <label for="resourceGuruAccountId">Authorized Resource Guru account</label>
          <select id="resourceGuruAccountId" name="resourceGuruAccountId" required>
            <option value="" ${selectedAccountId ? '' : 'selected'} disabled>Select an account</option>
            ${accounts.map(resourceGuruAccount => `<option value="${escapeHtml(resourceGuruAccount.resourceGuruAccountId)}" ${resourceGuruAccount.resourceGuruAccountId === selectedAccountId ? 'selected' : ''}>${escapeHtml(resourceGuruAccount.name)}</option>`).join('')}
          </select>
        </div>
        <div class="notice">Sneup will only ingest read-only project and booking schedule metadata from this account.</div>
        <div class="toolbar modal-actions">
          <button class="button" type="button" id="cancelResourceGuruAccount">Cancel</button>
          <button class="button primary" type="submit">Use this account</button>
        </div>
      </form>
    `;
    els.modal.classList.add('open');
    document.getElementById('cancelResourceGuruAccount').addEventListener('click', closeModal);
    document.getElementById('resourceGuruAccountForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(event.target).entries());
      try {
        await fetchApi(`/api/connectors/accounts/${accountId}/resource-guru-account`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        closeModal();
        openNotice('Resource Guru account selected', 'Sneup will use this account for the next read-only sync.');
        await loadConnectors();
      } catch (error) {
        openNotice('Resource Guru account selection', error.message);
      }
    });
  } catch (error) {
    openNotice('Resource Guru account selection', error.message);
  }
}

async function openBasecampAccountModal(accountId) {
  const account = state.accounts.find(item => item.id === accountId);
  if (!account) return;

  try {
    const data = await fetchApi(`/api/connectors/accounts/${accountId}/basecamp-accounts`);
    const accounts = data.accounts || [];
    if (accounts.length === 0) {
      openNotice('Basecamp account selection', 'No Basecamp 3 accounts are currently authorized for this connection. Reconnect it with Basecamp access.');
      return;
    }

    const selectedAccountId = account.metadata?.fields?.basecampAccountId || (accounts.length === 1 ? accounts[0].basecampAccountId : '');
    els.modalTitle.textContent = 'Select Basecamp account';
    els.modalBody.innerHTML = `
      <form id="basecampAccountForm">
        <div class="field">
          <label for="basecampAccountId">Authorized Basecamp account</label>
          <select id="basecampAccountId" name="basecampAccountId" required>
            <option value="" ${selectedAccountId ? '' : 'selected'} disabled>Select an account</option>
            ${accounts.map(basecampAccount => `<option value="${escapeHtml(basecampAccount.basecampAccountId)}" ${basecampAccount.basecampAccountId === selectedAccountId ? 'selected' : ''}>${escapeHtml(basecampAccount.name)}</option>`).join('')}
          </select>
        </div>
        <div class="notice">Sneup will only ingest read-only project and to-do metadata from this account.</div>
        <div class="toolbar modal-actions">
          <button class="button" type="button" id="cancelBasecampAccount">Cancel</button>
          <button class="button primary" type="submit">Use this account</button>
        </div>
      </form>
    `;
    els.modal.classList.add('open');
    document.getElementById('cancelBasecampAccount').addEventListener('click', closeModal);
    document.getElementById('basecampAccountForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(event.target).entries());
      try {
        await fetchApi(`/api/connectors/accounts/${accountId}/basecamp-account`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        closeModal();
        openNotice('Basecamp account selected', 'Sneup will use this account for the next read-only sync.');
        await loadConnectors();
      } catch (error) {
        openNotice('Basecamp account selection', error.message);
      }
    });
  } catch (error) {
    openNotice('Basecamp account selection', error.message);
  }
}

async function openAsanaWorkspaceModal(accountId) {
  const account = state.accounts.find(item => item.id === accountId);
  if (!account) return;

  try {
    const data = await fetchApi(`/api/connectors/accounts/${accountId}/asana-workspaces`);
    const workspaces = data.workspaces || [];
    if (workspaces.length === 0) {
      openNotice('Asana workspace selection', 'No Asana workspaces are currently authorized for this account. Reconnect it with workspace read access.');
      return;
    }

    const selectedWorkspaceGid = account.metadata?.fields?.asanaWorkspaceGid || (workspaces.length === 1 ? workspaces[0].workspaceGid : '');
    els.modalTitle.textContent = 'Select Asana workspace';
    els.modalBody.innerHTML = `
      <form id="asanaWorkspaceForm">
        <div class="field">
          <label for="asanaWorkspaceGid">Authorized workspace</label>
          <select id="asanaWorkspaceGid" name="workspaceGid" required>
            <option value="" ${selectedWorkspaceGid ? '' : 'selected'} disabled>Select a workspace</option>
            ${workspaces.map(workspace => `<option value="${escapeHtml(workspace.workspaceGid)}" ${workspace.workspaceGid === selectedWorkspaceGid ? 'selected' : ''}>${escapeHtml(workspace.name)}${workspace.organization ? ' (organization)' : ''}</option>`).join('')}
          </select>
        </div>
        <div class="notice">Sneup will only ingest read-only project tasks from the selected workspace.</div>
        <div class="toolbar modal-actions">
          <button class="button" type="button" id="cancelAsanaWorkspace">Cancel</button>
          <button class="button primary" type="submit">Use this workspace</button>
        </div>
      </form>
    `;
    els.modal.classList.add('open');
    document.getElementById('cancelAsanaWorkspace').addEventListener('click', closeModal);
    document.getElementById('asanaWorkspaceForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(event.target).entries());
      try {
        await fetchApi(`/api/connectors/accounts/${accountId}/asana-workspace`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        closeModal();
        openNotice('Asana workspace selected', 'Sneup will use this workspace for the next read-only sync.');
        await loadConnectors();
      } catch (error) {
        openNotice('Asana workspace selection', error.message);
      }
    });
  } catch (error) {
    openNotice('Asana workspace selection', error.message);
  }
}

async function openConfluenceSiteModal(accountId) {
  const account = state.accounts.find(item => item.id === accountId);
  if (!account) return;

  try {
    const data = await fetchApi(`/api/connectors/accounts/${accountId}/confluence-sites`);
    const sites = data.sites || [];
    if (sites.length === 0) {
      openNotice('Confluence site selection', 'No Confluence sites are currently authorized for this account. Reconnect it with page and space read access.');
      return;
    }

    const selectedCloudId = account.metadata?.fields?.confluenceCloudId || (sites.length === 1 ? sites[0].cloudId : '');
    els.modalTitle.textContent = 'Select Confluence site';
    els.modalBody.innerHTML = `
      <form id="confluenceSiteForm">
        <div class="field">
          <label for="confluenceCloudId">Authorized Confluence site</label>
          <select id="confluenceCloudId" name="cloudId" required>
            <option value="" ${selectedCloudId ? '' : 'selected'} disabled>Select a site</option>
            ${sites.map(site => `<option value="${escapeHtml(site.cloudId)}" ${site.cloudId === selectedCloudId ? 'selected' : ''}>${escapeHtml(site.name)}${site.url ? ` (${escapeHtml(site.url)})` : ''}</option>`).join('')}
          </select>
        </div>
        <div class="notice">Sneup will ingest space and page metadata only. It does not read page bodies, comments, attachments, users, descriptions, URLs, or version messages.</div>
        <div class="toolbar modal-actions">
          <button class="button" type="button" id="cancelConfluenceSite">Cancel</button>
          <button class="button primary" type="submit">Use this site</button>
        </div>
      </form>
    `;
    els.modal.classList.add('open');
    document.getElementById('cancelConfluenceSite').addEventListener('click', closeModal);
    document.getElementById('confluenceSiteForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(event.target).entries());
      try {
        await fetchApi(`/api/connectors/accounts/${accountId}/confluence-site`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        closeModal();
        openNotice('Confluence site selected', 'Sneup will use this site for the next read-only metadata sync.');
        await loadConnectors();
      } catch (error) {
        openNotice('Confluence site selection', error.message);
      }
    });
  } catch (error) {
    openNotice('Confluence site selection', error.message);
  }
}

async function openJiraSiteModal(accountId) {
  const account = state.accounts.find(item => item.id === accountId);
  if (!account) return;

  try {
    const data = await fetchApi(`/api/connectors/accounts/${accountId}/jira-sites`);
    const sites = data.sites || [];
    if (sites.length === 0) {
      openNotice('Jira site selection', 'No Jira sites are currently authorized for this account. Reconnect it with Jira read access.');
      return;
    }

    const selectedCloudId = account.metadata?.fields?.cloudId || (sites.length === 1 ? sites[0].cloudId : '');
    els.modalTitle.textContent = 'Select Jira site';
    els.modalBody.innerHTML = `
      <form id="jiraSiteForm">
        <div class="field">
          <label for="jiraCloudId">Authorized Jira site</label>
          <select id="jiraCloudId" name="cloudId" required>
            <option value="" ${selectedCloudId ? '' : 'selected'} disabled>Select a site</option>
            ${sites.map(site => `<option value="${escapeHtml(site.cloudId)}" ${site.cloudId === selectedCloudId ? 'selected' : ''}>${escapeHtml(site.name)}${site.url ? ` (${escapeHtml(site.url)})` : ''}</option>`).join('')}
          </select>
        </div>
        <div class="notice">Sneup will only ingest read-only work signals from the selected site.</div>
        <div class="toolbar modal-actions">
          <button class="button" type="button" id="cancelJiraSite">Cancel</button>
          <button class="button primary" type="submit">Use this site</button>
        </div>
      </form>
    `;
    els.modal.classList.add('open');
    document.getElementById('cancelJiraSite').addEventListener('click', closeModal);
    document.getElementById('jiraSiteForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(event.target).entries());
      try {
        await fetchApi(`/api/connectors/accounts/${accountId}/jira-site`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        closeModal();
        openNotice('Jira site selected', 'Sneup will use this site for the next read-only sync.');
        await loadConnectors();
      } catch (error) {
        openNotice('Jira site selection', error.message);
      }
    });
  } catch (error) {
    openNotice('Jira site selection', error.message);
  }
}

async function syncConnectorAccount(accountId) {
  if (!accountId) return;
  if (!isFeatureEnabled('connector_sync')) {
    openNotice('Connector sync paused', 'This workspace rollout does not currently allow connector synchronization.');
    return;
  }
  try {
    const data = await fetchApi(`/api/work-signals/accounts/${accountId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const result = data.result || {};
    openNotice('Connector synced', `${result.signalCount || 0} work signals updated${result.retryCount ? ` after ${result.retryCount} ${result.retryCount === 1 ? 'retry' : 'retries'}` : ''}.`);
    await Promise.all([loadConnectors(), loadWorkSignals(), loadJobDashboard()]);
  } catch (error) {
    openNotice('Connector sync unavailable', error.message);
  }
}

async function startConnection(connectorId, options = {}) {
  const connector = state.connectors.find(item => item.id === connectorId);
  if (!connector) return;
  try {
    const data = await fetchApi(`/api/connectors/${connectorId}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnTo: '/?connectors=1', scopeAcknowledged: options.scopeAcknowledged === true })
    });

    if (data.scopeReviewRequired) {
      openConnectorSafetyReview(connector, data, options.account);
      return;
    }

    if (data.authUrl) {
      window.location.href = data.authUrl;
      return;
    }

    openCredentialModal(connector, data, options.account);
  } catch (error) {
    openNotice(connector.name, error.message);
  }
}

function openConnectorSafetyReview(connector, data, account) {
  const safety = data.safety || connector.safety || {};
  els.modalTitle.textContent = `Review ${connector.name} access`;
  els.modalBody.innerHTML = `
    <div class="notice-stack">
      <div class="notice"><strong>Read-only signal ingestion.</strong> Sneup blocks provider writes and turns proposed provider changes into exact-payload approval decisions.</div>
      <div class="scope-review-list">
        <span>Requested provider scopes</span>
        <code>${escapeHtml((safety.requestedScopes || []).join(', ') || 'Provider-managed token permissions')}</code>
      </div>
      ${(safety.reviewReasons || []).map(reason => `<div class="notice">${escapeHtml(reason)}</div>`).join('')}
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelScopeReview">Cancel</button>
        <button class="button primary" type="button" id="continueScopeReview">Continue to ${escapeHtml(connector.name)}</button>
      </div>
    </div>
  `;
  els.modal.classList.add('open');
  document.getElementById('cancelScopeReview').addEventListener('click', closeModal);
  document.getElementById('continueScopeReview').addEventListener('click', () => {
    closeModal();
    startConnection(connector.id, { scopeAcknowledged: true, account });
  });
}

function openCredentialModal(connector, data, account) {
  const fields = data.fields || connector.auth.fields || [];
  const rotating = Boolean(account);
  els.modalTitle.textContent = `${rotating ? 'Rotate' : 'Connect'} ${connector.name}`;
  els.modalBody.innerHTML = `
    <form id="credentialForm">
      ${fields.map(field => `
        <div class="field">
          <label for="field-${field.name}">${escapeHtml(field.label || field.name)}</label>
          <input id="field-${field.name}" name="${field.name}" type="${field.secret ? 'password' : 'text'}" autocomplete="${field.secret ? 'current-password' : 'off'}" ${field.required ? 'required' : ''}>
        </div>
      `).join('')}
      <div class="field">
        <label for="accountName">Account name</label>
        <input id="accountName" name="accountName" type="text" placeholder="${escapeHtml(connector.name)}">
      </div>
      <div class="notice">Credential storage is locked until MongoDB plus CONNECTOR_ENCRYPTION_KEY are configured. ${rotating ? 'Replacing this credential retains the linked account, renews its scope evidence, and records a secret-free audit event.' : 'Saving records the scope review without storing your credential in the audit ledger.'}</div>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelCredential">Cancel</button>
        <button class="button primary" type="submit">${rotating ? 'Replace credential' : 'Save account'}</button>
      </div>
    </form>
  `;
  els.modal.classList.add('open');
  document.getElementById('cancelCredential').addEventListener('click', closeModal);
  document.getElementById('credentialForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = {
      ...Object.fromEntries(new FormData(event.target).entries()),
      scopeAcknowledged: data.scopeAcknowledged === true
    };
    try {
      await fetchApi(rotating ? `/api/connectors/accounts/${account.id}/rotate-credentials` : `/api/connectors/${connector.id}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      closeModal();
      await loadConnectors();
    } catch (error) {
      openNotice(connector.name, error.message);
    }
  });
}

function openNotice(title, message) {
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = `
    <div class="notice-stack">
      <div class="notice">${escapeHtml(message)}</div>
      <div class="toolbar modal-actions">
        <button class="button primary" type="button" id="noticeClose">Done</button>
      </div>
    </div>
  `;
  els.modal.classList.add('open');
  document.getElementById('noticeClose').addEventListener('click', closeModal);
}

function openTrelloActionReconciliation(actionId) {
  const attempt = (state.ledger.actions || []).find(item => getId(item._id || item.id) === actionId);
  if (!attempt) return;

  els.modalTitle.textContent = t('Reconcile {action}', {
    action: t(String(attempt.actionType || 'Trello action').replaceAll('_', ' '))
  });
  els.modalBody.innerHTML = `
    <form id="trelloActionReconciliationForm" class="notice-stack">
      <div class="notice">${et("Confirm the observed provider result. This finalizes Sneup's ledger and does not send another Trello request.")}</div>
      <label>${et('Observed result')}
        <select name="outcome" required>
          <option value="" selected disabled>${et('Select result')}</option>
          <option value="succeeded">${et('Succeeded in Trello')}</option>
          <option value="failed">${et('Did not succeed in Trello')}</option>
        </select>
      </label>
      <label>${et('Evidence checked')}
        <textarea name="evidence" rows="4" maxlength="2000" required placeholder="${et('Trello activity, card state, or provider error reviewed')}"></textarea>
      </label>
      <label>${et('Resolution note')}
        <textarea name="reason" rows="2" maxlength="1000" placeholder="${et('Optional decision note')}"></textarea>
      </label>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelTrelloReconciliation">${et('Cancel')}</button>
        <button class="button primary" type="submit">${et('Finalize ledger')}</button>
      </div>
    </form>
  `;
  els.modal.classList.add('open');

  document.getElementById('cancelTrelloReconciliation').addEventListener('click', closeModal);
  document.getElementById('trelloActionReconciliationForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    const formData = new FormData(event.currentTarget);
    submitButton.disabled = true;
    submitButton.textContent = t('Finalizing...');

    try {
      const data = await fetchApi(`/api/trello-actions/${encodeURIComponent(actionId)}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: formData.get('outcome'),
          evidence: formData.get('evidence'),
          reason: formData.get('reason'),
          reconciledBy: state.securityContext?.actorId || 'local-user'
        })
      });
      closeModal();
      await loadOperationsLedger();
      openNotice(t('Ledger reconciled'), t(data.auditRecorded === false
        ? 'The provider result is finalized. Audit recording needs operator review.'
        : 'The provider result and approval ledger are finalized.'));
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = t('Finalize ledger');
      openNotice(t('Reconciliation blocked'), error.message);
    }
  });
}

function openNotificationPolicy() {
  openNotificationPolicyForm();
}

function openNotificationPolicyEditor(policyId) {
  const policy = (state.ledger.notificationPolicies || []).find(item => getId(item.id || item._id) === policyId);
  if (policy) openNotificationPolicyForm(policy);
}

function openNotificationPolicyForm(policy = null) {
  const isEdit = Boolean(policy);
  const eventTypes = policy?.eventTypes?.length ? policy.eventTypes : ['reconciliation_alert'];
  const quietHours = policy?.quietHours || { enabled: false, startHourUtc: 18, endHourUtc: 8 };
  const digest = policy?.digest || { enabled: false, hourUtc: 9, maximumItems: 10 };
  const reportSchedule = policy?.reportSchedule || { dayOfWeekUtc: 1, hourUtc: 9 };
  const dailyBriefSchedule = policy?.dailyBriefSchedule || { hourUtc: 8 };
  const channel = policy?.channel || 'slack_webhook';
  els.modalTitle.textContent = t(isEdit ? 'Edit delivery policy' : 'Add delivery policy');
  els.modalBody.innerHTML = `
    <form id="notificationPolicyForm" class="notice-stack">
      <label>${et('Name')}<input name="name" type="text" maxlength="120" required value="${escapeHtml(policy?.name || '')}" placeholder="${et('Operations alerts')}"></label>
      <fieldset class="notice-stack">
        <legend>${et('Deliver')}</legend>
        <label><input name="eventTypes" type="checkbox" value="reconciliation_alert" ${eventTypes.includes('reconciliation_alert') ? 'checked' : ''}> ${et('Reconciliation alerts')}</label>
        <label><input name="eventTypes" type="checkbox" value="weekly_status_report" ${eventTypes.includes('weekly_status_report') ? 'checked' : ''}> ${et('Weekly status report')}</label>
        <label><input name="eventTypes" type="checkbox" value="daily_operations_brief" ${eventTypes.includes('daily_operations_brief') ? 'checked' : ''}> ${et('Daily operations brief')}</label>
      </fieldset>
      <label>${et('Channel')}
        <select name="channel" required>
          <option value="slack_webhook" ${channel === 'slack_webhook' ? 'selected' : ''}>${et('Slack webhook')}</option>
          <option value="teams_webhook" ${channel === 'teams_webhook' ? 'selected' : ''}>${et('Teams webhook')}</option>
          <option value="generic_webhook" ${channel === 'generic_webhook' ? 'selected' : ''}>${et('Generic webhook')}</option>
          <option value="email" ${channel === 'email' ? 'selected' : ''}>${et('Email (Resend)')}</option>
        </select>
      </label>
      <label>${et('Destination label')}<input name="destinationLabel" type="text" maxlength="160" required value="${escapeHtml(policy?.destinationLabel || '')}" placeholder="${et('Project operations channel')}"></label>
      <label id="notificationWebhookDestination">${et('HTTPS webhook URL')}<input name="destinationUrl" type="url" inputmode="url" autocomplete="off" placeholder="https://..."></label>
      <label id="notificationEmailDestination" hidden>${et('Email recipient')}<input name="destinationEmail" type="email" inputmode="email" autocomplete="email" placeholder="operations@example.com"></label>
      ${isEdit && policy.destinationConfigured ? `<div class="notice">${et('Encrypted destination retained unless you enter a replacement.')}</div>` : ''}
      <div id="notificationAlertSettings">
      <label>${et('Minimum severity')}
        <select name="minimumSeverity">
          <option value="warning" ${policy?.minimumSeverity !== 'critical' ? 'selected' : ''}>${et('Warning and critical')}</option>
          <option value="critical" ${policy?.minimumSeverity === 'critical' ? 'selected' : ''}>${et('Critical only')}</option>
        </select>
      </label>
      <label><input name="quietHoursEnabled" type="checkbox" ${quietHours.enabled ? 'checked' : ''}> ${et('Defer warning alerts during quiet hours (critical alerts stay immediate)')}</label>
      <div class="form-grid">
        <label>${et('Quiet start UTC')}<input name="quietStartHourUtc" type="number" min="0" max="23" value="${escapeHtml(quietHours.startHourUtc)}"></label>
        <label>${et('Quiet end UTC')}<input name="quietEndHourUtc" type="number" min="0" max="23" value="${escapeHtml(quietHours.endHourUtc)}"></label>
      </div>
      <label><input name="digestEnabled" type="checkbox" ${digest.enabled ? 'checked' : ''}> ${et('Send warning evidence as one daily digest (critical alerts stay immediate)')}</label>
      <div class="form-grid">
        <label>${et('Digest hour UTC')}<input name="digestHourUtc" type="number" min="0" max="23" value="${escapeHtml(digest.hourUtc)}"></label>
        <label>${et('Maximum digest items')}<input name="digestMaximumItems" type="number" min="1" max="25" value="${escapeHtml(digest.maximumItems)}"></label>
      </div>
      </div>
      <div id="notificationReportSettings" hidden>
        <div class="form-grid">
          <label>${et('Weekly day UTC')}
            <select name="reportDayOfWeekUtc">
              <option value="1" ${Number(reportSchedule.dayOfWeekUtc) === 1 ? 'selected' : ''}>${et('Monday')}</option><option value="2" ${Number(reportSchedule.dayOfWeekUtc) === 2 ? 'selected' : ''}>${et('Tuesday')}</option><option value="3" ${Number(reportSchedule.dayOfWeekUtc) === 3 ? 'selected' : ''}>${et('Wednesday')}</option><option value="4" ${Number(reportSchedule.dayOfWeekUtc) === 4 ? 'selected' : ''}>${et('Thursday')}</option><option value="5" ${Number(reportSchedule.dayOfWeekUtc) === 5 ? 'selected' : ''}>${et('Friday')}</option><option value="6" ${Number(reportSchedule.dayOfWeekUtc) === 6 ? 'selected' : ''}>${et('Saturday')}</option><option value="0" ${Number(reportSchedule.dayOfWeekUtc) === 0 ? 'selected' : ''}>${et('Sunday')}</option>
            </select>
          </label>
          <label>${et('Delivery hour UTC')}<input name="reportHourUtc" type="number" min="0" max="23" value="${escapeHtml(reportSchedule.hourUtc)}"></label>
        </div>
      </div>
      <div id="notificationDailyBriefSettings" hidden>
        <div class="form-grid">
          <label>${et('Daily delivery hour UTC')}<input name="dailyBriefHourUtc" type="number" min="0" max="23" value="${escapeHtml(dailyBriefSchedule.hourUtc)}"></label>
        </div>
        <div class="notice">${et('The daily brief is read-only: it summarizes current decisions, risks, follow-ups, and the morning plan. It never changes a provider account.')}</div>
      </div>
      <div class="notice">${isEdit
    ? et('Changes keep this policy {status}. Activation remains a separate confirmation.', { status: t(String(policy.status).replaceAll('_', ' ')) })
    : et('The policy starts paused. Activate it separately when this workspace is ready to deliver its configured alerts, daily brief, or weekly status report.')}</div>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelNotificationPolicy">${et('Cancel')}</button>
        <button class="button primary" type="submit">${et(isEdit ? 'Save changes' : 'Save paused policy')}</button>
      </div>
    </form>
  `;
  els.modal.classList.add('open');
  document.getElementById('cancelNotificationPolicy').addEventListener('click', closeModal);
  const policyForm = document.getElementById('notificationPolicyForm');
  const channelInput = policyForm.elements.channel;
  const eventTypeInputs = [...policyForm.querySelectorAll('input[name="eventTypes"]')];
  const webhookDestination = document.getElementById('notificationWebhookDestination');
  const emailDestination = document.getElementById('notificationEmailDestination');
  const alertSettings = document.getElementById('notificationAlertSettings');
  const reportSettings = document.getElementById('notificationReportSettings');
  const dailyBriefSettings = document.getElementById('notificationDailyBriefSettings');
  const syncDestinationInput = () => {
    const emailSelected = channelInput.value === 'email';
    const retainsDestination = isEdit && policy.destinationConfigured && channelInput.value === policy.channel;
    webhookDestination.hidden = emailSelected;
    emailDestination.hidden = !emailSelected;
    policyForm.elements.destinationUrl.required = !emailSelected && !retainsDestination;
    policyForm.elements.destinationEmail.required = emailSelected && !retainsDestination;
  };
  channelInput.addEventListener('change', syncDestinationInput);
  const syncEventSettings = () => {
    const selectedEventTypes = eventTypeInputs.filter(input => input.checked).map(input => input.value);
    alertSettings.hidden = !selectedEventTypes.includes('reconciliation_alert');
    reportSettings.hidden = !selectedEventTypes.includes('weekly_status_report');
    dailyBriefSettings.hidden = !selectedEventTypes.includes('daily_operations_brief');
    eventTypeInputs[0].setCustomValidity(selectedEventTypes.length ? '' : t('Select at least one delivery type'));
  };
  eventTypeInputs.forEach(input => input.addEventListener('change', syncEventSettings));
  syncDestinationInput();
  syncEventSettings();
  policyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = t('Saving...');
    try {
      const form = event.currentTarget;
      const formValues = Object.fromEntries(new FormData(form).entries());
      const destinationField = channelInput.value === 'email' ? 'destinationEmail' : 'destinationUrl';
      const payload = {
        ...formValues,
        quietHours: {
          enabled: form.elements.quietHoursEnabled.checked,
          startHourUtc: Number(form.elements.quietStartHourUtc.value),
          endHourUtc: Number(form.elements.quietEndHourUtc.value)
        },
        digest: {
          enabled: form.elements.digestEnabled.checked,
          hourUtc: Number(form.elements.digestHourUtc.value),
          maximumItems: Number(form.elements.digestMaximumItems.value)
        },
        eventTypes: eventTypeInputs.filter(input => input.checked).map(input => input.value),
        reportSchedule: {
          enabled: eventTypeInputs.some(input => input.checked && input.value === 'weekly_status_report'),
          reportType: 'weekly_status',
          dayOfWeekUtc: Number(form.elements.reportDayOfWeekUtc.value),
          hourUtc: Number(form.elements.reportHourUtc.value)
        },
        dailyBriefSchedule: {
          enabled: eventTypeInputs.some(input => input.checked && input.value === 'daily_operations_brief'),
          hourUtc: Number(form.elements.dailyBriefHourUtc.value)
        }
      };
      delete payload.destinationUrl;
      delete payload.destinationEmail;
      if (form.elements[destinationField].value.trim()) payload[destinationField] = form.elements[destinationField].value.trim();
      if (isEdit) {
        if (!await updateNotificationPolicy(getId(policy.id || policy._id), payload)) return;
      } else {
        await fetchApi('/api/notifications/policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        await loadOperationsLedger();
      }
      closeModal();
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = t(isEdit ? 'Save changes' : 'Save paused policy');
      openNotice(t('Policy not saved'), error.message);
    }
  });
}

async function updateNotificationPolicy(policyId, body) {
  try {
    await fetchApi(`/api/notifications/policies/${encodeURIComponent(policyId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    await loadOperationsLedger();
    return true;
  } catch (error) {
    openNotice(t('Policy update blocked'), error.message);
    return false;
  }
}

function openNotificationActivation(policyId) {
  const policy = (state.ledger.notificationPolicies || []).find(item => getId(item.id || item._id) === policyId);
  if (!policy) return;
  const eventLabels = [];
  if ((policy.eventTypes || []).includes('reconciliation_alert')) eventLabels.push(t('{severity} reconciliation evidence alerts', { severity: t(policy.minimumSeverity) }));
  if ((policy.eventTypes || []).includes('weekly_status_report')) eventLabels.push(t('weekly status reports'));
  if ((policy.eventTypes || []).includes('daily_operations_brief')) eventLabels.push(t('daily operations briefs'));
  els.modalTitle.textContent = t('Activate delivery policy');
  els.modalBody.innerHTML = `
    <form id="activateNotificationPolicyForm" class="notice-stack">
      <div class="notice">${et('Activating')} <strong>${escapeHtml(policy.name)}</strong> ${et('permits {deliveries} to', { deliveries: eventLabels.join(` ${t('and')} `) || t('configured deliveries') })} <strong>${escapeHtml(policy.destinationLabel || t('the configured destination'))}</strong>.</div>
      <label><input type="checkbox" name="confirmActivation" required> ${et('I confirm this workspace may deliver these notifications.')}</label>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelNotificationActivation">${et('Cancel')}</button>
        <button class="button primary" type="submit">${et('Activate policy')}</button>
      </div>
    </form>
  `;
  els.modal.classList.add('open');
  document.getElementById('cancelNotificationActivation').addEventListener('click', closeModal);
  document.getElementById('activateNotificationPolicyForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = t('Activating...');
    try {
      if (await updateNotificationPolicy(policyId, { status: 'active' })) closeModal();
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = t('Activate policy');
    }
  });
}

function openNotificationTest(policyId) {
  const policy = (state.ledger.notificationPolicies || []).find(item => getId(item.id || item._id) === policyId);
  if (!policy) return;
  els.modalTitle.textContent = t('Send test alert');
  els.modalBody.innerHTML = `
    <form id="notificationTestForm" class="notice-stack">
      <div class="notice">${et('This sends a real test delivery to')} <strong>${escapeHtml(policy.destinationLabel || t('the configured destination'))}</strong>. ${et('It does not activate the policy.')}</div>
      <label><input type="checkbox" name="confirmDelivery" required> ${et('I understand this sends an external test notification.')}</label>
      <div class="toolbar modal-actions">
        <button class="button" type="button" id="cancelNotificationTest">${et('Cancel')}</button>
        <button class="button primary" type="submit">${et('Send test')}</button>
      </div>
    </form>
  `;
  els.modal.classList.add('open');
  document.getElementById('cancelNotificationTest').addEventListener('click', closeModal);
  document.getElementById('notificationTestForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = t('Sending...');
    try {
      await fetchApi(`/api/notifications/policies/${encodeURIComponent(policyId)}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmDelivery: true })
      });
      closeModal();
      await loadOperationsLedger();
      openNotice(t('Test delivered'), t('The external destination accepted the test alert.'));
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = t('Send test');
      openNotice(t('Test delivery failed'), error.message);
    }
  });
}

function closeModal() {
  const cleanup = state.modalCleanup;
  state.modalCleanup = null;
  cleanup?.();
  els.modal.classList.remove('open');
}

function inviteTokenFromUrl() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('invite');
  if (!token) return '';
  url.searchParams.delete('invite');
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  return token;
}

function openInviteAcceptance(rawToken) {
  els.modalTitle.textContent = t('Join workspace');
  els.modalBody.innerHTML = `
    <form id="acceptWorkspaceInviteForm" class="notice-stack">
      <label>${et('Name')}<input name="displayName" type="text" autocomplete="name" required></label>
      <div class="toolbar modal-actions">
        <button class="button primary" type="submit">${et('Join workspace')}</button>
      </div>
    </form>
  `;
  els.modal.classList.add('open');
  document.getElementById('acceptWorkspaceInviteForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = t('Joining...');
    try {
      const values = new FormData(event.currentTarget);
      const data = await fetchApi('/api/workspaces/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawToken, displayName: values.get('displayName') })
      });
      state.sessionToken = data.sessionToken;
      sessionStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
      state.activeWorkspaceId = data.workspace.id;
      localStorage.setItem('sneup.workspaceId', state.activeWorkspaceId);
      closeModal();
      await loadAll({ force: true });
      showView('overview');
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = t('Join workspace');
      openNotice(t('Unable to join workspace'), error.message);
    }
  });
}

function listOrEmpty(items, renderer) {
  return items && items.length > 0
    ? items.map(renderer).join('')
    : `<div class="empty">${et('Nothing needs attention.')}</div>`;
}

function severityClass(value) {
  if (value === 'critical') return 'critical';
  if (value === 'high' || value === 'at_risk') return 'high';
  if (value === 'connected' || value === 'healthy') return 'healthy';
  return 'review';
}

function priorityBadgeClass(priority) {
  if (priority === 'P0') return 'critical';
  if (priority === 'P1') return 'high';
  if (priority === 'P2') return 'review';
  return 'healthy';
}

function signalClass(signal = {}) {
  if (signal.priority === 'critical' || signal.status === 'blocked') return 'critical';
  if (signal.priority === 'high' || signal.status === 'waiting') return 'high';
  if (signal.status === 'done' || signal.status === 'archived') return 'healthy';
  return 'review';
}

function getId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return value._id;
  if (value.id) return value.id;
  return String(value);
}

function formatDate(value) {
  if (!value) return t('No date');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? t('No date') : i18n.formatDate(date);
}

function toDateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function renderConfidence(value) {
  const safeValue = clampPercent(value);
  return `<progress class="confidence-meter" value="${safeValue}" max="100" aria-label="${et('Confidence {value}%', { value: safeValue })}"></progress>`;
}

function renderBar(value, label) {
  const safeValue = clampPercent(value);
  return `<progress class="bar-meter" value="${safeValue}" max="100" aria-label="${escapeHtml(label)}"></progress>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

const invitationToken = inviteTokenFromUrl();
if (invitationToken) {
  openInviteAcceptance(invitationToken);
} else {
  loadAll();
  if (!state.setupMode && window.sneupDesktop?.saveStartupMode) openFirstRunSetup();
}
