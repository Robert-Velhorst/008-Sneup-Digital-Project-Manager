const Recommendation = require('../models/Recommendation');
const Intervention = require('../models/Intervention');
const FollowUpPlan = require('../models/FollowUpPlan');
const WorkerResponse = require('../models/WorkerResponse');
const AuditEvent = require('../models/AuditEvent');
const logger = require('../utils/logger');

const RETRY_DELAY_MS = 5 * 60 * 1000;
const id = value => String(value?._id || value || '');

async function insertOnce(Model, data, proof, ledger) {
  const existing = await Model.findOne(proof);
  if (existing) return existing;
  try {
    return await Model.create(data);
  } catch {
    return ledger.recoverLedgerCommit(Model, proof);
  }
}

async function updateIntervention(recommendation, attempt, ledger) {
  if (!attempt.interventionId && !recommendation.interventionId) return false;
  if (id(attempt.interventionId) !== id(recommendation.interventionId)) throw ledger.reconciliationConflict();
  const intervention = await Intervention.findOne({ _id: attempt.interventionId, workspaceId: attempt.workspaceId });
  if (!intervention) throw ledger.reconciliationConflict();
  const decision = recommendation.reconciliationDecision;
  if (id(intervention.metadata?.reconciliationDecisionId) === id(decision._id)) return true;
  if (intervention.status === 'cancelled'
    || (intervention.metadata?.trelloActionAttemptId && id(intervention.metadata.trelloActionAttemptId) !== id(attempt._id))
    || (intervention.metadata?.recommendationId && id(intervention.metadata.recommendationId) !== id(recommendation._id))) {
    throw ledger.reconciliationConflict();
  }
  const state = {
    status: decision.outcome === 'succeeded' ? 'executed' : 'failed',
    'metadata.recommendationId': recommendation._id,
    'metadata.trelloActionAttemptId': attempt._id,
    'metadata.reconciliationDecisionId': decision._id,
    'metadata.reconciled': true,
    ...(decision.outcome === 'succeeded' ? { executedAt: attempt.finishedAt } : { 'metadata.error': decision.reason })
  };
  await ledger.commitReconciliationState(Intervention, {
    workspaceId: attempt.workspaceId,
    ...ledger.recommendationRevisionQuery(intervention, intervention.__v),
    ...Object.fromEntries(['recommendationId', 'trelloActionAttemptId', 'reconciliationDecisionId'].map(key => [
      `metadata.${key}`, intervention.metadata?.[key] === undefined ? { $exists: false } : intervention.metadata[key]
    ]))
  }, { $set: state }, {
    _id: intervention._id, workspaceId: attempt.workspaceId, 'metadata.reconciliationDecisionId': decision._id
  });
  return true;
}

async function createFollowUp(recommendation, attempt, ledger, plan = recommendation.reconciliationDecision.effects, actor = recommendation.reconciliationDecision.actor, source = 'manual') {
  if (attempt.status !== 'succeeded'
    || !['comment', 'follow_up', 'escalate', 'performance_notification'].includes(recommendation.actionType)) return false;
  const proof = { _id: plan.followUpId, workspaceId: recommendation.workspaceId, recommendationId: recommendation._id };
  let followUp = await FollowUpPlan.findOne(proof);
  if (!followUp) {
    const policy = require('./policyRuleService');
    const timingPolicy = await policy.getScheduledInterventionTimingPolicy({ workspaceId: recommendation.workspaceId });
    const timing = policy.resolveScheduledInterventionTiming({ policy: timingPolicy });
    followUp = await insertOnce(FollowUpPlan, {
      ...proof, interventionId: recommendation.interventionId, boardId: recommendation.boardId,
      cardId: recommendation.cardId, memberId: recommendation.memberId,
      reason: 'Verify whether the intervention received a useful response.',
      nextAction: 'Check worker response and escalate if no response arrives.',
      dueAt: new Date(new Date(attempt.finishedAt).getTime() + timing.followUpAfterHours * 60 * 60 * 1000),
      status: 'scheduled'
    }, proof, ledger);
  }
  // A response can be recorded while the follow-up insert is interrupted. Catch it after insertion.
  if (recommendation.interventionId) {
    const intervention = await Intervention.findOne({ _id: recommendation.interventionId, workspaceId: recommendation.workspaceId });
    if (intervention?.response?.workerResponseId) {
      const response = await WorkerResponse.findOne({ _id: intervention.response.workerResponseId,
        workspaceId: recommendation.workspaceId, interventionId: recommendation.interventionId });
      if (!response) throw ledger.reconciliationConflict();
      if (response.effects) {
        const receipt = await ledger.finalizeWorkerResponseEffects(response);
        if (!receipt.effectsCompleted) throw ledger.ledgerCommitUncertain();
        if (receipt.effects.followUpIds?.some(followUpId => id(followUpId) === id(followUp._id))) return true;
      }
      const resolution = await ledger.resolveFollowUpsForWorkerResponse(response, { followUpIds: [followUp._id] });
      if (resolution.modifiedCount > 0) {
        // This follow-up may postdate the response's original batch. Its own stable audit is part of reconciliation recovery.
        await insertOnce(AuditEvent, {
          _id: followUp._id, workspaceId: response.workspaceId, entityType: 'worker_response', entityId: response._id,
          action: 'late_follow_up_resolved_from_worker_response', actor,
          source, recommendationId: recommendation._id, trelloActionAttemptId: attempt._id,
          riskLevel: resolution.status === 'escalated' ? 'medium' : 'low',
          afterState: { ...resolution, followUpId: followUp._id, workerResponseId: response._id }
        }, { _id: followUp._id, workspaceId: response.workspaceId, entityId: response._id,
          action: 'late_follow_up_resolved_from_worker_response' }, ledger);
      }
    }
  }
  return Boolean(followUp);
}

async function finalize(recommendation, attempt, ledger) {
  const decision = recommendation.reconciliationDecision;
  const effects = decision?.effects;
  const outcome = decision?.outcome;
  if (!effects || id(decision.attemptId) !== id(attempt._id)
    || recommendation.status !== (outcome === 'succeeded' ? 'executed' : 'failed')
    || attempt.status !== outcome || attempt.reconciliation?.status !== `confirmed_${outcome}`
    || attempt.reconciliation.evidence !== decision.evidence || attempt.reconciliation.reason !== decision.reason) {
    throw ledger.reconciliationConflict();
  }
  const receipt = { interventionUpdated: effects.interventionUpdated === true,
    followUpScheduled: effects.followUpScheduled === true, auditRecorded: effects.auditRecorded === true,
    effectsCompleted: effects.status === 'completed' };
  if (receipt.effectsCompleted) return { recommendation, attempt, ...receipt };
  const pendingQuery = { _id: recommendation._id, workspaceId: recommendation.workspaceId,
    'reconciliationDecision._id': decision._id, 'reconciliationDecision.effects.status': 'pending' };
  try {
    await Recommendation.updateOne(pendingQuery, {
      $set: { 'reconciliationDecision.effects.nextAttemptAt': new Date(Date.now() + RETRY_DELAY_MS) }
    });
    receipt.interventionUpdated = await updateIntervention(recommendation, attempt, ledger);
    receipt.followUpScheduled = await createFollowUp(recommendation, attempt, ledger);
    receipt.auditRecorded = Boolean(await insertOnce(AuditEvent, {
      _id: effects.auditId, workspaceId: attempt.workspaceId, boardId: attempt.boardId, cardId: attempt.cardId,
      entityType: 'trello_action_attempt', entityId: attempt._id,
      action: `trello_action_reconciled_${outcome}`, actor: decision.actor, source: 'manual',
      riskLevel: recommendation.riskLevel, approvalId: attempt.approvalId,
      recommendationId: recommendation._id, trelloActionAttemptId: attempt._id,
      beforeState: decision.beforeState, createdAt: decision.decidedAt,
      afterState: { attemptStatus: attempt.status, recommendationStatus: recommendation.status,
        reconciliation: attempt.reconciliation, interventionUpdated: receipt.interventionUpdated,
        followUpScheduled: receipt.followUpScheduled }
    }, { _id: effects.auditId, workspaceId: attempt.workspaceId, trelloActionAttemptId: attempt._id,
      action: `trello_action_reconciled_${outcome}` }, ledger));
    if (!receipt.auditRecorded) throw ledger.ledgerCommitUncertain();
    const completed = { ...(typeof effects.toObject === 'function' ? effects.toObject() : effects),
      ...receipt, status: 'completed', completedAt: new Date() };
    delete completed.effectsCompleted;
    let updated;
    try {
      updated = await Recommendation.findOneAndUpdate(pendingQuery, {
        $set: { 'reconciliationDecision.effects': completed }, $inc: { __v: 1 }
      }, { new: true, runValidators: true });
    } catch {
      // A lost acknowledgement is not evidence that the completion write failed.
    }
    recommendation = updated || await ledger.recoverLedgerCommit(Recommendation, {
      _id: recommendation._id, workspaceId: recommendation.workspaceId,
      'reconciliationDecision._id': decision._id, 'reconciliationDecision.effects.status': 'completed'
    });
    receipt.effectsCompleted = true;
  } catch (error) {
    logger.warn('Reconciliation result retained; internal ledger work remains pending.', {
      recommendationId: recommendation._id, code: error.code || 'SNEUP_RECONCILIATION_EFFECTS_PENDING'
    });
  }
  return { recommendation, attempt, ...receipt };
}

async function retryPending(options, ledger) {
  const limit = Math.min(100, Math.max(1, Number.isSafeInteger(options.limit) ? options.limit : 20));
  const records = await Recommendation.find(ledger.workspaceQuery(options, {
    status: { $in: ['executed', 'failed'] }, 'reconciliationDecision.effects.status': 'pending',
    $or: [{ 'reconciliationDecision.effects.nextAttemptAt': { $exists: false } },
      { 'reconciliationDecision.effects.nextAttemptAt': { $lte: new Date() } }]
  })).sort({ 'reconciliationDecision.effects.nextAttemptAt': 1, _id: 1 }).limit(limit);
  let completedCount = 0;
  for (const record of records) {
    const decision = record.reconciliationDecision;
    try {
      // Rotate even invalid pending entries so one broken reference cannot starve the bounded queue.
      await Recommendation.updateOne({ _id: record._id, workspaceId: record.workspaceId,
        'reconciliationDecision._id': decision._id, 'reconciliationDecision.effects.status': 'pending' }, {
        $set: { 'reconciliationDecision.effects.nextAttemptAt': new Date(Date.now() + RETRY_DELAY_MS) }
      });
      const result = await ledger.reconcileTrelloActionAttempt(decision.attemptId, {
        workspaceId: record.workspaceId, outcome: decision.outcome, evidence: decision.evidence, reason: decision.reason
      });
      if (result.effectsCompleted) completedCount += 1;
    } catch {
      logger.warn('Pending reconciliation requires operator review.', { recommendationId: record._id });
    }
  }
  return { processedCount: records.length, completedCount, failureCount: records.length - completedCount };
}

module.exports = { finalize, retryPending, createFollowUp, insertOnce };
