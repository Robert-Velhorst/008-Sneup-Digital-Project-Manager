const { JiraWorkSignalClient } = require('../src/services/jiraWorkSignalClient');
const { AccountConnectorService } = require('../src/services/accountConnectorService');
const { jiraApiUrl } = require('../src/services/jiraRequestBoundary');

const base = 'https://api.atlassian.com';
const resource = { id: 'cloud-1', name: 'Delivery', url: 'https://delivery.atlassian.net', scopes: ['read:jira-work'] };
const make = http => new JiraWorkSignalClient({ http, accountConnectorService: {
  getAccountCredentials: jest.fn(() => ({ accessToken: 'test-jira-token' }))
} });
const accountService = http => {
  const service = new AccountConnectorService({ http });
  service.getAccountCredentials = jest.fn(() => ({ accessToken: 'test-jira-token' }));
  return service;
};
const surfaces = [
  ['work discovery', async (http, apiUrl) => make(http).listAccessibleResources('test-jira-token', { apiUrl })],
  ['issue search', async (http, apiUrl) => make(http).fetchIssues(resource, 'test-jira-token', null,
    { apiUrl, maxIssues: 100, pageSize: 50, cursorLookbackMs: 60000 })],
  ['account discovery', async (http, apiUrl) => {
    process.env.SNEUP_JIRA_API_URL = apiUrl;
    return accountService(http).fetchJiraSites({ connectorId: 'jira_software' });
  }]
];
let previous;
beforeEach(() => {
  previous = process.env.SNEUP_JIRA_API_URL;
  delete process.env.SNEUP_JIRA_API_URL;
});
afterEach(() => {
  if (previous === undefined) delete process.env.SNEUP_JIRA_API_URL;
  else process.env.SNEUP_JIRA_API_URL = previous;
});

describe('Jira OAuth request authority', () => {
  test.each(surfaces.flatMap(([name, request]) => [base, `${base}/`, 'https://API.ATLASSIAN.COM:443/', ` ${base} `]
    .map(apiUrl => [name, apiUrl, request])))('%s canonicalizes %s and disables redirects/proxy discovery', async (name, apiUrl, request) => {
    const http = { get: jest.fn().mockResolvedValue({ data: [resource] }), post: jest.fn().mockResolvedValue({ data: { issues: [] } }) };
    await request(http, apiUrl);
    const calls = [...http.get.mock.calls, ...http.post.mock.calls];
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe(name === 'issue search' ? `${base}/ex/jira/cloud-1/rest/api/3/search/jql` : `${base}/oauth/token/accessible-resources`);
    expect(calls[0].at(-1)).toMatchObject({ maxRedirects: 0, proxy: false,
      headers: { Authorization: 'Bearer test-jira-token' } });
  });

  test.each(surfaces.flatMap(([name, request]) => ['http://api.atlassian.com', 'https://api.atlassian.com:8443',
    'https://api.atlassian.com.evil.example', 'https://127.0.0.1', 'https://[::1]',
    'https://user:pass@api.atlassian.com', `${base}/ex/jira`, `${base}?next=other`, `${base}#fragment`,
    'https://api.atlassian.com\\evil', 'https://api.atlassian.com/\ninjected', 'not-a-url']
    .map(apiUrl => [name, apiUrl, request])))('%s rejects unauthorized base %s before HTTP', async (name, apiUrl, request) => {
    const http = { get: jest.fn(), post: jest.fn() };
    await expect(request(http, apiUrl)).rejects.toMatchObject({ statusCode: 400 });
    expect(http.get).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
  });

  test.each(['', '.', '..', 'cloud\nother', 'cloud other', 'cloud\\other'])('rejects invalid cloud resource %s before issue HTTP', async id => {
    const http = { post: jest.fn() };
    await expect(make(http).fetchIssues({ ...resource, id }, 'test-jira-token', null,
      { apiUrl: base, maxIssues: 100, pageSize: 50 })).rejects.toMatchObject({ statusCode: 400 });
    expect(http.post).not.toHaveBeenCalled();
  });

  test.each(['cloud/other', 'cloud?other#fragment', 'cloud%2Fother'])('keeps opaque cloud identifier %s inside one encoded path segment', async id => {
    const http = { post: jest.fn().mockResolvedValue({ data: { issues: [] } }) };
    await make(http).fetchIssues({ ...resource, id }, 'test-jira-token', null, { apiUrl: base, maxIssues: 100, pageSize: 50 });
    expect(http.post.mock.calls[0][0]).toBe(`${base}/ex/jira/${encodeURIComponent(id)}/rest/api/3/search/jql`);
  });

  test('preserves site selection, issue fields, opaque pagination token and cursor filtering', async () => {
    const http = {
      get: jest.fn().mockResolvedValue({ data: [resource, { ...resource, id: 'cloud-2' }] }),
      post: jest.fn()
        .mockResolvedValueOnce({ data: { issues: [{ id: '1', key: 'DEL-1', fields: { updated: '2026-07-09T12:00:00.000Z' } }], nextPageToken: 'opaque+/=?#' } })
        .mockResolvedValueOnce({ data: { issues: [{ id: '2', key: 'DEL-2', fields: { updated: '2026-07-09T12:01:00.000Z' } }] } })
    };
    const result = await make(http).fetchDelta({ metadata: { fields: { cloudId: 'cloud-1' } } }, '2026-07-09T11:30:00.000Z');
    expect(result).toMatchObject({ nextCursor: '2026-07-09T12:01:00.000Z', metadata: { sites: 1, cloudId: 'cloud-1' }, hasMore: false });
    expect(result.records).toHaveLength(2);
    expect(http.post.mock.calls[1][1]).toMatchObject({ nextPageToken: 'opaque+/=?#', maxResults: 100,
      fields: ['summary', 'status', 'priority', 'assignee', 'reporter', 'labels', 'duedate', 'created', 'updated', 'issuetype', 'project', 'parent', 'issuelinks'] });
    expect(http.post.mock.calls.every(call => call[0] === `${base}/ex/jira/cloud-1/rest/api/3/search/jql`)).toBe(true);
  });

  test('retains account discovery scope filtering and public display metadata', async () => {
    const http = { get: jest.fn().mockResolvedValue({ data: [resource, { id: 'confluence', scopes: ['read:confluence-content.all'] }] }) };
    await expect(accountService(http).fetchJiraSites({})).resolves.toEqual([
      { cloudId: 'cloud-1', name: 'Delivery', url: 'https://delivery.atlassian.net' }
    ]);
  });

  test('retains the issue cap failure when another page exists', async () => {
    const http = { post: jest.fn().mockResolvedValue({ data: { issues: [{ id: '1' }], nextPageToken: 'next' } }) };
    await expect(make(http).fetchIssues(resource, 'test-jira-token', null, { apiUrl: base, maxIssues: 1, pageSize: 1 }))
      .rejects.toMatchObject({ statusCode: 413 });
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  test('configuration rejects a direct tenant URL before credential discovery', () => {
    process.env.SNEUP_JIRA_API_URL = 'https://delivery.atlassian.net';
    expect(() => make({}).getConfig()).toThrow('Jira OAuth API endpoint');
    expect(() => jiraApiUrl(null)).toThrow('Jira OAuth API endpoint');
  });
});
