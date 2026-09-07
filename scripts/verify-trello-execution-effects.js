const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const { cleanupVerificationDatabase } = require('./verify-hai-snapshot');

const uri = process.env.SNEUP_EXECUTION_EFFECTS_VERIFICATION_MONGO_URI;
const name = uri ? new URL(uri).pathname.slice(1) : '';
if (!uri || Buffer.byteLength(name) > 63 || !/^sneup_execution_verification_[a-z0-9_-]+$/i.test(name)) {
  throw new Error('SNEUP_EXECUTION_EFFECTS_VERIFICATION_MONGO_URI must target a dedicated sneup_execution_verification_* database');
}

async function run() {
  let ownsDatabase = false;
  const token = randomUUID();
  const started = performance.now();
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    assert.equal((await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).length, 0,
      'Refusing to modify a nonempty verification database');
    await mongoose.connection.db.collection('_sneup_verification_owner').insertOne({ _id: 'owner', token });
    ownsDatabase = true;
    const Recommendation = require('../src/models/Recommendation');
    const Attempt = require('../src/models/TrelloActionAttempt');
    const Approval = require('../src/models/Approval');
    const Intervention = require('../src/models/Intervention');
    const FollowUp = require('../src/models/FollowUpPlan');
    const Audit = require('../src/models/AuditEvent');
    const Workspace = require('../src/models/Workspace');
    const service = require('../src/services/operationsLedgerService');
    const workspaceId = new mongoose.Types.ObjectId();
    const foreignWorkspaceId = new mongoose.Types.ObjectId();
    await Promise.all([Recommendation, Attempt, Approval, Intervention, FollowUp, Audit, Workspace].map(Model => Model.init()));
    await Workspace.create({ _id: workspaceId, name: 'Synthetic execution recovery', slug: `execution-${token}` });
    // Replace the provider boundary before enabling the actual approved-execution controller.
    let simulatedProviderCalls = 0;
    let providerFailure;
    service.performTrelloAction = async () => {
      simulatedProviderCalls += 1;
      if (providerFailure) throw providerFailure;
      return { synthetic: true };
    };
    process.env.SNEUP_DEMO_MODE = 'false';
    process.env.SNEUP_PROVIDER_WRITES_DISABLED = 'false';
    const create = async ({ bindApproval = true } = {}) => {
      const boardId = new mongoose.Types.ObjectId();
      const memberId = new mongoose.Types.ObjectId();
      const cardId = new mongoose.Types.ObjectId();
      const intervention = await Intervention.create({ workspaceId, boardId, cardId, memberId,
        type: 'comment', trigger: 'manual_request', severity: 'medium', action: 'Synthetic follow-up', status: 'executing' });
      const expiresAt = new Date(Date.now() + 3600000);
      const rec = await Recommendation.create({ workspaceId, boardId, cardId, memberId, interventionId: intervention._id,
        findingType: 'manual', title: 'Synthetic approved execution', recommendedAction: 'Synthetic comment',
        actionType: 'comment', status: 'approved', requiresApproval: true, approvalExpiresAt: expiresAt,
        actionPayload: { executable: true, draftOnly: false, cardTrelloId: 'synthetic-card', commentText: 'Synthetic only' } });
      const approval = await Approval.create({ workspaceId, recommendationId: rec._id, requestedAction: 'comment',
        decision: 'approved', approvedPayloadSnapshot: rec.actionPayload, decidedBy: 'synthetic-approver', expiresAt });
      if (bindApproval) await Recommendation.updateOne({ _id: rec._id }, { $set: { currentApprovalId: approval._id } });
      return { rec, intervention };
    };
    const execute = pair => service.executeApprovedRecommendation(pair.rec._id, {
      workspaceId, expectedRevision: pair.rec.__v, actor: 'synthetic-executor'
    });
    const final = async pair => {
      const attempt = await Attempt.findOne({ recommendationId: pair.rec._id });
      const rec = await Recommendation.findById(pair.rec._id);
      assert.equal(rec.status, 'executed');
      assert.equal(String(rec.executionAttemptId), String(attempt._id));
      assert.equal(attempt.executionEffects.status, 'completed');
      const intervention = await Intervention.findById(pair.intervention._id);
      assert.equal(intervention.status, 'executed');
      assert.equal(intervention.executedAt.getTime(), attempt.finishedAt.getTime());
      const followUps = await FollowUp.find({ recommendationId: rec._id });
      assert.equal(followUps.length, 1);
      const audits = await Audit.find({ trelloActionAttemptId: attempt._id, action: 'trello_action_succeeded' });
      assert.equal(audits.length, 1);
      assert.equal(audits[0].actor, 'synthetic-executor');
      assert.equal(audits[0].createdAt.getTime(), attempt.finishedAt.getTime());
      assert.equal(audits[0].afterState.followUpScheduled, true);
      const count = simulatedProviderCalls;
      await service.finalizeTrelloExecutionEffects(attempt);
      assert.equal(simulatedProviderCalls, count);
      return { attempt, followUp: followUps[0] };
    };
    let faultCases = 0;
    for (const stage of ['attempt', 'recommendation', 'intervention', 'followUp', 'audit', 'completion']) {
      for (const afterWrite of [false, true]) {
        const pair = await create();
        const target = stage === 'attempt' ? Attempt.prototype : stage === 'recommendation' ? Recommendation
          : stage === 'intervention' ? Intervention : stage === 'followUp' ? FollowUp : stage === 'audit' ? Audit : Attempt;
        const method = stage === 'attempt' ? 'save' : ['followUp', 'audit'].includes(stage) ? 'create' : 'findOneAndUpdate';
        const original = target[method];
        let injected = false;
        target[method] = async function(...args) {
          const eligible = stage === 'attempt' ? this.status === 'succeeded'
            : stage === 'recommendation' ? args[1]?.$set?.status === 'executed'
              : stage === 'audit' ? args[0]?.action === 'trello_action_succeeded'
                : stage === 'completion' ? args[1]?.$set?.['executionEffects.status'] === 'completed' : true;
          if (injected || !eligible) return original.apply(this, args);
          injected = true;
          if (afterWrite) await original.apply(this, args);
          throw new Error(`Synthetic ${stage} interruption`);
        };
        let result, failure;
        const beforeCalls = simulatedProviderCalls;
        try { result = await execute(pair); } catch (error) { failure = error; }
        finally { target[method] = original; }
        assert.equal(injected, true, `${stage} injection reached`);
        assert.equal(simulatedProviderCalls, beforeCalls + 1);
        const attempt = await Attempt.findOne({ recommendationId: pair.rec._id });
        if (stage === 'attempt' && !afterWrite) {
          assert.equal(failure?.statusCode, 503);
          assert.equal(attempt.status, 'in_progress');
          assert.equal((await service.retryPendingTrelloExecutionEffects({ workspaceId })).processedCount, 0);
          assert.equal((await Recommendation.findById(pair.rec._id)).status, 'executing');
          assert.equal(await FollowUp.countDocuments({ recommendationId: pair.rec._id }), 0);
        } else {
          assert.ifError(failure);
          assert.equal(result.effectsCompleted, afterWrite, `${stage} initial receipt matches commit proof`);
          delete require.cache[require.resolve('../src/services/trelloExecutionEffectsService')];
          const retries = await Promise.all([service.finalizeTrelloExecutionEffects(attempt), service.finalizeTrelloExecutionEffects(attempt)]);
          assert.ok(retries.every(receipt => receipt.effectsCompleted));
          await final(pair);
        }
        assert.equal(simulatedProviderCalls, beforeCalls + 1, 'Recovery never repeats a provider call');
        faultCases += 1;
      }
    }
    const failedFinal = async pair => {
      const attempt = await Attempt.findOne({ recommendationId: pair.rec._id });
      const rec = await Recommendation.findById(pair.rec._id);
      const intervention = await Intervention.findById(pair.intervention._id);
      assert.equal(rec.status, 'failed');
      assert.equal(String(rec.executionAttemptId), String(attempt._id));
      assert.equal(rec.failureReason, 'Synthetic definite rejection');
      assert.equal(rec.executedAt, undefined);
      assert.equal(attempt.executionEffects.status, 'completed');
      assert.equal(attempt.executionEffects.outcome, 'failed');
      assert.equal(attempt.executionEffects.followUpScheduled, false);
      assert.equal(intervention.status, 'failed');
      assert.equal(intervention.executedAt, undefined);
      assert.equal(intervention.metadata.error, rec.failureReason);
      assert.equal(await FollowUp.countDocuments({ recommendationId: rec._id }), 0);
      const audits = await Audit.find({ trelloActionAttemptId: attempt._id });
      assert.equal(audits.length, 1);
      assert.equal(audits[0].action, 'trello_action_failed');
      assert.equal(audits[0].actor, 'synthetic-executor');
      assert.equal(audits[0].createdAt.getTime(), attempt.finishedAt.getTime());
      assert.equal(audits[0].afterState.attemptStatus, 'failed');
      assert.equal(audits[0].afterState.followUpScheduled, false);
      assert.ok(!JSON.stringify(audits).includes('Synthetic definite rejection'), 'No duplicate provider error in audit payload');
      const count = simulatedProviderCalls;
      assert.equal((await service.finalizeTrelloExecutionEffects(attempt)).effectsCompleted, true);
      assert.equal(simulatedProviderCalls, count);
    };
    providerFailure = new Error('Synthetic definite rejection');
    for (const stage of ['attempt', 'recommendation', 'intervention', 'audit', 'completion']) {
      for (const afterWrite of [false, true]) {
        const pair = await create();
        const target = stage === 'attempt' ? Attempt.prototype : stage === 'recommendation' ? Recommendation
          : stage === 'intervention' ? Intervention : stage === 'audit' ? Audit : Attempt;
        const method = stage === 'attempt' ? 'save' : stage === 'audit' ? 'create' : 'findOneAndUpdate';
        const original = target[method];
        let injected = false;
        target[method] = async function(...args) {
          const eligible = stage === 'attempt' ? this.status === 'failed'
            : stage === 'recommendation' ? args[1]?.$set?.status === 'failed'
              : stage === 'audit' ? args[0]?.action === 'trello_action_failed'
                : stage === 'completion' ? args[1]?.$set?.['executionEffects.status'] === 'completed' : true;
          if (injected || !eligible) return original.apply(this, args);
          injected = true;
          if (afterWrite) await original.apply(this, args);
          throw new Error(`Synthetic failure ${stage} interruption`);
        };
        let failure;
        const beforeCalls = simulatedProviderCalls;
        try { await execute(pair); } catch (error) { failure = error; }
        finally { target[method] = original; }
        assert.equal(injected, true, `failure ${stage} injection reached`);
        const attempt = await Attempt.findOne({ recommendationId: pair.rec._id });
        if (stage === 'attempt' && !afterWrite) {
          assert.equal(failure?.code, 'SNEUP_LEDGER_COMMIT_UNCERTAIN');
          assert.equal(attempt.status, 'in_progress');
          assert.equal((await Recommendation.findById(pair.rec._id)).status, 'executing');
          await Attempt.updateOne({ _id: attempt._id }, { $unset: { 'executionEffects.nextAttemptAt': 1 } });
          assert.equal((await service.retryPendingTrelloExecutionEffects({ workspaceId })).processedCount, 0);
        } else {
          assert.equal(failure?.code, afterWrite ? 'SNEUP_TRELLO_ACTION_FAILED' : 'SNEUP_TRELLO_ACTION_FAILED_EFFECTS_PENDING');
          delete require.cache[require.resolve('../src/services/trelloExecutionEffectsService')];
          const receipts = await Promise.all([service.finalizeTrelloExecutionEffects(attempt), service.finalizeTrelloExecutionEffects(attempt)]);
          assert.ok(receipts.every(receipt => receipt.effectsCompleted && receipt.followUpScheduled === false));
          await failedFinal(pair);
        }
        assert.equal(simulatedProviderCalls, beforeCalls + 1, 'Failure recovery never repeats provider execution');
        faultCases += 1;
      }
    }
    const failedPaused = async () => {
      const pair = await create();
      const original = Recommendation.findOneAndUpdate;
      Recommendation.findOneAndUpdate = function(...args) {
        if (args[1]?.$set?.status === 'failed') throw new Error('Synthetic failed finalization pause');
        return original.apply(this, args);
      };
      try { await assert.rejects(execute(pair), { code: 'SNEUP_TRELLO_ACTION_FAILED_EFFECTS_PENDING' }); }
      finally { Recommendation.findOneAndUpdate = original; }
      return { ...pair, attempt: await Attempt.findOne({ recommendationId: pair.rec._id }) };
    };
    const failedPending = await failedPaused();
    const health = await service.getTrelloActionReconciliationHealth({ workspaceId, limit: 100,
      now: new Date(Date.now() + 48 * 3600000), lean: true });
    assert.ok(!health.items.some(item => item.attemptId === String(failedPending.attempt._id)),
      'A persisted definite failure must not raise a provider-evidence alert');
    await Attempt.updateOne({ _id: failedPending.attempt._id }, { $unset: { 'executionEffects.nextAttemptAt': 1 } });
    assert.equal((await service.retryPendingTrelloExecutionEffects({ workspaceId: foreignWorkspaceId })).processedCount, 0);
    const failedCalls = simulatedProviderCalls;
    assert.deepEqual(await service.retryPendingTrelloExecutionEffects({ workspaceId, limit: 1 }),
      { processedCount: 1, completedCount: 1, failureCount: 0 });
    await failedFinal(failedPending);
    assert.equal(simulatedProviderCalls, failedCalls);
    for (const terminal of ['failed', 'executed', 'cancelled']) {
      const pair = await failedPaused();
      await Intervention.updateOne({ _id: pair.intervention._id }, { $set: { status: terminal, 'metadata.unrelated': 'preserve' } });
      assert.equal((await service.finalizeTrelloExecutionEffects(pair.attempt)).effectsCompleted, false);
      const preserved = await Intervention.findById(pair.intervention._id);
      assert.equal(preserved.status, terminal);
      assert.equal(preserved.metadata.unrelated, 'preserve');
      assert.equal(await Audit.countDocuments({ trelloActionAttemptId: pair.attempt._id }), 0);
      assert.equal(await FollowUp.countDocuments({ recommendationId: pair.rec._id }), 0);
    }
    for (const excluded of ['historical', 'ambiguous']) {
      const pair = await failedPaused();
      await Attempt.updateOne({ _id: pair.attempt._id }, {
        $unset: { 'executionEffects.nextAttemptAt': 1, ...(excluded === 'historical' ? { 'executionEffects.outcome': 1 } : {}) },
        ...(excluded === 'ambiguous' ? { $set: { 'reconciliation.status': 'required' } } : {})
      });
      await assert.rejects(service.finalizeTrelloExecutionEffects(pair.attempt), { code: 'SNEUP_LEDGER_COMMIT_UNCERTAIN' });
      assert.equal((await service.retryPendingTrelloExecutionEffects({ workspaceId })).processedCount, 0);
      assert.equal((await Recommendation.findById(pair.rec._id)).status, 'executing');
    }
    const originalProvider = service.performTrelloAction;
    const { withTimeout } = require('../src/utils/runtimeShutdown');
    for (const outcome of ['succeeded', 'failed']) {
      for (const interruptedClaim of [false, true]) {
        const pair = await create();
        let rejectProvider, reached;
        const providerStarted = new Promise(resolve => { reached = resolve; });
        const held = new Promise((resolve, reject) => { rejectProvider = reject; });
        service.performTrelloAction = () => { simulatedProviderCalls += 1; reached(); return held; };
        const execution = execute(pair).then(value => ({ value }), error => ({ error }));
        await withTimeout(Promise.race([providerStarted, execution.then(result => {
          throw result.error || new Error('Synthetic provider was not reached');
        })]), { timeoutMs: 5000 });
        const attempt = await Attempt.findOne({ recommendationId: pair.rec._id });
        const body = { workspaceId, outcome, evidence: 'Synthetic operator evidence', reason: 'Synthetic operator note', actor: 'synthetic-reviewer' };
        const original = Attempt.findOneAndUpdate;
        if (interruptedClaim) Attempt.findOneAndUpdate = () => { throw new Error('Synthetic interrupted operator confirmation'); };
        try {
          if (interruptedClaim) await assert.rejects(service.reconcileTrelloActionAttempt(attempt._id, body), { code: 'SNEUP_LEDGER_COMMIT_UNCERTAIN' });
          else assert.equal((await service.reconcileTrelloActionAttempt(attempt._id, body)).effectsCompleted, true);
        } finally { Attempt.findOneAndUpdate = original; }
        const recorded = (await Recommendation.findById(pair.rec._id)).reconciliationDecision;
        rejectProvider(new Error('Synthetic definite rejection'));
        const result = await withTimeout(execution, { timeoutMs: 5000 });
        assert.ok(result.error && !result.value, 'Late definite failure cannot report success or overwrite a manual decision');
        const interim = await Attempt.findById(attempt._id);
        if (interruptedClaim) {
          assert.equal(interim.executionEffects.status, 'superseded');
          assert.equal(await FollowUp.countDocuments({ recommendationId: pair.rec._id }), 0);
          const operatorHealth = await service.getTrelloActionReconciliationHealth({ workspaceId, limit: 100, lean: true });
          const item = operatorHealth.items.find(entry => entry.attemptId === String(attempt._id));
          assert.ok(item?.message.includes('Internal intervention'), 'Recorded operator claims remain visible for internal completion');
          assert.equal((await service.reconcileTrelloActionAttempt(attempt._id, { ...body, actor: 'different-retry-actor' })).effectsCompleted, true);
        }
        const rec = await Recommendation.findById(pair.rec._id);
        const finalAttempt = await Attempt.findById(attempt._id);
        assert.equal(rec.status, outcome === 'succeeded' ? 'executed' : 'failed');
        assert.equal(finalAttempt.status, outcome);
        assert.equal(finalAttempt.reconciliation.status, `confirmed_${outcome}`);
        assert.equal(finalAttempt.reconciliation.evidence, body.evidence);
        assert.equal(finalAttempt.reconciliation.reconciledBy, 'synthetic-reviewer');
        assert.equal(finalAttempt.reconciliation.reconciledAt.getTime(), recorded.decidedAt.getTime());
        assert.equal(rec.reconciliationDecision.actor, 'synthetic-reviewer');
        assert.equal(rec.reconciliationDecision.decidedAt.getTime(), recorded.decidedAt.getTime());
        assert.equal(await Audit.countDocuments({ trelloActionAttemptId: attempt._id, action: 'trello_action_failed' }), 0);
        assert.equal(await FollowUp.countDocuments({ recommendationId: rec._id }), outcome === 'succeeded' ? 1 : 0,
          'Only a confirmed successful manual result may own a follow-up');
      }
    }
    service.performTrelloAction = originalProvider;
    providerFailure = undefined;
    const legacyApproval = await create({ bindApproval: false });
    assert.equal((await execute(legacyApproval)).effectsCompleted, true);
    await final(legacyApproval);
    for (const representation of ['null', 'missing']) {
      const nullable = await create();
      const update = representation === 'null' ? { $set: { cardId: null, memberId: null } } : { $unset: { cardId: 1, memberId: 1 } };
      await Recommendation.updateOne({ _id: nullable.rec._id }, update);
      await Intervention.updateOne({ _id: nullable.intervention._id }, update);
      assert.equal((await execute(nullable)).effectsCompleted, true, `${representation} optional targets are supported`);
      await final(nullable);
    }

    // A response may finish after intervention finalization but before the follow-up insert.
    const early = await create();
    const originalCreate = FollowUp.create;
    let response;
    FollowUp.create = async function(...args) {
      response = await service.recordWorkerResponse({ workspaceId, interventionId: early.intervention._id,
        recommendationId: early.rec._id, memberId: early.rec.memberId, boardId: early.rec.boardId, cardId: early.rec.cardId,
        responseType: 'completed', actor: 'synthetic-worker', responseText: 'Private synthetic response' });
      return originalCreate.apply(this, args);
    };
    try { assert.equal((await execute(early)).effectsCompleted, true); }
    finally { FollowUp.create = originalCreate; }
    const earlyFinal = await final(early);
    assert.equal(earlyFinal.followUp.status, 'resolved');
    assert.equal(response.followUpResolution.modifiedCount, 0, 'Original response receipt is not rewritten for later work');
    const lateAudits = await Audit.find({ action: 'late_follow_up_resolved_from_worker_response', trelloActionAttemptId: earlyFinal.attempt._id });
    assert.equal(lateAudits.length, 1);
    assert.equal(lateAudits[0].afterState.modifiedCount, 1);
    assert.ok(!JSON.stringify(lateAudits).includes('Private synthetic response'));

    const pending = await create();
    FollowUp.create = async () => { throw new Error('Synthetic interrupted insert'); };
    try { assert.equal((await execute(pending)).effectsCompleted, false); }
    finally { FollowUp.create = originalCreate; }
    const pendingAttempt = await Attempt.findOne({ recommendationId: pending.rec._id });
    await Attempt.updateOne({ _id: pendingAttempt._id }, { $unset: { 'executionEffects.nextAttemptAt': 1 } });
    assert.equal((await service.retryPendingTrelloExecutionEffects({ workspaceId: foreignWorkspaceId })).processedCount, 0);
    const callsBeforeRecovery = simulatedProviderCalls;
    assert.deepEqual(await service.retryPendingTrelloExecutionEffects({ workspaceId, limit: 1 }),
      { processedCount: 1, completedCount: 1, failureCount: 0 });
    await final(pending);
    assert.equal(simulatedProviderCalls, callsBeforeRecovery);

    const invalid = await create();
    await Intervention.updateOne({ _id: invalid.intervention._id }, { $set: { status: 'cancelled' } });
    assert.equal((await execute(invalid)).effectsCompleted, false);
    const invalidAttempt = await Attempt.findOne({ recommendationId: invalid.rec._id });
    await Attempt.updateOne({ _id: invalidAttempt._id }, { $unset: { 'executionEffects.nextAttemptAt': 1 } });
    assert.deepEqual(await service.retryPendingTrelloExecutionEffects({ workspaceId, limit: 1 }),
      { processedCount: 1, completedCount: 0, failureCount: 1 });
    assert.equal((await service.retryPendingTrelloExecutionEffects({ workspaceId, limit: 1 })).processedCount, 0);
    assert.equal((await Intervention.findById(invalid.intervention._id)).status, 'cancelled');
    assert.equal(await FollowUp.countDocuments({ recommendationId: invalid.rec._id }), 0);
    const paused = async () => {
      const pair = await create();
      const original = Recommendation.findOneAndUpdate;
      Recommendation.findOneAndUpdate = function(...args) {
        if (args[1]?.$set?.status === 'executed') throw new Error('Synthetic paused finalization');
        return original.apply(this, args);
      };
      try { assert.equal((await execute(pair)).effectsCompleted, false); }
      finally { Recommendation.findOneAndUpdate = original; }
      return { ...pair, attempt: await Attempt.findOne({ recommendationId: pair.rec._id }) };
    };
    for (const mutation of ['failed', 'member', 'board', 'card', 'missing-approval', 'foreign-approval', 'approval-payload']) {
      const pair = await paused();
      if (mutation === 'failed') await Intervention.updateOne({ _id: pair.intervention._id }, { $set: { status: 'failed' } });
      if (mutation === 'member') await Intervention.updateOne({ _id: pair.intervention._id }, { $set: { memberId: new mongoose.Types.ObjectId() } });
      if (mutation === 'board' || mutation === 'card') await Attempt.updateOne({ _id: pair.attempt._id }, { $set: { [`${mutation}Id`]: new mongoose.Types.ObjectId() } });
      if (mutation.includes('approval')) await Recommendation.updateOne({ _id: pair.rec._id }, { $unset: { currentApprovalId: 1 } });
      if (mutation === 'missing-approval') await Attempt.updateOne({ _id: pair.attempt._id }, { $unset: { approvalId: 1 } });
      if (mutation === 'foreign-approval') await Attempt.updateOne({ _id: pair.attempt._id }, { $set: { approvalId: new mongoose.Types.ObjectId() } });
      if (mutation === 'approval-payload') await Approval.updateOne({ _id: pair.attempt.approvalId }, { $set: { approvedPayloadSnapshot: { changed: true } } });
      assert.equal((await service.finalizeTrelloExecutionEffects(pair.attempt)).effectsCompleted, false, mutation);
      assert.equal(await FollowUp.countDocuments({ recommendationId: pair.rec._id }), 0);
      assert.equal(await Audit.countDocuments({ trelloActionAttemptId: pair.attempt._id, action: 'trello_action_succeeded' }), 0);
      if (mutation === 'failed') assert.equal((await Intervention.findById(pair.intervention._id)).status, 'failed');
    }
    const expired = await paused();
    await Approval.updateOne({ _id: expired.attempt.approvalId }, { $set: { expiresAt: new Date(0) } });
    assert.equal((await service.finalizeTrelloExecutionEffects(expired.attempt)).effectsCompleted, true,
      'Recovery of confirmed success does not require renewed provider authority');
    await final(expired);
    const broken = await paused();
    const later = await paused();
    await Recommendation.deleteOne({ _id: broken.rec._id, workspaceId });
    await Attempt.updateOne({ _id: broken.attempt._id }, { $set: { 'executionEffects.nextAttemptAt': new Date(0) } });
    await Attempt.updateOne({ _id: later.attempt._id }, { $set: { 'executionEffects.nextAttemptAt': new Date(1) } });
    assert.deepEqual(await service.retryPendingTrelloExecutionEffects({ workspaceId, limit: 1 }),
      { processedCount: 1, completedCount: 0, failureCount: 1 });
    assert.deepEqual(await service.retryPendingTrelloExecutionEffects({ workspaceId, limit: 1 }),
      { processedCount: 1, completedCount: 1, failureCount: 0 });
    await final(later);
    const manual = await paused();
    const originalTransition = Recommendation.findOneAndUpdate;
    let manualClaimed = false;
    Recommendation.findOneAndUpdate = async function(...args) {
      if (!manualClaimed && args[1]?.$set?.executionAttemptId) {
        manualClaimed = true;
        await service.reconcileTrelloActionAttempt(manual.attempt._id, { workspaceId, outcome: 'failed',
          evidence: 'Synthetic operator decision', reason: 'Synthetic conflict', actor: 'synthetic-reviewer' });
      }
      return originalTransition.apply(this, args);
    };
    try {
      await assert.rejects(service.finalizeTrelloExecutionEffects(manual.attempt), { code: 'SNEUP_RECONCILIATION_CONFLICT' });
    } finally { Recommendation.findOneAndUpdate = originalTransition; }
    assert.equal(manualClaimed, true);
    assert.equal((await Recommendation.findById(manual.rec._id)).status, 'failed');
    assert.equal((await Attempt.findById(manual.attempt._id)).status, 'failed');
    assert.equal(await FollowUp.countDocuments({ recommendationId: manual.rec._id }), 0);
    const superseded = await paused();
    await service.reconcileTrelloActionAttempt(superseded.attempt._id, { workspaceId, outcome: 'succeeded',
      evidence: 'Synthetic operator confirmation', actor: 'synthetic-reviewer' });
    for (let retry = 0; retry < 2; retry += 1) {
      assert.equal((await service.finalizeTrelloExecutionEffects(superseded.attempt)).superseded, true);
    }
    assert.equal((await Attempt.findById(superseded.attempt._id)).executionEffects.status, 'superseded');
    assert.equal(await FollowUp.countDocuments({ recommendationId: superseded.rec._id }), 1);
    assert.equal(await Audit.countDocuments({ trelloActionAttemptId: superseded.attempt._id, action: 'trello_action_succeeded' }), 0);
    const stale = await paused();
    const originalRenew = Attempt.updateOne;
    let winner;
    Attempt.updateOne = async function(...args) {
      if (!winner && args[1]?.$set?.['executionEffects.nextAttemptAt']) {
        winner = 'running';
        winner = await service.finalizeTrelloExecutionEffects(stale.attempt);
      }
      return originalRenew.apply(this, args);
    };
    let staleReceipt;
    try { staleReceipt = await service.finalizeTrelloExecutionEffects(stale.attempt); }
    finally { Attempt.updateOne = originalRenew; }
    for (const receipt of [winner, staleReceipt]) {
      assert.equal(receipt.effectsCompleted, true);
      assert.equal(receipt.interventionUpdated, true);
      assert.equal(receipt.followUpScheduled, true);
    }
    await final(stale);
    console.log(JSON.stringify({ result: 'PASS', faultCases, simulatedProviderCalls, realProviderCalls: 0,
      scenarios: ['actual-approved-execution', 'lost-acknowledgements', 'interrupted-internal-writes', 'concurrent-retry',
        'module-reload', 'legacy-approval', 'late-response-audit', 'workspace-isolation', 'bounded-retry', 'cancelled-intervention', 'backoff',
        'failed-intervention-preserved', 'target-and-member-binding', 'original-approval-binding', 'expired-approval-recovery', 'broken-reference-rotation',
        'manual-reconciliation-wins-success-claim', 'nullable-optional-targets', 'persisted-supersession', 'completion-before-renewal-receipt',
        'definite-failure-write-recovery', 'failed-action-audit-once', 'failed-action-no-follow-ups', 'failed-action-worker-recovery',
        'failure-terminal-state-preservation', 'historical-and-ambiguous-failure-exclusion',
        'definite-failure-alert-exclusion', 'late-definite-failure-manual-success-and-failure', 'interrupted-operator-claim-recovery'],
      elapsedMs: Math.round(performance.now() - started) }));
  } finally {
    let verifiedOwnership = false;
    try {
      if (ownsDatabase && mongoose.connection.readyState === 1) {
        verifiedOwnership = Boolean(await mongoose.connection.db.collection('_sneup_verification_owner').findOne({ _id: 'owner', token }));
      }
    } finally { await cleanupVerificationDatabase(mongoose, verifiedOwnership); }
  }
}

run().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
