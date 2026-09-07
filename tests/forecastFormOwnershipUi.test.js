const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { createController } = require('../public/forecastView');
const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let n = 0; n < 12; n++) await Promise.resolve(); };

function harness(realForecast = false) {
  const dom = new JSDOM('<div id="modal"><h2 id="title"></h2><div id="body"></div></div>');
  const document = dom.window.document;
  const state = { activeWorkspaceId: 'a', sessionToken: 's', forecast: {
    memberCapacity: [{ memberId: 'member', name: 'Alice', weeklyHours: 32 }],
    boards: [{ boardId: 'board', boardName: 'Project' }]
  } };
  const els = { modal: document.getElementById('modal'), modalTitle: document.getElementById('title'), modalBody: document.getElementById('body') };
  const requests = [];
  const fetchApi = jest.fn((url, options) => {
    const request = deferred(); requests.push({ url, options, ...request }); return request.promise;
  });
  const closeModal = jest.fn(() => els.modal.classList.remove('open'));
  const notice = jest.fn();
  const render = jest.fn();
  const saved = jest.fn();
  const loadForecast = jest.fn(async () => true);
  const renderer = deferred();
  const forecastViewController = createController({ document, state, elements: els,
    callbacks: { closeModal }, escapeHtml: String });
  const bindings = { state, els, document, forecastViewController, fetchApi, closeModal,
    openNotice: notice, renderForecast: render, formPersistence: { markSaved: saved },
    loadForecast, loadForecastView: () => renderer.promise, t: value => value };
  const code = section('function beginWorkspaceRead(', 'function adoptWorkspaceId(')
    + (realForecast ? section('async function loadForecast(', 'function renderForecast(') : '')
    + section('async function resetForecastScenario(', 'function cancelReportDownloads(');
  const api = new Function(...Object.keys(bindings), `${code}; return { openForecastScenario, openCapacityEditor, openBoardProjectMappingsEditor, resetForecastScenario, beginWorkspaceRead };`)(...Object.values(bindings));
  const submit = async () => {
    const form = els.modalBody.querySelector('form');
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await flush();
  };
  return { dom, state, els, requests, fetchApi, closeModal, notice, render, saved, loadForecast, renderer, submit, ...api };
}

describe.each([
  ['scenario', 'openForecastScenario', undefined],
  ['capacity', 'openCapacityEditor', 'member'],
  ['project mappings', 'openBoardProjectMappingsEditor', 'board']
])('%s form ownership', (name, open, id) => {
  let h;
  beforeEach(() => { h = harness(); h[open](id); });
  afterEach(() => h.dom.window.close());

  test.each(['workspace', 'session', 'epoch'])('cannot submit values opened in another %s', async change => {
    if (change === 'workspace') h.state.activeWorkspaceId = 'b';
    if (change === 'session') h.state.sessionToken = 'other';
    if (change === 'epoch') h.state.workspaceEpoch = 1;
    await h.submit();
    expect(h.fetchApi).not.toHaveBeenCalled();
  });

  test.each(['success', 'failure'])('ignores late %s after switching workspace', async outcome => {
    const before = h.state.forecast;
    await h.submit();
    h.state.activeWorkspaceId = 'b';
    if (outcome === 'success') h.requests[0].resolve({ forecast: { marker: 'old' } });
    else h.requests[0].reject(new Error('Old request failed'));
    await flush();
    expect(h.state.forecast).toBe(before);
    expect(h.saved).not.toHaveBeenCalled();
    expect(h.closeModal).not.toHaveBeenCalled();
    expect(h.loadForecast).not.toHaveBeenCalled();
    expect(h.notice).not.toHaveBeenCalled();
  });

  test('duplicate submission starts only one request', async () => {
    await h.submit();
    await h.submit();
    expect(h.requests).toHaveLength(1);
    h.requests.forEach(request => request.resolve({ forecast: {} }));
    await flush();
  });

  test('dismissed form cannot replace a later modal on completion', async () => {
    await h.submit();
    h.els.modalBody.innerHTML = '<div>New modal</div>';
    h.requests[0].resolve({ forecast: { marker: 'old' } });
    await flush();
    expect(h.closeModal).not.toHaveBeenCalled();
    expect(h.notice).not.toHaveBeenCalled();
  });

  test('current success still saves and reports completion', async () => {
    await h.submit();
    h.requests[0].resolve({ forecast: { marker: 'current' } });
    await flush();
    expect(h.saved).toHaveBeenCalledTimes(1);
    expect(h.closeModal).toHaveBeenCalledTimes(1);
    expect(h.notice).toHaveBeenCalledTimes(1);
    if (name === 'scenario') expect(h.state.forecast.marker).toBe('current');
    else expect(h.loadForecast).toHaveBeenCalledTimes(1);
  });

  if (name !== 'scenario') {
    test.each(['read failure', 'module failure'])('acknowledged save is not reported as failed after a forecast %s', async failure => {
      if (failure === 'read failure') h.loadForecast.mockResolvedValue(undefined);
      else h.loadForecast.mockRejectedValue(new Error('Module failed'));
      await h.submit();
      h.requests[0].resolve({});
      await flush();
      expect(h.saved).toHaveBeenCalledTimes(1);
      expect(h.notice).toHaveBeenCalledWith(expect.stringContaining('saved'), expect.stringContaining('saved, but the forecast could not be refreshed'));
    });

    test('switching during the post-save refresh suppresses old completion notices', async () => {
      const refresh = deferred();
      h.loadForecast.mockReturnValue(refresh.promise);
      await h.submit();
      h.requests[0].resolve({});
      await flush();
      expect(h.saved).toHaveBeenCalledTimes(1);
      h.state.activeWorkspaceId = 'b';
      refresh.resolve(true);
      await flush();
      expect(h.notice).not.toHaveBeenCalled();
      expect(h.closeModal).not.toHaveBeenCalled();
    });
  }
});

test('a newer forecast read supersedes a pending scenario and releases its form button', async () => {
  const h = harness();
  h.openForecastScenario();
  await h.submit();
  h.beginWorkspaceRead('forecast');
  h.state.forecast = { marker: 'newer' };
  h.requests[0].resolve({ forecast: { marker: 'old scenario' } });
  await flush();
  expect(h.state.forecast.marker).toBe('newer');
  expect(h.notice).not.toHaveBeenCalled();
  expect(h.els.modalBody.querySelector('button[type="submit"]').disabled).toBe(false);
  h.dom.window.close();
});

test('reset does not claim success after a failed forecast refresh', async () => {
  const h = harness();
  h.loadForecast.mockResolvedValue(undefined);
  await h.resetForecastScenario();
  expect(h.notice).not.toHaveBeenCalled();
  h.dom.window.close();
});

test.each(['capacity', 'mappings'])('actual %s post-save reader drops delayed data and module results after switching', async kind => {
  const h = harness(true);
  if (kind === 'capacity') h.openCapacityEditor('member');
  else h.openBoardProjectMappingsEditor('board');
  const before = h.state.forecast;
  await h.submit();
  h.requests[0].resolve({});
  await flush();
  expect(h.requests[1].url).toBe('/api/forecasts');
  expect(h.saved).toHaveBeenCalledTimes(1);
  h.state.activeWorkspaceId = 'b';
  h.requests[1].resolve({ forecast: { marker: 'old data' } });
  h.renderer.resolve({ render: h.render });
  await flush();
  expect(h.state.forecast).toBe(before);
  expect(h.render).not.toHaveBeenCalled();
  expect(h.closeModal).not.toHaveBeenCalled();
  expect(h.notice).not.toHaveBeenCalled();
  h.dom.window.close();
});
