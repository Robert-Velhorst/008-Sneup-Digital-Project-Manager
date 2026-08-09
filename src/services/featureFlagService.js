const crypto = require('crypto');
const { isDemoMode } = require('./demoWorkspaceService');
const logger = require('../utils/logger');

const FEATURE_DEFINITIONS = Object.freeze([
  Object.freeze({
    key: 'connector_sync',
    label: 'Connector synchronization',
    description: 'Read-only ingestion from connected project-management accounts.',
    defaultEnabled: true,
    rolloutSubject: 'workspace'
  }),
  Object.freeze({
    key: 'forecast_scenarios',
    label: 'Capacity forecast scenarios',
    description: 'Temporary analysis-only capacity scenarios.',
    defaultEnabled: true,
    rolloutSubject: 'actor'
  }),
  Object.freeze({
    key: 'work_graph_decisions',
    label: 'Work graph decisions',
    description: 'Cross-tool decision candidates and approval-queue proposals.',
    defaultEnabled: true,
    rolloutSubject: 'actor'
  }),
  Object.freeze({
    key: 'hai_proposals',
    label: 'HAI proposals',
    description: 'Internal HAI recommendations that still require human approval.',
    defaultEnabled: true,
    rolloutSubject: 'actor'
  })
]);

const DEFINITIONS_BY_KEY = new Map(FEATURE_DEFINITIONS.map(definition => [definition.key, definition]));
const CACHE_TTL_MS = 30_000;
const MAX_CACHE_WORKSPACES = 250;
const MAX_HISTORY = 50;
const MAX_REASON_LENGTH = 500;

const clampInteger = (value, fallback, minimum, maximum) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback;
};

const strictInteger = (value, minimum, maximum) => {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
};

const featureError = (message, statusCode, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

class FeatureFlagService {
  constructor(options = {}) {
    this.FeatureFlag = options.FeatureFlag || null;
    this.AuditEvent = options.AuditEvent || null;
    this.now = options.now || (() => new Date());
    this.isDemoRuntime = options.isDemoRuntime || (() => isDemoMode());
    this.cacheTtlMs = clampInteger(options.cacheTtlMs, CACHE_TTL_MS, 1_000, 300_000);
    this.maximumCacheWorkspaces = clampInteger(options.maximumCacheWorkspaces, MAX_CACHE_WORKSPACES, 1, 2_000);
    this.cache = new Map();
  }

  getFeatureFlagModel() {
    return this.FeatureFlag || require('../models/FeatureFlag');
  }

  getAuditEventModel() {
    return this.AuditEvent || require('../models/AuditEvent');
  }

  definition(key) {
    const normalized = String(key || '').trim().toLowerCase();
    const definition = DEFINITIONS_BY_KEY.get(normalized);
    if (!definition) throw featureError('Unknown feature flag', 404, 'FEATURE_FLAG_NOT_FOUND');
    return definition;
  }

  isDatabaseReady() {
    if (this.isDemoRuntime()) return false;
    return require('mongoose').connection.readyState === 1;
  }

  resolveWorkspaceId(workspaceId) {
    if (this.isDemoRuntime()) {
      return String(workspaceId || process.env.SNEUP_DEFAULT_WORKSPACE_ID || 'default');
    }
    return require('./workspaceScopeService').normalizeWorkspaceObjectId(workspaceId);
  }

  cacheKey(workspaceId) {
    return String(workspaceId);
  }

  invalidate(workspaceId) {
    if (workspaceId) this.cache.delete(this.cacheKey(workspaceId));
  }

  trimCache() {
    while (this.cache.size > this.maximumCacheWorkspaces) {
      this.cache.delete(this.cache.keys().next().value);
    }
  }

  async loadWorkspaceRules(workspaceId, options = {}) {
    if (!this.isDatabaseReady()) return new Map();
    const key = this.cacheKey(workspaceId);
    const cached = this.cache.get(key);
    if (!options.force && cached && cached.expiresAt > Date.now()) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached.rules || cached.promise;
    }

    const promise = this.getFeatureFlagModel()
      .find({ workspaceId })
      .select('key enabled rolloutPercentage reason revision updatedBy updatedAt')
      .lean()
      .then(rows => new Map(rows.filter(row => DEFINITIONS_BY_KEY.has(row.key)).map(row => [row.key, row])));
    this.cache.set(key, { expiresAt: Date.now() + this.cacheTtlMs, promise });
    this.trimCache();
    try {
      const rules = await promise;
      this.cache.set(key, { expiresAt: Date.now() + this.cacheTtlMs, rules });
      this.trimCache();
      return rules;
    } catch (error) {
      this.cache.delete(key);
      throw error;
    }
  }

  rolloutBucket({ workspaceId, key, subjectId }) {
    const digest = crypto.createHash('sha256')
      .update(`${workspaceId}:${key}:${subjectId}`)
      .digest();
    return (digest.readUInt32BE(0) / 0x1_0000_0000) * 100;
  }

  serialize(definition, rule, options = {}) {
    const configured = Boolean(rule);
    const enabled = configured ? rule.enabled !== false : definition.defaultEnabled;
    const rolloutPercentage = configured
      ? clampInteger(rule.rolloutPercentage, enabled ? 100 : 0, 0, 100)
      : definition.defaultEnabled ? 100 : 0;
    const workspaceId = String(options.workspaceId);
    const requestedSubject = definition.rolloutSubject === 'workspace'
      ? workspaceId
      : String(options.subjectId || workspaceId);
    const effective = enabled && (
      rolloutPercentage >= 100
      || (rolloutPercentage > 0 && this.rolloutBucket({ workspaceId, key: definition.key, subjectId: requestedSubject }) < rolloutPercentage)
    );
    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      rolloutSubject: definition.rolloutSubject,
      configured,
      enabled,
      rolloutPercentage,
      effective,
      reason: rule?.reason || '',
      revision: Number(rule?.revision || 0),
      updatedBy: rule?.updatedBy || null,
      updatedAt: rule?.updatedAt || null
    };
  }

  async list(options = {}) {
    const workspaceId = this.resolveWorkspaceId(options.workspaceId);
    if (!this.isDatabaseReady() && !this.isDemoRuntime()) {
      throw featureError('Feature rollout controls are temporarily unavailable', 503, 'FEATURE_FLAGS_UNAVAILABLE');
    }
    let rules;
    try {
      rules = await this.loadWorkspaceRules(workspaceId, { force: options.force });
    } catch (error) {
      logger.error('Feature flag lookup failed:', error);
      throw featureError('Feature rollout controls are temporarily unavailable', 503, 'FEATURE_FLAGS_UNAVAILABLE');
    }
    return FEATURE_DEFINITIONS.map(definition => this.serialize(definition, rules.get(definition.key), {
      workspaceId,
      subjectId: options.subjectId
    }));
  }

  async evaluate(key, options = {}) {
    const definition = this.definition(key);
    const workspaceId = this.resolveWorkspaceId(options.workspaceId);
    if (!this.isDatabaseReady()) {
      if (this.isDemoRuntime()) {
        return this.serialize(definition, null, { workspaceId, subjectId: options.subjectId });
      }
      return {
        ...this.serialize(definition, { enabled: false, rolloutPercentage: 0 }, { workspaceId, subjectId: options.subjectId }),
        available: false
      };
    }
    try {
      const rules = await this.loadWorkspaceRules(workspaceId);
      return this.serialize(definition, rules.get(definition.key), { workspaceId, subjectId: options.subjectId });
    } catch (error) {
      logger.error(`Feature flag evaluation failed for ${definition.key}:`, error);
      return {
        ...this.serialize(definition, { enabled: false, rolloutPercentage: 0 }, { workspaceId, subjectId: options.subjectId }),
        available: false
      };
    }
  }

  async assertEnabled(key, options = {}) {
    const result = await this.evaluate(key, options);
    if (result.effective) return result;
    const unavailable = result.available === false;
    throw featureError(
      unavailable ? 'Feature rollout controls are temporarily unavailable' : `${result.label} is not enabled for this workspace`,
      503,
      unavailable ? 'FEATURE_FLAGS_UNAVAILABLE' : 'FEATURE_DISABLED'
    );
  }

  async history(key, options = {}) {
    const definition = this.definition(key);
    if (!this.isDatabaseReady()) {
      throw featureError('Feature rollout history is temporarily unavailable', 503, 'FEATURE_FLAGS_UNAVAILABLE');
    }
    const workspaceId = this.resolveWorkspaceId(options.workspaceId);
    const limit = clampInteger(options.limit, 25, 1, MAX_HISTORY);
    const row = await this.getFeatureFlagModel()
      .findOne({ workspaceId, key: definition.key })
      .select('+history')
      .lean();
    return (row?.history || []).slice().reverse().slice(0, limit).map(entry => ({
      revision: Number(entry.revision || 0),
      enabled: entry.enabled === true,
      rolloutPercentage: clampInteger(entry.rolloutPercentage, 0, 0, 100),
      actor: String(entry.actor || 'unknown'),
      reason: String(entry.reason || ''),
      changedAt: entry.changedAt || null
    }));
  }

  normalizeUpdate(body = {}) {
    if (typeof body.enabled !== 'boolean') {
      throw featureError('enabled must be true or false', 400, 'FEATURE_FLAG_INVALID');
    }
    const rolloutPercentage = strictInteger(body.rolloutPercentage, 0, 100);
    if (rolloutPercentage === null) {
      throw featureError('rolloutPercentage must be a whole number from 0 to 100', 400, 'FEATURE_FLAG_INVALID');
    }
    const expectedRevision = body.expectedRevision === undefined
      ? undefined
      : strictInteger(body.expectedRevision, 0, Number.MAX_SAFE_INTEGER);
    if (body.expectedRevision !== undefined && expectedRevision === null) {
      throw featureError('expectedRevision must be a non-negative whole number', 400, 'FEATURE_FLAG_INVALID');
    }
    return {
      enabled: body.enabled,
      rolloutPercentage,
      expectedRevision,
      reason: String(body.reason || '').trim().slice(0, MAX_REASON_LENGTH)
    };
  }

  async update(key, body = {}, options = {}) {
    const definition = this.definition(key);
    if (!this.isDatabaseReady()) {
      throw featureError('Database connection is required to manage feature rollouts', 503, 'FEATURE_FLAGS_UNAVAILABLE');
    }
    const workspaceId = this.resolveWorkspaceId(options.workspaceId);
    const actor = String(options.actor || 'sneup-operator').trim().slice(0, 160) || 'sneup-operator';
    const update = this.normalizeUpdate(body);
    const FeatureFlag = this.getFeatureFlagModel();
    const existing = await FeatureFlag.findOne({ workspaceId, key: definition.key }).lean();
    const currentRevision = Number(existing?.revision || 0);
    if (update.expectedRevision !== undefined && update.expectedRevision !== currentRevision) {
      throw featureError('Feature flag changed since it was loaded; refresh and try again', 409, 'FEATURE_FLAG_REVISION_CONFLICT');
    }

    const nextRevision = currentRevision + 1;
    const now = this.now();
    const filter = { workspaceId, key: definition.key };
    if (existing) filter.revision = currentRevision;
    let saved;
    try {
      saved = await FeatureFlag.findOneAndUpdate(
        filter,
        {
          $set: {
            enabled: update.enabled,
            rolloutPercentage: update.rolloutPercentage,
            reason: update.reason,
            revision: nextRevision,
            updatedBy: actor
          },
          $setOnInsert: { workspaceId, key: definition.key },
          $push: {
            history: {
              $each: [{
                revision: nextRevision,
                enabled: update.enabled,
                rolloutPercentage: update.rolloutPercentage,
                actor,
                reason: update.reason,
                changedAt: now
              }],
              $slice: -MAX_HISTORY
            }
          }
        },
        { new: true, upsert: !existing, setDefaultsOnInsert: true }
      ).lean();
    } catch (error) {
      if (error?.code === 11000) {
        throw featureError('Feature flag changed since it was loaded; refresh and try again', 409, 'FEATURE_FLAG_REVISION_CONFLICT');
      }
      throw error;
    }
    if (!saved) {
      throw featureError('Feature flag changed since it was loaded; refresh and try again', 409, 'FEATURE_FLAG_REVISION_CONFLICT');
    }

    this.invalidate(workspaceId);
    const before = this.serialize(definition, existing, { workspaceId, subjectId: options.subjectId });
    const after = this.serialize(definition, saved, { workspaceId, subjectId: options.subjectId });
    try {
      await this.getAuditEventModel().create({
        workspaceId,
        entityType: 'feature_flag',
        entityId: saved._id,
        action: 'feature_flag_updated',
        actor,
        source: 'api',
        riskLevel: 'medium',
        beforeState: before,
        afterState: after
      });
    } catch (error) {
      logger.error('Feature flag audit write failed; bounded history remains on the flag:', error);
    }
    return after;
  }

  cacheMetrics() {
    return {
      retention: 'bounded_workspace_lru',
      ttlMs: this.cacheTtlMs,
      maximumWorkspaces: this.maximumCacheWorkspaces,
      cachedWorkspaces: this.cache.size
    };
  }
}

const featureFlagService = new FeatureFlagService();
module.exports = featureFlagService;
module.exports.FeatureFlagService = FeatureFlagService;
module.exports.FEATURE_DEFINITIONS = FEATURE_DEFINITIONS;
module.exports.MAX_HISTORY = MAX_HISTORY;
