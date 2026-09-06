const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { withTimeout } = require('../src/utils/runtimeShutdown');

const cleanupVerificationDatabase = async (client, ownsDatabase, options = {}) => {
  try {
    if (ownsDatabase) {
      // Late automatic collection/index creation must settle before the database is dropped.
      await withTimeout(Promise.allSettled(
        Object.values(client.models).map(model => Promise.resolve().then(() => model.init()))
      ), {
        timeoutMs: options.timeoutMs ?? 30000,
        code: 'SNEUP_VERIFICATION_CLEANUP_TIMEOUT',
        message: 'Model initialization did not settle; verification database removal is unconfirmed'
      });
      assert.equal(client.connection.readyState, 1, 'Verification database cleanup cannot be confirmed without a connection');
      await client.connection.dropDatabase();
      const remaining = await client.connection.db.listCollections({}, { nameOnly: true }).toArray();
      assert.equal(remaining.length, 0, 'Verification database still contains collections');
    }
  } finally {
    await client.disconnect();
  }
};

const run = async () => {
  const uri = process.env.SNEUP_HAI_SNAPSHOT_VERIFICATION_MONGO_URI;
  const databaseName = uri ? new URL(uri).pathname.slice(1) : '';
  if (!/^sneup_hai_snapshot_verification_[a-f0-9]{16}$/.test(databaseName)) {
    throw new Error('SNEUP_HAI_SNAPSHOT_VERIFICATION_MONGO_URI must target a dedicated sneup_hai_snapshot_verification_<16 hex characters> database');
  }

  process.env.SNEUP_DEMO_MODE = 'false';
  process.env.SNEUP_PROVIDER_WRITES_DISABLED = 'true';

  let ownsDatabase = false;
  let evidence;
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000,
      socketTimeoutMS: 15000, waitQueueTimeoutMS: 5000, maxPoolSize: 5
    });
    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
    assert.equal(collections.length, 0, 'Refusing to modify an existing nonempty verification database');
    ownsDatabase = true;

    const Workspace = require('../src/models/Workspace');
    const Board = require('../src/models/Board');
    const List = require('../src/models/List');
    const Card = require('../src/models/Card');
    const Recommendation = require('../src/models/Recommendation');
    const DecisionQueueItem = require('../src/models/DecisionQueueItem');
    const Approval = require('../src/models/Approval');
    const TrelloActionAttempt = require('../src/models/TrelloActionAttempt');
    const { HaiIntegrationService } = require('../src/services/haiIntegrationService');
    const service = new HaiIntegrationService();
    await Promise.all([Workspace, Board, List, Card, Recommendation, DecisionQueueItem].map(model => model.init()));

    const workspace = await Workspace.create({ name: 'HAI verification', slug: 'hai-verification' });
    const otherWorkspace = await Workspace.create({ name: 'Isolated workspace', slug: 'hai-isolated' });
    const workspaceId = workspace._id;
    const board = await Board.create({ workspaceId, trelloId: 'a'.repeat(24), name: 'Verification board', url: 'https://trello.com/b/fixture' });
    const list = await List.create({ workspaceId, boardId: board._id, trelloId: 'b'.repeat(24), name: 'In progress' });
    const card = await Card.create({ workspaceId, boardId: board._id, listId: list._id, trelloId: 'c'.repeat(24), name: 'Verification card' });
    const recommendationData = {
      workspaceId, boardId: board._id, cardId: card._id,
      findingType: 'stale_card', title: 'Review the next action',
      recommendedAction: 'Request a reviewed update.', actionType: 'comment',
      requiresApproval: true, status: 'pending'
    };
    const recommendation = await Recommendation.create(recommendationData);
    const otherRecommendation = await Recommendation.create({
      ...recommendationData, workspaceId: otherWorkspace._id, boardId: undefined, cardId: undefined,
      title: 'Other workspace private record'
    });
    const decision = await DecisionQueueItem.create({
      workspaceId, recommendationId: recommendation._id, boardId: board._id, cardId: card._id,
      ownerType: 'robert', title: recommendation.title, question: 'Request an update: Yes/No?', status: 'open'
    });

    const snapshot = await service.getSnapshot({ workspaceId });
    assert.deepEqual(snapshot.partialErrors, []);
    assert.equal(snapshot.demoMode, false);
    assert.equal(snapshot.recommendations.length, 1);
    assert.equal(snapshot.recommendations[0].id, String(recommendation._id));
    assert.equal(snapshot.decisions[0].id, String(decision._id));
    assert.equal(snapshot.decisions[0].boardId, String(board._id));
    assert.equal(snapshot.decisions[0].cardId, String(card._id));
    assert.ok(!JSON.stringify(snapshot).includes(String(otherRecommendation._id)));
    assert.ok(!JSON.stringify(snapshot).includes('Other workspace private record'));

    const proposalBody = {
      externalId: 'hai-verification-proposal', type: 'request_update',
      title: 'Request a reviewed update', reason: 'Verification of the snapshot reference round trip.',
      payload: { cardId: snapshot.decisions[0].cardId, boardId: snapshot.decisions[0].boardId }
    };
    const proposal = await service.createProposal(proposalBody, { workspaceId, actor: 'HAI verification' });
    assert.equal(proposal.created, true);
    assert.equal(proposal.recommendation.status, 'pending');
    assert.equal(proposal.recommendation.requiresApproval, true);
    assert.equal(String(proposal.recommendation.cardId), String(card._id));
    assert.equal(proposal.decisionQueueItem.status, 'open');
    const repeated = await service.createProposal(proposalBody, { workspaceId, actor: 'HAI verification' });
    assert.equal(repeated.created, false);
    assert.equal(String(repeated.recommendation._id), String(proposal.recommendation._id));
    assert.equal(await Approval.countDocuments({}), 0);
    assert.equal(await TrelloActionAttempt.countDocuments({}), 0);
    const refreshed = await service.getSnapshot({ workspaceId });
    assert.ok(refreshed.recommendations.some(item => item.id === String(proposal.recommendation._id)));

    evidence = {
      ok: true, database: databaseName, liveIdentifiersPreserved: true,
      crossWorkspaceIsolation: true, snapshotToProposalRoundTrip: true,
      repeatedProposalDeduplicated: true, approvals: 0, trelloActionAttempts: 0, providerWrites: false
    };
  } finally {
    await cleanupVerificationDatabase(mongoose, ownsDatabase);
  }
  process.stdout.write(`${JSON.stringify({ ...evidence, verificationDatabaseRemoved: true }, null, 2)}\n`);
};

if (require.main === module) run().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});

module.exports = { cleanupVerificationDatabase };
