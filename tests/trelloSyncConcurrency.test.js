const Board = require('../src/models/Board');
const trelloClient = require('../src/services/trelloClient');
const {
  getBoardSyncConcurrency,
  mapTrelloAttachments,
  parseTrelloActivityAt,
  reconcileBoardMemberAssignments,
  reconcileCardMemberAssignments,
  reconcileListCardIndexes,
  runSerialized,
  syncAllBoards,
  syncBoard,
  syncBoardNow,
  syncRecentActivity
} = require('../src/services/trelloSync');

const workspaceId = '507f1f77bcf86cd799439011';

const waitFor = async (predicate) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  throw new Error('Timed out waiting for Trello board sync workers');
};

const gateWorker = () => {
  const starts = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  return {
    starts,
    release,
    sync: async (board) => {
      starts.push(typeof board === 'string' ? board : board.trelloId);
      await gate;
    }
  };
};

describe('Trello board sync concurrency', () => {
  afterEach(() => jest.restoreAllMocks());

  test('clamps configured Trello board sync concurrency to a safe range', () => {
    expect(getBoardSyncConcurrency('0')).toBe(1);
    expect(getBoardSyncConcurrency('99')).toBe(4);
    expect(getBoardSyncConcurrency('invalid')).toBe(2);
  });

  test('keeps an exact board and active-state index for list reconciliation', () => {
    const indexes = require('../src/models/Card').schema.indexes().map(([fields]) => fields);
    expect(indexes).toContainEqual({ workspaceId: 1, boardId: 1, closed: 1, listId: 1 });
  });

  test('preserves only valid provider activity timestamps instead of treating sync time as card activity', () => {
    expect(parseTrelloActivityAt('2026-07-23T12:34:56.000Z')).toEqual(new Date('2026-07-23T12:34:56.000Z'));
    expect(parseTrelloActivityAt('not-a-date')).toBeNull();
    expect(parseTrelloActivityAt()).toBeNull();
  });

  test('retains only stable linked-card evidence from Trello attachments', () => {
    expect(mapTrelloAttachments([
      { id: 'attachment-1', name: 'Blocker', url: 'https://trello.com/c/Ab12Cd34/blocker' },
      { id: 'attachment-2', name: 'Document', url: 'https://example.com/private.pdf' }
    ])).toEqual([
      { id: 'attachment-1', name: 'Blocker', url: 'https://trello.com/c/Ab12Cd34/blocker', linkedCardShortLink: 'Ab12Cd34' },
      { id: 'attachment-2', name: 'Document', url: 'https://example.com/private.pdf', linkedCardShortLink: undefined }
    ]);
  });

  test('reconciles each card membership into the denormalized worker workload index', async () => {
    const updateMany = jest.spyOn(require('../src/models/Member'), 'updateMany').mockResolvedValue({ acknowledged: true });

    await expect(reconcileCardMemberAssignments({
      cardId: 'card-1',
      workspaceId,
      previousMemberIds: ['member-1', 'member-2'],
      nextMemberIds: ['member-2', 'member-3']
    })).resolves.toEqual({
      addedMemberIds: ['member-3'],
      removedMemberIds: ['member-1']
    });

    expect(updateMany).toHaveBeenNthCalledWith(1,
      { _id: { $in: ['member-3'] }, workspaceId },
      { $addToSet: { assignedCards: 'card-1' } }
    );
    expect(updateMany).toHaveBeenNthCalledWith(2,
      { _id: { $in: ['member-1'] }, workspaceId },
      { $pull: { assignedCards: 'card-1' } }
    );
  });

  test('removes stale board membership without touching active Trello members', async () => {
    const MemberModel = {
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 2 })
    };

    await expect(reconcileBoardMemberAssignments({
      boardId: 'board-1',
      workspaceId,
      activeTrelloMemberIds: ['member-1', 'member-2', 'member-1', '', null, undefined],
      MemberModel
    })).resolves.toEqual({
      activeMemberCount: 2,
      removedBoardMemberships: 2
    });

    expect(MemberModel.updateMany).toHaveBeenCalledWith({
      workspaceId,
      boards: 'board-1',
      trelloId: { $nin: ['member-1', 'member-2'] }
    }, {
      $pull: { boards: 'board-1' }
    });
  });

  test('does not advance board freshness when a detailed sync stage fails', async () => {
    const lastSync = new Date('2026-08-13T12:00:00.000Z');
    const board = {
      _id: 'board-1',
      trelloId: 'board-1',
      workspaceId,
      name: 'Previous name',
      lastSync,
      save: jest.fn().mockResolvedValue(undefined)
    };
    jest.spyOn(trelloClient.boardApi, 'getBoard').mockResolvedValue({
      id: 'board-1',
      name: 'Current name',
      url: 'https://trello.com/b/board-1',
      desc: '',
      closed: false
    });
    jest.spyOn(Board, 'findOne').mockResolvedValue(board);
    const syncLists = jest.fn().mockResolvedValue(undefined);
    const syncMembers = jest.fn().mockRejectedValue(new Error('member sync failed'));
    const syncCards = jest.fn().mockResolvedValue(undefined);

    await expect(syncBoardNow('board-1', { workspaceId, syncLists, syncMembers, syncCards }))
      .rejects.toThrow('member sync failed');

    expect(syncLists).toHaveBeenCalledWith(board);
    expect(syncMembers).toHaveBeenCalledWith(board);
    expect(syncCards).not.toHaveBeenCalled();
    expect(board.lastSync).toBe(lastSync);
    expect(board.save).toHaveBeenCalledTimes(1);
  });

  test('advances board freshness only after every detailed sync stage succeeds', async () => {
    const lastSync = new Date('2026-08-13T12:00:00.000Z');
    const board = {
      _id: 'board-1',
      trelloId: 'board-1',
      workspaceId,
      name: 'Previous name',
      lastSync,
      save: jest.fn().mockResolvedValue(undefined)
    };
    jest.spyOn(trelloClient.boardApi, 'getBoard').mockResolvedValue({
      id: 'board-1',
      name: 'Current name',
      url: 'https://trello.com/b/board-1',
      desc: '',
      closed: false
    });
    jest.spyOn(Board, 'findOne').mockResolvedValue(board);
    const calls = [];
    const syncLists = jest.fn().mockImplementation(async () => { calls.push('lists'); });
    const syncMembers = jest.fn().mockImplementation(async () => { calls.push('members'); });
    const syncCards = jest.fn().mockImplementation(async () => { calls.push('cards'); });

    await expect(syncBoardNow('board-1', { workspaceId, syncLists, syncMembers, syncCards }))
      .resolves.toBe(board);

    expect(calls).toEqual(['lists', 'members', 'cards']);
    expect(board.lastSync.getTime()).toBeGreaterThan(lastSync.getTime());
    expect(board.save).toHaveBeenCalledTimes(2);
  });

  test('rebuilds list card indexes from active canonical cards in one bounded bulk write', async () => {
    const board = { _id: 'board-1', workspaceId };
    const lists = [{ _id: 'list-1' }, { _id: 'list-2' }, { _id: 'list-3' }];
    const CardModel = {
      aggregate: jest.fn().mockResolvedValue([
        { _id: 'list-2', cardIds: ['card-2', 'card-3'], cardCount: 2 }
      ])
    };
    const ListModel = {
      bulkWrite: jest.fn().mockResolvedValue({ matchedCount: 3, modifiedCount: 2 })
    };
    const updatedAt = new Date('2026-08-14T20:00:00.000Z');

    await expect(reconcileListCardIndexes(board, lists, { CardModel, ListModel, updatedAt })).resolves.toEqual({
      listCount: 3,
      activeCardCount: 2,
      matchedCount: 3,
      modifiedCount: 2
    });

    expect(CardModel.aggregate).toHaveBeenCalledWith([
      { $match: { workspaceId, boardId: 'board-1', closed: false } },
      { $group: { _id: '$listId', cardIds: { $push: '$_id' }, cardCount: { $sum: 1 } } }
    ]);
    expect(ListModel.bulkWrite).toHaveBeenCalledWith([
      { updateOne: { filter: { _id: 'list-1', workspaceId }, update: { $set: { cards: [], cardCount: 0, updatedAt } } } },
      { updateOne: { filter: { _id: 'list-2', workspaceId }, update: { $set: { cards: ['card-2', 'card-3'], cardCount: 2, updatedAt } } } },
      { updateOne: { filter: { _id: 'list-3', workspaceId }, update: { $set: { cards: [], cardCount: 0, updatedAt } } } }
    ], { ordered: false });
  });

  test('does not issue a bulk write when a board has no lists', async () => {
    const CardModel = { aggregate: jest.fn().mockResolvedValue([]) };
    const ListModel = { bulkWrite: jest.fn() };

    await expect(reconcileListCardIndexes({ _id: 'board-1', workspaceId }, [], { CardModel, ListModel }))
      .resolves.toEqual({ listCount: 0, activeCardCount: 0, matchedCount: 0, modifiedCount: 0 });
    expect(ListModel.bulkWrite).not.toHaveBeenCalled();
  });

  test('serializes writes for the same shared record and releases its queue afterward', async () => {
    const queues = new Map();
    const starts = [];
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const first = runSerialized(queues, 'workspace-1:member-1', async () => {
      starts.push('first');
      await gate;
    });
    const second = runSerialized(queues, 'workspace-1:member-1', async () => {
      starts.push('second');
    });

    await waitFor(() => starts.length === 1);
    expect(starts).toEqual(['first']);
    release();
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
    expect(starts).toEqual(['first', 'second']);
    expect(queues.size).toBe(0);
  });

  test('serializes duplicate sync requests for the same board', async () => {
    const worker = gateWorker();
    const first = syncBoard('board-1', { workspaceId, syncBoardNow: worker.sync });
    const second = syncBoard('board-1', { workspaceId, syncBoardNow: worker.sync });

    await waitFor(() => worker.starts.length === 1);
    expect(worker.starts).toEqual(['board-1']);
    worker.release();
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
    expect(worker.starts).toEqual(['board-1', 'board-1']);
  });

  test('runs full board syncs through a bounded pool and retains per-board results', async () => {
    jest.spyOn(trelloClient.boardApi, 'getBoards').mockResolvedValue([
      { id: 'board-1' },
      { id: 'board-2' },
      { id: 'board-3' }
    ]);
    const worker = gateWorker();

    const sync = syncAllBoards({ workspaceId, concurrency: 2, syncBoard: worker.sync });
    await waitFor(() => worker.starts.length === 2);
    expect(worker.starts).toEqual(['board-1', 'board-2']);

    worker.release();
    await expect(sync).resolves.toMatchObject({
      processedCount: 3,
      successCount: 3,
      failureCount: 0,
      metadata: {
        trelloBoardCount: 3,
        boardSyncConcurrency: 2,
        workspaceId
      }
    });
    expect(worker.starts).toEqual(['board-1', 'board-2', 'board-3']);
  });

  test('uses the same bounded pool for incremental board refreshes', async () => {
    jest.spyOn(Board, 'find').mockResolvedValue([
      { trelloId: 'board-1', name: 'First' },
      { trelloId: 'board-2', name: 'Second' },
      { trelloId: 'board-3', name: 'Third' }
    ]);
    const worker = gateWorker();

    const sync = syncRecentActivity({ workspaceId, concurrency: 2, syncCards: worker.sync });
    await waitFor(() => worker.starts.length === 2);
    expect(worker.starts).toEqual(['board-1', 'board-2']);

    worker.release();
    await expect(sync).resolves.toMatchObject({
      processedCount: 3,
      successCount: 3,
      failureCount: 0,
      metadata: {
        trelloBoardCount: 3,
        boardSyncConcurrency: 2,
        workspaceId
      }
    });
    expect(worker.starts).toEqual(['board-1', 'board-2', 'board-3']);
  });
});
