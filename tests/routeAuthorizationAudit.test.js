const {
  PUBLIC_ROUTE_CONTRACTS,
  auditRouteSources,
  auditRoutesDirectory
} = require('../scripts/verify-route-authorization');

const auditSource = (source, publicContracts = {}) => auditRouteSources({
  sources: [{ fileName: 'fixture.js', source }],
  publicContracts
});

describe('route authorization audit', () => {
  test('covers every repository route and every intentional public contract', () => {
    const report = auditRoutesDirectory();

    expect(report.success).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.routeCount).toBeGreaterThanOrEqual(180);
    expect(report.publicRouteCount).toBe(Object.keys(PUBLIC_ROUTE_CONTRACTS).length);
    expect(report.guardedRouteCount + report.publicRouteCount).toBe(report.routeCount);
    expect(report.methods.head).toBeGreaterThanOrEqual(1);
  });

  test('rejects a multiline route without permission middleware', () => {
    const report = auditSource(`
      router.post(
        '/unsafe',
        async (req, res) => res.json({ success: true })
      );
    `);

    expect(report.success).toBe(false);
    expect(report.issues[0].message).toContain('has no permission guard');
  });

  test('accepts multiline permission middleware with a known literal permission', () => {
    const report = auditSource(`
      router.post(
        '/safe',
        requirePermission(
          'jobs:manage'
        ),
        async (req, res) => res.json({ success: true })
      );
    `);

    expect(report.success).toBe(true);
  });

  test('audits chained and computed Express route declarations', () => {
    const safe = auditSource(`
      router.route('/safe')
        .get(requirePermission('audit:read'), handler)
        .post(requirePermission('jobs:manage'), handler);
      router['patch']('/also-safe', requirePermission('jobs:manage'), handler);
    `);
    const unsafe = auditSource("router.route('/unsafe').delete(handler);");

    expect(safe.success).toBe(true);
    expect(safe.routeCount).toBe(3);
    expect(unsafe.success).toBe(false);
    expect(unsafe.issues[0].message).toContain('has no permission guard');
  });

  test('rejects router aliases that could hide declarations from the audit', () => {
    const report = auditSource(`
      const hiddenRouter = router;
      hiddenRouter.post('/unsafe', handler);
    `);

    expect(report.success).toBe(false);
    expect(report.issues[0].message).toContain('router aliases are not allowed');
  });

  test('rejects dynamic and unknown permission names', () => {
    const dynamic = auditSource("router.get('/dynamic', requirePermission(permissionName), handler);");
    const unknown = auditSource("router.get('/unknown', requirePermission('provider:write'), handler);");

    expect(dynamic.issues[0].message).toContain('unknown or dynamic permission');
    expect(unknown.issues[0].message).toContain('unknown or dynamic permission');
  });

  test('audits HEAD routes instead of silently ignoring them', () => {
    const report = auditSource("router.head('/health', (req, res) => res.status(200).send('OK'));");

    expect(report.success).toBe(false);
    expect(report.methods.head).toBe(1);
  });

  test('rejects side effects in an intentionally public HEAD probe', () => {
    const key = 'fixture.js:HEAD:/provider-check';
    const contracts = {
      [key]: {
        staticHeadResponse: true,
        reason: 'Test contract'
      }
    };
    const report = auditSource(`
      router.head('/provider-check', (req, res) => {
        providerService.touch();
        return res.status(200).send('OK');
      });
    `, contracts);

    expect(report.success).toBe(false);
    expect(report.issues[0].message).toContain('side-effect-free');
  });

  test('requires each public route to retain its verification behavior', () => {
    const key = 'fixture.js:POST:/callback';
    const contracts = {
      [key]: {
        handlerCalls: ['oauthService.verifyState'],
        reason: 'Test contract'
      }
    };
    const missing = auditSource("router.post('/callback', async (req, res) => res.send('ok'));", contracts);
    const present = auditSource("router.post('/callback', async (req, res) => oauthService.verifyState(req));", contracts);

    expect(missing.issues[0].message).toContain('missing public-route verification call');
    expect(present.success).toBe(true);
  });
});
