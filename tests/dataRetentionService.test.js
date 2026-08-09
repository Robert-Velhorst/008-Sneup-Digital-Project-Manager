const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const {
  DataRetentionService,
  APPLY_CONFIRMATION
} = require('../src/services/dataRetentionService');

const findResult = rows => ({
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(rows)
});

const model = rows => ({
  find: jest.fn(() => findResult(rows)),
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: rows.length })
});

describe('workspace data retention', () => {
  const workspaceId = new mongoose.Types.ObjectId();
  const dueId = new mongoose.Types.ObjectId();
  const workspace = {
    _id: workspaceId,
    slug: 'delivery-team',
    settings: {
      dataRetention: {
        enabled: true,
        operationalDays: 90,
        performanceDays: 730,
        notificationDays: 365,
        credentialDays: 90
      }
    }
  };

  const dependencies = () => {
    const JobRun = model([{ _id: dueId }]);
    const empty = () => model([]);
    return {
      models: {
        JobRun,
        BoardHealthSnapshot: empty(),
        Performance: empty(),
        NotificationDelivery: empty(),
        SessionToken: empty(),
        ApiToken: empty()
      },
      ledger: { recordAudit: jest.fn().mockResolvedValue({}) },
      now: () => new Date('2026-08-09T12:00:00.000Z')
    };
  };

  test('previews only bounded eligible history and keeps sensitive evidence protected', async () => {
    const deps = dependencies();
    const service = new DataRetentionService(deps);
    const report = await service.scan({ workspace, skipDatabaseCheck: true, limit: 20 });

    expect(report.summary).toEqual({ due: 1, truncated: false, categoriesWithDueRecords: 1 });
    expect(report.providerWrites).toBe(false);
    expect(report.protectedEvidence).toEqual(expect.arrayContaining([
      'audit events',
      'approvals and recommendations',
      'Trello action attempts',
      'active credentials and sessions'
    ]));
    expect(deps.models.JobRun.find).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId,
      status: { $in: ['succeeded', 'failed', 'skipped'] },
      finishedAt: { $lte: new Date('2026-05-11T12:00:00.000Z') }
    }));
    expect(service.publicReport(report).categories[0]).not.toHaveProperty('ids');
    expect(deps.models.JobRun.deleteMany).not.toHaveBeenCalled();
  });

  test('requires enabled policy, explicit phrase, and exact workspace slug', async () => {
    const service = new DataRetentionService(dependencies());
    await expect(service.apply({ workspace, skipDatabaseCheck: true }))
      .rejects.toMatchObject({ code: 'RETENTION_CONFIRMATION_REQUIRED' });
    await expect(service.apply({
      workspace,
      skipDatabaseCheck: true,
      confirm: APPLY_CONFIRMATION,
      workspaceConfirmation: 'wrong-workspace'
    })).rejects.toMatchObject({ code: 'RETENTION_WORKSPACE_CONFIRMATION_REQUIRED' });
  });

  test('records a high-risk start before a bounded delete and completion evidence after it', async () => {
    const deps = dependencies();
    const service = new DataRetentionService(deps);
    const result = await service.apply({
      workspace,
      skipDatabaseCheck: true,
      confirm: APPLY_CONFIRMATION,
      workspaceConfirmation: workspace.slug,
      categories: ['job_runs'],
      actor: 'workspace-owner',
      source: 'api'
    });

    expect(result).toMatchObject({ deleted: 1, providerWrites: false, bounded: true });
    expect(deps.ledger.recordAudit).toHaveBeenNthCalledWith(1, expect.objectContaining({
      action: 'workspace_data_retention_prune_started',
      riskLevel: 'high',
      afterState: expect.objectContaining({ category: 'job_runs', providerWrites: false })
    }));
    expect(deps.models.JobRun.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId,
      _id: { $in: [String(dueId)] }
    }));
    expect(deps.ledger.recordAudit).toHaveBeenNthCalledWith(2, expect.objectContaining({
      action: 'workspace_data_retention_prune_completed',
      afterState: expect.objectContaining({ deleted: 1 })
    }));
  });

  test('does not delete when the pre-delete audit cannot be stored', async () => {
    const deps = dependencies();
    deps.ledger.recordAudit.mockRejectedValueOnce(new Error('audit unavailable'));
    const service = new DataRetentionService(deps);
    await expect(service.apply({
      workspace,
      skipDatabaseCheck: true,
      scheduled: true,
      categories: ['job_runs']
    })).rejects.toThrow('audit unavailable');
    expect(deps.models.JobRun.deleteMany).not.toHaveBeenCalled();
  });

  test('stores policy intent before enabling scheduled retention', async () => {
    const policyWorkspace = {
      _id: workspaceId,
      slug: workspace.slug,
      settings: { dataRetention: { ...workspace.settings.dataRetention, enabled: false } },
      save: jest.fn().mockResolvedValue(undefined)
    };
    const ledger = { recordAudit: jest.fn().mockRejectedValueOnce(new Error('audit unavailable')) };
    const service = new DataRetentionService({
      models: { Workspace: { findById: jest.fn().mockResolvedValue(policyWorkspace) } },
      ledger
    });
    await expect(service.updatePolicy({
      workspaceId,
      skipDatabaseCheck: true,
      policy: { enabled: true }
    })).rejects.toMatchObject({ code: 'RETENTION_POLICY_AUDIT_FAILED' });
    expect(policyWorkspace.save).not.toHaveBeenCalled();

    ledger.recordAudit.mockResolvedValue({});
    const result = await service.updatePolicy({
      workspaceId,
      skipDatabaseCheck: true,
      policy: { enabled: true },
      actor: 'owner-1'
    });
    expect(result.enabled).toBe(true);
    expect(policyWorkspace.save).toHaveBeenCalledTimes(1);
    expect(ledger.recordAudit).toHaveBeenNthCalledWith(2, expect.objectContaining({
      action: 'workspace_data_retention_policy_update_started', actor: 'owner-1'
    }));
    expect(ledger.recordAudit).toHaveBeenNthCalledWith(3, expect.objectContaining({
      action: 'workspace_data_retention_policy_updated', actor: 'owner-1'
    }));
  });

  test('validates bounded policy windows and wires owner controls into the command center', () => {
    const service = new DataRetentionService();
    expect(service.normalizePolicy({ operationalDays: 30, enabled: true })).toMatchObject({
      enabled: true,
      operationalDays: 30
    });
    expect(() => service.normalizePolicy({ notificationDays: 30 })).toThrow('notificationDays');

    const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
    expect(html).toContain('id="retentionList"');
    expect(app).toContain('openRetentionPolicy');
    expect(app).toContain("confirm: 'prune-expired-history'");
    expect(app).toContain('retentionWorkspaceConfirmation');
  });
});
