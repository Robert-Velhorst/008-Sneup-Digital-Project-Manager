jest.mock('../src/services/accountConnectorService', () => ({}));

const { graphApiUrl } = require('../src/services/microsoftGraphRequestBoundary');
const { Microsoft365WorkSignalClient } = require('../src/services/microsoft365WorkSignalClient');
const { MicrosoftPlannerWorkSignalClient } = require('../src/services/microsoftPlannerWorkSignalClient');
const { MicrosoftProjectWorkSignalClient } = require('../src/services/microsoftProjectWorkSignalClient');
const { OutlookWorkSignalClient } = require('../src/services/outlookWorkSignalClient');

const clouds = ['graph.microsoft.com', 'graph.microsoft.us', 'dod-graph.microsoft.us', 'microsoftgraph.chinacloudapi.cn'];
const clients = [
  { name: 'Microsoft365', resource: '/me/todo/lists/AQ%2Fopaque%3D/tasks', absolute: false,
    make: http => new Microsoft365WorkSignalClient({ http }), invoke: (client, raw, config) => client.request(raw, 'token', config, { '$top': 5 }) },
  { name: 'Planner', resource: '/me/planner/tasks', absolute: true,
    make: http => new MicrosoftPlannerWorkSignalClient({ http }), invoke: (client, raw, config) => client.request(raw, 'token', config, { '$top': 5 }) },
  { name: 'Project', resource: '/planner/plans/plan-1/tasks', absolute: true,
    make: http => new MicrosoftProjectWorkSignalClient({ http }), invoke: (client, raw, config) => client.request(raw, 'token', config, { '$top': 5 }) },
  { name: 'Outlook', resource: '/me/mailFolders/inbox/messages', absolute: false,
    make: http => new OutlookWorkSignalClient({ http }), invoke: (client, raw, config) => client.request(raw, 'token', { '$top': 5 }, config) }
];
const unsafeRequests = [
  'https://127.0.0.1/v1.0/me/planner/tasks', 'https://graph.microsoft.com.evil.example/v1.0/me/planner/tasks',
  'https://user:pass@graph.microsoft.com/v1.0/me/planner/tasks', 'https://graph.microsoft.com:8443/v1.0/me/planner/tasks',
  'https://graph.microsoft.us/v1.0/me/planner/tasks', 'https://graph.microsoft.com/beta/me/planner/tasks',
  'https://graph.microsoft.com/v1.0/me/planner/tasks#fragment', '/v1.0/../../me/planner/tasks',
  '//evil.example/request', 'https://graph.microsoft.com/v1.0/users/someone/messages'
];

describe('Microsoft Graph authority and resource boundaries', () => {
  test.each(clouds)('canonicalizes the supported HTTPS v1.0 endpoint for %s', host => {
    expect(graphApiUrl(`https://${host}:443/v1.0/`)).toBe(`https://${host}/v1.0`);
  });

  test.each(['http://graph.microsoft.com/v1.0', 'https://127.0.0.1/v1.0',
    'https://graph.microsoft.com.evil.example/v1.0', 'https://graph.microsoft.com:8443/v1.0',
    'https://user:pass@graph.microsoft.com/v1.0', 'https://graph.microsoft.com/beta',
    'https://graph.microsoft.com/v1.0?target=elsewhere', 'https://graph.microsoft.com/v1.0#fragment',
    'https://graph.microsoft.com/v1.0/other', 'not-a-url', 'https://graph.microsoft.de/v1.0'])('rejects an unsupported API base: %s', raw => {
    expect(() => graphApiUrl(raw)).toThrow('approved Microsoft Graph v1.0 HTTPS endpoint');
  });

  test.each(clouds.flatMap(host => clients.map(spec => [spec.name, host, spec])))('%s preserves its supported read route in %s', async (name, host, spec) => {
    const response = { data: { value: [] } };
    const http = { get: jest.fn().mockResolvedValue(response) };
    const client = spec.make(http);
    const base = `https://${host}/v1.0`;
    const suffix = spec.absolute ? '?$skiptoken=next%2Fpage%3D' : '';
    const raw = spec.absolute ? `${base}${spec.resource}${suffix}` : spec.resource;
    const config = { apiUrl: `https://${host}:443/v1.0/`, timeout: 5000, maxResponseBytes: 1000000 };
    await expect(spec.invoke(client, raw, config)).resolves.toBe(response);
    expect(http.get).toHaveBeenCalledWith(`${base}${spec.resource}${suffix}`, expect.objectContaining({
      maxRedirects: 0, proxy: false, timeout: 5000, params: { '$top': 5 },
      headers: expect.objectContaining({ Authorization: 'Bearer token' })
    }));
    if (name === 'Project') expect(http.get.mock.calls[0][1]).toMatchObject({ maxContentLength: 1000000, maxBodyLength: 65536 });
  });

  test.each(clients.flatMap(spec => unsafeRequests.map(raw => [spec.name, raw, spec])))('%s rejects %s before sending a credential', (name, raw, spec) => {
    const http = { get: jest.fn() };
    expect(() => spec.invoke(spec.make(http), raw, { apiUrl: 'https://graph.microsoft.com/v1.0' })).toThrow('request location is invalid');
    expect(http.get).not.toHaveBeenCalled();
  });

  test.each(clouds.flatMap(host => ['Planner', 'Project'].map(name => [name, host])))('%s retains a valid absolute next page on %s', (name, host) => {
    const config = { apiUrl: `https://${host}/v1.0` };
    const resource = name === 'Project' ? '/me/planner/plans' : '/me/planner/tasks';
    const next = `${config.apiUrl}${resource}?$skiptoken=next%2Fpage%3D`;
    const client = name === 'Project' ? new MicrosoftProjectWorkSignalClient({ http: {} }) : new MicrosoftPlannerWorkSignalClient({ http: {} });
    expect(client.validateNextUrl(next, config, resource)).toBe(next);
    expect(() => client.validateNextUrl(`${next}#fragment`, config, resource)).toThrow(/untrusted pagination/i);
  });

  test.each(clouds)('Outlook retains the opaque next-page token in %s', host => {
    const client = new OutlookWorkSignalClient({ http: {} });
    const config = { apiUrl: `https://${host}/v1.0` };
    expect(client.nextToken(`${config.apiUrl}/me/mailFolders/inbox/messages?%24skiptoken=page_2`, config)).toBe('page_2');
  });

  test('Microsoft Project follows a valid plan next page before reading each plan task collection', async () => {
    const next = 'https://graph.microsoft.com/v1.0/me/planner/plans?$skiptoken=page_2';
    const http = { get: jest.fn()
      .mockResolvedValueOnce({ data: { value: [{ id: 'plan-1', title: 'One' }], '@odata.nextLink': next } })
      .mockResolvedValueOnce({ data: { value: [{ id: 'plan-2', title: 'Two' }] } })
      .mockResolvedValueOnce({ data: { value: [] } })
      .mockResolvedValueOnce({ data: { value: [] } }) };
    const client = new MicrosoftProjectWorkSignalClient({ http,
      accountConnectorService: { getAccountCredentials: () => ({ accessToken: 'token' }) } });
    await client.fetchDelta({ connectorId: 'microsoft_project' });
    expect(http.get.mock.calls.map(args => args[0])).toEqual([
      'https://graph.microsoft.com/v1.0/me/planner/plans', next,
      'https://graph.microsoft.com/v1.0/planner/plans/plan-1/tasks',
      'https://graph.microsoft.com/v1.0/planner/plans/plan-2/tasks'
    ]);
  });
});
