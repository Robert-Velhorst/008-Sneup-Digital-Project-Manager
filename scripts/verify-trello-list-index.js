const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const uri = process.env.SNEUP_TRELLO_LIST_INDEX_VERIFICATION_MONGO_URI;
const databaseName = uri ? new URL(uri).pathname.replace(/^\//, '').split('?')[0] : '';
if (!uri || databaseName.length > 63 || !/^sneup_trello_list_index_verification_[a-z0-9_-]+$/i.test(databaseName)) {
  throw new Error('SNEUP_TRELLO_LIST_INDEX_VERIFICATION_MONGO_URI must target a dedicated sneup_trello_list_index_verification_* database with at most 63 characters');
}

const Workspace = require('../src/models/Workspace');
const Board = require('../src/models/Board');
const List = require('../src/models/List');
const Card = require('../src/models/Card');
const Member = require('../src/models/Member');
const {
  reconcileBoardMemberAssignments,
  reconcileListCardIndexes
} = require('../src/services/trelloSync');

const listCount = Math.max(10, Number.parseInt(process.env.SNEUP_LIST_INDEX_LISTS, 10) || 300);
const cardCount = Math.max(1000, Number.parseInt(process.env.SNEUP_LIST_INDEX_CARDS, 10) || 15000);
const unrelatedCardCount = Math.max(1000, Number.parseInt(process.env.SNEUP_LIST_INDEX_UNRELATED_CARDS, 10) || 15000);
const latencyBudgetMs = Math.max(500, Number.parseInt(process.env.SNEUP_LIST_INDEX_P95_BUDGET_MS, 10) || 5000);
const rssBudgetMb = Math.max(128, Number.parseInt(process.env.SNEUP_LIST_INDEX_RSS_BUDGET_MB, 10) || 384);
const LIST_INDEX_NAME = 'workspaceId_1_boardId_1_closed_1_listId_1';

const durationMs = started => Number(process.hrtime.bigint() - started) / 1e6;
const round = value => Math.round(value * 10) / 10;
const collectIndexScans = (node, names = []) => {
  if (!node || typeof node !== 'object') return names;
  if (node.indexName) names.push(node.indexName);
  Object.values(node).forEach(value => {
    if (Array.isArray(value)) value.forEach(item => collectIndexScans(item, names));
    else if (value && typeof value === 'object') collectIndexScans(value, names);
  });
  return names;
};

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await Promise.all([Workspace.init(), Board.init(), List.init(), Card.init(), Member.init()]);
    const workspace = await Workspace.create({
      name: 'Trello list index verification',
      slug: `trello-list-index-${Date.now()}`
    });
    const board = await Board.create({
      workspaceId: workspace._id,
      trelloId: 'list-index-board',
      name: 'List index board',
      url: 'https://trello.com/b/list-index-board'
    });
    const now = new Date();
    const lists = Array.from({ length: listCount }, (_, index) => ({
      _id: new mongoose.Types.ObjectId(),
      workspaceId: workspace._id,
      boardId: board._id,
      trelloId: `list-index-${index}`,
      name: `List ${index}`,
      position: index,
      cards: [],
      cardCount: 0,
      createdAt: now,
      updatedAt: now
    }));
    await List.collection.insertMany(lists, { ordered: false });

    const expectedByList = new Map(lists.map(list => [String(list._id), []]));
    const cards = Array.from({ length: cardCount }, (_, index) => {
      const list = lists[index % lists.length];
      const closed = index % 17 === 0;
      const card = {
        _id: new mongoose.Types.ObjectId(),
        workspaceId: workspace._id,
        boardId: board._id,
        listId: list._id,
        trelloId: `list-index-card-${index}`,
        name: `Card ${index}`,
        closed,
        createdAt: now,
        updatedAt: now
      };
      if (!closed) expectedByList.get(String(list._id)).push(String(card._id));
      return card;
    });
    await Card.collection.insertMany(cards, { ordered: false });
    const unrelatedBoards = Array.from({ length: 59 }, () => ({
      boardId: new mongoose.Types.ObjectId(),
      listIds: Array.from({ length: 5 }, () => new mongoose.Types.ObjectId())
    }));
    const unrelatedCards = Array.from({ length: unrelatedCardCount }, (_, index) => {
      const unrelatedBoard = unrelatedBoards[index % unrelatedBoards.length];
      return {
        _id: new mongoose.Types.ObjectId(),
        workspaceId: workspace._id,
        boardId: unrelatedBoard.boardId,
        listId: unrelatedBoard.listIds[index % unrelatedBoard.listIds.length],
        trelloId: `unrelated-card-${index}`,
        name: `Unrelated card ${index}`,
        closed: false,
        createdAt: now,
        updatedAt: now
      };
    });
    await Card.collection.insertMany(unrelatedCards, { ordered: false });

    await Member.create([
      {
        workspaceId: workspace._id,
        trelloId: 'active-member',
        username: 'active-member',
        fullName: 'Active Member',
        boards: [board._id]
      },
      {
        workspaceId: workspace._id,
        trelloId: 'stale-member',
        username: 'stale-member',
        fullName: 'Stale Member',
        boards: [board._id]
      },
      {
        workspaceId: workspace._id,
        trelloId: 'other-board-member',
        username: 'other-board-member',
        fullName: 'Other Board Member',
        boards: [unrelatedBoards[0].boardId]
      }
    ]);

    const staleCardIds = cards.slice(0, 20).map(card => card._id);
    await List.updateMany(
      { workspaceId: workspace._id, boardId: board._id },
      { $set: { cards: staleCardIds, cardCount: 999 } }
    );

    const pipeline = [
      { $match: { workspaceId: workspace._id, boardId: board._id, closed: false } },
      { $group: { _id: '$listId', cardIds: { $push: '$_id' }, cardCount: { $sum: 1 } } }
    ];
    const explain = await Card.collection.aggregate(pipeline).explain('executionStats');
    const cursorStage = explain?.stages?.find(stage => stage.$cursor)?.$cursor;
    const winningPlan = cursorStage?.queryPlanner?.winningPlan
      || explain?.queryPlanner?.winningPlan
      || cursorStage?.executionStats?.executionStages
      || explain?.executionStats?.executionStages;
    const indexScans = [...new Set(collectIndexScans(winningPlan))];

    const started = process.hrtime.bigint();
    const result = await reconcileListCardIndexes(board, lists);
    const memberResult = await reconcileBoardMemberAssignments({
      boardId: board._id,
      workspaceId: workspace._id,
      activeTrelloMemberIds: ['active-member']
    });
    const elapsedMs = durationMs(started);
    const persisted = await List.find({ workspaceId: workspace._id, boardId: board._id })
      .select('_id cards cardCount')
      .lean();

    let totalIndexedCards = 0;
    for (const list of persisted) {
      const actual = (list.cards || []).map(String).sort();
      const expected = expectedByList.get(String(list._id)).sort();
      assert.deepEqual(actual, expected);
      assert.equal(list.cardCount, expected.length);
      totalIndexedCards += actual.length;
    }

    const expectedActiveCards = cards.filter(card => !card.closed).length;
    const [activeMember, staleMember, otherBoardMember] = await Promise.all([
      Member.findOne({ workspaceId: workspace._id, trelloId: 'active-member' }).lean(),
      Member.findOne({ workspaceId: workspace._id, trelloId: 'stale-member' }).lean(),
      Member.findOne({ workspaceId: workspace._id, trelloId: 'other-board-member' }).lean()
    ]);
    const rssMb = process.memoryUsage().rss / 1024 / 1024;
    assert.equal(result.listCount, listCount);
    assert.equal(result.activeCardCount, expectedActiveCards);
    assert.equal(totalIndexedCards, expectedActiveCards);
    assert.equal(memberResult.removedBoardMemberships, 1);
    assert.deepEqual(activeMember.boards.map(String), [String(board._id)]);
    assert.deepEqual(staleMember.boards, []);
    assert.deepEqual(otherBoardMember.boards.map(String), [String(unrelatedBoards[0].boardId)]);
    assert.ok(elapsedMs <= latencyBudgetMs, `List-index reconciliation exceeded ${latencyBudgetMs} ms`);
    assert.ok(rssMb <= rssBudgetMb, `List-index verifier exceeded ${rssBudgetMb} MB RSS`);
    assert.ok(indexScans.includes(LIST_INDEX_NAME), `List-index aggregation did not select ${LIST_INDEX_NAME}`);

    process.stdout.write(`${JSON.stringify({
      ok: true,
      database: databaseName,
      lists: listCount,
      cards: cardCount,
      workspaceBoards: unrelatedBoards.length + 1,
      unrelatedWorkspaceCards: unrelatedCardCount,
      activeCards: expectedActiveCards,
      staleReferencesSeededPerList: staleCardIds.length,
      exactCanonicalMembership: true,
      exactBoardMembership: true,
      staleBoardMembershipsRemoved: memberResult.removedBoardMemberships,
      databaseOperations: { aggregate: 1, unorderedBulkWrite: 1 },
      durationMs: round(elapsedMs),
      rssMb: round(rssMb),
      indexScans,
      providerWrites: false
    }, null, 2)}\n`);
  } finally {
    try {
      if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    } finally {
      await mongoose.disconnect();
    }
  }
};

run().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
