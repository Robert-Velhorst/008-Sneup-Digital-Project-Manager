const mongoose = require('mongoose');

const loadService = ({ workerResponseModel, interventionModel, followUpModel, auditModel } = {}) => {
  jest.resetModules();
  jest.dontMock('../src/services/operationsLedgerService');
  jest.doMock('../src/models/WorkerResponse', () => workerResponseModel || {});
  jest.doMock('../src/models/Intervention', () => interventionModel || {});
  jest.doMock('../src/models/FollowUpPlan', () => followUpModel || {});
  jest.doMock('../src/models/AuditEvent', () => auditModel || {});
  jest.doMock('../src/services/workspaceScopeService', () => ({
    normalizeWorkspaceObjectId: jest.fn(value => value)
  }));
  const service = require('../src/services/operationsLedgerService');
  jest.spyOn(service, 'isDatabaseReady').mockReturnValue(true);
  return service;
};

describe('worker response and follow-up integrity', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test('uses the strongest available identity instead of broad same-card matching', () => {
    const service = loadService();
    const matcher = service.followUpMatcherForWorkerResponse({
      workspaceId: 'workspace-1',
      recommendationId: 'recommendation-1',
      interventionId: 'intervention-1',
      cardId: 'card-1',
      memberId: 'member-1'
    });

    expect(matcher).toEqual({
      workspaceId: 'workspace-1',
      status: { $in: ['scheduled', 'due'] },
      recommendationId: 'recommendation-1'
    });
    expect(matcher).not.toHaveProperty('$or');
    expect(service.workerResponseAuditSource('slack')).toBe('worker');
    expect(service.workerResponseAuditSource('trello_comment')).toBe('trello');
    expect(service.workerResponseAuditSource('manual')).toBe('manual');
  });

  test('removes the losing response when another request already claimed the intervention', async () => {
    const responseId = new mongoose.Types.ObjectId();
    const response = {
      _id: responseId,
      workspaceId: 'workspace-1',
      interventionId: 'intervention-1',
      memberId: 'member-1',
      responseType: 'completed',
      source: 'manual'
    };
    const deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
    const updateMany = jest.fn();
    const auditCreate = jest.fn();
    const service = loadService({
      workerResponseModel: {
        create: jest.fn().mockResolvedValue(response),
        deleteOne
      },
      interventionModel: { findOneAndUpdate: jest.fn().mockResolvedValue(null) },
      followUpModel: { updateMany },
      auditModel: { create: auditCreate }
    });

    await expect(service.recordWorkerResponse({
      workspaceId: 'workspace-1',
      interventionId: 'intervention-1',
      memberId: 'member-1',
      responseType: 'completed',
      source: 'manual'
    })).rejects.toMatchObject({
      code: 'SNEUP_WORKER_RESPONSE_CONFLICT',
      statusCode: 409
    });

    expect(deleteOne).toHaveBeenCalledWith({
      _id: responseId,
      workspaceId: 'workspace-1',
      interventionId: 'intervention-1'
    });
    expect(updateMany).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  test('rejects a stale terminal follow-up before saving a second outcome', async () => {
    const findOneAndUpdate = jest.fn();
    const service = loadService({
      followUpModel: {
        findOne: jest.fn().mockResolvedValue({
          _id: 'follow-up-1',
          workspaceId: 'workspace-1',
          status: 'resolved'
        }),
        findOneAndUpdate
      }
    });

    await expect(service.resolveFollowUp('follow-up-1', {
      workspaceId: 'workspace-1',
      status: 'escalated'
    })).rejects.toMatchObject({
      code: 'SNEUP_FOLLOW_UP_TERMINAL',
      statusCode: 409
    });
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('reports a revision conflict when a competing follow-up resolution wins', async () => {
    const service = loadService({
      followUpModel: {
        findOne: jest.fn().mockResolvedValue({
          _id: 'follow-up-1',
          workspaceId: 'workspace-1',
          recommendationId: 'recommendation-1',
          status: 'due',
          __v: 3
        }),
        findOneAndUpdate: jest.fn().mockResolvedValue(null)
      }
    });

    await expect(service.resolveFollowUp('follow-up-1', {
      workspaceId: 'workspace-1',
      status: 'resolved'
    })).rejects.toMatchObject({
      code: 'SNEUP_FOLLOW_UP_CONFLICT',
      statusCode: 409
    });
  });
});
