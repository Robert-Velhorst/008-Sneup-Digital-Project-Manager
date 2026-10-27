jest.mock('../src/services/accountConnectorService', () => ({}));

const { providerApiUrl } = require('../src/services/fixedProviderApiBoundary');
const { LinearWorkSignalClient } = require('../src/services/linearWorkSignalClient');
const { NotionWorkSignalClient } = require('../src/services/notionWorkSignalClient');
const { MondayWorkSignalClient } = require('../src/services/mondayWorkSignalClient');
const { ClickUpWorkSignalClient } = require('../src/services/clickupWorkSignalClient');
const { AirtableWorkSignalClient } = require('../src/services/airtableWorkSignalClient');
const { SmartsheetWorkSignalClient } = require('../src/services/smartsheetWorkSignalClient');
const credentials = { getAccountCredentials: () => ({ accessToken: 'token' }) };
const clients = [
  { name: 'Linear', base: 'https://api.linear.app/graphql', method: 'post', key: 'graphqlUrl',
    make: http => new LinearWorkSignalClient({ http, accountConnectorService: credentials }),
    invoke: (client, config) => client.requestIssues('token', config, 5, 'opaque+cursor=/token') },
  { name: 'Notion', base: 'https://api.notion.com/v1', method: 'post', key: 'apiUrl', suffix: '/search',
    make: http => new NotionWorkSignalClient({ http, accountConnectorService: credentials }),
    invoke: (client, config) => client.request('opaque+cursor=/token', 5, 'token', config) },
  { name: 'Monday', base: 'https://api.monday.com/v2', method: 'post', key: 'apiUrl',
    make: http => new MondayWorkSignalClient({ http, accountConnectorService: credentials }),
    invoke: (client, config) => client.request('query { boards { id } }', { limit: 5 }, 'token', config) },
  { name: 'ClickUp', base: 'https://api.clickup.com/api/v2', method: 'get', key: 'apiUrl', suffix: '/team/team-1/task',
    make: http => new ClickUpWorkSignalClient({ http, accountConnectorService: credentials }),
    invoke: (client, config) => client.request('/team/team-1/task', 'token', config, { page: 2 }) },
  { name: 'Airtable', base: 'https://api.airtable.com/v0', method: 'get', key: 'apiUrl', suffix: '/app123/Tasks%2FPlan',
    make: http => new AirtableWorkSignalClient({ http, accountConnectorService: credentials }),
    invoke: (client, config) => { jest.spyOn(client, 'getConfig').mockReturnValue(config); return client.fetchDelta({}); } },
  { name: 'Smartsheet', base: 'https://api.smartsheet.com/2.0', method: 'get', key: 'apiUrl', suffix: '/sheets/sheet-1/columns',
    make: http => new SmartsheetWorkSignalClient({ http, accountConnectorService: credentials }),
    invoke: (client, config) => client.request(config, '/sheets/sheet-1/columns', 'token', { page: 2 }) }
];
const supported = clients.flatMap(spec => (spec.name === 'Smartsheet'
  ? ['https://api.smartsheet.com/2.0', 'https://api.smartsheet.eu/2.0', 'https://api.smartsheet.au/2.0'] : [spec.base])
  .map(base => [spec.name, base, spec]));
const unsafeBases = base => {
  const parsed = new URL(base);
  return [base.replace('https:', 'http:'), `https://127.0.0.1${parsed.pathname}`,
    `https://${parsed.hostname}.evil.example${parsed.pathname}`, `https://${parsed.hostname}:8443${parsed.pathname}`,
    `https://user:pass@${parsed.hostname}${parsed.pathname}`, `${base}/other`, `${base}?target=elsewhere`, `${base}#fragment`, 'not-a-url'];
};
const configuration = (spec, base) => ({ [spec.key]: base, timeout: 5000, maxResponseBytes: 1000000,
  baseId: 'app123', tableName: 'Tasks/Plan', allowedFields: ['Name'], maxRecords: 10, pageSize: 5,
  version: '2026-03-11', apiVersion: '2026-07' });

describe('Fixed provider API authorities', () => {
  test.each(supported)('%s retains the canonical endpoint %s', (name, base) => {
    const parsed = new URL(base);
    expect(providerApiUrl(`https://${parsed.hostname}:443${parsed.pathname}/`, name)).toBe(base);
  });

  test.each(clients.flatMap(spec => unsafeBases(spec.base).map(base => [spec.name, base, spec])))('%s rejects %s before sending a credential', async (name, base, spec) => {
    const http = { get: jest.fn(), post: jest.fn() };
    await expect(Promise.resolve().then(() => spec.invoke(spec.make(http), configuration(spec, base))))
      .rejects.toThrow('supported HTTPS endpoint');
    expect(http.get).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
  });

  test.each(supported)('%s preserves its original request body/options on %s', async (name, base, spec) => {
    const response = { data: { data: { issues: { nodes: [], pageInfo: { hasNextPage: false } } }, records: [], results: [] } };
    const http = { get: jest.fn().mockResolvedValue(response), post: jest.fn().mockResolvedValue(response) };
    await spec.invoke(spec.make(http), configuration(spec, `${base}/`));
    expect(http[spec.method]).toHaveBeenCalledTimes(1);
    const args = http[spec.method].mock.calls[0];
    expect(args[0]).toBe(`${base}${spec.suffix || ''}`);
    expect(args[args.length - 1]).toMatchObject({ maxRedirects: 0, proxy: false, timeout: 5000,
      headers: { Authorization: name === 'Monday' ? 'token' : 'Bearer token' } });
    if (name === 'Linear') expect(args[1].variables).toEqual({ first: 5, after: 'opaque+cursor=/token' });
    if (name === 'Notion') {
      expect(args[1]).toMatchObject({ page_size: 5, start_cursor: 'opaque+cursor=/token' });
      expect(args[2].headers['Notion-Version']).toBe('2026-03-11');
    }
    if (name === 'Monday') {
      expect(args[1]).toEqual({ query: 'query { boards { id } }', variables: { limit: 5 } });
      expect(args[2].headers['API-Version']).toBe('2026-07');
    }
    if (name === 'ClickUp' || name === 'Smartsheet') expect(args[1].params).toEqual({ page: 2 });
    if (name === 'Airtable') expect(args[1]).toMatchObject({ maxContentLength: 1000000, maxBodyLength: 1000000,
      params: { 'fields[]': ['Name'], pageSize: 5 } });
  });

  test.each(['https://evil.example/', '//evil.example/', '/team/../task', '/team/a/task?target=evil',
    '/sheets/a#fragment', '/sheets/a\\columns'].flatMap(path => ['ClickUp', 'Smartsheet'].map(name => [name, path])))('%s rejects an unexpected resource %s', (name, path) => {
    const http = { get: jest.fn() };
    if (name === 'ClickUp') expect(() => new ClickUpWorkSignalClient({ http }).request(path, 'token', { apiUrl: 'https://api.clickup.com/api/v2' })).toThrow('request path is invalid');
    else expect(() => new SmartsheetWorkSignalClient({ http }).request({ apiUrl: 'https://api.smartsheet.com/2.0' }, path, 'token')).toThrow('request path is invalid');
    expect(http.get).not.toHaveBeenCalled();
  });

  test.each(['constructor', '__proto__'])('rejects unknown policy %s', provider => {
    expect(() => providerApiUrl('https://api.notion.com/v1', provider)).toThrow('supported HTTPS endpoint');
  });
});
