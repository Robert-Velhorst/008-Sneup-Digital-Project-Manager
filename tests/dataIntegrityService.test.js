const mongoose = require('mongoose');
const { DataIntegrityService, APPLY_CONFIRMATION, workloadForCount } = require('../src/services/dataIntegrityService');
const { parseArgs } = require('../scripts/repair-data-integrity');

const findResult = value => ({
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  maxTimeMS: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(value)
});

const model = rows => ({
  find: jest.fn(query => findResult(rows.filter(row =>
    (typeof query.status !== 'string' || row.status === query.status)
    && (!query._id?.$gt || String(row._id) > String(query._id.$gt))))),
  updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
});

describe('data integrity repair', () => {
  const workspaceId = new mongoose.Types.ObjectId();
  const listId = new mongoose.Types.ObjectId();
  const memberId = new mongoose.Types.ObjectId();
  const cardA = new mongoose.Types.ObjectId();
  const cardB = new mongoose.Types.ObjectId();

  const dependencies = () => {
    const List = model([{ _id: listId, name: 'Doing', cardCount: 9 }]);
    const Member = model([{
      _id: memberId,
      fullName: 'Project Manager',
      assignedCards: [cardA],
      workloadLevel: 'overloaded'
    }]);
    const Card = {
      aggregate: jest.fn(pipeline => {
        const group = pipeline.find(stage => stage.$group)?.$group || {};
        return Promise.resolve(group.count
          ? [{ _id: listId, count: 2 }]
          : [{ _id: memberId, cardIds: [cardA, cardB] }]);
      })
    };
    const ledger = { recordAudit: jest.fn().mockResolvedValue({}) };
    return {
      models: {
        List, Member, Card,
        TrelloActionAttempt: model([]),
        NotificationDelivery: model([]),
        Recommendation: model([]),
        Approval: model([]),
        WorkerResponse: model([]),
        WebhookDelivery: model([]),
        JobRun: model([])
      },
      ledger
    };
  };

  test('scans without writes and reports only bounded safe derived-state repairs', async () => {
    const deps = dependencies();
    const service = new DataIntegrityService(deps);
    const report = await service.scan({ workspaceId, skipDatabaseCheck: true, limit: 20 });

    expect(report.summary).toEqual({ findings: 2, repairable: 2, reviewRequired: 0 });
    expect(report.providerWrites).toBe(false);
    expect(report.findings.map(item => item.category)).toEqual(expect.arrayContaining(['list_card_count', 'member_assignment_cache']));
    expect(deps.models.List.updateOne).not.toHaveBeenCalled();
    expect(deps.models.Member.updateOne).not.toHaveBeenCalled();
    expect(service.publicReport(report)).not.toHaveProperty('repairStates');
  });

  test('requires explicit confirmation, re-scans, updates atomically, and audits each repair', async () => {
    const deps = dependencies();
    const service = new DataIntegrityService(deps);
    const report = await service.scan({ workspaceId, skipDatabaseCheck: true, limit: 20 });
    const fingerprints = report.findings.map(item => item.fingerprint);

    await expect(service.apply({ workspaceId, skipDatabaseCheck: true, fingerprints }))
      .rejects.toMatchObject({ code: 'REPAIR_CONFIRMATION_REQUIRED' });

    const result = await service.apply({
      workspaceId,
      skipDatabaseCheck: true,
      fingerprints,
      confirm: APPLY_CONFIRMATION,
      actor: 'admin-1',
      source: 'api'
    });

    expect(result).toMatchObject({ providerWrites: false, requested: 2, repaired: 2, skipped: 0 });
    expect(deps.models.List.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: listId, workspaceId, cardCount: 9 }),
      { $set: { cardCount: 2 } }
    );
    expect(deps.models.Member.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: memberId, workspaceId, workloadLevel: 'overloaded' }),
      { $set: { assignedCards: [String(cardA), String(cardB)].sort(), workloadLevel: 'normal' } }
    );
    expect(deps.ledger.recordAudit).toHaveBeenCalledTimes(2);
    expect(deps.ledger.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'derived_state_repaired',
      actor: 'admin-1',
      source: 'api',
      afterState: expect.objectContaining({ providerWrite: false })
    }));
  });

  test('keeps provider ambiguity, delivery claims, executions, and stale jobs review-only', async () => {
    const now = new Date('2026-08-09T12:00:00.000Z');
    const empty = model([]);
    const service = new DataIntegrityService({
      now: () => now,
      models: {
        List: empty,
        Member: empty,
        Card: { aggregate: jest.fn() },
        Approval: model([]), WorkerResponse: model([]), WebhookDelivery: model([]),
        TrelloActionAttempt: model([{ _id: new mongoose.Types.ObjectId(), actionType: 'move_card', status: 'failed' }]),
        NotificationDelivery: model([{ _id: new mongoose.Types.ObjectId(), channel: 'webhook', status: 'sending', updatedAt: new Date('2026-08-09T10:00:00Z') }]),
        Recommendation: model([{ _id: new mongoose.Types.ObjectId(), title: 'Move work', status: 'executing', updatedAt: new Date('2026-08-09T10:00:00Z') }]),
        JobRun: model([{ _id: new mongoose.Types.ObjectId(), jobName: 'sync', status: 'running', startedAt: new Date('2026-08-09T08:00:00Z'), staleAfterMinutes: 30 }])
      }
    });

    const report = await service.scan({ workspaceId, skipDatabaseCheck: true, limit: 20 });
    expect(report.summary).toEqual({ findings: 4, repairable: 0, reviewRequired: 4 });
    expect(report.findings.every(item => item.repairable === false)).toBe(true);
    expect(report.findings.map(item => item.category)).toEqual(expect.arrayContaining([
      'trello_reconciliation_required',
      'stranded_notification_delivery',
      'stranded_recommendation_execution',
      'stale_job_run'
    ]));
  });

  test('rolls a derived-state update back when its audit cannot be recorded', async () => {
    const deps = dependencies();
    deps.ledger.recordAudit.mockRejectedValue(new Error('audit unavailable'));
    const service = new DataIntegrityService(deps);
    const report = await service.scan({ workspaceId, skipDatabaseCheck: true, limit: 20 });

    const result = await service.apply({
      workspaceId,
      skipDatabaseCheck: true,
      fingerprints: report.findings.map(item => item.fingerprint),
      confirm: APPLY_CONFIRMATION
    });

    expect(result).toMatchObject({ repaired: 0, skipped: 2, providerWrites: false });
    expect(result.results.every(item => /rolled back/i.test(item.reason))).toBe(true);
    expect(deps.models.List.updateOne).toHaveBeenCalledTimes(2);
    expect(deps.models.Member.updateOne).toHaveBeenCalledTimes(2);
    expect(deps.models.List.updateOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ cardCount: 2 }),
      { $set: { cardCount: 9 } }
    );
  });

  test('uses the existing workload thresholds and parses a fail-closed CLI', () => {
    expect([workloadForCount(0), workloadForCount(2), workloadForCount(5), workloadForCount(6)])
      .toEqual(['light', 'normal', 'heavy', 'overloaded']);
    expect(parseArgs(['--workspace', 'team-a', '--limit', '40', '--json']))
      .toEqual({ apply: false, json: true, workspace: 'team-a', limit: '40' });
    expect(() => parseArgs(['--confirm', APPLY_CONFIRMATION])).toThrow(/only valid together/i);
    expect(parseArgs(['--apply', '--confirm', APPLY_CONFIRMATION]).apply).toBe(true);
  });

  test('surfaces pending response and held webhook evidence without exposing source content', async () => {
    const deps = dependencies();
    const responseId = new mongoose.Types.ObjectId();
    const deliveryId = new mongoose.Types.ObjectId();
    deps.models.WorkerResponse = model([{ _id: responseId, claimState: 'pending', recommendationId: cardA, interventionId: cardB, createdAt: new Date(0), responseText: 'PRIVATE', responseType: 'completed' }]);
    deps.models.WebhookDelivery = model([{ _id: deliveryId, status: 'reconciliation_required', connectorAccountId: memberId, deliveryId: 'PRIVATE-SOURCE-ID', updatedAt: new Date(0) }]);
    const service = new DataIntegrityService(deps);
    const report = await service.scan({ workspaceId, skipDatabaseCheck: true, limit: 20 });
    const recovery = report.findings.filter(item => ['pending_worker_response', 'quarantined_worker_webhook'].includes(item.category));
    expect(recovery).toHaveLength(2);
    expect(recovery.every(item => !item.repairable)).toBe(true);
    expect(JSON.stringify(recovery)).not.toMatch(/PRIVATE|completed/);
    expect(recovery.find(item => item.entityId === String(responseId)).current).toMatchObject({ recommendationId: String(cardA), interventionId: String(cardB), claimState: 'pending' });
    expect(deps.models.WorkerResponse.find).toHaveBeenCalledWith({ workspaceId, claimState: 'pending', createdAt: { $lte: expect.any(Date) } });
    expect(deps.models.WebhookDelivery.find).toHaveBeenCalledWith({ workspaceId, status: 'reconciliation_required', updatedAt: { $lte: expect.any(Date) } });
    const result = await service.apply({ workspaceId, skipDatabaseCheck: true, fingerprints: recovery.map(item => item.fingerprint), confirm: APPLY_CONFIRMATION });
    expect(result).toMatchObject({ repaired: 0, skipped: 2 });
    expect(deps.models.WorkerResponse.updateOne).not.toHaveBeenCalled();
    expect(deps.models.WebhookDelivery.updateOne).not.toHaveBeenCalled();
    expect(deps.ledger.recordAudit).not.toHaveBeenCalled();
  });

  test('checks exact active approval references in one bounded workspace lookup', async () => {
    const deps = dependencies();
    const validId = new mongoose.Types.ObjectId();
    const wrongId = new mongoose.Types.ObjectId();
    const missingId = new mongoose.Types.ObjectId();
    deps.models.Recommendation = model([
      { _id: cardA, status: 'approved', currentApprovalId: validId },
      { _id: cardB, status: 'approved', currentApprovalId: wrongId },
      { _id: listId, status: 'approved', currentApprovalId: missingId },
      { _id: memberId, status: 'approved' }
    ]);
    deps.models.Approval = model([
      { _id: validId, workspaceId, recommendationId: cardA, decision: 'approved' },
      { _id: wrongId, workspaceId, recommendationId: cardA, decision: 'approved' }
    ]);
    const report = await new DataIntegrityService(deps).scan({ workspaceId, skipDatabaseCheck: true });
    const approvals = report.findings.filter(item => item.category === 'invalid_active_approval');
    expect(approvals.map(item => item.entityId).sort()).toEqual([cardB, listId, memberId].map(String).sort());
    expect(approvals.every(item => !item.repairable)).toBe(true);
    expect(deps.models.Approval.find).toHaveBeenCalledTimes(1);
    expect(deps.models.Approval.find).toHaveBeenCalledWith({ workspaceId, _id: { $in: [validId, wrongId, missingId] } });
  });

  test('review-required evidence cannot be crowded out by cache repairs at the result cap', async () => {
    const deps = dependencies();
    deps.models.WorkerResponse = model([{ _id: cardA, claimState: 'pending', createdAt: new Date(0) }]);
    const report = await new DataIntegrityService(deps).scan({ workspaceId, skipDatabaseCheck: true, limit: 1 });
    expect(report.truncated).toBe(true);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].category).toBe('pending_worker_response');
    expect(report.summary).toEqual({ findings: 1, repairable: 0, reviewRequired: 1 });
  });

  test('category continuation advances past healthy approvals to a broken reference', async () => {
    const deps = dependencies();
    const first = new mongoose.Types.ObjectId();
    const second = new mongoose.Types.ObjectId();
    const approvalId = new mongoose.Types.ObjectId();
    deps.models.Recommendation = model([
      { _id: first, status: 'approved', currentApprovalId: approvalId },
      { _id: second, status: 'approved' }
    ]);
    deps.models.Approval = model([{ _id: approvalId, workspaceId, recommendationId: first, decision: 'approved' }]);
    const service = new DataIntegrityService(deps);
    const options = { workspaceId, skipDatabaseCheck: true, category: 'invalid_active_approval', limit: 1 };
    const initial = await service.scan(options);
    expect(initial.findings).toHaveLength(0);
    expect(initial.nextAfterId).toBe(String(first));
    const next = await service.scan({ ...options, afterId: initial.nextAfterId });
    expect(next.findings).toMatchObject([{ category: 'invalid_active_approval', entityId: String(second) }]);
    expect(next.nextAfterId).toBeNull();
    expect(deps.models.List.find).not.toHaveBeenCalled();
  });

  test('category selection makes recovery evidence reachable behind a full review page', async () => {
    const deps = dependencies();
    deps.models.TrelloActionAttempt = model([{ _id: cardA, status: 'failed' }]);
    deps.models.WorkerResponse = model([{ _id: cardB, claimState: 'pending', createdAt: new Date(0) }]);
    const service = new DataIntegrityService(deps);
    const options = { workspaceId, skipDatabaseCheck: true, limit: 1 };
    expect((await service.scan(options)).findings[0].category).toBe('trello_reconciliation_required');
    deps.models.TrelloActionAttempt.find.mockClear();
    const filtered = await service.scan({ ...options, category: 'pending_worker_response' });
    expect(filtered.findings[0].category).toBe('pending_worker_response');
    expect(deps.models.TrelloActionAttempt.find).not.toHaveBeenCalled();
    for (const invalid of [{ category: 'unknown' }, { afterId: String(cardA) }, { category: 'invalid_active_approval', afterId: { $gt: '' } }]) {
      await expect(service.scan({ ...options, ...invalid })).rejects.toMatchObject({ statusCode: 400 });
    }
  });
});
