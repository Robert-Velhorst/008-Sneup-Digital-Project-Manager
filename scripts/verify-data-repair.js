const assert = require('assert');
const mongoose = require('mongoose');

const uri = process.env.SNEUP_DATA_REPAIR_VERIFICATION_MONGO_URI;
const databaseName = uri ? new URL(uri).pathname.replace(/^\//, '').split('?')[0] : '';
if (!uri || !/^sneup_data_repair_verification_[a-z0-9_-]+$/i.test(databaseName)) {
  throw new Error('SNEUP_DATA_REPAIR_VERIFICATION_MONGO_URI must target a dedicated sneup_data_repair_verification_* database');
}

const Workspace = require('../src/models/Workspace');
const Board = require('../src/models/Board');
const Card = require('../src/models/Card');
const List = require('../src/models/List');
const Member = require('../src/models/Member');
const TrelloActionAttempt = require('../src/models/TrelloActionAttempt');
const AuditEvent = require('../src/models/AuditEvent');
const dataIntegrityService = require('../src/services/dataIntegrityService');

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const workspace = await Workspace.create({ name: 'Repair verification', slug: `repair-${Date.now()}` });
  const board = await Board.create({ workspaceId: workspace._id, trelloId: 'board-1', name: 'Delivery', url: 'https://trello.example/b/1' });
  const list = await List.create({ workspaceId: workspace._id, trelloId: 'list-1', name: 'Doing', boardId: board._id, cardCount: 17 });
  const member = await Member.create({ workspaceId: workspace._id, trelloId: 'member-1', username: 'manager', fullName: 'Project Manager', assignedCards: [], workloadLevel: 'overloaded' });
  const cards = await Card.create([
    { workspaceId: workspace._id, trelloId: 'card-1', name: 'One', boardId: board._id, listId: list._id, members: [member._id] },
    { workspaceId: workspace._id, trelloId: 'card-2', name: 'Two', boardId: board._id, listId: list._id, members: [member._id] }
  ]);
  const action = await TrelloActionAttempt.create({
    workspaceId: workspace._id,
    boardId: board._id,
    cardId: cards[0]._id,
    actionType: 'move_card',
    status: 'failed',
    reconciliation: { status: 'required', reason: 'Verification ambiguity' }
  });

  const scan = await dataIntegrityService.scan({ workspaceId: workspace._id, limit: 50 });
  assert.equal(scan.summary.repairable, 2);
  assert.equal(scan.summary.reviewRequired, 1);
  assert.equal(scan.findings.find(item => item.entityId === String(action._id)).repairable, false);

  const result = await dataIntegrityService.apply({
    workspaceId: workspace._id,
    limit: 50,
    fingerprints: scan.findings.filter(item => item.repairable).map(item => item.fingerprint),
    confirm: 'repair-derived-state',
    actor: 'verification'
  });
  assert.equal(result.repaired, 2);
  assert.equal(result.providerWrites, false);

  const [repairedList, repairedMember, unchangedAction, auditCount] = await Promise.all([
    List.findById(list._id).lean(),
    Member.findById(member._id).lean(),
    TrelloActionAttempt.findById(action._id).lean(),
    AuditEvent.countDocuments({ workspaceId: workspace._id, action: 'derived_state_repaired' })
  ]);
  assert.equal(repairedList.cardCount, 2);
  assert.deepEqual(repairedMember.assignedCards.map(String).sort(), cards.map(card => String(card._id)).sort());
  assert.equal(repairedMember.workloadLevel, 'normal');
  assert.equal(unchangedAction.reconciliation.status, 'required');
  assert.equal(auditCount, 2);

  process.stdout.write(`${JSON.stringify({ verified: true, databaseName, findings: scan.summary, repaired: result.repaired, audits: auditCount, providerWrites: false }, null, 2)}\n`);
};

run()
  .finally(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  })
  .catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
