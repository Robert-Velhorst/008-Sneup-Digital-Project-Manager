const fs = require('fs');
const http = require('http');
const path = require('path');
const app = require('../src/index');
const {
  requestContextMiddleware,
  versionedApiEnvelope
} = require('../src/services/apiContractService');

const request = (port, requestPath) => new Promise((resolve, reject) => {
  const call = http.get({ host: '127.0.0.1', port, path: requestPath }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => resolve({
      statusCode: response.statusCode,
      headers: response.headers,
      body: Buffer.concat(chunks).toString('utf8')
    }));
  });
  call.on('error', reject);
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
    const [versioned, legacy, missing, openapi] = await Promise.all([
      request(port, '/api/v1'),
      request(port, '/api'),
      request(port, '/api/v1/not-a-route'),
      request(port, '/api/v1/integrations/hai/openapi.json')
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
  });

  test('routes dashboard API traffic through the versioned parser', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
    expect(source).toContain("return `/api/v1/${url.slice('/api/'.length)}`");
    expect(source).toContain("data.meta?.apiVersion === 'v1'");
    expect(source).toContain('error.requestId = data.meta?.requestId');
  });
});
