const document = fields => ({ ...fields, toObject() { const { toObject, ...data } = this; return data; } });
const readQuery = value => ({
  read: jest.fn().mockReturnThis(),
  maxTimeMS: jest.fn().mockReturnThis(),
  setOptions: jest.fn().mockReturnThis(),
  exec: jest.fn().mockImplementation(async () => {
    if (value instanceof Error) throw value;
    return value;
  })
});

const setup = (recovery = 'saved') => {
  jest.resetModules();
  const recommendation = document({
    _id: 'recommendation', workspaceId: 'workspace', __v: 4, status: 'pending',
    recommendedAction: 'Review this exact draft', riskLevel: 'medium', actionPayload: { draftOnly: true }
  });
  const approval = document({
    _id: 'decision', workspaceId: 'workspace', recommendationId: recommendation._id,
    decidedBy: 'owner', approvedPayloadSnapshot: recommendation.actionPayload
  });
  const response = document({
    _id: 'response', workspaceId: 'workspace', interventionId: 'intervention',
    recommendationId: recommendation._id, memberId: 'member', responseType: 'completed', source: 'manual'
  });
  const error = new Error('confirmation lost: private database detail');
  let saved;
  const recoveryQuery = readQuery(null);
  recoveryQuery.exec.mockImplementation(async () => {
    if (recovery === 'error') throw new Error('private read failure');
    return recovery === 'saved' ? saved : null;
  });
  const recommendationModel = {
    findOne: jest.fn().mockImplementation(query => query.lastReviewDecisionId ? recoveryQuery : Promise.resolve(recommendation)),
    findOneAndUpdate: jest.fn().mockImplementation(async (query, update) => {
      saved = document({ ...recommendation, ...update.$set, __v: 5 });
      throw error;
    })
  };
  const interventionModel = {
    findOne: jest.fn().mockReturnValue(recoveryQuery),
    findOneAndUpdate: jest.fn().mockImplementation(async (query, update) => {
      saved = document({ _id: 'intervention', workspaceId: 'workspace', ...update.$set });
      throw error;
    })
  };
  const approvalModel = { create: jest.fn().mockResolvedValue(approval), deleteOne: jest.fn() };
  const responseModel = { create: jest.fn().mockResolvedValue(response), deleteOne: jest.fn(), updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }) };
  const queueModel = { updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
  jest.dontMock('../src/services/operationsLedgerService');
  jest.doMock('../src/models/Recommendation', () => recommendationModel);
  jest.doMock('../src/models/Approval', () => approvalModel);
  jest.doMock('../src/models/WorkerResponse', () => responseModel);
  jest.doMock('../src/models/Intervention', () => interventionModel);
  jest.doMock('../src/models/DecisionQueueItem', () => queueModel);
  jest.doMock('../src/services/workspaceScopeService', () => ({ normalizeWorkspaceObjectId: value => value }));
  const service = require('../src/services/operationsLedgerService');
  jest.spyOn(service, 'isDatabaseReady').mockReturnValue(true);
  jest.spyOn(service, 'recordAudit').mockResolvedValue({});
  jest.spyOn(service, 'recordRecommendationLearningFeedback').mockResolvedValue({});
  jest.spyOn(service, 'resolveFollowUpsForWorkerResponse').mockResolvedValue({ modifiedCount: 1, status: 'resolved' });
  return { service, recommendationModel, interventionModel, approvalModel, responseModel, queueModel, recoveryQuery, error };
};

const decisions = [
  ['approveRecommendation', 'approved'],
  ['rejectRecommendation', 'rejected'],
  ['requestRecommendationChange', 'change_requested']
];
const reviewBody = { workspaceId: 'workspace', expectedRevision: 4, decidedBy: 'owner' };
const responseBody = {
  workspaceId: 'workspace', interventionId: 'intervention', recommendationId: 'recommendation',
  memberId: 'member', responseType: 'completed', source: 'manual'
};

afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); jest.resetModules(); });

describe('ledger evidence after a lost write acknowledgement', () => {
  test.each(decisions)('%s recovers only its exact committed decision', async (method, status) => {
    const ctx = setup();
    const result = await ctx.service[method]('recommendation', reviewBody);
    expect(result.recommendation.status).toBe(status);
    expect(ctx.recommendationModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(ctx.recommendationModel.findOne).toHaveBeenLastCalledWith({
      _id: 'recommendation', workspaceId: 'workspace', lastReviewDecisionId: 'decision', status, __v: 5
    });
    expect(ctx.recoveryQuery.read).toHaveBeenCalledWith('primary');
    expect(ctx.recoveryQuery.maxTimeMS).toHaveBeenCalledWith(5000);
    expect(ctx.recoveryQuery.setOptions).toHaveBeenCalledWith({ timeoutMS: 5000 });
    expect(ctx.approvalModel.deleteOne).not.toHaveBeenCalled();
    expect(ctx.queueModel.updateMany).toHaveBeenCalledTimes(1);
    expect(ctx.service.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ approvalId: 'decision' }));
  });

  test.each(decisions)('%s preserves evidence when readback cannot confirm the commit', async (method) => {
    const ctx = setup('missing');
    await expect(ctx.service[method]('recommendation', reviewBody)).rejects.toMatchObject({
      code: 'SNEUP_LEDGER_COMMIT_UNCERTAIN', statusCode: 503
    });
    expect(ctx.approvalModel.deleteOne).not.toHaveBeenCalled();
    expect(ctx.queueModel.updateMany).not.toHaveBeenCalled();
    expect(ctx.service.recordAudit).not.toHaveBeenCalled();
  });

  test('readback failure neither deletes decision evidence nor exposes database details', async () => {
    const ctx = setup('error');
    let failure;
    try { await ctx.service.approveRecommendation('recommendation', reviewBody); } catch (error) { failure = error; }
    expect(failure).toMatchObject({ code: 'SNEUP_LEDGER_COMMIT_UNCERTAIN', statusCode: 503 });
    expect(failure.message).not.toMatch(/private/);
    expect(ctx.approvalModel.deleteOne).not.toHaveBeenCalled();
  });

  test('recovers the worker response before resolving follow-ups and recording its audit', async () => {
    const ctx = setup();
    const result = await ctx.service.recordWorkerResponse(responseBody);
    expect(result._id).toBe('response');
    expect(ctx.interventionModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(ctx.interventionModel.findOne).toHaveBeenCalledWith({
      _id: 'intervention', workspaceId: 'workspace', memberId: 'member',
      'response.workerResponseId': 'response'
    });
    expect(ctx.responseModel.deleteOne).not.toHaveBeenCalled();
    expect(ctx.service.resolveFollowUpsForWorkerResponse).toHaveBeenCalledTimes(1);
    expect(ctx.service.recordAudit).toHaveBeenCalledTimes(2);
  });

  test.each(['missing', 'error'])('preserves uncertain worker evidence after %s readback', async recovery => {
    const ctx = setup(recovery);
    await expect(ctx.service.recordWorkerResponse(responseBody)).rejects.toMatchObject({
      code: 'SNEUP_LEDGER_COMMIT_UNCERTAIN', statusCode: 503
    });
    expect(ctx.responseModel.deleteOne).not.toHaveBeenCalled();
    expect(ctx.service.resolveFollowUpsForWorkerResponse).not.toHaveBeenCalled();
    expect(ctx.service.recordAudit).not.toHaveBeenCalled();
  });

  test('keeps intervention-bound response evidence pending until the exact claim is confirmed', async () => {
    const ctx = setup();
    const response = await ctx.service.recordWorkerResponse(responseBody);
    expect(ctx.responseModel.create).toHaveBeenCalledWith(expect.objectContaining({ claimState: 'pending' }));
    expect(ctx.responseModel.updateOne).toHaveBeenCalledWith({ _id: 'response', workspaceId: 'workspace', claimState: 'pending' }, {
      $set: { claimState: 'confirmed' }
    });
    expect(response.claimState).toBe('confirmed');
  });

  test('failed confirmation marking retains evidence and does not resolve follow-ups', async () => {
    const ctx = setup();
    ctx.responseModel.updateOne.mockRejectedValue(new Error('lost confirmation marking'));
    await expect(ctx.service.recordWorkerResponse(responseBody)).rejects.toMatchObject({ code: 'SNEUP_LEDGER_COMMIT_UNCERTAIN' });
    expect(ctx.responseModel.deleteOne).not.toHaveBeenCalled();
    expect(ctx.service.resolveFollowUpsForWorkerResponse).not.toHaveBeenCalled();
  });

  test('stalled readback stops awaiting after five seconds and never resumes downstream work', async () => {
    const ctx = setup();
    jest.useFakeTimers();
    let finish;
    ctx.recoveryQuery.exec.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const result = ctx.service.approveRecommendation('recommendation', reviewBody).catch(error => error);
    await jest.advanceTimersByTimeAsync(5001);
    expect(await result).toMatchObject({ code: 'SNEUP_LEDGER_COMMIT_UNCERTAIN', statusCode: 503 });
    finish({ status: 'approved' });
    await jest.advanceTimersByTimeAsync(1);
    expect(ctx.queueModel.updateMany).not.toHaveBeenCalled();
    expect(ctx.approvalModel.deleteOne).not.toHaveBeenCalled();
  });
});
