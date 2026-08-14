const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const uri = process.env.SNEUP_FOLLOW_UP_VERIFICATION_MONGO_URI;
const databaseName = uri ? new URL(uri).pathname.replace(/^\//, '').split('?')[0] : '';
if (!uri || !/^sneup_follow_up_verification_[a-z0-9_-]+$/i.test(databaseName)) {
  throw new Error('SNEUP_FOLLOW_UP_VERIFICATION_MONGO_URI must target a dedicated sneup_follow_up_verification_* database');
}

const Workspace = require('../src/models/Workspace');
const Recommendation = require('../src/models/Recommendation');
const Intervention = require('../src/models/Intervention');
const FollowUpPlan = require('../src/models/FollowUpPlan');
const WorkerResponse = require('../src/models/WorkerResponse');
const AuditEvent = require('../src/models/AuditEvent');
const TrelloActionAttempt = require('../src/models/TrelloActionAttempt');
const operationsLedgerService = require('../src/services/operationsLedgerService');

const rejectedCode = result => result.status === 'rejected' ? result.reason?.code : null;

const createIntervention = (workspaceId, refs, suffix) => Intervention.create({
  workspaceId,
  boardId: refs.boardId,
  cardId: refs.cardId,
  memberId: refs.memberId,
  type: 'follow_up',
  trigger: 'manual_request',
  severity: 'medium',
  action: `Verify worker response ${suffix}`,
  status: 'executed',
  executedAt: new Date()
});

const createRecommendation = (workspaceId, intervention, refs, suffix) => Recommendation.create({
  workspaceId,
  interventionId: intervention._id,
  boardId: refs.boardId,
  cardId: refs.cardId,
  memberId: refs.memberId,
  findingType: 'worker_follow_up',
  title: `Worker follow-up ${suffix}`,
  recommendedAction: `Review the exact worker response for ${suffix}`,
  actionType: 'follow_up',
  actionPayload: { executable: false, draftOnly: true },
  riskLevel: 'medium',
  requiresApproval: true,
  status: 'executed'
});

const createFollowUp = (workspaceId, recommendation, intervention, refs, suffix) => FollowUpPlan.create({
  workspaceId,
  recommendationId: recommendation._id,
  interventionId: intervention._id,
  boardId: refs.boardId,
  cardId: refs.cardId,
  memberId: refs.memberId,
  reason: `Confirm response ${suffix}`,
  nextAction: `Review ${suffix}`,
  dueAt: new Date(Date.now() - 60 * 1000),
  status: 'due'
});

const run = async () => {
  const startedAt = process.hrtime.bigint();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await Promise.all([
      Workspace.init(),
      Recommendation.init(),
      Intervention.init(),
      FollowUpPlan.init(),
      WorkerResponse.init(),
      AuditEvent.init(),
      TrelloActionAttempt.init()
    ]);
    const workspace = await Workspace.create({
      name: 'Follow-up integrity verification',
      slug: `follow-up-integrity-${Date.now()}`
    });
    const workspaceId = workspace._id;
    const refs = {
      boardId: new mongoose.Types.ObjectId(),
      cardId: new mongoose.Types.ObjectId(),
      memberId: new mongoose.Types.ObjectId()
    };

    const primaryIntervention = await createIntervention(workspaceId, refs, 'primary');
    const adjacentIntervention = await createIntervention(workspaceId, refs, 'adjacent');
    const primaryRecommendation = await createRecommendation(workspaceId, primaryIntervention, refs, 'primary');
    const adjacentRecommendation = await createRecommendation(workspaceId, adjacentIntervention, refs, 'adjacent');
    const primaryFollowUp = await createFollowUp(workspaceId, primaryRecommendation, primaryIntervention, refs, 'primary');
    const adjacentFollowUp = await createFollowUp(workspaceId, adjacentRecommendation, adjacentIntervention, refs, 'adjacent');

    const responseResults = await Promise.allSettled([
      operationsLedgerService.recordWorkerResponse({
        workspaceId,
        recommendationId: primaryRecommendation._id,
        interventionId: primaryIntervention._id,
        ...refs,
        responseText: 'Primary response A',
        responseType: 'completed',
        source: 'slack',
        actor: 'reviewer-a'
      }),
      operationsLedgerService.recordWorkerResponse({
        workspaceId,
        recommendationId: primaryRecommendation._id,
        interventionId: primaryIntervention._id,
        ...refs,
        responseText: 'Primary response B',
        responseType: 'blocked',
        source: 'slack',
        actor: 'reviewer-b'
      })
    ]);
    assert.equal(responseResults.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(responseResults.filter(result => rejectedCode(result) === 'SNEUP_WORKER_RESPONSE_CONFLICT').length, 1);

    const [primaryAfter, primaryFollowUpAfter, adjacentFollowUpAfter, responseRows] = await Promise.all([
      Intervention.findById(primaryIntervention._id).lean(),
      FollowUpPlan.findById(primaryFollowUp._id).lean(),
      FollowUpPlan.findById(adjacentFollowUp._id).lean(),
      WorkerResponse.find({ interventionId: primaryIntervention._id }).lean()
    ]);
    assert.equal(responseRows.length, 1);
    assert.equal(String(primaryAfter.response.workerResponseId), String(responseRows[0]._id));
    assert.equal(primaryFollowUpAfter.status, responseRows[0].responseType === 'blocked' ? 'escalated' : 'resolved');
    assert.equal(adjacentFollowUpAfter.status, 'due');
    const responseAuditActions = await AuditEvent.find({
      workspaceId,
      entityType: 'worker_response',
      source: 'worker'
    }).distinct('action');
    assert.deepEqual(responseAuditActions.sort(), [
      'follow_ups_resolved_from_worker_response',
      'worker_response_recorded'
    ]);

    const manualIntervention = await createIntervention(workspaceId, refs, 'manual-race');
    const manualRecommendation = await createRecommendation(workspaceId, manualIntervention, refs, 'manual-race');
    const manualFollowUp = await createFollowUp(workspaceId, manualRecommendation, manualIntervention, refs, 'manual-race');
    const resolutionResults = await Promise.allSettled([
      operationsLedgerService.resolveFollowUp(manualFollowUp._id, {
        workspaceId,
        status: 'resolved',
        resolvedBy: 'reviewer-resolve'
      }),
      operationsLedgerService.resolveFollowUp(manualFollowUp._id, {
        workspaceId,
        status: 'escalated',
        resolvedBy: 'reviewer-escalate'
      })
    ]);
    assert.equal(resolutionResults.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(resolutionResults.filter(result => ['SNEUP_FOLLOW_UP_CONFLICT', 'SNEUP_FOLLOW_UP_TERMINAL'].includes(rejectedCode(result))).length, 1);
    const manualAfter = await FollowUpPlan.findById(manualFollowUp._id).lean();
    assert.ok(['resolved', 'escalated'].includes(manualAfter.status));
    assert.equal(await TrelloActionAttempt.countDocuments({ workspaceId }), 0);

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    process.stdout.write(`${JSON.stringify({
      ok: true,
      database: databaseName,
      durationMs: Math.round(durationMs * 10) / 10,
      responseRaceWinner: responseRows[0].responseType,
      workerResponseCount: responseRows.length,
      exactResponseBound: true,
      primaryFollowUpStatus: primaryFollowUpAfter.status,
      adjacentFollowUpStatus: adjacentFollowUpAfter.status,
      manualResolutionWinner: manualAfter.status,
      trelloActionAttempts: 0,
      providerWrites: false
    }, null, 2)}\n`);
  } finally {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
};

run().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
