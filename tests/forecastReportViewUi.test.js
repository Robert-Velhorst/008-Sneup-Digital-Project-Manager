const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { createRuntime } = require('../public/i18n');
const {
  createController: createForecastController,
  NL_MESSAGES: FORECAST_NL_MESSAGES,
  DYNAMIC_OPERATOR_MESSAGES: FORECAST_MESSAGES
} = require('../public/forecastView');
const {
  createController: createReportController,
  NL_MESSAGES: REPORT_NL_MESSAGES,
  DYNAMIC_OPERATOR_MESSAGES: REPORT_MESSAGES
} = require('../public/reportView');

const rootDir = path.join(__dirname, '..');
const forecastSource = fs.readFileSync(path.join(rootDir, 'public', 'forecastView.js'), 'utf8');
const reportSource = fs.readFileSync(path.join(rootDir, 'public', 'reportView.js'), 'utf8');
const appSource = fs.readFileSync(path.join(rootDir, 'public', 'app.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const elementIds = [
  'forecastCount', 'forecastMetrics', 'forecastMode', 'forecastCapacityCount', 'forecastCapacity',
  'portfolioForecast', 'forecastBoardCount', 'forecastBoards', 'reportCount', 'reportMode',
  'reportList', 'connectorModal', 'modalTitle', 'modalBody'
];

function createHarness(locale = 'nl') {
  const dom = new JSDOM(`<!doctype html><html lang="${locale}"><body>${elementIds.map(id => `<div id="${id}"></div>`).join('')}</body></html>`, {
    url: 'http://127.0.0.1:3212/'
  });
  const i18n = createRuntime({ root: null, language: locale, storage: null });
  i18n.registerMessages('nl', FORECAST_NL_MESSAGES);
  i18n.registerMessages('nl', REPORT_NL_MESSAGES);
  const elements = Object.fromEntries(elementIds.map(id => [id, dom.window.document.getElementById(id)]));
  elements.modal = elements.connectorModal;
  const callbacks = {
    openForecastScenario: jest.fn(),
    resetForecastScenario: jest.fn(),
    openBoardProjectMappingsEditor: jest.fn(),
    openCapacityEditor: jest.fn(),
    openNotice: jest.fn(),
    closeModal: jest.fn(),
    enhanceForm: jest.fn(),
    downloadReport: jest.fn()
  };
  const state = {
    securityContext: { permissions: ['capacity:manage'] },
    forecast: {
      mode: 'live',
      scenario: { active: true, overrideCount: 1 },
      portfolio: {
        boardName: 'Exact Portfolio Evidence', health: 'at_risk', openCards: 8, workHours: 80,
        weeklyAvailableHours: 40, confidence: 72, confidenceLabel: 'reviewed evidence', utilizationPercent: 84,
        p50: { date: '2026-08-20T00:00:00.000Z' }, p80: { date: '2026-08-28T00:00:00.000Z' },
        risks: ['Exact risk evidence remains unchanged'], assumptions: ['Exact assumption evidence remains unchanged']
      },
      dataQuality: {
        utilization: { entries: 4, weeklyHours: 20, activeProviders: ['harvest'] },
        allocations: { matchedEntries: 2, matchedWeeklyHours: 10, mappedProjectEntries: 1, mappedProjectWeeklyHours: 6 },
        calendar: { matchedEntries: 2, matchedWeeklyHours: 4 }
      },
      memberCapacity: [{
        memberId: 'member-1', name: 'Exact Member Evidence', configured: true, weeklyHours: 40,
        weeklyAvailableHours: 32, dailyAvailableHours: 6.4, allocationPercent: 80, focusHoursPerWeek: 6,
        timeOffHours: 4, historicalCardHours: 11, trackedTimeEntriesLast28Days: 2,
        trackedTimeProvidersLast28Days: ['harvest'], trackedTimeWeeklyHours: 8,
        scheduledAllocationEntriesNext28Days: 1, scheduledAllocationProvidersNext28Days: ['float'],
        scheduledAllocationWeeklyHours: 5, calendarEventsNext28Days: 2, calendarBusyWeeklyHours: 3,
        skills: ['Exact Skill Evidence'], externalIdentities: [{ provider: 'float', externalId: 'person-1' }],
        timeOff: [{ startDate: '2026-08-21', endDate: '2026-08-22', label: 'Exact Leave Evidence' }]
      }],
      boards: [{
        boardId: 'board-1', boardName: 'Exact Board Evidence', health: 'watch', openCards: 5, workHours: 30,
        confidence: 61, p50: { date: '2026-08-22T00:00:00.000Z' }, p80: { date: '2026-08-30T00:00:00.000Z' },
        risks: ['Exact Board Risk Evidence'], mappedProjectScheduleEntriesNext28Days: 1,
        mappedProjectScheduleWeeklyHours: 4, externalProjectMappings: [{ provider: 'float', projectId: 'project-1' }]
      }]
    },
    reports: [{ id: 'weekly_status', label: 'Exact Stakeholder Report Evidence', filename: 'exact-report' }]
  };
  const forecast = createForecastController({
    document: dom.window.document,
    state,
    elements,
    callbacks,
    t: i18n.t,
    plural: i18n.plural,
    escapeHtml,
    getLocale: i18n.getLocale,
    isFeatureEnabled: key => key === 'forecast_scenarios'
  });
  const report = createReportController({
    document: dom.window.document,
    state,
    elements,
    callbacks,
    t: i18n.t,
    escapeHtml
  });
  return { dom, i18n, state, elements, callbacks, forecast, report };
}

describe('demand-loaded forecast and report views', () => {
  test('renders Dutch forecast chrome while preserving operational evidence verbatim', () => {
    const harness = createHarness('nl');
    harness.forecast.render();
    const text = harness.dom.window.document.body.textContent;

    expect(text).toContain('P50-levering');
    expect(text).toContain('Wekelijkse capaciteit');
    expect(text).toContain('Tijdelijk scenario voor 1 medewerker');
    expect(text).toContain('Providerprojecten koppelen');
    expect(text).toContain('Capaciteit bewerken');
    expect(text).toContain('Exact Portfolio Evidence');
    expect(text).toContain('Exact risk evidence remains unchanged');
    expect(text).toContain('Exact assumption evidence remains unchanged');
    expect(text).toContain('Exact Member Evidence');
    expect(text).toContain('Exact Skill Evidence');
    expect(text).toContain('Exact Board Evidence');
    expect(text).toContain('Exact Board Risk Evidence');
    expect(text).toContain('Harvest');
    harness.dom.window.close();
  });

  test('delegates forecast actions without granting API authority to the renderer', () => {
    const harness = createHarness('en');
    harness.forecast.render();
    const { document } = harness.dom.window;

    document.querySelector('[data-forecast-scenario]').click();
    document.querySelector('[data-forecast-scenario-reset]').click();
    document.querySelector('[data-board-project-mappings="board-1"]').click();
    document.querySelector('[data-capacity-member="member-1"]').click();

    expect(harness.callbacks.openForecastScenario).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.resetForecastScenario).toHaveBeenCalledTimes(1);
    expect(harness.callbacks.openBoardProjectMappingsEditor).toHaveBeenCalledWith('board-1');
    expect(harness.callbacks.openCapacityEditor).toHaveBeenCalledWith('member-1');
    harness.dom.window.close();
  });

  test('renders localized scenario, mapping, and capacity forms with exact current values', () => {
    const harness = createHarness('nl');
    const scenario = harness.forecast.openForecastScenarioForm();
    expect(scenario.form.textContent).toContain('Dit is een tijdelijke wat-als-analyse.');
    expect(scenario.form.textContent).toContain('Medewerker');
    expect(scenario.form.textContent).toContain('Scenario uitvoeren');
    expect(scenario.form.elements.memberId.value).toBe('member-1');
    expect(scenario.form.elements.timeOff.value).toContain('Exact Leave Evidence');
    expect(harness.callbacks.enhanceForm).toHaveBeenCalledWith(scenario.form);

    const mappings = harness.forecast.openBoardProjectMappingsForm('board-1');
    expect(harness.elements.modalTitle.textContent).toBe('Projectkoppelingen: Exact Board Evidence');
    expect(mappings.form.elements.externalProjectMappings.value).toBe('float: project-1');

    const capacity = harness.forecast.openCapacityForm('member-1');
    expect(harness.elements.modalTitle.textContent).toBe('Capaciteit: Exact Member Evidence');
    expect(capacity.form.textContent).toContain('Capaciteitswijzigingen zijn alleen analyse-invoer.');
    expect(capacity.form.elements.externalIdentities.value).toBe('float: person-1');
    harness.dom.window.close();
  });

  test('renders localized reports, preserves report labels, and delegates downloads', () => {
    const harness = createHarness('nl');
    harness.report.render();
    const text = harness.elements.reportList.textContent;

    expect(harness.elements.reportMode.textContent).toBe('alleen-lezen');
    expect(text).toContain('Gebruikt de huidige context');
    expect(text).toContain('Exact Stakeholder Report Evidence');
    harness.elements.reportList.querySelector('[data-report-format="markdown"]').click();
    harness.elements.reportList.querySelector('[data-report-format="pdf"]').click();
    expect(harness.callbacks.downloadReport.mock.calls).toEqual([
      ['weekly_status', 'markdown'],
      ['weekly_status', 'pdf']
    ]);
    harness.dom.window.close();
  });

  test('keeps every dynamic operator message in its deferred Dutch catalog', () => {
    const runtime = createRuntime({ root: null, language: 'nl', storage: null });
    runtime.registerMessages('nl', FORECAST_NL_MESSAGES);
    runtime.registerMessages('nl', REPORT_NL_MESSAGES);
    const messages = new Set([...FORECAST_MESSAGES, ...REPORT_MESSAGES]);
    for (const source of [forecastSource, reportSource]) {
      for (const match of source.matchAll(/\b(?:t|et)\(\s*'([^']+)'/g)) messages.add(match[1]);
      for (const match of source.matchAll(/\b(?:plural|ep)\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
        messages.add(match[1]);
        messages.add(match[2]);
      }
    }
    expect([...messages].filter(message => !runtime.hasTranslation(message))).toEqual([]);
  });

  test('loads each view on demand with retry and shared-fingerprint boundaries', () => {
    expect(htmlSource).not.toContain('/forecastView.js');
    expect(htmlSource).not.toContain('/reportView.js');
    expect(appSource).toContain("loadBrowserModule('/forecastView.js', 'SneupForecastView'");
    expect(appSource).toContain("loadBrowserModule('/reportView.js', 'SneupReportView'");
    expect(appSource).toContain('forecastViewPromise = null');
    expect(appSource).toContain('forecastViewController = null');
    expect(appSource).toContain('reportViewPromise = null');
    expect(appSource).toContain('reportViewController = null');
    expect(appSource).toContain('const renderer = loadForecastView();');
    expect(appSource).toContain('const renderer = loadReportView();');
    expect(appSource).toContain("fetchApi('/api/forecasts')");
    expect(appSource).toContain("fetchApi('/api/reports')");
    expect(appSource).toContain('function openForecastScenario(');
    expect(appSource).toContain('function openBoardProjectMappingsEditor(');
    expect(appSource).toContain('function openCapacityEditor(');
    expect(appSource).toContain('function downloadReport(');
    expect(appSource).not.toContain('function renderForecastSummary(');
    expect(appSource).not.toContain('function renderBoardForecast(');
    expect(appSource).not.toContain('function renderCapacityMember(');
    expect(forecastSource).not.toContain('fetchApi(');
    expect(reportSource).not.toContain('fetchApi(');
    expect(forecastSource).not.toMatch(/SESSION_TOKEN|localStorage|sessionStorage|document\.cookie/);
    expect(reportSource).not.toMatch(/SESSION_TOKEN|localStorage|sessionStorage|document\.cookie/);
  });
});
