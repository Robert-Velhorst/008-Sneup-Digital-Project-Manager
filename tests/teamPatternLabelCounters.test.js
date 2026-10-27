jest.mock('../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
for (const model of ['Board', 'List', 'Card', 'Comment']) {
  jest.doMock(`../src/models/${model}`, () => ({}));
}
jest.mock('../src/models/Member', () => ({ find: jest.fn() }));
jest.mock('../src/services/workspaceScopeService', () => ({
  getDefaultWorkspaceObjectId: () => 'default-workspace',
  normalizeWorkspaceObjectId: value => value,
  workspacePopulate: (workspaceId, paths) => ({ workspaceId, paths })
}));

const Member = require('../src/models/Member');
const { analyzeTeamPatterns } = require('../src/services/contextAnalyzer');
const logger = require('../src/utils/logger');

// Only the database/provider boundary is substituted; the production analyzer runs unchanged.
describe('team pattern counters treat external labels as data', () => {
  const workspaceId = '0123456789abcdef01234567';
  const prototype = Object.getOwnPropertyDescriptors(Object.prototype);
  const board = { _id: 'abcdef0123456789abcdef01', name: 'Primary board' };
  const otherBoard = { _id: 'abcdef0123456789abcdef02', name: 'Other board' };
  let member;

  beforeEach(() => {
    jest.clearAllMocks();
    member = {
      _id: 'abcdef0123456789abcdef03', username: 'member', fullName: 'Member',
      workloadLevel: 'balanced', boards: [board, otherBoard], assignedCards: [], save: jest.fn().mockResolvedValue(undefined)
    };
    Member.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([member]) });
  });
  afterEach(() => {
    expect(Object.getOwnPropertyDescriptors(Object.prototype)).toEqual(prototype);
    expect(logger.error).not.toHaveBeenCalled();
    expect(Member.find).toHaveBeenCalledWith({ workspaceId });
  });
  const cards = names => Array.from({ length: 3 }, () => ({ boardId: board, labels: names.map(name => ({ name })) }));

  test.each(['__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty', 'valueOf', '__defineGetter__', 'Bug'])
  ('counts the literal label %s and persists its numeric specialty', async name => {
    member.assignedCards = cards([name]);
    const result = await analyzeTeamPatterns({ workspaceId });
    expect(result).toHaveLength(1);
    expect(result[0].commonCardTypes).toEqual([{ type: name.toLowerCase(), count: 3, percentage: 100 }]);
    expect(result[0].specialties).toEqual([name.toLowerCase()]);
    expect(member.specialties).toEqual([name.toLowerCase()]);
    expect(member.save).toHaveBeenCalledTimes(1);
    expect(result[0].boardFocus).toEqual([{ boardId: board._id, boardName: board.name, cardCount: 3, percentage: 100 }]);
  });

  test('counts mixed inherited names and ordinary labels independently', async () => {
    member.assignedCards = cards(['__proto__', 'constructor', 'Bug']);
    const result = await analyzeTeamPatterns({ workspaceId });
    expect(result[0].commonCardTypes).toEqual([
      { type: '__proto__', count: 3, percentage: 100 },
      { type: 'constructor', count: 3, percentage: 100 },
      { type: 'bug', count: 3, percentage: 100 }
    ]);
    expect(member.specialties).toEqual(['__proto__', 'constructor', 'bug']);
    expect(member.save).toHaveBeenCalledTimes(1);
  });

  test('keeps board grouping, order and percentages for normal identifiers', async () => {
    member.assignedCards = cards(['Bug']);
    member.assignedCards[2].boardId = otherBoard;
    const result = await analyzeTeamPatterns({ workspaceId });
    expect(result[0].boardFocus).toEqual([
      { boardId: board._id, boardName: board.name, cardCount: 2, percentage: 67 },
      { boardId: otherBoard._id, boardName: otherBoard.name, cardCount: 1, percentage: 33 }
    ]);
    expect(result[0].totalAssignedCards).toBe(3);
    expect(member.save).toHaveBeenCalledTimes(1);
  });
});
