const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const { cleanupVerificationDatabase } = require('./verify-hai-snapshot');

const uri = process.env.SNEUP_FOLLOW_UP_VERIFICATION_MONGO_URI;
const databaseName = uri ? new URL(uri).pathname.replace(/^\//, '').split('?')[0] : '';
if (!uri || Buffer.byteLength(databaseName) > 63 || !/^sneup_follow_up_verification_[a-z0-9_-]+$/i.test(databaseName)) {
  throw new Error('SNEUP_FOLLOW_UP_VERIFICATION_MONGO_URI must target a dedicated sneup_follow_up_verification_* database');
}

const rejectedCode = result => result.status === 'rejected' ? result.reason?.code : null;

const createIntervention = (Intervention, workspaceId, refs, suffix) => Intervention.create({
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

const createRecommendation = (Recommendation, workspaceId, intervention, refs, suffix) => Recommendation.create({
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

const createFollowUp = (FollowUpPlan, workspaceId, recommendation, intervention, refs, suffix) => FollowUpPlan.create({
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
  let ownsDatabase = false;
  const ownershipToken = randomUUID();
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
    assert.equal(collections.length, 0, 'Refusing to modify an existing nonempty verification database');
    await mongoose.connection.db.collection('_sneup_verification_owner').insertOne({ _id: 'owner', token: ownershipToken });
    ownsDatabase = true;
    const Workspace = require('../src/models/Workspace');
    const Recommendation = require('../src/models/Recommendation');
    const Intervention = require('../src/models/Intervention');
    const FollowUpPlan = require('../src/models/FollowUpPlan');
    const WorkerResponse = require('../src/models/WorkerResponse');
    const AuditEvent = require('../src/models/AuditEvent');
    const TrelloActionAttempt = require('../src/models/TrelloActionAttempt');
    const operationsLedgerService = require('../src/services/operationsLedgerService');
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

    const primaryIntervention = await createIntervention(Intervention, workspaceId, refs, 'primary');
    const adjacentIntervention = await createIntervention(Intervention, workspaceId, refs, 'adjacent');
    const primaryRecommendation = await createRecommendation(Recommendation, workspaceId, primaryIntervention, refs, 'primary');
    const adjacentRecommendation = await createRecommendation(Recommendation, workspaceId, adjacentIntervention, refs, 'adjacent');
    const primaryFollowUp = await createFollowUp(FollowUpPlan, workspaceId, primaryRecommendation, primaryIntervention, refs, 'primary');
    const adjacentFollowUp = await createFollowUp(FollowUpPlan, workspaceId, adjacentRecommendation, adjacentIntervention, refs, 'adjacent');

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
    const receipt = responseResults.find(result => result.status === 'fulfilled').value;
    assert.equal(receipt.followUpResolution.modifiedCount, 1);
    assert.equal(receipt.followUpResolution.status, primaryFollowUpAfter.status);
    assert.equal(Object.hasOwn(receipt, 'responseText'), false);
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

    const ignoredReceipt = await operationsLedgerService.recordWorkerResponse({
      workspaceId, recommendationId: adjacentRecommendation._id, interventionId: adjacentIntervention._id,
      ...refs, responseType: 'ignored', source: 'manual', actor: 'reviewer'
    });
    assert.equal(ignoredReceipt.followUpResolution.modifiedCount, 0);
    assert.equal(ignoredReceipt.followUpResolution.status, 'open');
    assert.equal((await FollowUpPlan.findById(adjacentFollowUp._id).lean()).status, 'due');

    const manualIntervention = await createIntervention(Intervention, workspaceId, refs, 'manual-race');
    const manualRecommendation = await createRecommendation(Recommendation, workspaceId, manualIntervention, refs, 'manual-race');
    const manualFollowUp = await createFollowUp(FollowUpPlan, workspaceId, manualRecommendation, manualIntervention, refs, 'manual-race');
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

    const service = operationsLedgerService;
    let recoveryCases = 0;
    for (const stage of ['confirmation', 'batch', 'followUps', 'receipt', 'responseAudit', 'followUpAudit', 'completion']) {
      for (const lostAck of [false, true]) {
        const suffix = `${stage}-${lostAck}`;
        const intervention = await createIntervention(Intervention, workspaceId, refs, suffix);
        const recommendation = await createRecommendation(Recommendation, workspaceId, intervention, refs, suffix);
        const followUp = await createFollowUp(FollowUpPlan, workspaceId, recommendation, intervention, refs, suffix);
        const Model = stage === 'followUps' ? FollowUpPlan : stage.endsWith('Audit') ? AuditEvent : WorkerResponse;
        const method = stage === 'followUps' ? 'updateMany' : stage.endsWith('Audit') ? 'create'
          : stage === 'confirmation' ? 'updateOne' : 'findOneAndUpdate';
        const original = Model[method];
        let injected = 0;
        Model[method] = async function(...args) {
          const targeted = stage === 'confirmation' ? args[1]?.$set?.claimState === 'confirmed'
            : stage === 'responseAudit' ? args[0]?.action === 'worker_response_recorded'
              : stage === 'followUpAudit' ? args[0]?.action === 'follow_ups_resolved_from_worker_response'
                : stage === 'batch' ? Array.isArray(args[1]?.$set?.['effects.followUpIds'])
                  : stage === 'receipt' ? Boolean(args[1]?.$set?.['effects.followUpResolution']) && !args[1]?.$set?.['effects.status']
                    : stage === 'completion' ? args[1]?.$set?.['effects.status'] === 'completed' : true;
          if (!targeted) return original.apply(this, args);
          injected++;
          if (lostAck) await original.apply(this, args);
          throw new Error('Synthetic interrupted worker response effect');
        };
        try {
          const result = await service.recordWorkerResponse({ workspaceId, ...refs, interventionId: intervention._id,
            recommendationId: recommendation._id, responseType: 'completed', source: 'manual', actor: 'original-reviewer',
            responseText: 'Synthetic private response text' }).catch(error => ({ error }));
          if (stage === 'confirmation' && !lostAck) assert.equal(result.error?.code, 'SNEUP_LEDGER_COMMIT_UNCERTAIN');
          else assert.equal(result.effectsCompleted, lostAck && stage !== 'followUps');
        } finally { Model[method] = original; }
        assert.ok(injected > 0, `Fault ${suffix} was exercised`);
        const response = await WorkerResponse.findOne({ interventionId: intervention._id });
        if (stage === 'confirmation' && !lostAck) {
          await WorkerResponse.updateOne({ _id: response._id }, { $unset: { 'effects.nextAttemptAt': 1 } });
          assert.deepEqual(await service.retryPendingWorkerResponseEffects({ workspaceId, limit: 1 }),
            { processedCount: 1, completedCount: 1, failureCount: 0 });
        }
        const later = stage === 'responseAudit' ? await createFollowUp(FollowUpPlan, workspaceId, recommendation, intervention, refs, 'later') : null;
        assert.equal(String((await Intervention.findById(intervention._id)).response.workerResponseId), String(response._id));
        delete require.cache[require.resolve('../src/services/workerResponseEffectsService')];
        await Promise.all([1, 2].map(() => service.finalizeWorkerResponseEffects(response)));
        const final = await service.finalizeWorkerResponseEffects(await WorkerResponse.findById(response._id));
        assert.equal(final.effectsCompleted, true);
        assert.equal(final.claimState, 'confirmed');
        assert.equal(final.followUpResolution.modifiedCount, 1);
        assert.equal(Object.hasOwn(final, 'responseText'), false);
        const recovered = await FollowUpPlan.findById(followUp._id);
        assert.equal(recovered.status, 'resolved');
        assert.equal(String(recovered.resolutionWorkerResponseId), String(response._id));
        assert.equal(recovered.resolvedAt.getTime(), response.receivedAt.getTime());
        const audits = await AuditEvent.find({ workspaceId, entityId: response._id }).lean();
        assert.equal(audits.length, 2);
        assert.ok(audits.every(audit => audit.actor === 'original-reviewer'));
        assert.equal(JSON.stringify(audits).includes('Synthetic private response text'), false);
        assert.ok(audits.every(audit => (audit.afterState.followUpResolution || audit.afterState).modifiedCount === 1));
        if (later) assert.equal((await FollowUpPlan.findById(later._id)).status, 'due', 'A later follow-up is outside the frozen response batch');
        recoveryCases++;
      }
    }

    const unclaimed = await WorkerResponse.create({ workspaceId, interventionId: primaryIntervention._id, memberId: refs.memberId,
      claimState: 'pending', responseType: 'completed', effects: { status: 'pending', auditId: new mongoose.Types.ObjectId(),
        followUpAuditId: new mongoose.Types.ObjectId(), actor: 'synthetic' } });
    const foreignWorkspaceId = new mongoose.Types.ObjectId();
    assert.equal((await service.retryPendingWorkerResponseEffects({ workspaceId: foreignWorkspaceId })).processedCount, 0);
    assert.deepEqual(await service.retryPendingWorkerResponseEffects({ workspaceId, limit: 1 }),
      { processedCount: 1, completedCount: 0, failureCount: 1 });
    assert.equal((await WorkerResponse.findById(unclaimed._id)).claimState, 'pending');
    assert.equal((await service.retryPendingWorkerResponseEffects({ workspaceId })).processedCount, 0, 'Unclaimed entries are backed off');
    assert.equal(await AuditEvent.countDocuments({ entityId: unclaimed._id }), 0);
    assert.equal(await TrelloActionAttempt.countDocuments({ workspaceId }), 0);

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    process.stdout.write(`${JSON.stringify({ recoveryCases,
      ok: true,
      database: databaseName,
      durationMs: Math.round(durationMs * 10) / 10,
      responseRaceWinner: responseRows[0].responseType,
      workerResponseCount: responseRows.length,
      exactResponseBound: true,
      primaryFollowUpStatus: primaryFollowUpAfter.status,
      adjacentFollowUpStatus: adjacentFollowUpAfter.status,
      manualResolutionWinner: manualAfter.status,
      followUpReceiptMatchesPersistence: true,
      ignoredResponseLeavesFollowUpOpen: true,
      trelloActionAttempts: 0,
      providerWrites: false
    }, null, 2)}\n`);
  } finally {
    try {
      if (ownsDatabase) {
        const owner = await mongoose.connection.db.collection('_sneup_verification_owner').findOne({ _id: 'owner' });
        assert.equal(owner?.token, ownershipToken, 'Refusing to drop a verification database owned by another run');
      }
    } catch (error) {
      ownsDatabase = false;
      throw error;
    } finally {
      await cleanupVerificationDatabase(mongoose, ownsDatabase);
    }
  }
};

run().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
