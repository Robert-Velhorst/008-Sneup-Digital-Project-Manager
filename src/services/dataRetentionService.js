const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');
const JobRun = require('../models/JobRun');
const BoardHealthSnapshot = require('../models/BoardHealthSnapshot');
const Performance = require('../models/Performance');
const NotificationDelivery = require('../models/NotificationDelivery');
const SessionToken = require('../models/SessionToken');
const ApiToken = require('../models/ApiToken');
const operationsLedgerService = require('./operationsLedgerService');
const { normalizeWorkspaceObjectId } = require('./workspaceScopeService');

const MIN_LIMIT = 1;
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;
const APPLY_CONFIRMATION = 'prune-expired-history';
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_POLICY = Object.freeze({
  enabled: false,
  operationalDays: 90,
  performanceDays: 730,
  notificationDays: 365,
  credentialDays: 90
});

const POLICY_RANGES = Object.freeze({
  operationalDays: [30, 730],
  performanceDays: [180, 2555],
  notificationDays: [90, 2555],
  credentialDays: [30, 730]
});

const models = {
  Workspace,
  JobRun,
  BoardHealthSnapshot,
  Performance,
  NotificationDelivery,
  SessionToken,
  ApiToken
};

const boundedLimit = value => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, MIN_LIMIT), MAX_LIMIT);
};

const integerInRange = (value, [minimum, maximum], field) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    const error = new Error(`${field} must be an integer from ${minimum} to ${maximum}`);
    error.statusCode = 400;
    error.code = 'INVALID_RETENTION_POLICY';
    throw error;
  }
  return parsed;
};

const plainPolicy = value => {
  const source = value?.toObject ? value.toObject() : value || {};
  return {
    enabled: source.enabled === true,
    operationalDays: Number(source.operationalDays) || DEFAULT_POLICY.operationalDays,
    performanceDays: Number(source.performanceDays) || DEFAULT_POLICY.performanceDays,
    notificationDays: Number(source.notificationDays) || DEFAULT_POLICY.notificationDays,
    credentialDays: Number(source.credentialDays) || DEFAULT_POLICY.credentialDays,
    lastProcessedAt: source.lastProcessedAt || null
  };
};

const retentionError = (message, statusCode, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

class DataRetentionService {
  constructor(dependencies = {}) {
    this.models = { ...models, ...(dependencies.models || {}) };
    this.ledger = dependencies.ledger || operationsLedgerService;
    this.now = dependencies.now || (() => new Date());
  }

  requireDatabase() {
    if (mongoose.connection.readyState === 1) return;
    throw retentionError('Database connection is required for data retention', 503, 'DATABASE_REQUIRED');
  }

  normalizePolicy(input = {}, existing = DEFAULT_POLICY) {
    const current = plainPolicy(existing);
    const next = { ...current };
    if (Object.hasOwn(input, 'enabled')) {
      if (typeof input.enabled !== 'boolean') {
        throw retentionError('enabled must be true or false', 400, 'INVALID_RETENTION_POLICY');
      }
      next.enabled = input.enabled;
    }
    for (const [field, range] of Object.entries(POLICY_RANGES)) {
      if (Object.hasOwn(input, field)) next[field] = integerInRange(input[field], range, field);
    }
    return next;
  }

  async workspaceFor(workspaceId) {
    const normalized = normalizeWorkspaceObjectId(workspaceId);
    const workspace = await this.models.Workspace.findById(normalized);
    if (!workspace) throw retentionError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
    return workspace;
  }

  descriptors(workspaceId, policy, now) {
    const cutoff = days => new Date(now.getTime() - days * DAY_MS);
    return [
      {
        key: 'job_runs', label: 'Completed job history', model: this.models.JobRun,
        query: { workspaceId, status: { $in: ['succeeded', 'failed', 'skipped'] }, finishedAt: { $lte: cutoff(policy.operationalDays) } },
        cutoff: cutoff(policy.operationalDays), retentionDays: policy.operationalDays
      },
      {
        key: 'board_health_snapshots', label: 'Board health snapshots', model: this.models.BoardHealthSnapshot,
        query: { workspaceId, generatedAt: { $lte: cutoff(policy.operationalDays) } },
        cutoff: cutoff(policy.operationalDays), retentionDays: policy.operationalDays
      },
      {
        key: 'performance_records', label: 'Performance history', model: this.models.Performance,
        query: { workspaceId, endDate: { $lte: cutoff(policy.performanceDays) } },
        cutoff: cutoff(policy.performanceDays), retentionDays: policy.performanceDays
      },
      {
        key: 'notification_deliveries', label: 'Final notification receipts', model: this.models.NotificationDelivery,
        query: { workspaceId, status: { $in: ['delivered', 'failed', 'suppressed', 'digested'] }, updatedAt: { $lte: cutoff(policy.notificationDays) } },
        cutoff: cutoff(policy.notificationDays), retentionDays: policy.notificationDays
      },
      {
        key: 'session_tokens', label: 'Revoked and expired sessions', model: this.models.SessionToken,
        query: { workspaceId, status: { $in: ['revoked', 'expired'] }, updatedAt: { $lte: cutoff(policy.credentialDays) } },
        cutoff: cutoff(policy.credentialDays), retentionDays: policy.credentialDays
      },
      {
        key: 'api_tokens', label: 'Revoked and expired API credentials', model: this.models.ApiToken,
        query: { workspaceId, status: { $in: ['revoked', 'expired'] }, updatedAt: { $lte: cutoff(policy.credentialDays) } },
        cutoff: cutoff(policy.credentialDays), retentionDays: policy.credentialDays
      }
    ];
  }

  async candidateIds(descriptor, limit) {
    return descriptor.model.find(descriptor.query)
      .select('_id')
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean();
  }

  async scan(options = {}) {
    if (!options.skipDatabaseCheck) this.requireDatabase();
    const workspace = options.workspace || await this.workspaceFor(options.workspaceId);
    const workspaceId = normalizeWorkspaceObjectId(workspace._id || workspace.id);
    const policy = plainPolicy(workspace.settings?.dataRetention);
    const limit = boundedLimit(options.limit);
    const now = this.now();
    const descriptors = this.descriptors(workspaceId, policy, now);
    const candidates = await Promise.all(descriptors.map(item => this.candidateIds(item, limit)));
    const categories = descriptors.map((item, index) => ({
      key: item.key,
      label: item.label,
      retentionDays: item.retentionDays,
      cutoff: item.cutoff.toISOString(),
      due: Math.min(candidates[index].length, limit),
      truncated: candidates[index].length > limit,
      ids: candidates[index].slice(0, limit).map(record => String(record._id))
    }));
    return {
      mode: 'live',
      workspaceId: String(workspaceId),
      workspaceSlug: workspace.slug,
      scannedAt: now.toISOString(),
      limit,
      policy,
      providerWrites: false,
      protectedEvidence: [
        'audit events',
        'approvals and recommendations',
        'Trello action attempts',
        'active credentials and sessions',
        'queued, deferred, pending, or sending notifications',
        'current project and work-graph records'
      ],
      summary: {
        due: categories.reduce((total, item) => total + item.due, 0),
        truncated: categories.some(item => item.truncated),
        categoriesWithDueRecords: categories.filter(item => item.due > 0).length
      },
      categories
    };
  }

  publicReport(report) {
    return { ...report, categories: report.categories.map(({ ids, ...item }) => item) };
  }

  async updatePolicy(options = {}) {
    if (!options.skipDatabaseCheck) this.requireDatabase();
    const workspace = await this.workspaceFor(options.workspaceId);
    const before = plainPolicy(workspace.settings?.dataRetention);
    const policy = this.normalizePolicy(options.policy, before);
    if (!workspace.settings) workspace.settings = {};
    workspace.settings.dataRetention = policy;
    const auditBase = {
      workspaceId: workspace._id,
      entityType: 'workspace_data_retention',
      entityId: workspace._id,
      actor: options.actor || 'workspace-owner',
      source: options.source || 'api',
      riskLevel: 'high',
      beforeState: before,
      afterState: policy
    };
    try {
      await this.ledger.recordAudit({ ...auditBase, action: 'workspace_data_retention_policy_update_started' });
    } catch (error) {
      throw retentionError('Retention policy was not changed because audit evidence could not be stored', 503, 'RETENTION_POLICY_AUDIT_FAILED');
    }
    await workspace.save();
    try {
      await this.ledger.recordAudit({ ...auditBase, action: 'workspace_data_retention_policy_updated' });
    } catch (error) {
      throw retentionError('Retention policy changed but its completion audit requires operator review', 503, 'RETENTION_POLICY_COMPLETION_AUDIT_FAILED');
    }
    return policy;
  }

  async apply(options = {}) {
    if (!options.scheduled && options.confirm !== APPLY_CONFIRMATION) {
      throw retentionError(`Retention requires confirm=${APPLY_CONFIRMATION}`, 400, 'RETENTION_CONFIRMATION_REQUIRED');
    }
    const workspace = options.workspace || await this.workspaceFor(options.workspaceId);
    const report = await this.scan({ ...options, workspace });
    if (!report.policy.enabled) {
      throw retentionError('Enable the workspace retention policy before pruning history', 409, 'RETENTION_POLICY_DISABLED');
    }
    if (!options.scheduled && options.workspaceConfirmation !== report.workspaceSlug) {
      throw retentionError('Type the exact workspace slug to confirm retention pruning', 400, 'RETENTION_WORKSPACE_CONFIRMATION_REQUIRED');
    }

    const requested = Array.isArray(options.categories) && options.categories.length > 0
      ? new Set(options.categories.map(String))
      : null;
    const known = new Set(report.categories.map(item => item.key));
    if (requested && [...requested].some(item => !known.has(item))) {
      throw retentionError('One or more retention categories are invalid', 400, 'INVALID_RETENTION_CATEGORY');
    }

    const descriptors = this.descriptors(
      normalizeWorkspaceObjectId(workspace._id || workspace.id),
      report.policy,
      new Date(report.scannedAt)
    );
    const results = [];
    for (const category of report.categories) {
      if ((requested && !requested.has(category.key)) || category.ids.length === 0) continue;
      const descriptor = descriptors.find(item => item.key === category.key);
      await this.ledger.recordAudit({
        workspaceId: workspace._id || workspace.id,
        entityType: 'workspace_data_retention',
        entityId: workspace._id || workspace.id,
        action: 'workspace_data_retention_prune_started',
        actor: options.actor || 'sneup-retention',
        source: options.source || (options.scheduled ? 'scheduled' : 'api'),
        riskLevel: 'high',
        afterState: {
          category: category.key,
          candidateCount: category.ids.length,
          retentionDays: category.retentionDays,
          cutoff: category.cutoff,
          bounded: true,
          providerWrites: false
        }
      });
      const deletion = await descriptor.model.deleteMany({
        ...descriptor.query,
        _id: { $in: category.ids }
      });
      const deleted = Number(deletion.deletedCount) || 0;
      await this.ledger.recordAudit({
        workspaceId: workspace._id || workspace.id,
        entityType: 'workspace_data_retention',
        entityId: workspace._id || workspace.id,
        action: 'workspace_data_retention_prune_completed',
        actor: options.actor || 'sneup-retention',
        source: options.source || (options.scheduled ? 'scheduled' : 'api'),
        riskLevel: 'high',
        afterState: { category: category.key, deleted, candidateCount: category.ids.length, providerWrites: false }
      });
      results.push({ category: category.key, deleted, candidateCount: category.ids.length });
    }
    return {
      workspaceId: report.workspaceId,
      appliedAt: this.now().toISOString(),
      deleted: results.reduce((total, item) => total + item.deleted, 0),
      providerWrites: false,
      bounded: true,
      results
    };
  }

  async listEnabledWorkspaceIds(options = {}) {
    this.requireDatabase();
    const limit = typeof options === 'object' ? options.limit : options;
    const query = { status: 'active', 'settings.dataRetention.enabled': true };
    return this.models.Workspace.find(query)
      .select('_id')
      .sort({ 'settings.dataRetention.lastProcessedAt': 1, _id: 1 })
      .limit(boundedLimit(limit || 100))
      .lean()
      .then(items => items.map(item => item._id));
  }

  async markWorkspaceProcessed(workspaceId, processedAt = this.now()) {
    const result = await this.models.Workspace.updateOne(
      { _id: normalizeWorkspaceObjectId(workspaceId), status: 'active', 'settings.dataRetention.enabled': true },
      { $set: { 'settings.dataRetention.lastProcessedAt': processedAt } }
    );
    return Number(result.modifiedCount) === 1;
  }
}

module.exports = new DataRetentionService();
module.exports.DataRetentionService = DataRetentionService;
module.exports.APPLY_CONFIRMATION = APPLY_CONFIRMATION;
module.exports.DEFAULT_POLICY = DEFAULT_POLICY;
