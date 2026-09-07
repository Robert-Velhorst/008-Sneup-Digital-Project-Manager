const { isDeepStrictEqual } = require('node:util');
const Attempt = require('../models/TrelloActionAttempt');
const Recommendation = require('../models/Recommendation');
const Approval = require('../models/Approval');
const Intervention = require('../models/Intervention');
const AuditEvent = require('../models/AuditEvent');
const { insertOnce, createFollowUp } = require('./trelloReconciliationEffectsService');
const logger = require('../utils/logger');

const RETRY_DELAY_MS = 5 * 60 * 1000;
const id = value => String(value?._id || value || '');

async function commit(Model, query, update, proof, ledger) {
  let record;
  try {
    record = await Model.findOneAndUpdate(query, { ...update, $inc: { __v: 1 } }, { new: true, runValidators: true });
  } catch { /* Read back both lost acknowledgements and concurrent identical finalizers. */ }
  return record || ledger.recoverLedgerCommit(Model, proof);
}

async function updateIntervention(recommendation, attempt, ledger) {
  if (!attempt.interventionId) return false;
  const failed = attempt.status === 'failed';
  const terminalStatus = failed ? 'failed' : 'executed';
  const intervention = await Intervention.findOne({ _id: attempt.interventionId, workspaceId: attempt.workspaceId });
  if (!intervention || !['pending', 'awaiting_approval', 'executing', terminalStatus].includes(intervention.status)
    || id(intervention.boardId) !== id(recommendation.boardId) || id(intervention.cardId) !== id(recommendation.cardId)
    || id(intervention.memberId) !== id(recommendation.memberId) || intervention.type !== recommendation.actionType
    || (intervention.metadata?.recommendationId && id(intervention.metadata.recommendationId) !== id(recommendation._id))
    || (intervention.metadata?.trelloActionAttemptId && id(intervention.metadata.trelloActionAttemptId) !== id(attempt._id))) {
    throw ledger.reconciliationConflict();
  }
  if (id(intervention.metadata?.executionEffectsId) === id(attempt.executionEffects.auditId)
    && intervention.status === terminalStatus) return true;
  if (intervention.metadata?.executionEffectsId || (failed && intervention.status === 'failed')) {
    throw ledger.reconciliationConflict();
  }
  await commit(Intervention, {
    ...ledger.recommendationRevisionQuery(intervention, intervention.__v), workspaceId: attempt.workspaceId,
    boardId: intervention.boardId, cardId: intervention.cardId === undefined ? { $exists: false } : intervention.cardId,
    memberId: intervention.memberId === undefined ? { $exists: false } : intervention.memberId, type: intervention.type,
    ...Object.fromEntries(['recommendationId', 'trelloActionAttemptId', 'executionEffectsId'].map(key => [
      `metadata.${key}`, intervention.metadata?.[key] === undefined ? { $exists: false } : intervention.metadata[key]
    ]))
  }, { $set: {
    status: terminalStatus,
    ...(failed ? { 'metadata.error': attempt.errorMessage } : { executedAt: attempt.finishedAt }),
    'metadata.recommendationId': recommendation._id, 'metadata.trelloActionAttemptId': attempt._id,
    'metadata.executionEffectsId': attempt.executionEffects.auditId
  } }, { _id: intervention._id, workspaceId: attempt.workspaceId,
    'metadata.executionEffectsId': attempt.executionEffects.auditId }, ledger);
  return true;
}

async function finalize(input, ledger) {
  // Never use an in-memory provider result as recovery authority.
  const failed = input.status === 'failed';
  const authority = failed ? { status: 'failed', 'executionEffects.outcome': 'failed', 'reconciliation.status': 'not_needed' }
    : { status: 'succeeded' };
  const terminalStatus = failed ? 'failed' : 'executed';
  const auditAction = failed ? 'trello_action_failed' : 'trello_action_succeeded';
  let attempt = await ledger.recoverLedgerCommit(Attempt, { _id: input._id, workspaceId: input.workspaceId,
    ...authority, 'executionEffects.auditId': input.executionEffects?.auditId });
  const effects = attempt.executionEffects;
  if (!effects) throw ledger.ledgerCommitUncertain();
  let recommendation;
  const receipt = { effectsCompleted: effects.status === 'completed',
    interventionUpdated: effects.interventionUpdated === true, followUpScheduled: effects.followUpScheduled === true };
  const pending = { _id: attempt._id, workspaceId: attempt.workspaceId, ...authority,
    'executionEffects.auditId': effects.auditId, 'executionEffects.status': 'pending' };
  try {
    if (effects.status === 'pending') {
      const renewed = await Attempt.updateOne(pending, {
        $set: { 'executionEffects.nextAttemptAt': new Date(Date.now() + RETRY_DELAY_MS) }
      });
      if (renewed.matchedCount !== 1) throw ledger.ledgerCommitUncertain();
    }
    recommendation = await Recommendation.findOne({ _id: attempt.recommendationId, workspaceId: attempt.workspaceId });
    if (!recommendation) throw ledger.reconciliationConflict();
    if (receipt.effectsCompleted || effects.status === 'superseded') {
      return { recommendation, attempt, ...receipt, superseded: effects.status === 'superseded' };
    }
    if (recommendation.reconciliationDecision) {
      if (id(recommendation.reconciliationDecision.attemptId) !== id(attempt._id)) throw ledger.reconciliationConflict();
      // The immutable operator decision owns internal work once it has won the recommendation claim.
      attempt = await commit(Attempt, pending, { $set: { 'executionEffects.status': 'superseded' } }, {
        _id: attempt._id, workspaceId: attempt.workspaceId, 'executionEffects.auditId': effects.auditId,
        'executionEffects.status': 'superseded'
      }, ledger);
      return { recommendation, attempt, ...receipt, superseded: true };
    }
    if (!['executing', terminalStatus].includes(recommendation.status)
      || id(recommendation.interventionId) !== id(attempt.interventionId)
      || id(recommendation.boardId) !== id(attempt.boardId) || id(recommendation.cardId) !== id(attempt.cardId)
      || (recommendation.currentApprovalId && id(recommendation.currentApprovalId) !== id(attempt.approvalId))
      || recommendation.actionType !== attempt.actionType
      || !isDeepStrictEqual(recommendation.actionPayload, attempt.payload)
      || !attempt.finishedAt || attempt.reconciliation?.status !== 'not_needed') throw ledger.reconciliationConflict();
    if (recommendation.requiresApproval || attempt.approvalId) {
      const approval = attempt.approvalId && await Approval.findOne({ _id: attempt.approvalId,
        workspaceId: attempt.workspaceId, recommendationId: recommendation._id, decision: 'approved' });
      if (!approval || !isDeepStrictEqual(approval.approvedPayloadSnapshot, attempt.payload)) throw ledger.reconciliationConflict();
    }
    const latest = await Attempt.findOne({ workspaceId: attempt.workspaceId, recommendationId: recommendation._id })
      .sort({ createdAt: -1, _id: -1 });
    if (id(latest?._id) !== id(attempt._id)) throw ledger.reconciliationConflict();
    if (recommendation.status === 'executing') {
      recommendation = await commit(Recommendation, {
        ...ledger.recommendationRevisionQuery(recommendation, recommendation.__v), workspaceId: attempt.workspaceId,
        status: 'executing', reconciliationDecision: { $exists: false }, executionAttemptId: { $exists: false }
      }, { $set: { status: terminalStatus, executionAttemptId: attempt._id,
        ...(failed ? { failureReason: attempt.errorMessage } : { executedAt: attempt.finishedAt }) } }, {
        _id: recommendation._id, workspaceId: attempt.workspaceId, status: terminalStatus, executionAttemptId: attempt._id
      }, ledger);
    }
    if (id(recommendation.executionAttemptId) !== id(attempt._id)) throw ledger.reconciliationConflict();
    receipt.interventionUpdated = await updateIntervention(recommendation, attempt, ledger);
    receipt.followUpScheduled = !failed && await createFollowUp(recommendation, attempt, ledger, effects, effects.actor, 'trello');
    const audit = await insertOnce(AuditEvent, {
      _id: effects.auditId, workspaceId: attempt.workspaceId, boardId: attempt.boardId, cardId: attempt.cardId,
      entityType: 'trello_action_attempt', entityId: attempt._id, action: auditAction,
      actor: effects.actor, source: 'trello', riskLevel: recommendation.riskLevel, approvalId: attempt.approvalId,
      recommendationId: recommendation._id, trelloActionAttemptId: attempt._id, createdAt: attempt.finishedAt,
      afterState: { attemptStatus: attempt.status, recommendationStatus: terminalStatus,
        interventionUpdated: receipt.interventionUpdated, followUpScheduled: receipt.followUpScheduled }
    }, { _id: effects.auditId, workspaceId: attempt.workspaceId, entityId: attempt._id, action: auditAction }, ledger);
    if (!audit) throw ledger.ledgerCommitUncertain();
    attempt = await commit(Attempt, pending, { $set: {
      'executionEffects.status': 'completed', 'executionEffects.completedAt': new Date(),
      'executionEffects.interventionUpdated': receipt.interventionUpdated,
      'executionEffects.followUpScheduled': receipt.followUpScheduled
    } }, { _id: attempt._id, workspaceId: attempt.workspaceId,
      'executionEffects.auditId': effects.auditId, 'executionEffects.status': 'completed' }, ledger);
    receipt.effectsCompleted = true;
  } catch (error) {
    logger.warn('Recorded Trello action retained; internal ledger work remains pending.', {
      attemptId: id(attempt._id), code: error.code || 'SNEUP_EXECUTION_EFFECTS_PENDING'
    });
    attempt = await ledger.recoverLedgerCommit(Attempt, { _id: attempt._id, workspaceId: attempt.workspaceId });
    recommendation = await Recommendation.findOne({ _id: attempt.recommendationId, workspaceId: attempt.workspaceId });
    if (attempt.status !== (failed ? 'failed' : 'succeeded') || recommendation?.reconciliationDecision
      || (failed && (attempt.executionEffects?.outcome !== 'failed' || attempt.reconciliation?.status !== 'not_needed'))) {
      throw ledger.reconciliationConflict();
    }
    if (attempt.executionEffects?.status === 'completed') {
      receipt.effectsCompleted = true;
      receipt.interventionUpdated = attempt.executionEffects.interventionUpdated === true;
      receipt.followUpScheduled = attempt.executionEffects.followUpScheduled === true;
    }
  }
  return { recommendation, attempt, ...receipt };
}

async function retryPending(options, ledger) {
  const limit = Math.min(100, Math.max(1, Number.isSafeInteger(options.limit) ? options.limit : 20));
  const attempts = await Attempt.find(ledger.workspaceQuery(options, { 'executionEffects.status': 'pending',
    $and: [
      { $or: [{ status: 'succeeded' }, { status: 'failed', 'executionEffects.outcome': 'failed', 'reconciliation.status': 'not_needed' }] },
      { $or: [{ 'executionEffects.nextAttemptAt': { $exists: false } }, { 'executionEffects.nextAttemptAt': { $lte: new Date() } }] }
    ]
  })).sort({ 'executionEffects.nextAttemptAt': 1, _id: 1 }).limit(limit);
  let completedCount = 0;
  for (const attempt of attempts) {
    try {
      const receipt = await finalize(attempt, ledger);
      if (receipt.effectsCompleted || receipt.superseded) completedCount += 1;
    } catch {
      logger.warn('Pending Trello execution effects require ledger review.', { attemptId: id(attempt._id) });
    }
  }
  return { processedCount: attempts.length, completedCount, failureCount: attempts.length - completedCount };
}

module.exports = { finalize, retryPending };
