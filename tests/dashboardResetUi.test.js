const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const initialState = () => new Function('localStorage', 'sessionStorage', 'SESSION_TOKEN_KEY', 'FIRST_RUN_SETUP_KEY',
  `${source.slice(source.indexOf('const state = {'), source.indexOf('const els = {'))}; return state;`)(
  { getItem: () => '' }, { getItem: () => '' }, 'session', 'setup');

test.each([null, 'forecastScenarioForm', 'capacityProfileForm', 'boardProjectMappingsForm', 'payloadReviewForm', 'payloadReviewLoading', 'workerResponseForm', 'trelloActionReconciliationForm', 'ledgerClose'])('workspace reset clears dashboard evidence and any open %s without loading modules', formId => {
  expect(source.includes('function resetDashboardViews(')).toBe(true);
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'public/index.html'), 'utf8'));
  const document = dom.window.document;
  const state = initialState();
  const els = Object.fromEntries([...document.querySelectorAll('[id]')].map(element => [element.id, element]));
  const marker = 'PREVIOUS_WORKSPACE_EVIDENCE';
  state.enhancementArea = marker;
  els.enhancementAreaFilter.innerHTML = `<option value="all">All areas</option><option value="${marker}">${marker}</option>`;
  els.enhancementAreaFilter.value = marker;
  els.enhancementAreaFilter.dataset.areaSignature = JSON.stringify([marker]);
  for (const key of ['snapshot', 'operationsBrief', 'jobDashboard', 'responseTiming', 'rateLimitMetrics', 'connectorSafety',
    'connectorSyncReadiness', 'workGraph', 'forecast', 'recommendationEvaluation']) state[key] = { marker };
  for (const key of ['notificationJobHealth', 'connectors', 'categories', 'accounts', 'workSignals', 'workGraphCandidates',
    'workSignalContracts', 'enhancements', 'reports']) state[key] = [{ marker }];
  state.enhancementSummary = { marker };
  state.recommendationEvaluationLoaded = true;
  for (const key of Object.keys(state.ledger)) state.ledger[key] = [{ marker }];
  const containers = ['metrics', 'brief', 'operationsBriefItems', 'jobHealthList', 'commandQueue', 'dailyPlan', 'focusQueue',
    'teamLoad', 'boards', 'ledgerMetrics', 'decisionQueue', 'connectorGrid', 'workSignalList', 'portfolioForecast', 'reportList', 'enhancementsList'];
  containers.forEach(key => { els[key].textContent = marker; });
  if (formId) {
    els.modalBody.innerHTML = `<form id="${formId}">${marker}</form>`;
    els.connectorModal.classList.add('open');
  }
  const options = { document, window: dom.window, state, elements: els,
    callbacks: { captureWorkspaceContext: () => () => true, bindLedgerDrilldownActions: jest.fn(), bindGraphActions: jest.fn() }, t: value => value,
    plural: (one, many, count) => (count === 1 ? one : many).replace('{count}', String(count)),
    escapeHtml: String, isFeatureEnabled: () => false, formatDate: () => '', getId: item => item?.id || '',
    severityClass: () => '', signalClass: () => '' };
  const bindings = { state, els,
    connectorViewController: require('../public/connectorView').createController(options),
    approvalViewController: require('../public/approvalView').createController(options),
    workSignalsViewController: require('../public/workSignalsView').createController(options),
    forecastViewController: require('../public/forecastView').createController(options),
    reportViewController: require('../public/reportView').createController(options),
    enhancementViewController: require('../public/enhancementView').createController(options),
    updateApprovalCount: jest.fn(), t: value => value,
    closeModal: jest.fn(() => els.connectorModal.classList.remove('open'))
  };
  const abortConnector = jest.fn();
  const abortEnhancement = jest.fn();
  state.connectorRequest = { abort: abortConnector };
  const code = source.slice(source.indexOf('function resetDashboardViews('), source.indexOf('function beginWorkspaceRead('));
  const reset = new Function(...Object.keys(bindings), 'enhancementRequest', 'connectorSearchTimer', `${code}; return resetDashboardViews;`)(
    ...Object.values(bindings), { abort: abortEnhancement }, null);
  reset();
  expect(abortConnector).toHaveBeenCalledTimes(1);
  expect(abortEnhancement).toHaveBeenCalledTimes(1);
  expect(state.connectorRequest).toBeNull();
  expect(JSON.stringify(state)).not.toContain(marker);
  expect(document.body.textContent).not.toContain(marker);
  expect(state.recommendationEvaluationLoaded).toBe(false);
  expect(state.enhancementArea).toBe('all');
  expect(els.enhancementAreaFilter.options).toHaveLength(1);
  expect(els.enhancementAreaFilter.dataset.areaSignature).toBe('[]');
  expect(document.getElementById('refreshButton')).not.toBeNull();
  expect(document.querySelectorAll('[data-view-button]')).toHaveLength(8);
  expect(bindings.closeModal).toHaveBeenCalledTimes(formId ? 1 : 0);
  if (formId) expect(els.connectorModal.classList.contains('open')).toBe(false);
  dom.window.close();
});
