const fs = require('fs');
const http = require('http');
const path = require('path');
const app = require('../src/index');
const {
  requestContextMiddleware,
  versionedApiEnvelope
} = require('../src/services/apiContractService');

const request = (port, requestPath, options = {}) => new Promise((resolve, reject) => {
  const call = http.request({ host: '127.0.0.1', port, path: requestPath, method: options.method || 'GET', headers: options.headers }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => resolve({
      statusCode: response.statusCode,
      headers: response.headers,
      body: Buffer.concat(chunks).toString('utf8')
    }));
  });
  call.on('error', reject);
  call.setTimeout(4000, () => call.destroy(new Error('HTTP fixture request timed out')));
  call.end(options.body);
});

const response = (statusCode = 200) => {
  const res = {
    statusCode,
    locals: {},
    headers: {},
    setHeader: jest.fn((name, value) => { res.headers[name] = value; }),
    json: jest.fn(body => body)
  };
  return res;
};

describe('versioned API contract', () => {
  let server;
  let port;

  beforeAll(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    port = server.address().port;
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  test('wraps successful route payloads without duplicating legacy success flags', () => {
    const req = { sneupRequestId: 'request-1' };
    const res = response();
    const sendJson = res.json;

    versionedApiEnvelope(req, res, jest.fn());
    res.json({ success: true, count: 1, items: [{ id: 'item-1' }] });

    expect(sendJson).toHaveBeenCalledWith({
      ok: true,
      data: { count: 1, items: [{ id: 'item-1' }] },
      error: null,
      meta: expect.objectContaining({ apiVersion: 'v1', requestId: 'request-1' })
    });
  });

  test('normalizes failures without copying arbitrary route fields', () => {
    const req = { sneupRequestId: 'request-2' };
    const res = response(409);
    const sendJson = res.json;

    versionedApiEnvelope(req, res, jest.fn());
    res.json({ success: false, error: 'Action already running', privateContext: 'do not expose' });

    expect(sendJson).toHaveBeenCalledWith({
      ok: false,
      data: null,
      error: { code: 'CONFLICT', message: 'Action already running' },
      meta: expect.objectContaining({ apiVersion: 'v1', requestId: 'request-2' })
    });
    expect(JSON.stringify(sendJson.mock.calls)).not.toContain('privateContext');
  });

  test('adds one server-generated request id and permits raw protocol documents', () => {
    const req = { path: '/api/v1' };
    const res = response();
    requestContextMiddleware(req, res, jest.fn());

    expect(req.sneupRequestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(res.setHeader).toHaveBeenCalledWith('X-Sneup-Request-Id', req.sneupRequestId);

    res.locals.sneupRawApiResponse = true;
    const sendJson = res.json;
    versionedApiEnvelope(req, res, jest.fn());
    res.json({ openapi: '3.1.0' });
    expect(sendJson).toHaveBeenCalledWith({ openapi: '3.1.0' });
  });

  test('does not generate request ids for cacheable frontend assets', () => {
    const req = { path: '/app.123.js' };
    const res = response();
    const next = jest.fn();
    requestContextMiddleware(req, res, next);
    expect(req.sneupRequestId).toBeUndefined();
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('serves strict v1 metadata and errors while preserving the legacy API', async () => {
    const [versioned, legacy, missing, openapi, diagnostics] = await Promise.all([
      request(port, '/api/v1'),
      request(port, '/api'),
      request(port, '/api/v1/not-a-route'),
      request(port, '/api/v1/integrations/hai/openapi.json'),
      request(port, '/api/v1/security/diagnostics')
    ]);

    const versionedBody = JSON.parse(versioned.body);
    expect(versioned).toMatchObject({ statusCode: 200 });
    expect(versionedBody).toMatchObject({
      ok: true,
      data: { name: 'Sneup' },
      error: null,
      meta: { apiVersion: 'v1', requestId: expect.any(String), timestamp: expect.any(String) }
    });
    expect(versioned.headers['x-sneup-request-id']).toBe(versionedBody.meta.requestId);

    expect(JSON.parse(legacy.body)).toMatchObject({ name: 'Sneup' });
    expect(JSON.parse(legacy.body)).not.toHaveProperty('ok');

    expect(JSON.parse(missing.body)).toMatchObject({
      ok: false,
      data: null,
      error: { code: 'NOT_FOUND', message: 'Not found' },
      meta: { apiVersion: 'v1', requestId: expect.any(String) }
    });

    expect(JSON.parse(openapi.body)).toMatchObject({
      openapi: '3.1.0',
      paths: expect.objectContaining({ '/api/v1/integrations/hai/snapshot': expect.any(Object) })
    });
    expect(JSON.parse(openapi.body)).not.toHaveProperty('ok');

    expect(JSON.parse(diagnostics.body)).toMatchObject({
      ok: true,
      data: {
        diagnostics: {
          checks: expect.any(Array),
          secretsExposed: false
        }
      }
    });
  });

  test('routes dashboard API traffic through the versioned parser', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
    expect(source).toContain("return `/api/v1/${url.slice('/api/'.length)}`");
    expect(source).toContain("data.meta?.apiVersion === 'v1'");
    expect(source).toContain('error.requestId = data.meta?.requestId');
  });

  const expectFailure = (result, status, code) => {
    expect(result.statusCode).toBe(status);
    expect(JSON.parse(result.body)).toMatchObject({
      ok: false, data: null,
      error: { code, message: expect.any(String) },
      meta: { apiVersion: 'v1', requestId: result.headers['x-sneup-request-id'] }
    });
    expect(result.headers['x-sneup-request-id']).toMatch(/^[a-f0-9-]{36}$/);
  };

  test.each([
    ['/api/v1/integrations/hai/snapshot', 'configured-test-key', 401, 'UNAUTHORIZED'],
    ['/api/v1/integrations/hai/openapi.json', 'configured-test-key', 401, 'UNAUTHORIZED'],
    ['/api/v1/integrations/hai/snapshot', undefined, 503, 'SERVICE_UNAVAILABLE']
  ])('formats authentication failure on %s with request correlation', async (url, key, status, code) => {
    const previous = { key: process.env.SNEUP_API_KEY, required: process.env.SNEUP_REQUIRE_API_KEY };
    process.env.SNEUP_REQUIRE_API_KEY = 'true';
    if (key === undefined) delete process.env.SNEUP_API_KEY;
    else process.env.SNEUP_API_KEY = key;
    try {
      expectFailure(await request(port, url), status, code);
    } finally {
      if (previous.key === undefined) delete process.env.SNEUP_API_KEY;
      else process.env.SNEUP_API_KEY = previous.key;
      if (previous.required === undefined) delete process.env.SNEUP_REQUIRE_API_KEY;
      else process.env.SNEUP_REQUIRE_API_KEY = previous.required;
    }
  });

  test.each([
    ['malformed JSON', '{invalid', 400, 'BAD_REQUEST'],
    ['oversized JSON', JSON.stringify({ value: 'x'.repeat(1024 * 1024) }), 413, 'PAYLOAD_TOO_LARGE']
  ])('formats %s rejected before routing', async (label, body, status, code) => {
    expectFailure(await request(port, '/api/v1/integrations/hai/proposals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body
    }), status, code);
  });

  test('formats CORS rejection without exposing its internal error details', async () => {
    const result = await request(port, '/api/v1/integrations/hai/snapshot', { headers: { Origin: 'https://untrusted.example.invalid' } });
    expectFailure(result, 500, 'INTERNAL_ERROR');
    expect(result.body).not.toContain('Origin is not allowed');
    expect(result.headers).not.toHaveProperty('access-control-allow-origin');
  });

  test('formats a rate-limit rejection before authentication', async () => {
    const previous = process.env.SNEUP_RATE_LIMIT_MAX;
    process.env.SNEUP_RATE_LIMIT_MAX = '1';
    try {
      await request(port, '/api/v1/integrations/hai/snapshot');
      expectFailure(await request(port, '/api/v1/integrations/hai/snapshot'), 429, 'RATE_LIMITED');
    } finally {
      if (previous === undefined) delete process.env.SNEUP_RATE_LIMIT_MAX;
      else process.env.SNEUP_RATE_LIMIT_MAX = previous;
    }
  });

  test('leaves legacy and webhook parser failures unwrapped', async () => {
    for (const [url, body, status] of [
      ['/api/integrations/hai/proposals', '{invalid', 400],
      ['/api/webhooks/generic/507f1f77bcf86cd799439011', JSON.stringify({ value: 'x'.repeat(1024 * 1024) }), 413]
    ]) {
      const result = await request(port, url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body
      });
      expect(result.statusCode).toBe(status);
      expect(JSON.parse(result.body)).not.toHaveProperty('ok');
    }
    const adjacent = await request(port, '/api/v10/not-a-route');
    expect(JSON.parse(adjacent.body)).not.toHaveProperty('ok');
  });
});
