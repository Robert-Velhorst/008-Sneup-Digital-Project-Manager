describe('approved Trello execution ambiguity', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    delete process.env.SNEUP_DEMO_MODE;
    delete process.env.SNEUP_PROVIDER_WRITES_DISABLED;
  });

  test('persists reconciliation evidence and keeps an ambiguous provider write claimed', async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const actionPayload = {
      executable: true,
      draftOnly: false,
      cardTrelloId: 'trello-card-1',
      commentText: 'Please share the next action.'
    };
    const recommendation = {
      _id: 'recommendation-1',
      workspaceId: 'workspace-1',
      boardId: 'board-1',
      cardId: 'card-1',
      interventionId: null,
      actionType: 'comment',
      riskLevel: 'medium',
      requiresApproval: true,
      status: 'approved',
      approvalExpiresAt: expiresAt,
      actionPayload,
      save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn(() => ({ _id: 'recommendation-1', status: recommendation.status }))
    };
    const approval = {
      _id: 'approval-1',
      approvedPayloadSnapshot: { ...actionPayload },
      expiresAt,
      decidedBy: 'owner-1'
    };
    const attempt = {
      _id: 'attempt-1',
      status: 'in_progress',
      save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn(() => ({
        _id: 'attempt-1',
        status: attempt.status,
        reconciliation: attempt.reconciliation
      }))
    };
    const auditCreate = jest.fn().mockResolvedValue({ _id: 'audit-1' });
    const providerWrite = jest.fn().mockRejectedValue(
      Object.assign(new Error('timeout of 15000ms exceeded'), { code: 'ECONNABORTED' })
    );

    jest.doMock('../src/models/Recommendation', () => ({
      findOne: jest.fn().mockResolvedValue(recommendation),
      findOneAndUpdate: jest.fn().mockImplementation(async (query, update) => {
        if (query.status !== 'approved') return null;
        recommendation.status = update.$set.status;
        return recommendation;
      })
    }));
    jest.doMock('../src/models/Approval', () => ({
      findOne: jest.fn(() => ({ sort: jest.fn().mockResolvedValue(approval) }))
    }));
    jest.doMock('../src/models/TrelloActionAttempt', () => ({
      create: jest.fn().mockResolvedValue(attempt)
    }));
    jest.doMock('../src/models/AuditEvent', () => ({ create: auditCreate }));
    jest.doMock('../src/models/Workspace', () => ({
      findById: jest.fn(() => ({ select: jest.fn().mockResolvedValue({ status: 'active' }) }))
    }));
    jest.doMock('../src/services/policyRuleService', () => ({
      resolveEffectivePolicy: jest.fn().mockResolvedValue({ enabled: true, requiresApproval: true })
    }));
    jest.doMock('../src/services/trelloClient', () => ({
      cardApi: { addComment: providerWrite }
    }));
    jest.doMock('../src/services/workspaceScopeService', () => ({
      normalizeWorkspaceObjectId: jest.fn(value => value)
    }));

    const operationsLedgerService = require('../src/services/operationsLedgerService');
    jest.spyOn(operationsLedgerService, 'isDatabaseReady').mockReturnValue(true);

    await expect(operationsLedgerService.executeApprovedRecommendation(recommendation._id, {
      workspaceId: recommendation.workspaceId,
      actor: 'owner-1'
    })).rejects.toMatchObject({
      code: 'SNEUP_TRELLO_WRITE_RECONCILIATION_REQUIRED',
      requiresReconciliation: true
    });

    expect(providerWrite).toHaveBeenCalledTimes(1);
    expect(recommendation.status).toBe('executing');
    expect(attempt).toMatchObject({
      status: 'failed',
      reconciliation: {
        status: 'required',
        confirmedSteps: [],
        pendingSteps: ['comment_posted'],
        detectedAt: expect.any(Date)
      }
    });
    expect(attempt.save).toHaveBeenCalledTimes(1);
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      action: 'trello_action_partial_result_requires_reconciliation',
      actor: 'owner-1',
      source: 'trello',
      trelloActionAttemptId: attempt._id
    }));
  });
});
