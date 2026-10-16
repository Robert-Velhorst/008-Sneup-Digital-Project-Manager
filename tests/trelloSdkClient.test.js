const { createTrelloTransport } = require('../src/services/trelloSdkClient');

const buildUrl = (base, searchParams) => {
  const url = new URL(base);
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return url.toString();
};

const options = {
  apiKey: 'trello-key',
  apiToken: 'trello-token',
  timeoutMs: 1200,
  maxContentLength: 16,
  maxBodyLength: 8,
  maxRedirects: 0
};

describe('Trello SDK transport safety', () => {
  test('uses authenticated API URLs and refuses redirects', async () => {
    const fetchImpl = jest.fn(async () => new Response('redirected', {
      status: 302,
      headers: { location: 'https://attacker.example/collect' }
    }));
    const transport = createTrelloTransport(options, { buildUrl, fetchImpl });

    await expect(transport.sendRequest({
      url: '/cards/card-1',
      searchParams: { fields: 'name' }
    })).rejects.toMatchObject({
      response: { status: 302 }
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, request] = fetchImpl.mock.calls[0];
    const parsedUrl = new URL(url);
    expect(parsedUrl.origin).toBe('https://api.trello.com');
    expect(parsedUrl.pathname).toBe('/1/cards/card-1');
    expect(parsedUrl.searchParams.get('key')).toBe('trello-key');
    expect(parsedUrl.searchParams.get('token')).toBe('trello-token');
    expect(parsedUrl.searchParams.get('fields')).toBe('name');
    expect(request.redirect).toBe('manual');
    expect(request.signal).toBeInstanceOf(AbortSignal);
  });

  test('rejects request bodies above the configured byte limit before sending', async () => {
    const fetchImpl = jest.fn();
    const transport = createTrelloTransport(options, { buildUrl, fetchImpl });

    await expect(transport.sendRequest({ url: '/cards', method: 'POST', body: '123456789' }))
      .rejects.toThrow('Trello request exceeded the 8-byte limit');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('rejects declared response bodies above the configured byte limit', async () => {
    const fetchImpl = jest.fn(async () => new Response('12345678901234567', {
      headers: {
        'content-type': 'application/json',
        'content-length': '17'
      }
    }));
    const transport = createTrelloTransport(options, { buildUrl, fetchImpl });

    await expect(transport.sendRequest({ url: '/cards' }))
      .rejects.toThrow('Trello response exceeded the 16-byte limit');
  });
});
