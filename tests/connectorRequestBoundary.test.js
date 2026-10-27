jest.mock('../src/services/accountConnectorService', () => ({}));

const { TrelloWorkSignalClient } = require('../src/services/trelloWorkSignalClient');
const { WrikeWorkSignalClient } = require('../src/services/wrikeWorkSignalClient');

describe('Credential-bearing connector request boundaries', () => {
  const invalidBases = [
    'http://api.trello.com/1', 'https://127.0.0.1/1', 'https://api.trello.com.evil.example/1',
    'https://api.trello.com:8443/1', 'https://user:pass@api.trello.com/1',
    'https://api.trello.com/1?target=elsewhere', 'https://api.trello.com/1#fragment',
    'https://api.trello.com/other', 'not-a-url'
  ];

  test.each(invalidBases)('Trello rejects an invalid authority/base before sending: %s', base => {
    const http = { get: jest.fn() };
    const client = new TrelloWorkSignalClient({ http });
    expect(() => client.request('/members/me/boards', { apiKey: 'key', apiToken: 'token' }, { apiUrl: base }))
      .toThrow('Trello API URL must');
    expect(http.get).not.toHaveBeenCalled();
  });

  test.each(['/members/me/boards', '/boards/board-1/cards'])('Trello confines %s and disables redirects/proxies', async path => {
    const response = { data: [] };
    const http = { get: jest.fn().mockResolvedValue(response) };
    const client = new TrelloWorkSignalClient({ http });
    await expect(client.request(path, { apiKey: 'key', apiToken: 'token' },
      { apiUrl: 'https://api.trello.com:443/1/', timeout: 5000 }, { limit: 10 })).resolves.toBe(response);
    expect(http.get).toHaveBeenCalledWith(`https://api.trello.com/1${path}`, expect.objectContaining({
      maxRedirects: 0, proxy: false, timeout: 5000, params: { limit: 10, key: 'key', token: 'token' }
    }));
  });

  test.each(['https://evil.example/', '//evil.example/', '/boards/../cards', '/boards/%2f/cards',
    '/boards/a/cards?target=evil', '/boards/a/cards#fragment', '/boards/a\\b/cards'])('Trello refuses an unexpected resource: %s', path => {
    const http = { get: jest.fn() };
    const client = new TrelloWorkSignalClient({ http });
    expect(() => client.request(path, {}, { apiUrl: 'https://api.trello.com/1' })).toThrow('request path is invalid');
    expect(http.get).not.toHaveBeenCalled();
  });

  test.each(['https://www.wrike.com/api/v4', 'https://app-eu.wrike.com/api/v4'])('Wrike preserves supported region %s', async base => {
    const http = { get: jest.fn().mockResolvedValue({ data: [] }) };
    const client = new WrikeWorkSignalClient({ http });
    await client.request({ apiUrl: base, timeout: 5000 }, '/tasks', 'token', { pageSize: 5 });
    expect(http.get).toHaveBeenCalledWith(`${base}/tasks`, expect.objectContaining({
      maxRedirects: 0, proxy: false, timeout: 5000,
      headers: expect.objectContaining({ Authorization: 'Bearer token' }), params: { pageSize: 5 }
    }));
  });

  test.each(['https://www.wrike.com:8443/api/v4', 'https://www.wrike.com.evil.example/api/v4',
    'http://www.wrike.com/api/v4', 'https://user:pass@www.wrike.com/api/v4',
    'https://www.wrike.com/api/v4?target=evil', 'https://www.wrike.com/api/v4#fragment',
    'https://127.0.0.1/api/v4'])('Wrike rejects an invalid authority/base before sending: %s', base => {
    const http = { get: jest.fn() };
    const client = new WrikeWorkSignalClient({ http });
    expect(() => client.request({ apiUrl: base }, '/tasks', 'token')).toThrow('Wrike API URL must');
    expect(http.get).not.toHaveBeenCalled();
  });

  test.each(['//evil.example', '/tasks?target=evil', '/tasks/../folders', '/users'])('Wrike refuses an unexpected resource: %s', path => {
    const http = { get: jest.fn() };
    const client = new WrikeWorkSignalClient({ http });
    expect(() => client.request({ apiUrl: 'https://www.wrike.com/api/v4' }, path, 'token')).toThrow('request path is invalid');
    expect(http.get).not.toHaveBeenCalled();
  });
});
