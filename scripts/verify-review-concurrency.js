const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const uri = process.env.SNEUP_REVIEW_CONCURRENCY_VERIFICATION_MONGO_URI;
const databaseName = uri ? new URL(uri).pathname.replace(/^\//, '').split('?')[0] : '';
if (!uri || !/^sneup_review_concurrency_verification_[a-z0-9_-]+$/i.test(databaseName)) {
  throw new Error('SNEUP_REVIEW_CONCURRENCY_VERIFICATION_MONGO_URI must target a dedicated sneup_review_concurrency_verification_* database');
}

const Workspace = require('../src/models/Workspace');
const Recommendation = require('../src/models/Recommendation');
const Approval = require('../src/models/Approval');
const DecisionQueueItem = require('../src/models/DecisionQueueItem');
const TrelloActionAttempt = require('../src/models/TrelloActionAttempt');
const operationsLedgerService = require('../src/services/operationsLedgerService');

const recommendationData = (workspaceId, suffix) => ({
  workspaceId,
  findingType: 'stale_card',
  title: `Review race ${suffix}`,
  recommendedAction: 'Post the exact reviewed follow-up.',
  actionType: 'comment',
  actionPayload: {
    cardTrelloId: `card-${suffix}`,
    commentText: `Please share the next action for ${suffix}.`,
    executable: true
  },
  riskLevel: 'medium',
  requiresApproval: true,
  ownerType: 'robert',
  status: 'pending'
});

const queueData = (workspaceId, recommendation, suffix, status = 'open') => ({
  workspaceId,
  recommendationId: recommendation._id,
  ownerType: 'robert',
  title: `Review race ${suffix}`,
  question: `Post the exact reviewed follow-up for ${suffix}: Yes/No?`,
  recommendedAnswer: 'yes',
  options: ['approve', 'reject', 'change'],
  riskLevel: 'medium',
  status
});

const rejectedCode = result => result.status === 'rejected' ? result.reason?.code : null;

const run = async () => {
  const startedAt = process.hrtime.bigint();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await Promise.all([
      Workspace.init(),
      Recommendation.init(),
      Approval.init(),
      DecisionQueueItem.init(),
      TrelloActionAttempt.init()
    ]);
    const workspace = await Workspace.create({
      name: 'Review concurrency verification',
      slug: `review-concurrency-${Date.now()}`
    });
    const workspaceId = workspace._id;

    const decisionRace = await Recommendation.create(recommendationData(workspaceId, 'decision'));
    await DecisionQueueItem.create(queueData(workspaceId, decisionRace, 'decision'));
    const decisionResults = await Promise.allSettled([
      operationsLedgerService.approveRecommendation(decisionRace._id, {
        workspaceId,
        expectedRevision: decisionRace.__v,
        decidedBy: 'reviewer-approve'
      }),
      operationsLedgerService.rejectRecommendation(decisionRace._id, {
        workspaceId,
        expectedRevision: decisionRace.__v,
        decidedBy: 'reviewer-reject',
        decisionReason: 'Concurrent rejection verification'
      })
    ]);
    assert.equal(decisionResults.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(decisionResults.filter(result => rejectedCode(result) === 'SNEUP_RECOMMENDATION_REVIEW_CONFLICT').length, 1);
    const decisionFinal = await Recommendation.findById(decisionRace._id).lean();
    const decisionApprovals = await Approval.find({ recommendationId: decisionRace._id }).lean();
    assert.equal(decisionApprovals.length, 1);
    assert.equal(decisionApprovals[0].decision, decisionFinal.status);
    if (decisionFinal.status === 'approved') {
      assert.equal(String(decisionFinal.currentApprovalId), String(decisionApprovals[0]._id));
    } else {
      assert.equal(decisionFinal.currentApprovalId, undefined);
    }

    const payloadRace = await Recommendation.create(recommendationData(workspaceId, 'payload'));
    const payloadResults = await Promise.allSettled([
      operationsLedgerService.approveRecommendation(payloadRace._id, {
        workspaceId,
        expectedRevision: payloadRace.__v,
        decidedBy: 'reviewer-approve'
      }),
      operationsLedgerService.updateRecommendationPayload(payloadRace._id, {
        workspaceId,
        expectedRevision: payloadRace.__v,
        updatedBy: 'reviewer-edit',
        actionPayload: { commentText: 'Please share the revised exact next action.' }
      })
    ]);
    assert.equal(payloadResults.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(payloadResults.filter(result => rejectedCode(result) === 'SNEUP_RECOMMENDATION_REVIEW_CONFLICT').length, 1);
    const payloadFinal = await Recommendation.findById(payloadRace._id).lean();
    const payloadApprovals = await Approval.find({ recommendationId: payloadRace._id }).lean();
    assert.equal(payloadApprovals.length, payloadFinal.status === 'approved' ? 1 : 0);
    if (payloadFinal.status === 'approved') {
      assert.equal(String(payloadFinal.currentApprovalId), String(payloadApprovals[0]._id));
    } else {
      assert.equal(payloadFinal.actionPayload.commentText, 'Please share the revised exact next action.');
      assert.equal(payloadFinal.currentApprovalId, undefined);
    }

    const executedRecommendation = await Recommendation.create({
      ...recommendationData(workspaceId, 'executed'),
      status: 'executed',
      executedAt: new Date()
    });
    const staleOpenQueue = await DecisionQueueItem.create(queueData(workspaceId, executedRecommendation, 'executed'));
    const staleDelegation = await Promise.allSettled([
      operationsLedgerService.delegateDecisionQueueItem(staleOpenQueue._id, {
        workspaceId,
        ownerType: 'team',
        delegatedBy: 'stale-reviewer'
      })
    ]);
    assert.equal(rejectedCode(staleDelegation[0]), 'SNEUP_DECISION_QUEUE_STALE');
    const afterStaleDelegation = await Recommendation.findById(executedRecommendation._id).lean();
    assert.equal(afterStaleDelegation.status, 'executed');
    await DecisionQueueItem.updateOne({ _id: staleOpenQueue._id }, { $set: { status: 'approved' } });
    const terminalSnooze = await Promise.allSettled([
      operationsLedgerService.snoozeDecisionQueueItem(staleOpenQueue._id, {
        workspaceId,
        snoozedBy: 'stale-reviewer'
      })
    ]);
    assert.equal(rejectedCode(terminalSnooze[0]), 'SNEUP_DECISION_QUEUE_TERMINAL');
    await assert.rejects(
      operationsLedgerService.approveRecommendation(executedRecommendation._id, {
        workspaceId,
        expectedRevision: executedRecommendation.__v,
        decidedBy: 'stale-reviewer'
      }),
      error => error.statusCode === 409
    );
    assert.equal(await TrelloActionAttempt.countDocuments({ workspaceId }), 0);

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    process.stdout.write(`${JSON.stringify({
      ok: true,
      database: databaseName,
      durationMs: Math.round(durationMs * 10) / 10,
      simultaneousDecisionWinner: decisionFinal.status,
      simultaneousPayloadWinner: payloadFinal.status,
      staleOpenQueueBlocked: true,
      terminalQueueBlocked: true,
      exactActiveApprovalBound: true,
      orphanApprovals: 0,
      trelloActionAttempts: 0,
      providerWrites: false
    }, null, 2)}\n`);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
  }
};

run().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
