const { once } = require('node:events');
const crypto = require('node:crypto');
const app = require('../src/index');
const { createApiRateLimiter, requireApiAccess } = require('../src/utils/requestSecurity');
const { ResponseTimingService, VIEW_ROUTES } = require('../src/services/responseTimingService');

const response = () => {
  const res = { statusCode: 200 };
  res.status = jest.fn(code => { res.statusCode = code; return res; });
  res.json = jest.fn(body => body);
  return res;
};
const request = (path, method = 'GET') => ({ path, method, ip: '192.0.2.1', get: () => undefined });

describe('API routing compatibility', () => {
  let server;
  let base;
  let previous;
  const key = crypto.randomBytes(32).toString('hex');

  beforeAll(async () => {
    previous = { key: process.env.SNEUP_API_KEY, required: process.env.SNEUP_REQUIRE_API_KEY, demo: process.env.SNEUP_DEMO_MODE };
    process.env.SNEUP_API_KEY = key;
    process.env.SNEUP_REQUIRE_API_KEY = 'true';
    process.env.SNEUP_DEMO_MODE = 'false';
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    for (const [name, value] of Object.entries({ SNEUP_API_KEY: previous.key, SNEUP_REQUIRE_API_KEY: previous.required, SNEUP_DEMO_MODE: previous.demo })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  test.each(['/API/V1', '/Api/v1/', '/API/v1/not-a-route'])('requires credentials for Express-matched path %s', async path => {
    const result = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(4000) });
    expect(result.status).toBe(401);
    const body = await result.json();
    expect(body).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' }, meta: { requestId: expect.any(String) } });
    expect(body.meta.requestId).toBe(result.headers.get('x-sneup-request-id'));
  });

  test.each(['/api/v1/security/context', '/API/V1/SeCuRiTy/CoNtExT/'])('authenticates a valid credential on %s without changing workspace case', async path => {
    const result = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${key}`, 'X-Sneup-Workspace-Id': 'CaseSensitive-Workspace' },
      signal: AbortSignal.timeout(4000)
    });
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.data.context).toMatchObject({ authenticated: true, workspaceId: 'CaseSensitive-Workspace', authMethod: 'api_key' });
    expect(body.meta.requestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(body.meta.requestId).toBe(result.headers.get('x-sneup-request-id'));
  });

  test.each(['/health', '/HEALTH/', '/ready', '/ReAdY/'])('correlates health and readiness route %s', async path => {
    const result = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(4000) });
    await result.arrayBuffer();
    expect(result.headers.get('x-sneup-request-id')).toMatch(/^[a-f0-9-]{36}$/);
  });

  test('keeps the legacy metadata root public and neighboring namespaces outside the API', async () => {
    const metadata = await fetch(`${base}/api`, { signal: AbortSignal.timeout(4000) });
    expect(metadata.status).toBe(200);
    expect(await metadata.json()).toMatchObject({ name: 'Sneup' });
    for (const path of ['/apiary', '/apiculture', '/API-assets.js']) {
      const result = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(4000) });
      await result.arrayBuffer();
      expect(result.status).toBe(404);
      expect(result.headers.has('x-sneup-request-id')).toBe(false);
    }
  });

  test('records a completed authenticated v1 dashboard response in bounded telemetry', async () => {
    const telemetry = require('../src/services/responseTimingService');
    const before = telemetry.getSummary().views.find(item => item.view === 'enhancements').samples;
    const result = await fetch(`${base}/API/V1/Enhancements/`, {
      headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(4000)
    });
    expect(result.status).toBe(200);
    await result.arrayBuffer();
    const after = telemetry.getSummary().views.find(item => item.view === 'enhancements');
    expect(after.samples).toBe(Math.min(before + 1, telemetry.maxSamples));
    expect(after.lastSampleAt).not.toBeNull();
  });

  test.each(['/api/webhooks/trello', '/API/Webhooks/Trello/'])('still verifies the provider signature on %s', async path => {
    const oldSecret = process.env.TRELLO_WEBHOOK_SECRET;
    const oldCallback = process.env.WEBHOOK_CALLBACK_URL;
    process.env.TRELLO_WEBHOOK_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.WEBHOOK_CALLBACK_URL = 'https://verification.example.invalid/api/webhooks/trello';
    try {
      const result = await fetch(`${base}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(4000)
      });
      expect(result.status).toBe(401);
      expect(await result.json()).toMatchObject({ success: false, error: 'Missing Trello webhook signature' });
    } finally {
      if (oldSecret === undefined) delete process.env.TRELLO_WEBHOOK_SECRET;
      else process.env.TRELLO_WEBHOOK_SECRET = oldSecret;
      if (oldCallback === undefined) delete process.env.WEBHOOK_CALLBACK_URL;
      else process.env.WEBHOOK_CALLBACK_URL = oldCallback;
    }
  });

  test('keeps the bounded generic webhook error protocol on a mixed-case trailing-slash route', async () => {
    const result = await fetch(`${base}/API/Webhooks/Generic/507f1f77bcf86cd799439011/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: 'x'.repeat(256 * 1024) }),
      signal: AbortSignal.timeout(4000)
    });
    expect(result.status).toBe(413);
    expect(await result.json()).toEqual({ success: false, error: 'Webhook payload is too large' });
  });

  test.each([
    ['reconciliation_required', 409], ['SNEUP_LEDGER_COMMIT_UNCERTAIN', 503], ['stale_delivery', 409], ['private-database-code', 500]
  ])('serializes only allowlisted worker webhook classification %s', async (code, statusCode) => {
    const webhook = require('../src/services/genericWebhookService');
    const ingest = jest.spyOn(webhook, 'ingestWorkerResponse').mockRejectedValue(Object.assign(new Error('private source detail'), { code, statusCode }));
    try {
      const result = await fetch(`${base}/api/webhooks/generic/507f1f77bcf86cd799439011/worker-response`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(4000)
      });
      expect(result.status).toBe(statusCode);
      const body = await result.json();
      if (code === 'private-database-code') expect(body).not.toHaveProperty('code');
      else expect(body.code).toBe(code);
      expect(JSON.stringify(body)).not.toMatch(/private/);
    } finally { ingest.mockRestore(); }
  });

  test.each([
    ['/api/v1', '/API/V1', '/Api/v1/security/context'],
    ['/api/boards', '/api/BOARDS/', '/API/Boards/SomeCaseSensitiveId']
  ].map(paths => [paths]))('shares one rate bucket for case-equivalent route family %s', paths => {
    const limiter = createApiRateLimiter({ maxRequests: 1 });
    const first = response();
    limiter(request(paths[0]), first, jest.fn());
    expect(first.statusCode).toBe(200);
    for (const path of paths.slice(1)) {
      const res = response();
      const next = jest.fn();
      limiter(request(path), res, next);
      expect(res.statusCode).toBe(429);
      expect(next).not.toHaveBeenCalled();
    }
    expect(limiter.getMetrics()).toMatchObject({ bucketCount: 1, rejectedRequests: 2 });
  });

  test.each([
    ['GET', '/API/v1/CONNECTORS/CaseSensitiveProvider/CALLBACK/', 'oauth_callback', 'connector-oauth'],
    ['POST', '/Api/V1/WORKSPACES/INVITATIONS/ACCEPT/', 'invite_acceptance', 'pending-invite'],
    ['HEAD', '/API/WEBHOOKS/TRELLO/', 'trello_webhook', 'trello'],
    ['POST', '/api/Webhooks/Trello/', 'trello_webhook', 'trello'],
    ['POST', '/API/WEBHOOKS/GENERIC/507F1F77BCF86CD799439011/WORKER-RESPONSE/', 'signed_webhook', 'generic-worker-response-webhook']
  ])('recognizes only the established public protocol for %s %s', async (method, path, authMethod, actorId) => {
    const req = request(path, method);
    const res = response();
    const next = jest.fn();
    await requireApiAccess(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth).toMatchObject({ authMethod, actorId });
    expect(req.path).toBe(path);
    expect(req.auth.permissions).not.toContain('trello-actions:execute-approved');
  });

  test.each([
    ['POST', '/API/v1/connectors/CaseSensitiveProvider/callback'],
    ['GET', '/API/v1/connectors/CaseSensitiveProvider/callback/extra'],
    ['GET', '/api/v10/connectors/provider/callback'],
    ['GET', '/API/v1/workspaces/invitations/accept'],
    ['GET', '/API/webhooks/trello'],
    ['POST', '/API/v1/webhooks/trello'],
    ['POST', '/API/webhooks/generic/invalid']
  ])('does not grant a public protocol exception to %s %s', async (method, path) => {
    const req = request(path, method);
    const res = response();
    const next = jest.fn();
    await requireApiAccess(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(req.auth).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('dashboard response timing paths', () => {
  test.each(Object.entries(VIEW_ROUTES))('records %s for legacy and versioned Express-compatible routes', (view, paths) => {
    const telemetry = new ResponseTimingService();
    for (const path of paths) {
      for (const variant of [path, `${path}/`, path.replace('/api/', '/api/v1/'), `${path.replace('/api/', '/api/v1/').toUpperCase()}/`]) {
        expect(telemetry.getView(request(variant))).toBe(view);
      }
    }
  });

  test.each(['/api/v10/reports', '/api/v1/reports/SomeId', '/api/v1/reports//', '/apiary/reports'])('does not fold unrelated route %s into timing telemetry', path => {
    expect(new ResponseTimingService().getView(request(path))).toBeNull();
  });
});
