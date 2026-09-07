const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const { cleanupVerificationDatabase } = require('./verify-hai-snapshot');

const uri = process.env.SNEUP_RECONCILIATION_VERIFICATION_MONGO_URI;
const databaseName = uri ? new URL(uri).pathname.replace(/^\//, '').split('?')[0] : '';
if (!uri || Buffer.byteLength(databaseName) > 63 || !/^sneup_reconciliation_verification_[a-z0-9_-]+$/i.test(databaseName)) {
  throw new Error('SNEUP_RECONCILIATION_VERIFICATION_MONGO_URI must target a dedicated sneup_reconciliation_verification_* database');
}

const run = async () => {
  let ownsDatabase = false;
  const token = randomUUID();
  const startedAt = performance.now();
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
    assert.equal(collections.length, 0, 'Refusing to modify a nonempty verification database');
    await mongoose.connection.db.collection('_sneup_verification_owner').insertOne({ _id: 'owner', token });
    ownsDatabase = true;
    const Recommendation = require('../src/models/Recommendation');
    const Attempt = require('../src/models/TrelloActionAttempt');
    const AuditEvent = require('../src/models/AuditEvent');
    const Intervention = require('../src/models/Intervention');
    const Workspace = require('../src/models/Workspace');
    const Approval = require('../src/models/Approval');
    const FollowUpPlan = require('../src/models/FollowUpPlan');
    const WorkerResponse = require('../src/models/WorkerResponse');
    const service = require('../src/services/operationsLedgerService');
    await Promise.all([Recommendation.init(), Attempt.init(), AuditEvent.init(), Intervention.init(), FollowUpPlan.init(), WorkerResponse.init()]);
    const workspaceId = new mongoose.Types.ObjectId();
    const otherWorkspaceId = new mongoose.Types.ObjectId();
    let providerCalls = 0;
    service.performTrelloAction = async () => { providerCalls += 1; throw new Error('Provider writes forbidden in verification'); };
    const create = async () => {
      const rec = await Recommendation.create({ workspaceId, findingType: 'manual', title: 'Synthetic reconciliation',
        recommendedAction: 'Confirm synthetic result', actionType: 'move_card', status: 'executing',
        currentApprovalId: new mongoose.Types.ObjectId() });
      const attempt = await Attempt.create({ workspaceId, recommendationId: rec._id, approvalId: rec.currentApprovalId,
        actionType: 'move_card', status: 'in_progress', startedAt: new Date() });
      return { rec, attempt };
    };
    const body = (outcome = 'succeeded') => ({ workspaceId, outcome, evidence: 'Synthetic operator evidence',
      reason: 'Synthetic observed result', reconciledBy: 'synthetic-reviewer' });
    const verifyFinal = async (pair, outcome) => {
      const rec = await Recommendation.findById(pair.rec._id);
      const attempt = await Attempt.findById(pair.attempt._id);
      assert.equal(rec.status, outcome === 'succeeded' ? 'executed' : 'failed');
      assert.equal(attempt.status, outcome);
      assert.equal(attempt.reconciliation.status, `confirmed_${outcome}`);
      assert.equal(rec.reconciliationDecision.outcome, outcome);
      assert.equal(attempt.reconciliation.evidence, rec.reconciliationDecision.evidence);
      const audits = await AuditEvent.find({ trelloActionAttemptId: attempt._id });
      assert.equal(audits.length, 1, 'Exactly one finalizer records the audit');
      assert.equal(String(audits[0].workspaceId), String(workspaceId));
    };

    const partial = await create();
    await Attempt.updateOne({ _id: partial.attempt._id }, { $set: { status: 'failed', reconciliation: {
      status: 'required', confirmedSteps: ['member_added'], pendingSteps: ['member_removed'], detectedAt: new Date()
    } } });
    await service.reconcileTrelloActionAttempt(partial.attempt._id, body());
    await verifyFinal(partial, 'succeeded');
    const partialEvidence = await Attempt.findById(partial.attempt._id);
    assert.deepEqual([...partialEvidence.reconciliation.confirmedSteps], ['member_added']);
    assert.deepEqual([...partialEvidence.reconciliation.pendingSteps], ['member_removed']);

    for (const outcomes of [['succeeded', 'failed'], ['failed', 'succeeded'], ['succeeded', 'succeeded']]) {
      const pair = await create();
      const results = await Promise.allSettled(outcomes.map(outcome => service.reconcileTrelloActionAttempt(pair.attempt._id, body(outcome))));
      assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
      assert.equal(results.find(result => result.status === 'rejected').reason.statusCode, 409);
      await verifyFinal(pair, outcomes[results.findIndex(result => result.status === 'fulfilled')]);
    }

    // Exercise each actual database commit with its acknowledgement deliberately lost.
    for (const stage of ['claim', 'attempt', 'final']) {
      const pair = await create();
      const Model = stage === 'attempt' ? Attempt : Recommendation;
      const original = Model.findOneAndUpdate;
      let injected = false;
      Model.findOneAndUpdate = async function(query, update, options) {
        const result = await original.call(this, query, update, options);
        const target = stage === 'attempt' || (stage === 'claim' ? Boolean(update.$set.reconciliationDecision) : update.$set.status === 'executed');
        if (target && !injected) { injected = true; throw new Error('Synthetic lost acknowledgement'); }
        return result;
      };
      try {
        await service.reconcileTrelloActionAttempt(pair.attempt._id, body());
        assert.equal(injected, true);
        await verifyFinal(pair, 'succeeded');
      } finally { Model.findOneAndUpdate = original; }
    }

    // A failed write leaves the original decision available for an exact-evidence retry.
    for (const stage of ['attempt', 'final']) {
      const pair = await create();
      const Model = stage === 'attempt' ? Attempt : Recommendation;
      const original = Model.findOneAndUpdate;
      Model.findOneAndUpdate = function(query, update, options) {
        if (stage === 'attempt' || update.$set.status === 'failed') return Promise.reject(new Error('Synthetic unavailable write'));
        return original.call(this, query, update, options);
      };
      try {
        await assert.rejects(service.reconcileTrelloActionAttempt(pair.attempt._id, body('failed')), { code: 'SNEUP_LEDGER_COMMIT_UNCERTAIN' });
      } finally { Model.findOneAndUpdate = original; }
      assert.equal((await Recommendation.findById(pair.rec._id)).status, 'executing');
      await assert.rejects(service.reconcileTrelloActionAttempt(pair.attempt._id, body()), { statusCode: 409 });
      await assert.rejects(service.reconcileTrelloActionAttempt(pair.attempt._id, { ...body('failed'), evidence: 'Changed evidence' }), { statusCode: 409 });
      await service.reconcileTrelloActionAttempt(pair.attempt._id, { ...body('failed'), reconciledBy: 'retry-reviewer' });
      await verifyFinal(pair, 'failed');
      assert.equal((await Attempt.findById(pair.attempt._id)).reconciliation.reconciledBy, 'synthetic-reviewer');
    }

    for (const unversioned of [false, true]) {
      const stale = await create();
      if (unversioned) {
        await Recommendation.collection.updateOne({ _id: stale.rec._id }, { $unset: { __v: 1 } });
        await Attempt.collection.updateOne({ _id: stale.attempt._id }, { $unset: { __v: 1 } });
      }
      const providerRec = await Recommendation.findById(stale.rec._id);
      const providerAttempt = await Attempt.findById(stale.attempt._id);
      await service.reconcileTrelloActionAttempt(stale.attempt._id, body('failed'));
      providerAttempt.status = 'succeeded';
      providerRec.status = 'executed';
      await assert.rejects(providerAttempt.save(), error => ['VersionError', 'DocumentNotFoundError'].includes(error.name));
      await assert.rejects(providerRec.save(), error => ['VersionError', 'DocumentNotFoundError'].includes(error.name));
      await verifyFinal(stale, 'failed');
    }

    const historical = await create();
    for (const [Model, doc] of [[Recommendation, historical.rec], [Attempt, historical.attempt]]) {
      await Model.collection.updateOne({ _id: doc._id }, { $unset: { __v: 1 } });
      const legacyDoc = await Model.findById(doc._id);
      legacyDoc.$where = { workspaceId };
      legacyDoc.status = 'failed';
      await legacyDoc.save();
      legacyDoc.status = doc.status;
      await legacyDoc.save();
      assert.equal(legacyDoc.__v, 2, 'Uncontended legacy documents can be saved repeatedly');
      assert.equal(String(legacyDoc.$where.workspaceId), String(workspaceId), 'Existing predicates are retained');
    }
    await Attempt.create({ workspaceId, recommendationId: historical.rec._id, approvalId: historical.rec.currentApprovalId,
      actionType: 'move_card', status: 'in_progress', createdAt: new Date(Date.now() + 1000) });
    await assert.rejects(service.reconcileTrelloActionAttempt(historical.attempt._id, body()), { statusCode: 409 });
    const oldApproval = await create();
    await Recommendation.updateOne({ _id: oldApproval.rec._id }, { $set: { currentApprovalId: new mongoose.Types.ObjectId() } });
    await assert.rejects(service.reconcileTrelloActionAttempt(oldApproval.attempt._id, body()), { statusCode: 409 });

    const foreign = await create();
    await Recommendation.updateOne({ _id: foreign.rec._id }, { $set: { workspaceId: otherWorkspaceId } });
    await assert.rejects(service.reconcileTrelloActionAttempt(foreign.attempt._id, body()), { statusCode: 409 });
    assert.equal((await Attempt.findById(foreign.attempt._id)).status, 'in_progress');
    await assert.rejects(service.reconcileTrelloActionAttempt(foreign.attempt._id, { ...body(), workspaceId: otherWorkspaceId }), { statusCode: 404 });

    const legacy = await create();
    await Attempt.updateOne({ _id: legacy.attempt._id }, { $set: { status: 'failed', reconciliation: {
      status: 'confirmed_failed', evidence: body().evidence, reason: body().reason, reconciledBy: 'legacy-reviewer', reconciledAt: new Date()
    } } });
    await service.reconcileTrelloActionAttempt(legacy.attempt._id, body('failed'));
    await verifyFinal(legacy, 'failed');
    assert.equal((await Attempt.findById(legacy.attempt._id)).reconciliation.reconciledBy, 'legacy-reviewer');

    const createLinked = async () => {
      const pair = await create();
      const intervention = await Intervention.create({ workspaceId, boardId: new mongoose.Types.ObjectId(),
        type: 'comment', trigger: 'manual_request', action: 'Synthetic recovery', status: 'executing' });
      await Recommendation.updateOne({ _id: pair.rec._id }, { $set: { interventionId: intervention._id, actionType: 'comment' } });
      await Attempt.updateOne({ _id: pair.attempt._id }, { $set: { interventionId: intervention._id, actionType: 'comment' } });
      return { ...pair, intervention };
    };
    const fault = (stage, afterCommit) => {
      const Model = { intervention: Intervention, followUp: FollowUpPlan, audit: AuditEvent, completion: Recommendation }[stage];
      const method = ['followUp', 'audit'].includes(stage) ? 'create' : 'findOneAndUpdate';
      const original = Model[method];
      let injected = 0;
      Model[method] = async function(...args) {
        if (stage === 'completion' && args[1]?.$set?.['reconciliationDecision.effects']?.status !== 'completed') {
          return original.apply(this, args);
        }
        injected++;
        if (afterCommit) await original.apply(this, args);
        throw new Error('Synthetic interrupted internal effect');
      };
      return () => { Model[method] = original; assert.ok(injected > 0, `Fault ${stage} was exercised`); };
    };
    for (const stage of ['intervention', 'followUp', 'audit', 'completion']) {
      for (const afterCommit of [false, true]) {
        const pair = await createLinked();
        const restore = fault(stage, afterCommit);
        let result;
        try { result = await service.reconcileTrelloActionAttempt(pair.attempt._id, body()); }
        finally { restore(); }
        assert.equal(result.effectsCompleted, afterCommit, `${stage}: read-back distinguishes lost acknowledgement from failed write`);
        const recorded = await Recommendation.findById(pair.rec._id);
        assert.equal(recorded.status, 'executed', 'Internal failure must not reopen the provider action');
        assert.equal(recorded.reconciliationDecision.effects.status, afterCommit ? 'completed' : 'pending');
        const finishedAt = (await Attempt.findById(pair.attempt._id)).finishedAt;
        // Reload the module to ensure recovery depends on persisted state, not process-local flags.
        delete require.cache[require.resolve('../src/services/trelloReconciliationEffectsService')];
        await Promise.all([1, 2].map(() => service.reconcileTrelloActionAttempt(pair.attempt._id, body())));
        assert.equal((await service.reconcileTrelloActionAttempt(pair.attempt._id, body())).effectsCompleted, true);
        await verifyFinal(pair, 'succeeded');
        assert.equal(await FollowUpPlan.countDocuments({ recommendationId: pair.rec._id }), 1);
        const updated = await Intervention.findById(pair.intervention._id);
        assert.equal(updated.executedAt.getTime(), finishedAt.getTime(), 'Recovery preserves the original execution time');
        assert.equal(String(updated.metadata.reconciliationDecisionId), String(recorded.reconciliationDecision._id));
        await assert.rejects(service.reconcileTrelloActionAttempt(pair.attempt._id, body('failed')), { statusCode: 409 });
      }
    }

    const earlyResponse = await createLinked();
    const restoreFollowUp = fault('followUp', false);
    try { assert.equal((await service.reconcileTrelloActionAttempt(earlyResponse.attempt._id, body())).effectsCompleted, false); }
    finally { restoreFollowUp(); }
    await service.recordWorkerResponse({ workspaceId, interventionId: earlyResponse.intervention._id,
      recommendationId: earlyResponse.rec._id, responseType: 'completed', source: 'manual', responseText: 'Synthetic completed response' });
    await service.reconcileTrelloActionAttempt(earlyResponse.attempt._id, body());
    const answeredFollowUp = await FollowUpPlan.findOne({ recommendationId: earlyResponse.rec._id });
    assert.equal(answeredFollowUp.status, 'resolved', 'Recovery catches a response recorded before follow-up insertion');
    const resolvedAt = answeredFollowUp.resolvedAt.getTime();
    await service.reconcileTrelloActionAttempt(earlyResponse.attempt._id, body());
    assert.equal((await FollowUpPlan.findById(answeredFollowUp._id)).resolvedAt.getTime(), resolvedAt);

    const queued = await createLinked();
    const restoreAudit = fault('audit', false);
    try { await service.reconcileTrelloActionAttempt(queued.attempt._id, body()); }
    finally { restoreAudit(); }
    assert.equal((await service.retryPendingTrelloReconciliations({ workspaceId })).processedCount, 0, 'Backoff avoids hot retries');
    await Recommendation.updateOne({ _id: queued.rec._id }, { $unset: { 'reconciliationDecision.effects.nextAttemptAt': 1 } });
    assert.equal((await service.retryPendingTrelloReconciliations({ workspaceId: otherWorkspaceId })).processedCount, 0);
    assert.deepEqual(await service.retryPendingTrelloReconciliations({ workspaceId, limit: 1 }),
      { processedCount: 1, completedCount: 1, failureCount: 0 });
    await verifyFinal(queued, 'succeeded');

    for (const reason of ['', '   ']) {
      const emptyNote = await createLinked();
      const restore = fault('audit', false);
      try { await service.reconcileTrelloActionAttempt(emptyNote.attempt._id, { ...body(), reason }); }
      finally { restore(); }
      await Recommendation.updateOne({ _id: emptyNote.rec._id }, { $unset: { 'reconciliationDecision.effects.nextAttemptAt': 1 } });
      assert.deepEqual(await service.retryPendingTrelloReconciliations({ workspaceId, limit: 1 }),
        { processedCount: 1, completedCount: 1, failureCount: 0 });
      const recovered = await service.reconcileTrelloActionAttempt(emptyNote.attempt._id, { ...body(), reason: '' });
      assert.equal(recovered.effectsCompleted, true);
      assert.equal(recovered.recommendation.reconciliationDecision.reason, '');
    }

    const reassigned = await createLinked();
    const nextRecommendationId = new mongoose.Types.ObjectId();
    const originalUpdate = Intervention.findOneAndUpdate;
    let assignmentInjected = false;
    Intervention.findOneAndUpdate = async function(...args) {
      if (!assignmentInjected) {
        assignmentInjected = true;
        const newer = await Intervention.findById(reassigned.intervention._id);
        newer.metadata = { recommendationId: nextRecommendationId };
        await newer.save();
      }
      return originalUpdate.apply(this, args);
    };
    try { assert.equal((await service.reconcileTrelloActionAttempt(reassigned.attempt._id, body())).effectsCompleted, false); }
    finally { Intervention.findOneAndUpdate = originalUpdate; }
    assert.equal(assignmentInjected, true);
    const retainedAssignment = await Intervention.findById(reassigned.intervention._id);
    assert.equal(String(retainedAssignment.metadata.recommendationId), String(nextRecommendationId));
    assert.equal(retainedAssignment.status, 'executing');
    assert.equal(await FollowUpPlan.countDocuments({ recommendationId: reassigned.rec._id }), 0);

    const invalid = await createLinked();
    await Intervention.updateOne({ _id: invalid.intervention._id }, { $set: { status: 'cancelled' } });
    assert.equal((await service.reconcileTrelloActionAttempt(invalid.attempt._id, body())).effectsCompleted, false);
    assert.equal((await Intervention.findById(invalid.intervention._id)).status, 'cancelled');
    assert.equal(await FollowUpPlan.countDocuments({ recommendationId: invalid.rec._id }), 0);
    // A stale approval makes the endpoint reject before effect processing; the worker still backs it off.
    await Recommendation.updateOne({ _id: invalid.rec._id }, { $set: { currentApprovalId: new mongoose.Types.ObjectId() },
      $unset: { 'reconciliationDecision.effects.nextAttemptAt': 1 } });
    assert.deepEqual(await service.retryPendingTrelloReconciliations({ workspaceId, limit: 1 }),
      { processedCount: 1, completedCount: 0, failureCount: 1 });
    assert.equal((await service.retryPendingTrelloReconciliations({ workspaceId, limit: 1 })).processedCount, 0);

    assert.equal(providerCalls, 0);
    // Run the real executor/ledger path, replacing only its provider boundary with a held synthetic result.
    await Workspace.create({ _id: workspaceId, name: 'Synthetic reconciliation executor', slug: `reconciliation-${token}` });
    process.env.SNEUP_DEMO_MODE = 'false';
    process.env.SNEUP_PROVIDER_WRITES_DISABLED = 'false';
    let simulatedExecutorCalls = 0;
    for (const providerOutcome of ['succeeded', 'failed']) {
      let release, reject, reached;
      const providerStarted = new Promise(resolve => { reached = resolve; });
      const heldResult = new Promise((resolve, fail) => { release = resolve; reject = fail; });
      service.performTrelloAction = () => { simulatedExecutorCalls += 1; reached(); return heldResult; };
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const rec = await Recommendation.create({ workspaceId, findingType: 'manual', title: 'Synthetic held executor',
        recommendedAction: 'Synthetic comment', actionType: 'comment', status: 'approved', requiresApproval: true,
        approvalExpiresAt: expiresAt, actionPayload: { executable: true, draftOnly: false, cardTrelloId: 'synthetic-card', commentText: 'Synthetic only' } });
      const approval = await Approval.create({ workspaceId, recommendationId: rec._id, decision: 'approved', requestedAction: 'comment',
        expiresAt, approvedPayloadSnapshot: rec.actionPayload });
      await Recommendation.updateOne({ _id: rec._id }, { $set: { currentApprovalId: approval._id } });
      const execution = service.executeApprovedRecommendation(rec._id, { workspaceId, expectedRevision: rec.__v, actor: 'synthetic-executor' })
        .then(value => ({ value }), error => ({ error }));
      const { withTimeout } = require('../src/utils/runtimeShutdown');
      await withTimeout(Promise.race([providerStarted, execution.then(result => { throw result.error || new Error('Executor did not reach synthetic provider'); })]), { timeoutMs: 5000 });
      const attempt = await Attempt.findOne({ workspaceId, recommendationId: rec._id });
      await service.reconcileTrelloActionAttempt(attempt._id, body('failed'));
      if (providerOutcome === 'succeeded') release({ synthetic: true });
      else reject(Object.assign(new Error('Synthetic ambiguous provider failure'), { requiresReconciliation: true }));
      assert.ok((await execution).error, 'Late executor finalization must report a conflict, not overwrite the manual outcome');
      await verifyFinal({ rec, attempt }, 'failed');
    }
    assert.equal(simulatedExecutorCalls, 2);
    console.log(JSON.stringify({ result: 'PASS', scenarios: ['conflicting-and-identical-reviewers', 'lost-acknowledgements-all-three-writes',
      'interrupted-write-retry', 'immutable-evidence-and-actor', 'versioned-and-unversioned-stale-provider-saves', 'historical-attempt', 'approval-binding',
      'workspace-isolation', 'legacy-confirmation-recovery', 'partial-step-evidence', 'actual-executor-with-held-synthetic-provider',
      'four-internal-effect-failures-and-lost-acknowledgements', 'concurrent-idempotent-effect-retries', 'persisted-effect-module-reload',
      'early-response-follow-up-recovery', 'bounded-workspace-retry-and-backoff', 'cancelled-intervention-and-invalid-reference-backoff',
      'empty-and-whitespace-reason-replay', 'concurrent-intervention-assignment-preserved'],
    providerCalls, simulatedExecutorCalls, elapsedMs: Math.round(performance.now() - startedAt) }));
  } finally {
    let verifiedOwnership = false;
    try {
      if (ownsDatabase && mongoose.connection.readyState === 1) {
        const ownership = await mongoose.connection.db.collection('_sneup_verification_owner').findOne({ _id: 'owner', token });
        verifiedOwnership = Boolean(ownership);
      }
    } finally {
      await cleanupVerificationDatabase(mongoose, verifiedOwnership);
    }
  }
};

run().catch(error => {
  console.error(`Trello reconciliation verification failed: ${error.message}`);
  process.exitCode = 1;
});
