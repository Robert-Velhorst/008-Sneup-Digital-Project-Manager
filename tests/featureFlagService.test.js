const fs = require('fs');
const http = require('http');
const path = require('path');
const app = require('../src/index');
const { ConnectorSyncService } = require('../src/services/connectorSyncService');
const {
  FEATURE_DEFINITIONS,
  FeatureFlagService,
  MAX_HISTORY
} = require('../src/services/featureFlagService');
const { ROLE_PERMISSIONS } = require('../src/utils/requestSecurity');

const leanQuery = (value, rejection) => {
  const query = {
    select: jest.fn(() => query),
    lean: rejection ? jest.fn().mockRejectedValue(rejection) : jest.fn().mockResolvedValue(value)
  };
  return query;
};

const request = (port, requestPath) => new Promise((resolve, reject) => {
  const call = http.get({ host: '127.0.0.1', port, path: requestPath }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => resolve({
      statusCode: response.statusCode,
      body: JSON.parse(Buffer.concat(chunks).toString('utf8'))
    }));
  });
  call.on('error', reject);
});

const serviceWith = (FeatureFlag = {}) => {
  const service = new FeatureFlagService({
    FeatureFlag,
    AuditEvent: { create: jest.fn().mockResolvedValue({}) },
    cacheTtlMs: 60_000
  });
  service.isDatabaseReady = () => true;
  service.resolveWorkspaceId = value => value;
  return service;
};

describe('workspace feature rollout controls', () => {
  test('uses safe defaults without a database and never defines a safety-bypass flag', async () => {
    const service = new FeatureFlagService({ isDemoRuntime: () => true });
    service.isDatabaseReady = () => false;
    service.resolveWorkspaceId = value => value;

    const flags = await service.list({ workspaceId: 'workspace-1', subjectId: 'operator-1' });
    expect(flags).toHaveLength(4);
    expect(flags.every(flag => flag.effective && !flag.configured)).toBe(true);
    expect(FEATURE_DEFINITIONS.map(flag => flag.key)).toEqual([
      'connector_sync',
      'forecast_scenarios',
      'work_graph_decisions',
      'hai_proposals'
    ]);
    expect(FEATURE_DEFINITIONS.map(flag => flag.key).join(' '))
      .not.toMatch(/auth|approval|audit|emergency|permission|provider_write|trello_write/i);
  });

  test('fails closed without rollout storage outside explicit demo mode', async () => {
    const service = new FeatureFlagService({ isDemoRuntime: () => false });
    service.isDatabaseReady = () => false;
    service.resolveWorkspaceId = value => value;

    await expect(service.list({ workspaceId: 'workspace-1' }))
      .rejects.toMatchObject({ statusCode: 503, code: 'FEATURE_FLAGS_UNAVAILABLE' });
    await expect(service.assertEnabled('hai_proposals', { workspaceId: 'workspace-1' }))
      .rejects.toMatchObject({ statusCode: 503, code: 'FEATURE_FLAGS_UNAVAILABLE' });
  });

  test('evaluates percentage rollout deterministically for the declared subject', () => {
    const service = new FeatureFlagService();
    const definition = FEATURE_DEFINITIONS.find(flag => flag.key === 'forecast_scenarios');
    const rule = { enabled: true, rolloutPercentage: 50, revision: 1 };
    const candidates = Array.from({ length: 200 }, (_, index) => `operator-${index}`);
    const results = candidates.map(subjectId => service.serialize(definition, rule, { workspaceId: 'workspace-1', subjectId }));
    expect(results.some(result => result.effective)).toBe(true);
    expect(results.some(result => !result.effective)).toBe(true);
    expect(service.serialize(definition, rule, { workspaceId: 'workspace-1', subjectId: 'operator-7' }))
      .toEqual(service.serialize(definition, rule, { workspaceId: 'workspace-1', subjectId: 'operator-7' }));
  });

  test('shares one bounded cached database lookup across concurrent readers', async () => {
    let resolveRows;
    const rows = new Promise(resolve => { resolveRows = resolve; });
    const query = { select: jest.fn(() => query), lean: jest.fn(() => rows) };
    const FeatureFlag = { find: jest.fn(() => query) };
    const service = serviceWith(FeatureFlag);

    const first = service.list({ workspaceId: 'workspace-1', subjectId: 'operator-1' });
    const second = service.list({ workspaceId: 'workspace-1', subjectId: 'operator-2' });
    resolveRows([{ key: 'hai_proposals', enabled: false, rolloutPercentage: 0, revision: 1 }]);
    const [firstFlags, secondFlags] = await Promise.all([first, second]);

    expect(FeatureFlag.find).toHaveBeenCalledTimes(1);
    expect(firstFlags.find(flag => flag.key === 'hai_proposals').effective).toBe(false);
    expect(secondFlags.find(flag => flag.key === 'hai_proposals').effective).toBe(false);
    expect(service.cacheMetrics()).toMatchObject({ retention: 'bounded_workspace_lru', maximumWorkspaces: 250, cachedWorkspaces: 1 });
  });

  test('fails optional capability evaluation closed when rollout storage is unavailable', async () => {
    const FeatureFlag = { find: jest.fn(() => leanQuery(null, new Error('database unavailable'))) };
    const service = serviceWith(FeatureFlag);
    const result = await service.evaluate('connector_sync', { workspaceId: 'workspace-1' });
    expect(result).toMatchObject({ effective: false, available: false });
    await expect(service.assertEnabled('connector_sync', { workspaceId: 'workspace-1' }))
      .rejects.toMatchObject({ statusCode: 503, code: 'FEATURE_FLAGS_UNAVAILABLE' });
  });

  test('validates exact update values and rejects stale revisions', async () => {
    const FeatureFlag = {
      findOne: jest.fn(() => leanQuery({ key: 'hai_proposals', revision: 4 })),
      findOneAndUpdate: jest.fn()
    };
    const service = serviceWith(FeatureFlag);
    expect(() => service.normalizeUpdate({ enabled: true, rolloutPercentage: 12.5 })).toThrow('whole number');
    expect(() => service.normalizeUpdate({ enabled: 'true', rolloutPercentage: 50 })).toThrow('true or false');
    await expect(service.update('hai_proposals', {
      enabled: false,
      rolloutPercentage: 0,
      expectedRevision: 3
    }, { workspaceId: 'workspace-1' })).rejects.toMatchObject({ statusCode: 409, code: 'FEATURE_FLAG_REVISION_CONFLICT' });
    expect(FeatureFlag.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('atomically advances revision, retains bounded history, audits, and invalidates cache', async () => {
    const existing = {
      _id: 'flag-1', key: 'hai_proposals', enabled: true, rolloutPercentage: 100, revision: 2
    };
    const saved = {
      ...existing, enabled: false, rolloutPercentage: 0, revision: 3, reason: 'Pause HAI intake', updatedBy: 'owner-1'
    };
    const updateQuery = leanQuery(saved);
    const FeatureFlag = {
      findOne: jest.fn(() => leanQuery(existing)),
      findOneAndUpdate: jest.fn(() => updateQuery)
    };
    const AuditEvent = { create: jest.fn().mockResolvedValue({}) };
    const service = serviceWith(FeatureFlag);
    service.AuditEvent = AuditEvent;
    service.cache.set('workspace-1', { expiresAt: Date.now() + 60_000, rules: new Map() });

    const result = await service.update('hai_proposals', {
      enabled: false,
      rolloutPercentage: 0,
      expectedRevision: 2,
      reason: 'Pause HAI intake'
    }, { workspaceId: 'workspace-1', actor: 'owner-1' });

    expect(result).toMatchObject({ key: 'hai_proposals', effective: false, revision: 3, updatedBy: 'owner-1' });
    expect(FeatureFlag.findOneAndUpdate).toHaveBeenCalledWith(
      { workspaceId: 'workspace-1', key: 'hai_proposals', revision: 2 },
      expect.objectContaining({
        $set: expect.objectContaining({ enabled: false, rolloutPercentage: 0, revision: 3 }),
        $push: { history: expect.objectContaining({ $slice: -MAX_HISTORY }) }
      }),
      expect.objectContaining({ new: true, upsert: false })
    );
    expect(AuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'feature_flag', action: 'feature_flag_updated', actor: 'owner-1', riskLevel: 'medium'
    }));
    expect(service.cache.has('workspace-1')).toBe(false);
  });

  test('returns newest-first bounded rollout history without exposing the hidden model document', async () => {
    const entries = Array.from({ length: 55 }, (_, index) => ({
      revision: index + 1,
      enabled: index % 2 === 0,
      rolloutPercentage: index,
      actor: `operator-${index}`,
      reason: `change-${index}`,
      changedAt: new Date(2026, 0, index + 1)
    }));
    const query = leanQuery({ history: entries });
    const FeatureFlag = { findOne: jest.fn(() => query) };
    const service = serviceWith(FeatureFlag);

    const history = await service.history('hai_proposals', { workspaceId: 'workspace-1', limit: 200 });
    expect(query.select).toHaveBeenCalledWith('+history');
    expect(history).toHaveLength(MAX_HISTORY);
    expect(history[0]).toMatchObject({ revision: 55, actor: 'operator-54' });
    expect(history[MAX_HISTORY - 1]).toMatchObject({ revision: 6, actor: 'operator-5' });
    expect(history[0]).not.toHaveProperty('_id');
  });

  test('skips scheduled connector ingestion before account reads when its workspace rollout is paused', async () => {
    const featureFlagService = { evaluate: jest.fn().mockResolvedValue({ effective: false, available: true }) };
    const service = new ConnectorSyncService({ featureFlagService });
    service.requireDatabase = jest.fn();
    const result = await service.syncConnectedAccounts({ workspaceId: 'workspace-1' });
    expect(result).toMatchObject({
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      metadata: { skipped: true, reason: 'connector_sync_disabled' }
    });
  });

  test('limits rollout management to manager-level roles and wires every selected consumer plus the UI', () => {
    expect(ROLE_PERMISSIONS.operator).not.toContain('feature-flags:manage');
    expect(ROLE_PERMISSIONS.manager).toContain('feature-flags:manage');
    const sources = [
      'src/routes/haiIntegration.js',
      'src/routes/forecasts.js',
      'src/routes/workSignals.js',
      'src/services/connectorSyncService.js'
    ].map(file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')).join('\n');
    expect(sources).toContain("assertEnabled('hai_proposals'");
    expect(sources).toContain("assertEnabled('forecast_scenarios'");
    expect(sources).toContain("assertEnabled('work_graph_decisions'");
    expect(sources).toContain("evaluate('connector_sync'");
    expect(fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8')).toContain('id="featureFlagList"');
    expect(fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8')).toEqual(expect.stringContaining('openFeatureFlagEditor'));
    expect(fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8')).toEqual(expect.stringContaining('openFeatureFlagHistory'));
  });
});

describe('feature rollout API', () => {
  let server;
  let port;
  let originalDemoMode;

  beforeAll(async () => {
    originalDemoMode = process.env.SNEUP_DEMO_MODE;
    process.env.SNEUP_DEMO_MODE = 'true';
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    port = server.address().port;
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (originalDemoMode === undefined) delete process.env.SNEUP_DEMO_MODE;
    else process.env.SNEUP_DEMO_MODE = originalDemoMode;
  });

  test('serves effective defaults through the strict versioned API in local demo mode', async () => {
    const response = await request(port, '/api/v1/feature-flags');
    expect(response).toMatchObject({ statusCode: 200 });
    expect(response.body).toMatchObject({
      ok: true,
      data: {
        count: 4,
        flags: expect.arrayContaining([
          expect.objectContaining({ key: 'hai_proposals', effective: true, configured: false })
        ]),
        cache: { retention: 'bounded_workspace_lru', maximumWorkspaces: 250 }
      },
      error: null,
      meta: { apiVersion: 'v1', requestId: expect.any(String) }
    });
  });
});
