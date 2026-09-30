const http = require('node:http');
const express = require('express');
const { validateCloudEnvironment } = require('../src/utils/cloudConfiguration');
const { getTrustedProxyIps } = require('../src/utils/trustedProxyConfiguration');
const { createApiRateLimiter, requireApiAccess } = require('../src/utils/requestSecurity');

const environment = () => ({
  NODE_ENV: 'production', SNEUP_DEMO_MODE: 'false', SNEUP_NGROK_ENABLED: 'false',
  SNEUP_REQUIRE_API_KEY: 'true', SNEUP_API_KEY: 'a'.repeat(64),
  SNEUP_API_TOKEN_PEPPER: 'b'.repeat(64), SNEUP_SESSION_TOKEN_PEPPER: 'c'.repeat(64),
  SNEUP_INVITE_TOKEN_PEPPER: 'd'.repeat(64), CONNECTOR_ENCRYPTION_KEY: 'e'.repeat(64),
  CONNECTOR_STATE_SECRET: 'f'.repeat(64), MONGODB_URI: 'mongodb://private-db/sneup',
  SNEUP_PUBLIC_URL: 'https://sneup.example.com', SNEUP_ALLOWED_ORIGINS: 'https://sneup.example.com',
  SNEUP_TRUSTED_PROXY_IPS: '172.30.108.2'
});

describe('Hetzner cloud startup contract', () => {
  test('validates the dedicated authenticated origin without returning secrets', () => {
    expect(validateCloudEnvironment(environment())).toEqual({ valid: true, provider: 'hetzner', publicOrigin: 'https://sneup.example.com', secretsExposed: false });
  });

  test.each([
    ['NODE_ENV', 'development'], ['SNEUP_DEMO_MODE', 'true'], ['SNEUP_NGROK_ENABLED', 'true'],
    ['SNEUP_NGROK_ENABLED', ''], ['SNEUP_REQUIRE_API_KEY', 'false'], ['SNEUP_API_KEY', 'short'],
    ['SNEUP_API_KEY', 'replace_with_a_placeholder_which_is_more_than_32_characters'],
    ['SNEUP_API_KEY', 'b'.repeat(64)], ['SNEUP_TRUST_REQUEST_HOST', 'true'],
    ['SNEUP_ALLOWED_ORIGINS', '*'], ['MONGODB_URI', ''], ['CONNECTOR_ENCRYPTION_KEY', ''],
    ['SNEUP_TRUSTED_PROXY_IPS', 'true'], ['SNEUP_TRUSTED_PROXY_IPS', '1']
  ])('fails closed for unsafe %s', (key, value) => {
    expect(() => validateCloudEnvironment({ ...environment(), [key]: value })).toThrow();
  });

  test.each(['http://sneup.example.com', 'https://localhost', 'https://127.0.0.1', 'https://[::1]',
    'https://user:secret@sneup.example.com', 'https://sneup.example.com/path',
    'https://sneup.example.com:8443', 'https://sneup.example.com/?secret=value', 'https://sneup.example.com/#value'])('rejects unsafe public URL %s', url => {
    expect(() => validateCloudEnvironment({ ...environment(), SNEUP_PUBLIC_URL: url })).toThrow();
  });

  test('leaves forwarded headers untrusted by default and validates exact addresses only', () => {
    expect(getTrustedProxyIps({})).toEqual([]);
    expect(getTrustedProxyIps({ ...environment(), SNEUP_TRUSTED_PROXY_IPS: '127.0.0.1,::1,127.0.0.1' })).toEqual(['127.0.0.1', '::1']);
    expect(() => getTrustedProxyIps({ ...environment(), SNEUP_TRUSTED_PROXY_IPS: '0.0.0.0/0' })).toThrow();
    expect(() => getTrustedProxyIps({ ...environment(), SNEUP_TRUSTED_PROXY_IPS: 'loopback' })).toThrow();
  });
});

describe('real HTTP reverse-proxy authentication and rate buckets', () => {
  const original = { ...process.env };
  let server;
  const request = (headers = {}) => new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port: server.address().port, path: '/api/proxy-test', headers }, response => {
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(body) }));
    }).on('error', reject);
  });
  const start = async trusted => {
    Object.assign(process.env, environment());
    const app = express();
    app.set('trust proxy', trusted ? getTrustedProxyIps({ ...environment(), SNEUP_TRUSTED_PROXY_IPS: '127.0.0.1' }) : false);
    app.use(createApiRateLimiter({ maxRequests: 2 }));
    app.use(requireApiAccess);
    app.get('/api/proxy-test', (req, res) => res.json({ ip: req.ip, authMethod: req.auth.authMethod }));
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
  };
  afterEach(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    server = null;
    process.env = { ...original };
  });

  test('uses only the trusted hop for client identity and keeps per-client limits separate', async () => {
    await start(true);
    const first = { 'X-Forwarded-For': '198.51.100.8', 'X-Sneup-Api-Key': environment().SNEUP_API_KEY };
    expect((await request(first)).body).toMatchObject({ ip: '198.51.100.8', authMethod: 'api_key' });
    expect((await request(first)).status).toBe(200);
    expect((await request(first)).status).toBe(429);
    expect((await request({ ...first, 'X-Forwarded-For': '198.51.100.9' })).status).toBe(200);
  });

  test('forwarded localhost cannot acquire local-owner bypass', async () => {
    await start(true);
    expect((await request({ 'X-Forwarded-For': '127.0.0.1' })).status).toBe(401);
  });

  test('an untrusted peer cannot influence client identity', async () => {
    await start(false);
    expect((await request({ 'X-Forwarded-For': '198.51.100.8', 'X-Sneup-Api-Key': environment().SNEUP_API_KEY })).body.ip).toBe('127.0.0.1');
  });
});
