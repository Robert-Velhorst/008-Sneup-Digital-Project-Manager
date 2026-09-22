const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const { cleanupVerificationDatabase } = require('./verify-hai-snapshot');

async function run() {
  const uri = process.env.SNEUP_LEDGER_REFERENCES_MONGO_URI;
  const name = uri ? new URL(uri).pathname.slice(1) : '';
  if (!/^sneup_ledger_references_[a-z0-9_-]+$/i.test(name) || Buffer.byteLength(name) > 63) {
    throw new Error('SNEUP_LEDGER_REFERENCES_MONGO_URI must target a new sneup_ledger_references_* database');
  }
  process.env.SNEUP_DEMO_MODE = 'false';
  process.env.SNEUP_PROVIDER_WRITES_DISABLED = 'true';
  const token = randomUUID();
  process.env.SNEUP_REQUIRE_API_KEY = 'true';
  process.env.SNEUP_API_KEY = token;
  let ownsDatabase = false;
  let server;
  let evidence;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 5 });
    assert.equal((await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).length, 0);
    await mongoose.connection.db.collection('_sneup_verification_owner').insertOne({ _id: 'owner', token });
    ownsDatabase = true;
    const models = Object.fromEntries(['Board', 'List', 'Card', 'Member', 'Comment', 'Intervention', 'Recommendation', 'Approval',
      'TrelloActionAttempt', 'DecisionQueueItem', 'FollowUpPlan', 'OutcomeRecord', 'CardFinding', 'BoardHealthSnapshot']
      .map(model => [model, require(`../src/models/${model}`)]));
    const WorkItem = require('../src/models/WorkItem');
    const WorkDependency = require('../src/models/WorkDependency');
    const service = require('../src/services/operationsLedgerService');
    service.performTrelloAction = () => { throw new Error('Provider execution is forbidden in this verifier'); };
    const healthService = require('../src/services/boardHealthSnapshotService');
    await Promise.all([...Object.values(models), WorkItem, WorkDependency].map(model => model.init()));
    const workspaceId = new mongoose.Types.ObjectId();
    const foreignWorkspaceId = new mongoose.Types.ObjectId();
    const makeIds = () => Object.fromEntries(Object.keys(models).map(key => [key, new mongoose.Types.ObjectId()]));
    const bundle = async (scope, label, linkedIds) => {
      const ids = makeIds();
      const refs = linkedIds || ids;
      const common = { workspaceId: scope, boardId: refs.Board, cardId: refs.Card, memberId: refs.Member,
        interventionId: refs.Intervention, recommendationId: refs.Recommendation };
      const fields = {
        Board: { trelloId: String(ids.Board), name: label, url: 'https://trello.com/b/synthetic', members: [refs.Member], lists: [refs.List] },
        List: { trelloId: String(ids.List), name: label, boardId: refs.Board, cards: [refs.Card] },
        Card: { ...common, trelloId: String(ids.Card), name: label, listId: refs.List, members: [refs.Member], comments: [refs.Comment] },
        Member: { trelloId: String(ids.Member), username: String(ids.Member), fullName: label, boards: [refs.Board], assignedCards: [refs.Card] },
        Comment: { trelloId: String(ids.Comment), cardId: refs.Card, memberId: refs.Member,
          text: `${label} Please send the confidential report by Friday`, createdAt: new Date('2026-01-01T00:00:00Z') },
        Intervention: { ...common, type: 'comment', trigger: 'manual_request', action: label },
        Recommendation: { ...common, findingType: 'manual', title: label, recommendedAction: label, actionType: 'comment' },
        Approval: { ...common, requestedAction: 'comment', decision: 'rejected', decisionReason: label },
        TrelloActionAttempt: { ...common, approvalId: refs.Approval, actionType: 'comment', status: 'in_progress', payload: { text: label } },
        DecisionQueueItem: { ...common, title: label, question: 'Review synthetic evidence?' },
        FollowUpPlan: { ...common, reason: label, dueAt: new Date('2020-01-01T00:00:00Z') },
        OutcomeRecord: { ...common, actionAttemptId: refs.TrelloActionAttempt, actionType: 'comment', summary: label },
        CardFinding: { ...common, findingType: 'stale', title: label },
        BoardHealthSnapshot: { boardId: refs.Board, healthScore: 50, healthStatus: 'watch', summary: label }
      };
      for (const [key, model] of Object.entries(models)) {
        await model.create({ ...fields[key], _id: ids[key], workspaceId: scope });
      }
      return { ids, refs };
    };
    const good = await bundle(workspaceId, 'Synthetic local evidence');
    const foreign = await bundle(foreignWorkspaceId, 'FOREIGN_REFERENCE_SENTINEL');
    const legacy = await bundle(new mongoose.Types.ObjectId(), 'UNSCOPED_REFERENCE_SENTINEL');
    for (const [key, model] of Object.entries(models)) {
      await model.collection.updateOne({ _id: legacy.ids[key] }, { $unset: { workspaceId: '' } });
    }
    // Deliberately corrupt stored links, not provider data or a claimed public write exploit.
    const bad = await bundle(workspaceId, 'Synthetic invalid links', foreign.ids);
    const unscoped = await bundle(workspaceId, 'Synthetic legacy links', legacy.ids);
    const missing = await bundle(workspaceId, 'Synthetic missing links', makeIds());
    const mixedAttempt = await models.TrelloActionAttempt.create({ workspaceId: foreignWorkspaceId,
      actionType: 'comment', status: 'in_progress', payload: { text: 'FOREIGN_REFERENCE_SENTINEL' } });
    const mixed = await bundle(workspaceId, 'Synthetic mixed links', { ...foreign.ids, Board: good.ids.Board,
      Card: good.ids.Card, TrelloActionAttempt: mixedAttempt._id });
    const contaminatedCardId = new mongoose.Types.ObjectId();
    await models.Card.create({ _id: contaminatedCardId, workspaceId,
      trelloId: `synthetic-contaminated-${contaminatedCardId}`, name: 'Synthetic contaminated card',
      description: 'Local card details', boardId: good.ids.Board, listId: foreign.ids.List,
      members: [good.ids.Member, foreign.ids.Member], comments: [foreign.ids.Comment, good.ids.Comment], closed: false });
    const thirdLocalCardId = new mongoose.Types.ObjectId();
    await models.Card.create({ _id: thirdLocalCardId, workspaceId, trelloId: `synthetic-third-${thirdLocalCardId}`,
      name: 'Synthetic third local card', boardId: good.ids.Board, listId: good.ids.List,
      members: [good.ids.Member], comments: [], closed: false });
    await models.Board.collection.updateOne({ _id: good.ids.Board }, { $set: { members: [good.ids.Member, foreign.ids.Member] } });
    await models.Member.collection.updateOne({ _id: good.ids.Member }, { $set: {
      boards: [good.ids.Board, foreign.ids.Board],
      assignedCards: [good.ids.Card, contaminatedCardId, thirdLocalCardId, foreign.ids.Card]
    } });
    const localWorkItem = await WorkItem.create({ workspaceId, connectorAccountId: new mongoose.Types.ObjectId(),
      sourceProvider: 'trello', externalId: String(good.ids.Board), canonicalKey: `trello:${good.ids.Board}`,
      title: 'Synthetic local graph item', itemType: 'task', status: 'blocked',
      containerKey: `trello:container:${good.ids.Board}` });
    const foreignWorkItem = await WorkItem.create({ workspaceId: foreignWorkspaceId, connectorAccountId: new mongoose.Types.ObjectId(),
      sourceProvider: 'trello', externalId: String(foreign.ids.Board), canonicalKey: `trello:${foreign.ids.Board}`,
      title: 'FOREIGN_REFERENCE_SENTINEL graph item', description: 'Synthetic foreign details', itemType: 'task', status: 'blocked' });
    await WorkDependency.create({ workspaceId, sourceItemId: localWorkItem._id, targetItemId: foreignWorkItem._id,
      sourceProvider: 'trello', externalId: 'synthetic-cross-workspace-dependency', dependencyType: 'blocks' });
    const owned = [good, bad, unscoped, missing, mixed];
    const allowedIds = new Set(Object.values(good.ids).map(String));
    const assertPrivate = value => {
      const serialized = JSON.stringify(value);
      assert.ok(!serialized.includes('FOREIGN_REFERENCE_SENTINEL'), 'Foreign workspace contents must not expand through local links');
      assert.ok(!serialized.includes('UNSCOPED_REFERENCE_SENTINEL'), 'Unscoped legacy contents must not expand through local links');
    };
    const paths = {
      Recommendation: { boardId: 'Board', cardId: 'Card', memberId: 'Member', interventionId: 'Intervention' },
      DecisionQueueItem: { recommendationId: 'Recommendation', boardId: 'Board', cardId: 'Card' },
      TrelloActionAttempt: { recommendationId: 'Recommendation', interventionId: 'Intervention', approvalId: 'Approval', boardId: 'Board', cardId: 'Card' },
      FollowUpPlan: { recommendationId: 'Recommendation', interventionId: 'Intervention', boardId: 'Board', cardId: 'Card', memberId: 'Member' },
      OutcomeRecord: { recommendationId: 'Recommendation', interventionId: 'Intervention', actionAttemptId: 'TrelloActionAttempt', boardId: 'Board', cardId: 'Card' },
      CardFinding: { boardId: 'Board', cardId: 'Card', memberId: 'Member' }
    };
    const assertRows = (rows, modelName, selected = owned) => {
      assert.equal(rows.length, selected.length, `${modelName} roots must remain visible`);
      for (const item of selected) {
        const row = rows.find(record => String(record._id) === String(item.ids[modelName]));
        assert.ok(row, `${modelName} root is missing`);
        for (const [path, target] of Object.entries(paths[modelName])) {
          if (allowedIds.has(String(item.refs[target]))) {
            assert.equal(String(row[path]?._id), String(item.refs[target]), `${modelName}.${path} must retain a valid local link`);
          } else {
            assert.equal(row[path], null, `${modelName}.${path} must hide a foreign, unscoped or missing link`);
          }
        }
      }
      assertPrivate(rows);
    };
    const workGraphService = require('../src/services/workGraphService');
    const graph = await workGraphService.getTrelloBoardLedgerContext(await models.Board.findById(good.ids.Board), [], { workspaceId });
    assert.equal(graph.dependencies.length, 1);
    assert.equal(graph.dependencies[0].sourceItem?.title, 'Synthetic local graph item');
    assert.equal(graph.dependencies[0].targetItem, null);
    assertPrivate(graph);
    const graphDetail = await workGraphService.getItemDetail(localWorkItem._id, { workspaceId });
    assert.equal(graphDetail.dependencies[0].targetItem, null);
    assertPrivate(graphDetail);
    const contextAnalyzer = require('../src/services/contextAnalyzer');
    const contaminatedContext = await contextAnalyzer.getCardContext(contaminatedCardId, { workspaceId });
    assertPrivate(contaminatedContext);
    assert.equal(String(contaminatedContext.card.board.id), String(good.ids.Board));
    assert.equal(contaminatedContext.card.list, null, 'A foreign list is hidden without discarding the local card context');
    assert.deepEqual(contaminatedContext.card.members.map(member => String(member.id)), [String(good.ids.Member)]);
    assert.deepEqual(contaminatedContext.card.comments.map(comment => String(comment.id)), [String(good.ids.Comment)]);
    const teamPatterns = await contextAnalyzer.analyzeTeamPatterns({ workspaceId });
    assertPrivate(teamPatterns);
    assert.equal(teamPatterns.find(pattern => String(pattern.memberId) === String(good.ids.Member))?.totalAssignedCards, 3,
      'Only local assigned cards with local boards contribute to team analysis');
    const priorityEngine = require('../src/services/priorityEngine');
    const foreignMemberPriorities = await priorityEngine.getPrioritizedCards(foreign.ids.Member, { workspaceId });
    assert.deepEqual(foreignMemberPriorities.all, [], 'A foreign member cannot retrieve cards through contaminated local assignment refs');
    const localMemberPriorities = await priorityEngine.getPrioritizedCards(good.ids.Member, { workspaceId });
    assertPrivate(localMemberPriorities);
    assert.equal(localMemberPriorities.all.length, 3, 'Local member retains local card priorities');
    const app = require('../src/index');
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    const request = async (route, authenticated = true) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/${route}`, {
        headers: { ...(authenticated ? { 'x-sneup-api-key': token } : {}), 'x-sneup-workspace-id': String(workspaceId) },
        signal: AbortSignal.timeout(10000)
      });
      return { status: response.status, body: await response.json() };
    };
    const boardList = await request('boards');
    assert.equal(boardList.status, 200);
    assertPrivate(boardList.body);
    const listedGoodBoard = boardList.body.data.boards.find(board => String(board._id) === String(good.ids.Board));
    assert.ok(listedGoodBoard, 'Local board remains visible');
    assert.deepEqual(listedGoodBoard.members.map(member => String(member._id)), [String(good.ids.Member)]);
    const boardContext = await request(`boards/${good.ids.Board}/context`);
    assert.equal(boardContext.status, 200);
    assertPrivate(boardContext.body);
    const foreignCommentBefore = await models.Comment.findById(foreign.ids.Comment).lean();
    assert.equal(foreignCommentBefore.isActionItem, false);
    const contaminatedRead = await request(`boards/${good.ids.Board}/cards/${contaminatedCardId}`);
    assert.equal(contaminatedRead.status, 200);
    assertPrivate(contaminatedRead.body);
    assert.equal(contaminatedRead.body.data.card.listId, null);
    assert.deepEqual(contaminatedRead.body.data.card.members.map(member => String(member._id)), [String(good.ids.Member)]);
    assert.deepEqual(contaminatedRead.body.data.card.comments.map(comment => String(comment._id)), [String(good.ids.Comment)]);
    const foreignCommentAfter = await models.Comment.findById(foreign.ids.Comment).lean();
    assert.deepEqual({ sentiment: foreignCommentAfter.sentiment, isActionItem: foreignCommentAfter.isActionItem,
      entities: foreignCommentAfter.entities }, { sentiment: foreignCommentBefore.sentiment,
      isActionItem: foreignCommentBefore.isActionItem, entities: foreignCommentBefore.entities },
    'Reading a local card must not analyze or mutate a foreign linked comment');
    const relationships = await request(`boards/${good.ids.Board}/relationships`);
    assert.equal(relationships.status, 200);
    assertPrivate(relationships.body);
    const localDetail = await request(`recommendations/${good.ids.Recommendation}`);
    assert.equal(localDetail.status, 200);
    assertRows([localDetail.body.data.recommendation], 'Recommendation', [good]);
    const invalidDetail = await request(`recommendations/${bad.ids.Recommendation}`);
    assert.equal(invalidDetail.status, 200);
    assertRows([invalidDetail.body.data.recommendation], 'Recommendation', [bad]);

    const reads = {
      Recommendation: 'listRecommendations', DecisionQueueItem: 'listDecisionQueue', TrelloActionAttempt: 'listTrelloActions',
      FollowUpPlan: 'listFollowUps', OutcomeRecord: 'listInterventionOutcomes'
    };
    for (const lean of [false, true]) {
      for (const [modelName, method] of Object.entries(reads)) {
        const rows = await service[method]({ workspaceId: lean ? String(workspaceId) : workspaceId, lean });
        assertRows(rows, modelName);
        assert.equal(typeof rows[0].toObject, lean ? 'undefined' : 'function');
      }
    }
    const routes = ['recommendations', 'decision-queue', 'trello-actions', 'trello-actions/reconciliation', 'follow-ups',
      'follow-ups/due', 'outcomes', 'findings', 'findings/board-health', 'operations-ledger', 'autopilot/operations-brief',
      `work-signals/graph/items/${localWorkItem._id}`,
      `boards/${good.ids.Board}/operating-ledger`, `cards/${good.ids.Card}/operating-ledger`,
      ...owned.flatMap(item => [`recommendations/${item.ids.Recommendation}`, `recommendations/${item.ids.Recommendation}/evidence`])];
    for (const route of routes) {
      const response = await request(route);
      assert.equal(response.status, 200, route);
      assert.equal(response.body.ok, true, route);
      assertPrivate(response.body);
      if (route === 'findings') assertRows(response.body.data.findings, 'CardFinding');
      if (route === 'operations-ledger') {
        assert.deepEqual(response.body.data.ledger.errors, []);
        assertRows(response.body.data.ledger.findings, 'CardFinding');
      }
      if (route.startsWith('work-signals/graph/items/')) {
        assert.equal(response.body.data.detail.dependencies[0].targetItem, null);
      }
      if (route.includes('/operating-ledger')) {
        assertRows(response.body.data.ledger.recommendations, 'Recommendation', [good, mixed]);
      }
    }
    const health = await healthService.listLatestByBoard({ workspaceId });
    assert.ok(health.some(row => String(row.boardId?._id) === String(good.ids.Board)), 'Valid health board remains populated');
    assert.ok(health.some(row => row.boardId === null), 'Invalid health board is not expanded');
    assertPrivate(health);
    assert.equal((await request(`recommendations/${foreign.ids.Recommendation}`)).status, 404);
    assert.equal((await request('operations-ledger', false)).status, 401);
    assert.equal((await models.Recommendation.findById(bad.ids.Recommendation)).boardId.toString(), String(foreign.ids.Board),
      'Reads must not repair or erase stored references');
    const originalBoardFind = models.Board.collection.find;
    let expectedTimeout = 5000;
    let referenceReads = 0;
    models.Board.collection.find = function(filter, options) {
      assert.equal(String(filter.workspaceId), String(workspaceId), 'The database lookup itself must enforce workspace ownership');
      assert.equal(options.maxTimeMS, expectedTimeout, 'Population must forward its own server-side deadline');
      referenceReads += 1;
      throw Object.assign(new Error('Synthetic reference timeout'), { code: 50 });
    };
    try {
      await assert.rejects(service.listRecommendations({ workspaceId }), { code: 50 });
      assert.equal((await request(`recommendations/${good.ids.Recommendation}`)).status, 500);
      const partial = await request('operations-ledger');
      assert.equal(partial.status, 200);
      assert.ok(partial.body.data.ledger.errors.some(item => item.section === 'recommendations'));
      assert.deepEqual(partial.body.data.ledger.recommendations, []);
      expectedTimeout = 2400;
      await assert.rejects(healthService.listLatestByBoard({ workspaceId, queryTimeoutMs: expectedTimeout }), { code: 50 });
      assert.ok(referenceReads >= 4);
    } finally { models.Board.collection.find = originalBoardFind; }
    evidence = { result: 'PASS', scenarios: ['authenticated-detail-trigger', 'local-reference-controls', 'foreign-references',
      'unscoped-legacy-references', 'dangling-references', 'mixed-valid-invalid-links', 'lean-and-document-results',
      'objectid-and-string-scope', 'history-and-evidence-http', 'workspace-board-card-ledgers', 'latest-health-board',
      'authentication-and-root-isolation', 'stored-links-unchanged', 'reference-query-timeouts', 'partial-failure-propagation',
      'daily-brief-isolation', 'work-graph-ledger-and-item-detail', 'board-card-context-reference-isolation',
      'nested-member-reference-isolation', 'nlp-foreign-comment-write-isolation', 'priority-member-reference-isolation'],
    httpReadRoutes: routes.length + 4, realProviderCalls: 0 };
  } finally {
    try {
      if (server?.listening) {
        server.closeAllConnections();
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      }
    } finally {
      let verifiedOwnership = false;
      try {
        if (ownsDatabase && mongoose.connection.readyState === 1) {
          verifiedOwnership = Boolean(await mongoose.connection.db.collection('_sneup_verification_owner').findOne({ _id: 'owner', token }));
        }
      } finally { await cleanupVerificationDatabase(mongoose, verifiedOwnership); }
    }
  }
  console.log(JSON.stringify(evidence));
}

run().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
