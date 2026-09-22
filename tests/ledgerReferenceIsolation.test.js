const mongoose = require('mongoose');
const service = require('../src/services/operationsLedgerService');
const { workspacePopulate, normalizeWorkspaceObjectId } = require('../src/services/workspaceScopeService');

const cases = [
  ['listRecommendations', 'Recommendation', 'boardId cardId memberId interventionId'],
  ['listDecisionQueue', 'DecisionQueueItem', 'recommendationId boardId cardId'],
  ['listTrelloActions', 'TrelloActionAttempt', 'recommendationId interventionId approvalId boardId cardId'],
  ['listInterventionOutcomes', 'OutcomeRecord', 'recommendationId interventionId actionAttemptId boardId cardId'],
  ['listFollowUps', 'FollowUpPlan', 'recommendationId interventionId boardId cardId memberId']
];

describe('ledger reference isolation', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each(cases)('%s scopes every population to the resolved root workspace', async (method, modelName, paths) => {
    jest.spyOn(service, 'requireDatabase').mockImplementation(() => {});
    const model = require(`../src/models/${modelName}`);
    for (const workspaceId of [undefined, 'custom-workspace', new mongoose.Types.ObjectId(), '507f1f77bcf86cd799439011']) {
      const query = { sort: jest.fn().mockReturnThis(), populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) };
      const find = jest.spyOn(model, 'find').mockReturnValue(query);
      await expect(service[method]({ workspaceId, lean: true })).resolves.toEqual([]);
      const scope = find.mock.calls.at(-1)[0].workspaceId;
      expect(scope).toEqual(normalizeWorkspaceObjectId(workspaceId));
      expect(query.populate).toHaveBeenCalledWith(paths.split(' ').map(path => ({
        path, match: { workspaceId: scope }, options: { maxTimeMS: 5000 }
      })));
    }
  });

  test('requires an explicit scope and retains projection and bounded caller timeout', () => {
    expect(() => workspacePopulate(undefined, 'boardId')).toThrow('Workspace is required');
    const scope = new mongoose.Types.ObjectId();
    expect(workspacePopulate(String(scope), 'boardId cardId', { select: 'name', maxTimeMS: 2400 })).toEqual([
      { path: 'boardId', match: { workspaceId: scope }, options: { maxTimeMS: 2400 }, select: 'name' },
      { path: 'cardId', match: { workspaceId: scope }, options: { maxTimeMS: 2400 }, select: 'name' }
    ]);
  });
});
