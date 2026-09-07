const WorkerResponse = require('../models/WorkerResponse');
const Intervention = require('../models/Intervention');
const AuditEvent = require('../models/AuditEvent');
const FollowUpPlan = require('../models/FollowUpPlan');
const logger = require('../utils/logger');

const RETRY_DELAY_MS = 5 * 60 * 1000;

async function auditOnce(response, action, auditId, afterState, ledger) {
  const proof = { _id: auditId, workspaceId: response.workspaceId, entityId: response._id, action };
  const existing = await AuditEvent.findOne(proof);
  if (existing) return existing;
  try {
    const audit = await ledger.recordAudit({ ...proof, entityType: 'worker_response',
      actor: response.effects.actor, source: ledger.workerResponseAuditSource(response.source),
      riskLevel: afterState.status === 'escalated' ? 'medium' : 'low',
      recommendationId: response.recommendationId, createdAt: response.receivedAt, afterState });
    if (!audit) throw ledger.ledgerCommitUncertain();
    return audit;
  } catch {
    return ledger.recoverLedgerCommit(AuditEvent, proof);
  }
}

async function finalize(response, ledger) {
  const effects = response.effects;
  if (!effects) throw ledger.ledgerCommitUncertain();
  if (effects.status === 'completed') return { ...ledger.serializeWorkerResponse(response),
    effectsCompleted: true, followUpResolution: effects.followUpResolution };
  let followUpResolution;
  const pending = { _id: response._id, workspaceId: response.workspaceId, 'effects.status': 'pending',
    'effects.auditId': effects.auditId };
  try {
    const active = await WorkerResponse.updateOne(pending, { $set: { 'effects.nextAttemptAt': new Date(Date.now() + RETRY_DELAY_MS) } });
    if (active.matchedCount !== 1) {
      const completed = await ledger.recoverLedgerCommit(WorkerResponse, { _id: response._id,
        workspaceId: response.workspaceId, 'effects.auditId': effects.auditId, 'effects.status': 'completed' });
      return { ...ledger.serializeWorkerResponse(completed), effectsCompleted: true, followUpResolution: completed.effects.followUpResolution };
    }
    if (response.interventionId) {
      // Only the exact persisted claim permits recovery; never attach an unclaimed response to new work.
      await ledger.recoverLedgerCommit(Intervention, { _id: response.interventionId,
        workspaceId: response.workspaceId, memberId: response.memberId, 'response.workerResponseId': response._id });
    }
    if (response.claimState !== 'confirmed') {
      try {
        const result = await WorkerResponse.updateOne({ ...pending, claimState: 'pending' }, { $set: { claimState: 'confirmed' } });
        if (result.matchedCount !== 1) throw ledger.ledgerCommitUncertain();
      } catch {
        await ledger.recoverLedgerCommit(WorkerResponse, { _id: response._id, workspaceId: response.workspaceId, claimState: 'confirmed' });
      }
      response.claimState = 'confirmed';
    }
    if (!Array.isArray(response.effects.followUpIds)) {
      const matcher = response.responseType === 'ignored' ? null : ledger.followUpMatcherForWorkerResponse(response);
      if (matcher && !response.interventionId && !response.recommendationId) matcher.createdAt = { $lte: response.receivedAt };
      const ids = matcher ? (await FollowUpPlan.find(matcher).select('_id').lean()).map(row => row._id) : [];
      let planned;
      try {
        planned = await WorkerResponse.findOneAndUpdate({ ...pending, 'effects.followUpIds': { $exists: false } },
          { $set: { 'effects.followUpIds': ids } }, { new: true, runValidators: true });
      } catch {
        // Another finalizer or an uncertain write may already have fixed the batch.
      }
      response = planned || await ledger.recoverLedgerCommit(WorkerResponse, { _id: response._id,
        workspaceId: response.workspaceId, 'effects.auditId': effects.auditId, 'effects.followUpIds': { $exists: true } });
    }
    followUpResolution = response.effects.followUpResolution;
    if (!followUpResolution) {
      const resolution = await ledger.resolveFollowUpsForWorkerResponse(response, { actor: effects.actor, followUpIds: response.effects.followUpIds });
      let recorded;
      try {
        recorded = await WorkerResponse.findOneAndUpdate({ ...pending, 'effects.followUpResolution': { $exists: false } },
          { $set: { 'effects.followUpResolution': resolution } }, { new: true, runValidators: true });
      } catch {
        // Freeze one receipt before either audit is written.
      }
      response = recorded || await ledger.recoverLedgerCommit(WorkerResponse, { _id: response._id,
        workspaceId: response.workspaceId, 'effects.auditId': effects.auditId, 'effects.followUpResolution': { $exists: true } });
      followUpResolution = response.effects.followUpResolution;
    }
    await auditOnce(response, 'worker_response_recorded', effects.auditId,
      ledger.workerResponseAuditState(response, followUpResolution), ledger);
    if (followUpResolution.modifiedCount > 0) {
      await auditOnce(response, 'follow_ups_resolved_from_worker_response', effects.followUpAuditId, followUpResolution, ledger);
    }
    let updated;
    try {
      updated = await WorkerResponse.findOneAndUpdate(pending, { $set: {
        'effects.status': 'completed', 'effects.completedAt': new Date(), 'effects.followUpResolution': followUpResolution
      } }, { new: true, runValidators: true });
    } catch {
      // Read back the exact completion after an uncertain acknowledgement.
    }
    response = updated || await ledger.recoverLedgerCommit(WorkerResponse, { _id: response._id,
      workspaceId: response.workspaceId, 'effects.auditId': effects.auditId, 'effects.status': 'completed' });
    return { ...ledger.serializeWorkerResponse(response), effectsCompleted: true, followUpResolution: response.effects.followUpResolution };
  } catch (error) {
    logger.warn('Worker response retained; internal ledger work remains pending.', {
      responseId: String(response._id), code: error.code || 'SNEUP_WORKER_RESPONSE_EFFECTS_PENDING'
    });
    return { ...ledger.serializeWorkerResponse(response), effectsCompleted: false, followUpResolution };
  }
}

async function retryPending(options, ledger) {
  const limit = Math.min(100, Math.max(1, Number.isSafeInteger(options.limit) ? options.limit : 20));
  const records = await WorkerResponse.find(ledger.workspaceQuery(options, { 'effects.status': 'pending',
    $or: [{ 'effects.nextAttemptAt': { $exists: false } }, { 'effects.nextAttemptAt': { $lte: new Date() } }]
  })).sort({ 'effects.nextAttemptAt': 1, _id: 1 }).limit(limit);
  let completedCount = 0;
  for (const response of records) {
    if ((await finalize(response, ledger)).effectsCompleted) completedCount++;
  }
  return { processedCount: records.length, completedCount, failureCount: records.length - completedCount };
}

module.exports = { finalize, retryPending };
