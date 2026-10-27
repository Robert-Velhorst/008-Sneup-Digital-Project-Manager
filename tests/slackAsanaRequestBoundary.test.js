jest.mock('../src/services/accountConnectorService', () => ({}));

const { SlackWorkSignalClient } = require('../src/services/slackWorkSignalClient');
const { AsanaWorkSignalClient } = require('../src/services/asanaWorkSignalClient');

const invalidBases = (host, path) => [
  `http://${host}${path}`, `https://127.0.0.1${path}`, `https://${host}.evil.example${path}`,
  `https://${host}:8443${path}`, `https://user:pass@${host}${path}`,
  `https://${host}${path}?target=elsewhere`, `https://${host}${path}#fragment`,
  `https://${host}/other`, 'not-a-url'
];
const slackOperations = [
  { method: 'post', endpoint: 'auth.test', invoke: (client, config) => client.getTeam('token', config) },
  { method: 'get', endpoint: 'conversations.list', invoke: (client, config) => client.listChannels('token', config) },
  { method: 'post', endpoint: 'conversations.history', invoke: (client, config) =>
    client.listChannelMessages({ id: 'C1', name: 'channel' }, { team_id: 'T1' }, 'token', null, config) }
];

describe('Slack credential destinations', () => {
  test.each(slackOperations.flatMap(operation => invalidBases('slack.com', '/api')
    .map(base => [operation.endpoint, base, operation])))('%s rejects %s before sending', async (endpoint, base, operation) => {
    const http = { get: jest.fn(), post: jest.fn() };
    const client = new SlackWorkSignalClient({ http });
    await expect(operation.invoke(client, { apiUrl: base })).rejects.toThrow('Slack API URL must');
    expect(http.get).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
  });

  test.each(slackOperations)('$endpoint stays on the canonical Slack API without redirects or proxies', async operation => {
    const response = { data: { ok: true, channels: [], messages: [], response_metadata: {} } };
    const http = { get: jest.fn().mockResolvedValue(response), post: jest.fn().mockResolvedValue(response) };
    const client = new SlackWorkSignalClient({ http });
    await operation.invoke(client, { apiUrl: 'https://slack.com:443/api/', timeout: 5000, maxChannels: 5, maxMessagesPerChannel: 5 });
    expect(http[operation.method]).toHaveBeenCalledTimes(1);
    const args = http[operation.method].mock.calls[0];
    expect(args[0]).toBe(`https://slack.com/api/${operation.endpoint}`);
    expect(args[args.length - 1]).toMatchObject({
      maxRedirects: 0, proxy: false, timeout: 5000, headers: { Authorization: 'Bearer token' }
    });
    expect(http[operation.method === 'get' ? 'post' : 'get']).not.toHaveBeenCalled();
  });
});

describe('Asana credential destinations', () => {
  test.each(invalidBases('app.asana.com', '/api/1.0'))('rejects %s before sending', base => {
    const http = { get: jest.fn() };
    const client = new AsanaWorkSignalClient({ http });
    expect(() => client.request('/workspaces', 'token', { apiUrl: base })).toThrow('Asana API URL must');
    expect(http.get).not.toHaveBeenCalled();
  });

  test.each(['/workspaces', '/workspaces/workspace-1/projects', '/projects/project-1/tasks'])('retains supported resource %s and query parameters', async path => {
    const response = { data: { data: [] } };
    const http = { get: jest.fn().mockResolvedValue(response) };
    const client = new AsanaWorkSignalClient({ http });
    await expect(client.request(path, 'token', { apiUrl: 'https://app.asana.com:443/api/1.0/', timeout: 5000 },
      { limit: 10, offset: 'page-2' })).resolves.toBe(response);
    expect(http.get).toHaveBeenCalledWith(`https://app.asana.com/api/1.0${path}`, expect.objectContaining({
      maxRedirects: 0, proxy: false, timeout: 5000, params: { limit: 10, offset: 'page-2' },
      headers: expect.objectContaining({ Authorization: 'Bearer token' })
    }));
  });

  test.each(['https://evil.example/', '//evil.example/', '/projects/../tasks', '/projects/%2f/tasks',
    '/projects/a/tasks?target=evil', '/projects/a/tasks#fragment', '/projects/a\\b/tasks'])('rejects unexpected resource %s', path => {
    const http = { get: jest.fn() };
    const client = new AsanaWorkSignalClient({ http });
    expect(() => client.request(path, 'token', { apiUrl: 'https://app.asana.com/api/1.0' })).toThrow('request path is invalid');
    expect(http.get).not.toHaveBeenCalled();
  });
});
