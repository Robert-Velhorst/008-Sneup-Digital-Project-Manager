const http = require('http');
const express = require('express');
const accountConnectorService = require('../src/services/accountConnectorService');
const { sanitizeConnectorReturnPath, buildConnectorReturnPath } = require('../src/utils/connectorReturnPath');

const fallback = '/?connectors=1';
const unsafe = ['https://evil.example', '//evil.example', '/\\evil.example', '/\nevil.example',
  '/\revil.example', '/\tevil.example', '/ space', '/\u0000evil', '/\u007fevil',
  '/a/..//evil.example', 'javascript:alert(1)', '', null, {}];

describe('Connector callback local return paths', () => {
  test.each([
    ['/', '/'], ['/?connectors=1', '/?connectors=1'], ['/boards/one', '/boards/one'],
    ['/boards?filter=open#card-1', '/boards?filter=open#card-1'], ['/a/../boards', '/boards'],
    ['/boards/%2Fexternal', '/boards/%2Fexternal'], ['/boards?url=https%3A%2F%2Fexample.test', '/boards?url=https%3A%2F%2Fexample.test'],
    ['/boards#https://example.test', '/boards#https://example.test']
  ])('retains local destination %s', (input, expected) => {
    expect(sanitizeConnectorReturnPath(input)).toBe(expected);
    expect(accountConnectorService.sanitizeReturnTo(input)).toBe(expected);
  });

  test.each(unsafe)('falls back for unsafe stored return destination %s', input => {
    expect(sanitizeConnectorReturnPath(input)).toBe(fallback);
    expect(accountConnectorService.sanitizeReturnTo(input)).toBe(fallback);
    expect(buildConnectorReturnPath(input, 'jira_software')).toBe('/?connectors=1&connector=jira_software&status=connected');
  });

  test('places status before fragments and replaces stale status/connector fields', () => {
    expect(buildConnectorReturnPath('/boards?filter=open&connector=old&status=failed#card-1', 'jira_software'))
      .toBe('/boards?filter=open&connector=jira_software&status=connected#card-1');
  });

  test('encodes connector identity as one query value rather than URL syntax', () => {
    const output = buildConnectorReturnPath('/boards#card-1', 'provider&status=failed#other');
    const parsed = new URL(output, 'https://sneup.invalid');
    expect(parsed.origin).toBe('https://sneup.invalid');
    expect(parsed.searchParams.get('connector')).toBe('provider&status=failed#other');
    expect(parsed.searchParams.getAll('status')).toEqual(['connected']);
    expect(parsed.hash).toBe('#card-1');
  });

  test.each(unsafe)('callback revalidates destination %s using a real local HTTP response without following redirects', async input => {
    const complete = jest.spyOn(accountConnectorService, 'completeOAuth').mockResolvedValue({
      account: { connectorId: 'jira_software' }, returnTo: input
    });
    const app = express();
    app.use('/api/connectors', require('../src/routes/connectors'));
    const server = await new Promise(resolve => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    try {
      const result = await new Promise((resolve, reject) => {
        http.get({ hostname: '127.0.0.1', port: server.address().port,
          path: '/api/connectors/jira_software/callback?state=test-state&code=test-code' }, response => {
          response.resume();
          resolve({ status: response.statusCode, location: response.headers.location });
        }).on('error', reject);
      });
      expect(result).toEqual({ status: 302, location: '/?connectors=1&connector=jira_software&status=connected' });
      expect(complete).toHaveBeenCalledTimes(1);
    } finally {
      complete.mockRestore();
      await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    }
  });
});
