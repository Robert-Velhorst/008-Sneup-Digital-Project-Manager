const crypto = require('crypto');
const mongoose = require('mongoose');
const Board = require('../models/Board');
const Card = require('../models/Card');
const List = require('../models/List');
const Member = require('../models/Member');
const JobRun = require('../models/JobRun');
const NotificationDelivery = require('../models/NotificationDelivery');
const Recommendation = require('../models/Recommendation');
const TrelloActionAttempt = require('../models/TrelloActionAttempt');
const operationsLedgerService = require('./operationsLedgerService');
const { normalizeWorkspaceObjectId } = require('./workspaceScopeService');

const MIN_LIMIT = 1;
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;
const STRANDED_MINUTES = 15;
const APPLY_CONFIRMATION = 'repair-derived-state';

const models = {
  Board,
  Card,
  List,
  Member,
  JobRun,
  NotificationDelivery,
  Recommendation,
  TrelloActionAttempt
};

const boundedLimit = value => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, MIN_LIMIT), MAX_LIMIT);
};

const asId = value => String(value?._id || value || '');
const sortedIds = values => [...new Set((values || []).map(asId).filter(Boolean))].sort();
const sameIds = (left, right) => JSON.stringify(sortedIds(left)) === JSON.stringify(sortedIds(right));

const workloadForCount = count => {
  const ratio = count / 5;
  if (ratio >= 1.2) return 'overloaded';
  if (ratio >= 0.9) return 'heavy';
  if (ratio <= 0.3) return 'light';
  return 'normal';
};

const fingerprint = value => crypto
  .createHash('sha256')
  .update(JSON.stringify(value))
  .digest('hex')
  .slice(0, 24);

const finding = data => ({
  ...data,
  fingerprint: fingerprint({
    category: data.category,
    entityType: data.entityType,
    entityId: data.entityId,
    current: data.current,
    expected: data.expected
  })
});

const leanFind = (Model, query, select, limit) => Model.find(query)
  .select(select)
  .sort({ _id: 1 })
  .limit(limit)
  .lean();

class DataIntegrityService {
  constructor(dependencies = {}) {
    this.models = { ...models, ...(dependencies.models || {}) };
    this.ledger = dependencies.ledger || operationsLedgerService;
    this.now = dependencies.now || (() => new Date());
  }

  requireDatabase() {
    if (mongoose.connection.readyState === 1) return;
    const error = new Error('Database connection is required for an integrity scan');
    error.statusCode = 503;
    error.code = 'DATABASE_REQUIRED';
    throw error;
  }

  async scan(options = {}) {
    if (!options.skipDatabaseCheck) this.requireDatabase();
    const workspaceId = normalizeWorkspaceObjectId(options.workspaceId);
    const limit = boundedLimit(options.limit);
    const now = this.now();
    const strandedBefore = new Date(now.getTime() - STRANDED_MINUTES * 60 * 1000);
    const { List: ListModel, Card: CardModel, Member: MemberModel } = this.models;

    const [lists, members, actionAttempts, deliveries, recommendations, runningJobs] = await Promise.all([
      leanFind(ListModel, { workspaceId }, '_id name cardCount', limit + 1),
      leanFind(MemberModel, { workspaceId }, '_id fullName username assignedCards workloadLevel', limit + 1),
      leanFind(this.models.TrelloActionAttempt, {
        workspaceId,
        'reconciliation.status': 'required'
      }, '_id actionType status reconciliation.status updatedAt', limit + 1),
      leanFind(this.models.NotificationDelivery, {
        workspaceId,
        status: 'sending',
        updatedAt: { $lte: strandedBefore }
      }, '_id channel status updatedAt', limit + 1),
      leanFind(this.models.Recommendation, {
        workspaceId,
        status: 'executing',
        updatedAt: { $lte: strandedBefore }
      }, '_id title actionType status updatedAt', limit + 1),
      leanFind(this.models.JobRun, { workspaceId, status: 'running' }, '_id jobName status startedAt staleAfterMinutes', limit + 1)
    ]);

    const boundedLists = lists.slice(0, limit);
    const boundedMembers = members.slice(0, limit);
    const listIds = boundedLists.map(item => item._id);
    const memberIds = boundedMembers.map(item => item._id);

    const [listCounts, memberCards] = await Promise.all([
      listIds.length === 0 ? [] : CardModel.aggregate([
        { $match: { workspaceId, closed: false, listId: { $in: listIds } } },
        { $group: { _id: '$listId', count: { $sum: 1 } } }
      ]),
      memberIds.length === 0 ? [] : CardModel.aggregate([
        { $match: { workspaceId, closed: false, members: { $in: memberIds } } },
        { $unwind: '$members' },
        { $match: { members: { $in: memberIds } } },
        { $group: { _id: '$members', cardIds: { $addToSet: '$_id' } } }
      ])
    ]);

    const listCountMap = new Map(listCounts.map(row => [asId(row._id), Number(row.count) || 0]));
    const memberCardMap = new Map(memberCards.map(row => [asId(row._id), sortedIds(row.cardIds)]));
    const repairStates = new Map();
    const findings = [];

    for (const item of boundedLists) {
      const expectedCount = listCountMap.get(asId(item._id)) || 0;
      const currentCount = Number(item.cardCount) || 0;
      if (currentCount === expectedCount) continue;
      const result = finding({
        category: 'list_card_count',
        severity: 'low',
        repairable: true,
        entityType: 'list',
        entityId: asId(item._id),
        label: item.name || 'Trello list',
        current: { activeCardCount: currentCount },
        expected: { activeCardCount: expectedCount },
        reason: 'The cached list count differs from active workspace cards.'
      });
      repairStates.set(result.fingerprint, { type: result.category, item, expectedCount });
      findings.push(result);
    }

    for (const item of boundedMembers) {
      const expectedIds = memberCardMap.get(asId(item._id)) || [];
      const currentIds = sortedIds(item.assignedCards);
      const expectedWorkload = workloadForCount(expectedIds.length);
      if (sameIds(currentIds, expectedIds) && item.workloadLevel === expectedWorkload) continue;
      const result = finding({
        category: 'member_assignment_cache',
        severity: 'medium',
        repairable: true,
        entityType: 'member',
        entityId: asId(item._id),
        label: item.fullName || item.username || 'Trello member',
        current: { assignedCardCount: currentIds.length, workloadLevel: item.workloadLevel },
        expected: { assignedCardCount: expectedIds.length, workloadLevel: expectedWorkload },
        reason: 'The member assignment cache differs from active workspace cards.'
      });
      repairStates.set(result.fingerprint, { type: result.category, item, currentIds, expectedIds, expectedWorkload });
      findings.push(result);
    }

    actionAttempts.slice(0, limit).forEach(item => findings.push(finding({
      category: 'trello_reconciliation_required', severity: 'high', repairable: false,
      entityType: 'trello_action_attempt', entityId: asId(item._id), label: item.actionType || 'Trello action',
      current: { status: item.status, reconciliationStatus: 'required' }, expected: { operatorEvidence: true },
      reason: 'Provider outcome is ambiguous. Review provider evidence; Sneup will not repeat the write.'
    })));
    deliveries.slice(0, limit).forEach(item => findings.push(finding({
      category: 'stranded_notification_delivery', severity: 'medium', repairable: false,
      entityType: 'notification_delivery', entityId: asId(item._id), label: item.channel || 'Notification delivery',
      current: { status: item.status, updatedAt: item.updatedAt }, expected: { operatorReview: true },
      reason: 'The delivery claim is old. Review destination evidence before retrying.'
    })));
    recommendations.slice(0, limit).forEach(item => findings.push(finding({
      category: 'stranded_recommendation_execution', severity: 'high', repairable: false,
      entityType: 'recommendation', entityId: asId(item._id), label: item.title || item.actionType || 'Recommendation',
      current: { status: item.status, updatedAt: item.updatedAt }, expected: { operatorReview: true },
      reason: 'Execution is still in progress. Reconcile its action attempt before changing evidence.'
    })));
    runningJobs.slice(0, limit).filter(item => {
      const staleAfter = Math.max(Number(item.staleAfterMinutes) || 120, 1);
      return new Date(item.startedAt).getTime() + staleAfter * 60 * 1000 <= now.getTime();
    }).forEach(item => findings.push(finding({
      category: 'stale_job_run', severity: 'medium', repairable: false,
      entityType: 'job_run', entityId: asId(item._id), label: item.jobName || 'Background job',
      current: { status: item.status, startedAt: item.startedAt }, expected: { leaseReview: true },
      reason: 'The run exceeded its stale threshold. Confirm lease ownership before changing it.'
    })));

    const truncated = [lists, members, actionAttempts, deliveries, recommendations, runningJobs]
      .some(items => items.length > limit) || findings.length > limit;
    const boundedFindings = findings.slice(0, limit);
    return {
      mode: 'live',
      workspaceId: String(workspaceId),
      scannedAt: now.toISOString(),
      limit,
      truncated,
      providerWrites: false,
      summary: {
        findings: boundedFindings.length,
        repairable: boundedFindings.filter(item => item.repairable).length,
        reviewRequired: boundedFindings.filter(item => !item.repairable).length
      },
      findings: boundedFindings,
      repairStates
    };
  }

  publicReport(report) {
    const { repairStates, ...safe } = report;
    return safe;
  }

  async apply(options = {}) {
    if (options.confirm !== APPLY_CONFIRMATION) {
      const error = new Error(`Repair requires confirm=${APPLY_CONFIRMATION}`);
      error.statusCode = 400;
      error.code = 'REPAIR_CONFIRMATION_REQUIRED';
      throw error;
    }
    if (!Array.isArray(options.fingerprints)) {
      const error = new Error('fingerprints must be an array of current finding fingerprints');
      error.statusCode = 400;
      error.code = 'INVALID_REPAIR_SELECTION';
      throw error;
    }
    const requested = [...new Set(options.fingerprints.map(String).filter(Boolean))].slice(0, MAX_LIMIT);
    if (requested.length === 0) {
      const error = new Error('Select at least one current repairable finding');
      error.statusCode = 400;
      error.code = 'REPAIR_SELECTION_REQUIRED';
      throw error;
    }

    const scan = await this.scan(options);
    const workspaceId = normalizeWorkspaceObjectId(options.workspaceId);
    const results = [];
    for (const selected of requested) {
      const state = scan.repairStates.get(selected);
      if (!state) {
        results.push({ fingerprint: selected, status: 'skipped', reason: 'Finding changed, disappeared, or requires operator review.' });
        continue;
      }

      let update;
      let beforeState;
      let afterState;
      if (state.type === 'list_card_count') {
        beforeState = { activeCardCount: Number(state.item.cardCount) || 0 };
        afterState = { activeCardCount: state.expectedCount };
        update = await this.models.List.updateOne(
          { _id: state.item._id, workspaceId, cardCount: state.item.cardCount },
          { $set: { cardCount: state.expectedCount } }
        );
      } else {
        beforeState = { assignedCardCount: state.currentIds.length, workloadLevel: state.item.workloadLevel };
        afterState = { assignedCardCount: state.expectedIds.length, workloadLevel: state.expectedWorkload };
        update = await this.models.Member.updateOne(
          { _id: state.item._id, workspaceId, assignedCards: state.item.assignedCards, workloadLevel: state.item.workloadLevel },
          { $set: { assignedCards: state.expectedIds, workloadLevel: state.expectedWorkload } }
        );
      }

      const modified = Number(update?.modifiedCount ?? update?.nModified) > 0;
      if (!modified) {
        results.push({ fingerprint: selected, entityType: state.type === 'list_card_count' ? 'list' : 'member', entityId: asId(state.item._id), status: 'skipped', reason: 'Record changed during repair; scan again.' });
        continue;
      }

      try {
        const audit = await this.ledger.recordAudit({
          workspaceId,
          entityType: state.type === 'list_card_count' ? 'list' : 'member',
          entityId: state.item._id,
          action: 'derived_state_repaired',
          actor: options.actor || 'sneup-repair-cli',
          source: options.source || 'manual',
          riskLevel: 'medium',
          beforeState: { category: state.type, ...beforeState },
          afterState: { category: state.type, ...afterState, providerWrite: false }
        });
        if (!audit) throw new Error('Audit storage is unavailable');
      } catch (auditError) {
        const rollback = state.type === 'list_card_count'
          ? await this.models.List.updateOne(
            { _id: state.item._id, workspaceId, cardCount: state.expectedCount },
            { $set: { cardCount: state.item.cardCount } }
          )
          : await this.models.Member.updateOne(
            { _id: state.item._id, workspaceId, assignedCards: state.expectedIds, workloadLevel: state.expectedWorkload },
            { $set: { assignedCards: state.item.assignedCards, workloadLevel: state.item.workloadLevel } }
          );
        if (Number(rollback?.modifiedCount ?? rollback?.nModified) <= 0) {
          const error = new Error('Repair audit failed and the prior derived state could not be restored; operator review is required');
          error.statusCode = 500;
          error.code = 'REPAIR_AUDIT_ROLLBACK_FAILED';
          error.cause = auditError;
          throw error;
        }
        results.push({
          fingerprint: selected,
          entityType: state.type === 'list_card_count' ? 'list' : 'member',
          entityId: asId(state.item._id),
          status: 'skipped',
          reason: 'Audit storage was unavailable; the repair was rolled back.'
        });
        continue;
      }

      results.push({ fingerprint: selected, entityType: state.type === 'list_card_count' ? 'list' : 'member', entityId: asId(state.item._id), status: 'repaired' });
    }

    return {
      workspaceId: String(workspaceId),
      providerWrites: false,
      requested: requested.length,
      repaired: results.filter(item => item.status === 'repaired').length,
      skipped: results.filter(item => item.status === 'skipped').length,
      results
    };
  }
}

module.exports = new DataIntegrityService();
module.exports.DataIntegrityService = DataIntegrityService;
module.exports.APPLY_CONFIRMATION = APPLY_CONFIRMATION;
module.exports.boundedLimit = boundedLimit;
module.exports.workloadForCount = workloadForCount;
