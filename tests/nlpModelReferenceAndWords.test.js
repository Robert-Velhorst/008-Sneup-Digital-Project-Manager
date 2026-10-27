const mongoose = require('mongoose');
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock('../src/models/Card', () => ({ findOne: jest.fn() }));
jest.mock('../src/models/Comment', () => ({ find: jest.fn() }));
jest.mock('../src/models/Member', () => ({ findOne: jest.fn() }));
jest.mock('../src/services/workspaceScopeService', () => ({
  getDefaultWorkspaceObjectId: () => 'default-workspace',
  normalizeWorkspaceObjectId: value => value,
  workspacePopulate: (workspaceId, paths) => ({ workspaceId, paths })
}));
const Card = require('../src/models/Card');
const Comment = require('../src/models/Comment');
const Member = require('../src/models/Member');
const nlp = require('../src/services/nlpService');

describe('NLP identifier queries and literal word counts', () => {
  const workspaceId = new mongoose.Types.ObjectId('0123456789abcdef01234567');
  const id = 'abcdef0123456789abcdef01';
  const prototype = Object.getOwnPropertyDescriptors(Object.prototype);
  beforeEach(() => {
    jest.clearAllMocks();
    Card.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    Comment.find.mockResolvedValue([]);
    Member.findOne.mockResolvedValue(null);
  });
  afterEach(() => expect(Object.getOwnPropertyDescriptors(Object.prototype)).toEqual(prototype));
  const invalid = [
    ['not-equal operator', { $ne: null }], ['comparison operator', { $gt: '' }],
    ['implicit array selector', [id]], ['regular expression', /.*/],
    ['number', 1], ['boolean', true], ['null', null], ['undefined', undefined], ['empty identifier', '']
  ];
  test.each(invalid)('card analysis rejects %s before its model query', async (_name, value) => {
    await expect(nlp.analyzeCardContent(value, { workspaceId })).resolves.toBeNull();
    expect(Card.findOne).not.toHaveBeenCalled();
    expect(Comment.find).not.toHaveBeenCalled();
    expect(Member.findOne).not.toHaveBeenCalled();
  });
  test.each(invalid)('member analysis rejects %s before its model query', async (_name, value) => {
    await expect(nlp.analyzeMemberLanguagePatterns(value, { workspaceId })).resolves.toBeNull();
    expect(Card.findOne).not.toHaveBeenCalled();
    expect(Comment.find).not.toHaveBeenCalled();
    expect(Member.findOne).not.toHaveBeenCalled();
  });
  test.each([id, new mongoose.Types.ObjectId(id)])('card analysis keeps valid reference %s and workspace', async value => {
    await expect(nlp.analyzeCardContent(value, { workspaceId })).resolves.toBeNull();
    expect(Card.findOne).toHaveBeenCalledWith({ _id: value, workspaceId });
    expect(Card.findOne).toHaveBeenCalledTimes(1);
  });
  test.each([id, new mongoose.Types.ObjectId(id)])('member analysis keeps valid reference %s and workspace', async value => {
    await expect(nlp.analyzeMemberLanguagePatterns(value, { workspaceId })).resolves.toBeNull();
    expect(Comment.find).toHaveBeenCalledWith({ memberId: value, workspaceId });
    expect(Comment.find).toHaveBeenCalledTimes(1);
  });
  test('real NLP primitives count constructor words numerically and persist finite style scores', async () => {
    Comment.find.mockResolvedValue([{ text: 'constructor constructor reliable reliable reliable' }]);
    const member = { save: jest.fn().mockResolvedValue(undefined) };
    Member.findOne.mockResolvedValue(member);
    const result = await nlp.analyzeMemberLanguagePatterns(id, { workspaceId });
    expect(result).not.toBeNull();
    expect(result.frequentWords).toEqual([{ word: 'reliable', count: 3 }, { word: 'constructor', count: 2 }]);
    expect(Number.isFinite(result.averageSentiment)).toBe(true);
    expect(Member.findOne).toHaveBeenCalledWith({ _id: id, workspaceId });
    expect(member.save).toHaveBeenCalledTimes(1);
    expect(Number.isFinite(member.communicationStyle.sentimentAverage)).toBe(true);
  });
});
