const fs = require('fs');
const path = require('path');
const ConnectorAccount = require('../src/models/ConnectorAccount');
const JobRun = require('../src/models/JobRun');
const {
  EXPORT_COLLECTIONS,
  WorkspaceDataExportService,
  assertWorkspaceExportOwner,
  sanitizeExportValue
} = require('../src/services/workspaceDataExportService');

const modelWithRecords = (records) => ({
  find: jest.fn((query) => {
    const chain = {
      query,
      sort: jest.fn(() => chain),
      lean: jest.fn(() => chain),
      cursor: jest.fn(() => (async function* streamRecords() {
        for (const record of records) yield record;
      })())
    };
    return chain;
  })
});

describe('workspace data export', () => {
  test('streams deterministic NDJSON and strips secret material recursively', async () => {
    const first = modelWithRecords([{
      _id: 'record-1',
      workspaceId: 'workspace-1',
      name: 'Safe account name',
      credentials: { accessToken: 'private-access-token' },
      metadata: {
        signingSecret: 'private-signing-secret',
        visible: 'kept'
      }
    }]);
    const second = modelWithRecords([{
      _id: 'record-2',
      workspaceId: 'workspace-1',
      tokenHash: 'private-token-hash',
      result: 'complete'
    }]);
    const times = [
      new Date('2026-08-09T08:00:00.000Z'),
      new Date('2026-08-09T08:00:01.000Z')
    ];
    const service = new WorkspaceDataExportService({
      collections: [['accounts', first], ['jobs', second]],
      now: () => times.shift()
    });

    const lines = [];
    for await (const line of service.createExport({
      workspace: {
        _id: 'workspace-1',
        name: 'Delivery',
        slug: 'delivery',
        metadata: { clientSecret: 'private-client-secret', visible: true }
      },
      actor: 'owner-1'
    })) {
      lines.push(JSON.parse(line));
    }

    expect(lines).toEqual([
      expect.objectContaining({
        type: 'manifest',
        format: 'sneup-workspace-export',
        version: 1,
        actor: 'owner-1',
        secretMaterialIncluded: false,
        workspace: expect.objectContaining({ metadata: { visible: true } })
      }),
      {
        type: 'record',
        collection: 'accounts',
        data: {
          _id: 'record-1',
          workspaceId: 'workspace-1',
          name: 'Safe account name',
          metadata: { visible: 'kept' }
        }
      },
      {
        type: 'record',
        collection: 'jobs',
        data: {
          _id: 'record-2',
          workspaceId: 'workspace-1',
          result: 'complete'
        }
      },
      expect.objectContaining({
        type: 'complete',
        counts: { accounts: 1, jobs: 1 }
      })
    ]);
    expect(first.find).toHaveBeenCalledWith({ workspaceId: 'workspace-1' });
    expect(second.find).toHaveBeenCalledWith({ workspaceId: 'workspace-1' });
    expect(JSON.stringify(lines)).not.toMatch(/private-/);
  });

  test('keeps connector credentials opt-in and covers every registered workspace collection', () => {
    expect(ConnectorAccount.schema.path('credentials').options.select).toBe(false);
    expect(JobRun.schema.path('jobType').enumValues).toContain('security');
    expect(EXPORT_COLLECTIONS.length).toBeGreaterThanOrEqual(35);
    expect(new Set(EXPORT_COLLECTIONS.map(([name]) => name)).size).toBe(EXPORT_COLLECTIONS.length);
    for (const [, model] of EXPORT_COLLECTIONS) {
      expect(model.schema.path('workspaceId')).toBeTruthy();
    }
  });

  test('allows only owners and produces a bounded safe filename', () => {
    expect(() => assertWorkspaceExportOwner({ roles: ['owner'] })).not.toThrow();
    expect(() => assertWorkspaceExportOwner({ roles: ['admin'] })).toThrow(expect.objectContaining({ statusCode: 403 }));
    const service = new WorkspaceDataExportService({ now: () => new Date('2026-08-09T08:00:00.000Z') });
    expect(service.fileName({ slug: '../../Private Workspace' }))
      .toBe('sneup-private-workspace-export-2026-08-09.ndjson');
  });

  test('wires the export through the workspace UI', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
    expect(html).toContain('id="workspaceExportButton"');
    expect(app).toContain('downloadWorkspaceExport');
    expect(app).toContain('/export`');
  });

  test('sanitizes circular and binary values without retaining secret keys', () => {
    const source = { name: 'record', apiKey: 'private-key', payload: Buffer.from('private-binary') };
    source.self = source;
    expect(sanitizeExportValue(source)).toEqual({
      name: 'record',
      payload: '[binary omitted]',
      self: '[circular omitted]'
    });
  });
});
