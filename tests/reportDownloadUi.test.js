const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const downloadSource = source.slice(source.indexOf('function downloadReport('), source.indexOf('async function loadEnhancements('));
const apiSource = source.slice(source.indexOf('function apiOptions('), source.indexOf('async function loadSecurityContext('));
const deferred = () => {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
};
const harness = () => {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://127.0.0.1/' });
  const clicks = [];
  dom.window.HTMLAnchorElement.prototype.click = function() { clicks.push({ href: this.href, download: this.download }); };
  const state = { activeWorkspaceId: 'workspace-a', sessionToken: 'synthetic-session', reports: [{ id: 'weekly_status', filename: 'weekly-status' }] };
  const fetch = jest.fn().mockResolvedValue(new Response('# Synthetic report', { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } }));
  const URL = { createObjectURL: jest.fn(() => 'blob:synthetic-report'), revokeObjectURL: jest.fn() };
  const notice = jest.fn();
  const render = jest.fn();
  const download = new Function('state', 'document', 'URL', 'fetch', 'openNotice', 't', 'reportViewController', `${apiSource}\n${downloadSource}\nreturn downloadReport;`)(state, dom.window.document, URL, fetch, notice, text => text, { render });
  return { dom, state, fetch, URL, notice, render, clicks, download };
};

describe('authenticated report downloads', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); });

  test.each([['markdown', 'text/markdown', 'md'], ['pdf', 'application/pdf', 'pdf']])('downloads %s using the session and selected workspace', async (format, contentType, extension) => {
    const h = harness();
    h.fetch.mockResolvedValue(new Response(format === 'pdf' ? '%PDF-1.7\nSynthetic' : '# Synthetic', { headers: { 'Content-Type': contentType } }));
    await h.download('weekly_status', format);
    expect(h.fetch).toHaveBeenCalledWith(`/api/v1/reports/weekly_status?format=${format}`, expect.objectContaining({
      headers: { Authorization: 'Bearer synthetic-session', 'X-Sneup-Workspace-Id': 'workspace-a' }, signal: expect.any(AbortSignal)
    }));
    expect(h.clicks).toEqual([{ href: 'blob:synthetic-report', download: `weekly-status.${extension}` }]);
    expect(h.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(h.dom.window.document.querySelector('a')).toBeNull();
    jest.runOnlyPendingTimers();
    expect(h.URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-report');
    h.dom.window.close();
  });

  test('deduplicates repeated clicks and permits a retry after a failed request', async () => {
    const h = harness();
    const pending = deferred();
    h.fetch.mockReturnValueOnce(pending.promise);
    const first = h.download('weekly_status', 'pdf');
    const second = h.download('weekly_status', 'pdf');
    expect(h.fetch).toHaveBeenCalledTimes(1);
    pending.resolve(new Response(JSON.stringify({ ok: false, error: { message: 'Session expired' }, meta: { apiVersion: 'v1' } }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    await Promise.all([first, second]);
    expect(h.URL.createObjectURL).not.toHaveBeenCalled();
    expect(h.notice).toHaveBeenCalledWith('Report download failed', 'Session expired');
    h.fetch.mockResolvedValueOnce(new Response('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf' } }));
    await h.download('weekly_status', 'pdf');
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(h.clicks).toHaveLength(1);
    h.dom.window.close();
  });

  test.each(['activeWorkspaceId', 'sessionToken'])('does not save a report after %s changes', async key => {
    const h = harness();
    const pending = deferred();
    h.fetch.mockReturnValue(pending.promise);
    const download = h.download('weekly_status', 'markdown');
    h.state[key] = 'changed';
    pending.resolve(new Response('# Old workspace', { headers: { 'Content-Type': 'text/markdown' } }));
    await download;
    expect(h.URL.createObjectURL).not.toHaveBeenCalled();
    expect(h.clicks).toHaveLength(0);
    h.dom.window.close();
  });

  test('rejects successful proxy HTML and oversized bodies without saving an error as a report', async () => {
    const h = harness();
    for (const response of [
      new Response('<html>Sign in</html>', { headers: { 'Content-Type': 'text/html' } }),
      new Response(new Uint8Array(5 * 1024 * 1024 + 1), { headers: { 'Content-Type': 'application/pdf' } })
    ]) {
      h.fetch.mockResolvedValueOnce(response);
      await h.download('weekly_status', 'pdf');
    }
    expect(h.notice).toHaveBeenCalledTimes(2);
    expect(h.URL.createObjectURL).not.toHaveBeenCalled();
    h.dom.window.close();
  });

  test('ignores unknown report types and formats', async () => {
    const h = harness();
    await h.download('other', 'pdf');
    await h.download('weekly_status', 'html');
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.clicks).toHaveLength(0);
    h.dom.window.close();
  });

  test('supports the initial default workspace without an explicit session', async () => {
    const h = harness();
    delete h.state.activeWorkspaceId;
    delete h.state.sessionToken;
    await h.download('weekly_status', 'markdown');
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.clicks).toHaveLength(1);
    h.dom.window.close();
  });

  test('times out a stalled request and restores retryability', async () => {
    const h = harness();
    h.fetch.mockImplementationOnce((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const download = h.download('weekly_status', 'markdown');
    await jest.advanceTimersByTimeAsync(30000);
    await download;
    expect(h.notice).toHaveBeenCalledWith('Report download failed', 'Report generation timed out. Try again.');
    expect(h.state.reportDownloads.size).toBe(0);
    expect(h.clicks).toHaveLength(0);
    h.dom.window.close();
  });

  test('bounds error bodies and displayed messages instead of buffering proxy output', async () => {
    const h = harness();
    h.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'x'.repeat(6 * 1024 * 1024) }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    await h.download('weekly_status', 'pdf');
    expect(h.notice.mock.calls[0][1].length).toBeLessThanOrEqual(500);
    h.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'x'.repeat(1000) }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    await h.download('weekly_status', 'pdf');
    expect(h.notice.mock.calls[1][1].length).toBeLessThanOrEqual(500);
    expect(h.URL.createObjectURL).not.toHaveBeenCalled();
    h.dom.window.close();
  });

  test('stops consuming an oversized proxy error stream', async () => {
    const h = harness();
    let pulls = 0;
    const cancel = jest.fn();
    const body = new ReadableStream({
      pull(controller) { pulls++; controller.enqueue(new Uint8Array(16384)); },
      cancel
    });
    h.fetch.mockResolvedValueOnce(new Response(body, { status: 502, headers: { 'Content-Type': 'text/html' } }));
    await h.download('weekly_status', 'markdown');
    expect(pulls).toBeLessThanOrEqual(4);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(h.notice).toHaveBeenCalledWith('Report download failed', 'Report download failed');
    expect(h.clicks).toHaveLength(0);
    h.dom.window.close();
  });
});
