jest.mock('../src/services/accountConnectorService', () => ({}));

const { LinearWorkSignalClient } = require('../src/services/linearWorkSignalClient');
const response = { data: { data: { issues: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } } };
const makeClient = credentials => {
  const http = { post: jest.fn().mockResolvedValue(response) };
  const service = { getAccountCredentials: jest.fn(() => credentials) };
  return { client: new LinearWorkSignalClient({ http, accountConnectorService: service }), http, service };
};

describe('Linear documented authentication modes', () => {
  test.each([
    ['oauth2', { accessToken: 'oauth-value' }, 'Bearer oauth-value'],
    ['oauth2', { token: 'legacy-oauth' }, 'Bearer legacy-oauth'],
    ['api_key', { apiKey: 'personal-key' }, 'personal-key'],
    ['personal_access_token', { token: 'personal-token' }, 'personal-token'],
    [undefined, { accessToken: 'oauth-value', apiKey: 'unused-key' }, 'Bearer oauth-value'],
    [undefined, { token: 'legacy-oauth' }, 'Bearer legacy-oauth'],
    [undefined, { apiKey: 'personal-key' }, 'personal-key'],
    ['api_key', { apiKey: 'personal-key', accessToken: 'unused-oauth' }, 'personal-key'],
    ['personal_access_token', { apiKey: 'personal-key' }, 'personal-key']
  ])('uses the correct header for mode %s and credential fields %p', async (authType, credentials, expected) => {
    const { client, http, service } = makeClient(credentials);
    const account = { connectorId: 'linear', ...(authType === undefined ? {} : { authType }) };
    await client.fetchDelta(account);
    expect(service.getAccountCredentials).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith('https://api.linear.app/graphql', expect.objectContaining({
      variables: expect.objectContaining({ after: null })
    }), expect.objectContaining({ maxRedirects: 0, proxy: false, headers: expect.objectContaining({ Authorization: expected }) }));
  });

  test.each([
    ['oauth2', { apiKey: 'wrong-field' }], ['api_key', { accessToken: 'wrong-field' }],
    ['personal_access_token', { accessToken: 'wrong-field' }], ['basic', { apiKey: 'wrong-mode' }],
    [undefined, {}], ['webhook', { token: 'wrong-mode' }]
  ])('rejects missing or mismatched credentials for mode %s', async (authType, credentials) => {
    const { client, http } = makeClient(credentials);
    await expect(client.fetchDelta({ authType })).rejects.toMatchObject({ statusCode: 503 });
    expect(http.post).not.toHaveBeenCalled();
  });

  test.each(['', null, false, 123, [], {}, 'token\r\nInjected: yes', 'has space', '\tvalue', '\u0085', '\u00e9'])('rejects malformed credential %p before HTTP', async token => {
    const { client, http } = makeClient({ accessToken: token });
    await expect(client.fetchDelta({ authType: 'oauth2' })).rejects.toMatchObject({ statusCode: 503 });
    expect(http.post).not.toHaveBeenCalled();
  });

  test.each(['Bearer', '', null, 'unknown'])('rejects unsupported request mode %p', async mode => {
    const { client, http } = makeClient({});
    await expect(client.requestIssues('token', { graphqlUrl: 'https://api.linear.app/graphql' }, 5, null, mode))
      .rejects.toMatchObject({ statusCode: 503 });
    expect(http.post).not.toHaveBeenCalled();
  });

  test.each(['oauth2', 'api_key', 'personal_access_token'])('preserves direct request mode %s and opaque cursor', async mode => {
    const { client, http } = makeClient({});
    await client.requestIssues('token', { graphqlUrl: 'https://api.linear.app/graphql', timeout: 5000 }, 5, 'opaque+cursor=/value', mode);
    expect(http.post.mock.calls[0][1].variables).toEqual({ first: 5, after: 'opaque+cursor=/value' });
    expect(http.post.mock.calls[0][2].headers.Authorization).toBe(mode === 'oauth2' ? 'Bearer token' : 'token');
  });

  test.each(['oauth2', 'personal_access_token'])('retains one credential observation and correct headers across pages for %s', async authType => {
    const credentials = authType === 'oauth2' ? { accessToken: 'oauth-value' } : { apiKey: 'personal-key' };
    const { client, http, service } = makeClient(credentials);
    http.post.mockReset()
      .mockResolvedValueOnce({ data: { data: { issues: { nodes: [{ id: 'issue-1', updatedAt: '2026-07-01T10:00:00.000Z' }],
        pageInfo: { hasNextPage: true, endCursor: 'opaque+cursor=/value' } } } } })
      .mockResolvedValueOnce(response);
    await client.fetchDelta({ authType });
    expect(service.getAccountCredentials).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledTimes(2);
    expect(http.post.mock.calls[1][1].variables.after).toBe('opaque+cursor=/value');
    const expected = authType === 'oauth2' ? 'Bearer oauth-value' : 'personal-key';
    expect(http.post.mock.calls.map(args => args[2].headers.Authorization)).toEqual([expected, expected]);
  });

  test('keeps the existing getAccessToken string interface for an explicit personal key', () => {
    const { client } = makeClient({ apiKey: 'personal-key' });
    expect(client.getAccessToken({ authType: 'api_key' })).toBe('personal-key');
  });
});
