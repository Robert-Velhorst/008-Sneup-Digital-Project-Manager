jest.mock('../src/services/accountConnectorService', () => ({}));

const { configuredCodeHostApi } = require('../src/services/codeHostRequestBoundary');
const { GitHubWorkSignalClient } = require('../src/services/githubWorkSignalClient');
const { GitLabWorkSignalClient } = require('../src/services/gitlabWorkSignalClient');
const providers = [
  { name: 'GitHub', setting: 'SNEUP_GITHUB_API_URL', base: 'https://api.github.com', resource: '/user/repos', make: http => new GitHubWorkSignalClient({ http }) },
  { name: 'GitLab', setting: 'SNEUP_GITLAB_API_URL', base: 'https://gitlab.com/api/v4', resource: '/issues', make: http => new GitLabWorkSignalClient({ http }) }
];
const withSettings = async (settings, callback) => {
  const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(settings)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    return await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
};

describe('Operator-bound code-host APIs', () => {
  test.each([
    ['GitHub', 'https://api.github.com'], ['GitHub', 'https://github.example.test:8443/api/v3'],
    ['GitHub', 'https://github.example.test/service/api/v3'], ['GitLab', 'https://gitlab.com/api/v4'],
    ['GitLab', 'https://gitlab.example.test:8443/api/v4'], ['GitLab', 'https://gitlab.example.test/group/gitlab/api/v4']
  ])('%s retains the explicit operator endpoint %s', async (name, base) => {
    const spec = providers.find(item => item.name === name);
    await withSettings({ [spec.setting]: `${base}///`, SNEUP_GITHUB_API_VERSION: undefined }, async () => {
      const response = { data: [] };
      const http = { get: jest.fn().mockResolvedValue(response) };
      const client = spec.make(http);
      const config = client.getConfig();
      expect(config.apiUrl).toBe(base);
      await expect(client.request(spec.resource, 'token', config, { page: 2 })).resolves.toBe(response);
      expect(http.get).toHaveBeenCalledWith(`${base}${spec.resource}`, expect.objectContaining({
        params: { page: 2 }, maxRedirects: 0, proxy: false, headers: expect.objectContaining({ Authorization: 'Bearer token' })
      }));
      if (name === 'GitHub') expect(http.get.mock.calls[0][1].headers['X-GitHub-Api-Version']).toBe('2026-03-10');
    });
  });

  test.each(providers.flatMap(spec => ['https://', 'http://code.example.test/api', 'https://user:pass@code.example.test/api',
    'https://code.example.test/api?target=other', 'https://code.example.test/api#fragment', 'https://code.example.test\\evil/api',
    'https://code.example.test/\ninjected', 'https://code example.test/api', 'not-a-url'].map(base => [spec.name, base, spec])))('%s rejects malformed operator root %s', async (name, base, spec) => {
    await withSettings({ [spec.setting]: base, SNEUP_GITHUB_API_VERSION: undefined }, () => {
      expect(() => spec.make({}).getConfig()).toThrow('API endpoint or read resource is invalid');
    });
  });

  test.each(providers.flatMap(spec => ['https://127.0.0.1/api', 'https://other.example.test/api',
    `${spec.base}:8443`, `https://user:pass@${new URL(spec.base).host}/api`, `${spec.base}?target=other`,
    `${spec.base}#fragment`, `https://${new URL(spec.base).host}.evil.example/api`, spec.base.replace('https:', 'http:')]
    .map(base => [spec.name, base, spec])))('%s refuses an unconfigured request base %s', async (name, base, spec) => {
    await withSettings({ [spec.setting]: undefined, SNEUP_GITHUB_API_VERSION: undefined }, () => {
      const http = { get: jest.fn() };
      expect(() => spec.make(http).request(spec.resource, 'token', { apiUrl: base })).toThrow('API endpoint or read resource is invalid');
      expect(http.get).not.toHaveBeenCalled();
    });
  });

  test.each(providers)('$name rejects a stale config after the operator changes its base', async spec => {
    await withSettings({ [spec.setting]: undefined, SNEUP_GITHUB_API_VERSION: undefined }, () => {
      const http = { get: jest.fn() }; const client = spec.make(http); const config = client.getConfig();
      process.env[spec.setting] = 'https://changed.example.test/api';
      expect(() => client.request(spec.resource, 'token', config)).toThrow('API endpoint or read resource is invalid');
      expect(http.get).not.toHaveBeenCalled();
    });
  });

  test.each(providers.flatMap(spec => ['https://evil.example/', '//evil.example/', '/user/repos?target=evil',
    '/repos/a/../issues', '/repos/%2e%2e/a/issues', '/issues#fragment', '/merge_requests/../../users',
    '/repos/owner/repo/issues/1', '/issues\\other', ''].map(path => [spec.name, path, spec])))('%s rejects unexpected read path %s', async (name, path, spec) => {
    await withSettings({ [spec.setting]: undefined, SNEUP_GITHUB_API_VERSION: undefined }, () => {
      const http = { get: jest.fn() };
      expect(() => spec.make(http).request(path, 'token', { apiUrl: spec.base })).toThrow('API endpoint or read resource is invalid');
      expect(http.get).not.toHaveBeenCalled();
    });
  });

  test.each(['2026-03-10', '2022-11-28'])('GitHub preserves explicit supported version %s', async version => {
    await withSettings({ SNEUP_GITHUB_API_URL: undefined, SNEUP_GITHUB_API_VERSION: version }, async () => {
      const http = { get: jest.fn().mockResolvedValue({ data: [] }) }; const client = new GitHubWorkSignalClient({ http });
      await client.request('/user/repos', 'token', client.getConfig());
      expect(http.get.mock.calls[0][1].headers['X-GitHub-Api-Version']).toBe(version);
    });
  });

  test.each(['2027-01-01', '2026-03-10-preview', '', '2022-11-28\r\nInjected'])('GitHub rejects unsupported version %p', async version => {
    await withSettings({ SNEUP_GITHUB_API_URL: undefined, SNEUP_GITHUB_API_VERSION: version }, () => {
      expect(() => new GitHubWorkSignalClient({ http: {} }).getConfig()).toThrow('API endpoint or read resource is invalid');
    });
  });

  test.each(['constructor', '__proto__'])('rejects unknown provider %s', provider => {
    expect(() => configuredCodeHostApi(provider)).toThrow('API endpoint or read resource is invalid');
  });

  test('GitHub consumes current-version repository and issue fields without removed squash settings', async () => {
    await withSettings({ SNEUP_GITHUB_API_URL: undefined, SNEUP_GITHUB_API_VERSION: undefined }, async () => {
      const http = { get: jest.fn()
        .mockResolvedValueOnce({ data: [{ id: '123', full_name: 'owner/repo', archived: false, disabled: false }] })
        .mockResolvedValueOnce({ data: [{ id: '456', number: 1, title: 'Issue', state: 'open', updated_at: '2026-07-01T00:00:00.000Z' }] }) };
      const client = new GitHubWorkSignalClient({ http, accountConnectorService: { getAccountCredentials: () => ({ accessToken: 'token' }) } });
      const result = await client.fetchDelta({ connectorId: 'github' });
      expect(result.records[0]).toMatchObject({ id: '456', repository: { full_name: 'owner/repo' } });
      expect(http.get.mock.calls.map(args => args[0])).toEqual(['https://api.github.com/user/repos', 'https://api.github.com/repos/owner/repo/issues']);
      expect(http.get.mock.calls.every(args => args[1].headers['X-GitHub-Api-Version'] === '2026-03-10')).toBe(true);
    });
  });

  test('GitLab preserves self-managed prefixes and numeric pagination', async () => {
    const base = 'https://gitlab.example.test:8443/group/gitlab/api/v4';
    await withSettings({ SNEUP_GITLAB_API_URL: base }, async () => {
      const http = { get: jest.fn()
        .mockResolvedValueOnce({ data: [{ id: 1, title: 'Issue', updated_at: '2026-07-01T00:00:00.000Z' }], headers: { 'x-next-page': '2' } })
        .mockResolvedValueOnce({ data: [], headers: {} }).mockResolvedValueOnce({ data: [], headers: {} }) };
      const client = new GitLabWorkSignalClient({ http, accountConnectorService: { getAccountCredentials: () => ({ accessToken: 'token' }) } });
      const result = await client.fetchDelta({ connectorId: 'gitlab' });
      expect(result.records).toHaveLength(1);
      expect(http.get.mock.calls.map(args => args[0])).toEqual([`${base}/issues`, `${base}/issues`, `${base}/merge_requests`]);
      expect(http.get.mock.calls[1][1].params.page).toBe(2);
    });
  });
});
