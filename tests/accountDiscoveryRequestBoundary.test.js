const { AccountConnectorService } = require('../src/services/accountConnectorService');

const specs = [
  { name: 'Asana', setting: 'SNEUP_ASANA_API_URL', base: 'https://app.asana.com/api/1.0', route: '/workspaces', method: 'fetchAsanaWorkspaces', status: 400 },
  { name: 'Basecamp', setting: 'SNEUP_BASECAMP_LAUNCHPAD_URL', base: 'https://launchpad.37signals.com', route: '/authorization.json', method: 'fetchBasecampAccounts', status: 500 }
];
const make = (http, credentials = { accessToken: 'test-discovery-token' }) => {
  const service = new AccountConnectorService({ http });
  service.getAccountCredentials = jest.fn(() => credentials);
  return service;
};
let previous;
beforeEach(() => {
  previous = specs.map(spec => process.env[spec.setting]);
  specs.forEach(spec => { delete process.env[spec.setting]; });
});
afterEach(() => specs.forEach((spec, index) => {
  if (previous[index] === undefined) delete process.env[spec.setting];
  else process.env[spec.setting] = previous[index];
}));

describe('Provider account discovery request boundaries', () => {
  test.each(specs.flatMap(spec => [spec.base, `${spec.base}/`, spec.base.replace('.com', '.com:443')]
    .map(base => [spec.name, base, spec])))('%s canonicalizes %s and disables redirects/proxy discovery', async (name, base, spec) => {
    process.env[spec.setting] = base;
    const http = { get: jest.fn().mockResolvedValue({ data: {} }) };
    await make(http)[spec.method]({});
    expect(http.get).toHaveBeenCalledWith(`${spec.base}${spec.route}`, expect.objectContaining({
      maxRedirects: 0, proxy: false, timeout: 15000, headers: expect.objectContaining({ Authorization: 'Bearer test-discovery-token' })
    }));
  });

  test.each(specs.flatMap(spec => ['http://evil.example', 'https://127.0.0.1', 'https://[::1]',
    `${spec.base}:8443`, `${spec.base}/unexpected`, `${spec.base}?next=other`, `${spec.base}#fragment`,
    `https://user:pass@${new URL(spec.base).host}${new URL(spec.base).pathname}`, 'https://evil.example', 'not-a-url']
    .map(base => [spec.name, base, spec])))('%s rejects unsupported discovery base %s before HTTP', async (name, base, spec) => {
    process.env[spec.setting] = base;
    const http = { get: jest.fn() };
    await expect(make(http)[spec.method]({})).rejects.toMatchObject({ statusCode: spec.status });
    expect(http.get).not.toHaveBeenCalled();
  });

  test.each(specs)('$name rejects a missing credential before discovery', async spec => {
    const http = { get: jest.fn() };
    await expect(make(http, {})[spec.method]({})).rejects.toMatchObject({ statusCode: 503 });
    expect(http.get).not.toHaveBeenCalled();
  });

  test('Asana retains the bounded query and compact workspace mapping', async () => {
    const http = { get: jest.fn().mockResolvedValue({ data: { data: [
      { gid: '1', name: 'Delivery', is_organization: true }, { id: '2' }, {},
      { gid: '3', name: 'Personal', is_organization: false }
    ] } }) };
    await expect(make(http).fetchAsanaWorkspaces({})).resolves.toEqual([
      { workspaceGid: '1', name: 'Delivery', organization: true },
      { workspaceGid: '2', name: '2', organization: false },
      { workspaceGid: '3', name: 'Personal', organization: false }
    ]);
    expect(http.get.mock.calls[0][1].params).toEqual({ limit: 100, opt_fields: 'gid,name,is_organization' });
  });

  test('Basecamp retains only authorized bc3 accounts with matching API identifiers', async () => {
    const http = { get: jest.fn().mockResolvedValue({ data: { accounts: [
      { product: 'bc3', id: 123, name: 'Delivery', href: 'https://3.basecampapi.com/123' },
      { product: 'bcx', id: 456, href: 'https://basecamp.com/456/api/v1' },
      { product: 'bc3', id: 789, href: 'https://evil.example/789' },
      { product: 'bc3', id: 321, href: 'https://3.basecampapi.com/other' },
      { product: 'bc3', id: 222, href: 'https://3.basecampapi.com/222?secret=other' }
    ] } }) };
    await expect(make(http).fetchBasecampAccounts({})).resolves.toEqual([
      { basecampAccountId: '123', name: 'Delivery', apiUrl: 'https://3.basecampapi.com/123' }
    ]);
    expect(http.get.mock.calls[0][1].headers['User-Agent']).toBe('Sneup Digital Project Manager');
  });
});
