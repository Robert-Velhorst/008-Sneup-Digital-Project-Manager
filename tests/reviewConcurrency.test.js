const loadService = ({ recommendationModel, approvalModel, decisionQueueModel, policyRuleService } = {}) => {
  jest.resetModules();
  jest.dontMock('../src/services/operationsLedgerService');
  jest.doMock('../src/models/Recommendation', () => recommendationModel || {});
  jest.doMock('../src/models/Approval', () => approvalModel || {});
  jest.doMock('../src/models/DecisionQueueItem', () => decisionQueueModel || {});
  jest.doMock('../src/services/policyRuleService', () => policyRuleService || {});
  jest.doMock('../src/services/workspaceScopeService', () => ({
    normalizeWorkspaceObjectId: jest.fn(value => value)
  }));
  const service = require('../src/services/operationsLedgerService');
  jest.spyOn(service, 'isDatabaseReady').mockReturnValue(true);
  return service;
};

describe('approval and decision queue concurrency safeguards', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test('cleans up a losing approval when the recommendation revision changed', async () => {
    const recommendation = {
      _id: 'recommendation-1',
      workspaceId: 'workspace-1',
      __v: 4,
      status: 'pending',
      recommendedAction: 'Post the reviewed follow-up',
      actionPayload: { cardTrelloId: 'card-1', commentText: 'Please share the next action.' },
      riskLevel: 'medium'
    };
    const approval = {
      _id: 'approval-loser',
      workspaceId: 'workspace-1',
      recommendationId: 'recommendation-1',
      decidedAt: new Date('2026-08-14T08:00:00.000Z'),
      expiresAt: new Date('2026-08-17T08:00:00.000Z'),
      approvedPayloadSnapshot: recommendation.actionPayload
    };
    const findOneAndUpdate = jest.fn().mockResolvedValue(null);
    const deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
    const service = loadService({
      recommendationModel: {
        findOne: jest.fn().mockResolvedValue(recommendation),
        findOneAndUpdate
      },
      approvalModel: {
        create: jest.fn().mockResolvedValue(approval),
        deleteOne
      }
    });

    await expect(service.approveRecommendation('recommendation-1', {
      workspaceId: 'workspace-1',
      decidedBy: 'owner-1'
    })).rejects.toMatchObject({
      code: 'SNEUP_RECOMMENDATION_REVIEW_CONFLICT',
      statusCode: 409
    });

    expect(findOneAndUpdate).toHaveBeenCalledWith({
      _id: 'recommendation-1',
      workspaceId: 'workspace-1',
      status: 'pending',
      __v: 4
    }, expect.objectContaining({
      $set: expect.objectContaining({
        status: 'approved',
        currentApprovalId: 'approval-loser'
      }),
      $inc: { __v: 1 }
    }), { new: true, runValidators: true });
    expect(deleteOne).toHaveBeenCalledWith({
      _id: 'approval-loser',
      workspaceId: 'workspace-1',
      recommendationId: 'recommendation-1'
    });
  });

  test('binds a successful review to one exact current approval', async () => {
    const recommendation = {
      _id: 'recommendation-1',
      workspaceId: 'workspace-1',
      __v: 2,
      status: 'pending',
      recommendedAction: 'Post the reviewed follow-up',
      actionPayload: { cardTrelloId: 'card-1', commentText: 'Please share the next action.' },
      riskLevel: 'high'
    };
    const approval = {
      _id: 'approval-current',
      workspaceId: 'workspace-1',
      recommendationId: 'recommendation-1',
      decidedAt: new Date('2026-08-14T08:00:00.000Z'),
      expiresAt: new Date('2026-08-15T08:00:00.000Z'),
      approvedPayloadSnapshot: recommendation.actionPayload,
      decidedBy: 'owner-1',
      decisionReason: '',
      toObject: () => ({ _id: 'approval-current', decision: 'approved' })
    };
    const approvedRecommendation = {
      ...recommendation,
      __v: 3,
      status: 'approved',
      currentApprovalId: approval._id
    };
    const updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const service = loadService({
      recommendationModel: {
        findOne: jest.fn().mockResolvedValue(recommendation),
        findOneAndUpdate: jest.fn().mockResolvedValue(approvedRecommendation)
      },
      approvalModel: {
        create: jest.fn().mockResolvedValue(approval),
        deleteOne: jest.fn()
      },
      decisionQueueModel: { updateMany }
    });
    jest.spyOn(service, 'recordAudit').mockResolvedValue({});
    jest.spyOn(service, 'recordRecommendationLearningFeedback').mockResolvedValue({});

    const result = await service.approveRecommendation('recommendation-1', {
      workspaceId: 'workspace-1',
      decidedBy: 'owner-1'
    });

    expect(result.recommendation).toBe(approvedRecommendation);
    expect(result.recommendation.currentApprovalId).toBe('approval-current');
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'workspace-1',
      recommendationId: 'recommendation-1'
    }), expect.objectContaining({ status: 'approved' }));
  });

  test('never lets a stale open queue item rewrite a terminal recommendation', async () => {
    const item = {
      _id: 'decision-1',
      workspaceId: 'workspace-1',
      recommendationId: 'recommendation-executed',
      status: 'open',
      ownerType: 'robert',
      __v: 1,
      toObject: () => ({ _id: 'decision-1', status: 'open' })
    };
    const recommendationUpdate = jest.fn().mockResolvedValue(null);
    const queueUpdate = jest.fn();
    const service = loadService({
      recommendationModel: { findOneAndUpdate: recommendationUpdate },
      decisionQueueModel: {
        findOne: jest.fn().mockResolvedValue(item),
        findOneAndUpdate: queueUpdate
      }
    });

    await expect(service.delegateDecisionQueueItem('decision-1', {
      workspaceId: 'workspace-1',
      ownerType: 'team'
    })).rejects.toMatchObject({
      code: 'SNEUP_DECISION_QUEUE_STALE',
      statusCode: 409
    });

    expect(recommendationUpdate).toHaveBeenCalledWith({
      _id: 'recommendation-executed',
      workspaceId: 'workspace-1',
      status: 'pending'
    }, expect.objectContaining({
      $set: { ownerType: 'team', status: 'delegated' }
    }), { new: true, runValidators: true });
    expect(queueUpdate).not.toHaveBeenCalled();
  });

  test('rejects terminal queue actions before touching their recommendation', async () => {
    const recommendationUpdate = jest.fn();
    const service = loadService({
      recommendationModel: { findOneAndUpdate: recommendationUpdate },
      decisionQueueModel: {
        findOne: jest.fn().mockResolvedValue({
          _id: 'decision-approved',
          workspaceId: 'workspace-1',
          recommendationId: 'recommendation-1',
          status: 'approved'
        })
      }
    });

    await expect(service.snoozeDecisionQueueItem('decision-approved', {
      workspaceId: 'workspace-1'
    })).rejects.toMatchObject({
      code: 'SNEUP_DECISION_QUEUE_TERMINAL',
      statusCode: 409
    });
    expect(recommendationUpdate).not.toHaveBeenCalled();
  });

  test('treats only the recommendation current approval as executable authority', () => {
    const service = loadService();
    const expiry = new Date('2026-08-15T08:00:00.000Z');
    const recommendation = {
      currentApprovalId: 'approval-current',
      approvalExpiresAt: expiry
    };

    expect(service.isApprovalCurrent({
      _id: 'approval-stale',
      expiresAt: expiry
    }, recommendation, new Date('2026-08-14T08:00:00.000Z'))).toBe(false);
    expect(service.isApprovalCurrent({
      _id: 'approval-current',
      expiresAt: expiry
    }, recommendation, new Date('2026-08-14T08:00:00.000Z'))).toBe(true);
  });
});
