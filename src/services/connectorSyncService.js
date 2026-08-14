const mongoose = require('mongoose');
const schedule = require('node-schedule');
const ConnectorAccount = require('../models/ConnectorAccount');
const jobObservabilityService = require('./jobObservabilityService');
const providerSyncPolicyService = require('./providerSyncPolicyService');
const workGraphService = require('./workGraphService');
const workSignalAdapterService = require('./workSignalAdapterService');
const workSignalService = require('./workSignalService');
const logger = require('../utils/logger');
const { copyWorkSignalSyncCounts } = require('../utils/workSignalSyncMetadata');
const { cancelScheduledJob, observeScheduledJob } = require('../utils/scheduledJob');
const {
  getDefaultWorkspaceObjectId,
  listActiveWorkspaceIds,
  normalizeWorkspaceObjectId
} = require('./workspaceScopeService');

const DEFAULT_FAILURE_RETRY_BASE_MS = 30 * 60 * 1000;
const DEFAULT_FAILURE_RETRY_MAX_MS = 24 * 60 * 60 * 1000;
const MAX_CONSECUTIVE_FAILURES = 20;

const clamp = (value, fallback, minimum, maximum) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback;
};

const mapWithConcurrency = async (items, concurrency, worker) => {
  const results = new Array(items.length);
  let cursor = 0;
  const workerCount = Math.min(Math.max(concurrency, 1), items.length || 1);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }));
  return results;
};

class ConnectorSyncService {
  constructor(options = {}) {
    this.job = null;
    this.activeScheduledSync = null;
    this.scheduledSyncStartedAt = null;
    this.featureFlagService = options.featureFlagService || null;
    this.accountConnectorService = options.accountConnectorService || null;
    this.now = options.now || (() => new Date());
  }

  getFeatureFlagService() {
    if (!this.featureFlagService) this.featureFlagService = require('./featureFlagService');
    return this.featureFlagService;
  }

  getAccountConnectorService() {
    if (!this.accountConnectorService) this.accountConnectorService = require('./accountConnectorService');
    return this.accountConnectorService;
  }

  init() {
    if (this.job) return this.job;
    const cron = process.env.CONNECTOR_SYNC_CRON || '*/30 * * * *';
    this.job = observeScheduledJob(
      schedule.scheduleJob(cron, () => this.runScheduledSyncs()),
      { logger, jobName: 'connectors.work_signals_sync' }
    );
    if (!this.job) {
      const error = new Error('Connector synchronization schedule could not be created');
      error.code = 'SNEUP_CONNECTOR_SYNC_SCHEDULE_INVALID';
      throw error;
    }
    logger.info('Connector sync service initialized');
    return this.job;
  }

  async stop() {
    cancelScheduledJob(this.job);
    this.job = null;
    if (this.activeScheduledSync) await this.activeScheduledSync;
  }

  async runTrackedSync(options = {}) {
    const scheduledMetadata = Number.isFinite(Number(options.scheduledWorkspaceCount))
      ? {
        scheduledWorkspaceCount: clamp(options.scheduledWorkspaceCount, 0, 0, 5000),
        scheduledWorkspaceConcurrency: this.getScheduledWorkspaceConcurrency(options.scheduledWorkspaceConcurrency)
      }
      : {};
    return jobObservabilityService.trackJob({
      jobName: 'connectors.work_signals_sync',
      jobType: 'sync',
      triggerType: options.triggerType || 'scheduled',
      workspaceId: options.workspaceId,
      metadata: {
        actor: options.actor || 'connector-sync',
        ...scheduledMetadata
      }
    }, () => this.syncConnectedAccounts(options));
  }

  async runTrackedAccountSync(accountId, options = {}) {
    const workspaceId = normalizeWorkspaceObjectId(options.workspaceId || getDefaultWorkspaceObjectId());
    return jobObservabilityService.trackJob({
      jobName: 'connectors.work_signals_sync',
      jobType: 'sync',
      triggerType: options.triggerType || 'api',
      workspaceId,
      metadata: { actor: options.actor || 'api', accountScope: 'single' }
    }, async () => {
      const account = await this.getAccountForSync(accountId, workspaceId);
      try {
        return await this.syncAccount(account, options);
      } catch (error) {
        if (!this.isLifecycleSyncBlock(error)) await this.recordSyncFailure(account, error, options);
        throw error;
      }
    });
  }

  async runTrackedAccountDisconnect(accountId, body = {}, options = {}) {
    const workspaceId = normalizeWorkspaceObjectId(options.workspaceId || getDefaultWorkspaceObjectId());
    return jobObservabilityService.trackJob({
      jobName: 'connectors.work_signals_sync',
      jobType: 'sync',
      triggerType: options.triggerType || 'api',
      workspaceId,
      metadata: { actor: options.actorId || options.actor || 'api', accountScope: 'single', accountAction: 'disconnect' }
    }, () => this.getAccountConnectorService().disconnectAccount(accountId, body, {
      ...options,
      workspaceId,
      actorId: options.actorId || options.actor || 'api'
    }));
  }

  async runScheduledSyncs() {
    if (this.activeScheduledSync) {
      const startedAt = this.scheduledSyncStartedAt;
      logger.warn('Skipping overlapping scheduled connector sync', { startedAt });
      return {
        skipped: true,
        reason: 'scheduled_sync_in_progress',
        startedAt
      };
    }

    this.scheduledSyncStartedAt = new Date().toISOString();
    const scheduledRun = this.runScheduledSyncPass();
    this.activeScheduledSync = scheduledRun;

    try {
      return await scheduledRun;
    } finally {
      this.activeScheduledSync = null;
      this.scheduledSyncStartedAt = null;
    }
  }

  async runScheduledSyncPass(options = {}) {
    const workspaceIds = options.workspaceIds || await listActiveWorkspaceIds();
    const concurrency = this.getScheduledWorkspaceConcurrency(options.concurrency);
    return mapWithConcurrency(workspaceIds, concurrency, workspaceId => this.runTrackedSync({
        triggerType: 'scheduled',
        workspaceId,
        scheduledWorkspaceCount: workspaceIds.length,
        scheduledWorkspaceConcurrency: concurrency
      }));
  }

  async syncConnectedAccounts(options = {}) {
    this.requireDatabase();
    const workspaceId = normalizeWorkspaceObjectId(options.workspaceId || getDefaultWorkspaceObjectId());
    const rollout = await this.getFeatureFlagService().evaluate('connector_sync', {
      workspaceId,
      subjectId: options.actor
    });
    if (!rollout.effective) {
      return {
        processedCount: 0,
        successCount: 0,
        failureCount: 0,
        metadata: { skipped: true, reason: rollout.available === false ? 'feature_flags_unavailable' : 'connector_sync_disabled' }
      };
    }
    const connectorIds = workSignalAdapterService.getFirstWaveConnectorIds();
    const accountsFilter = this.getScheduledAccountsFilter(workspaceId, connectorIds, this.now());
    let accountsQuery = ConnectorAccount.find(accountsFilter);
    if (typeof accountsQuery.select === 'function') accountsQuery = accountsQuery.select('+credentials');
    const accounts = await accountsQuery.sort({ updatedAt: 1 });

    const providerQueues = this.groupAccountsByProvider(accounts);
    const concurrency = this.getAccountSyncConcurrency(options.concurrency);
    const outcomes = (await mapWithConcurrency(providerQueues, concurrency, async ({ connectorId, accounts: providerAccounts }) => {
      const results = [];
      // Keep each provider serial so its pacing state and retry behavior remain valid.
      for (const account of providerAccounts) results.push(await this.syncConnectedAccount(account, options));
      return { connectorId, results };
    })).flatMap(item => item.results);

    let successCount = 0;
    let failureCount = 0;
    let signalCount = 0;
    let signalWriteBatchCount = 0;
    let signalWriteBatchSize = 0;
    let retryCount = 0;
    let rateLimitWaitMs = 0;
    const providerStats = {};
    const successfulProviders = new Set();

    for (const outcome of outcomes) {
      if (outcome.ok) {
        const result = outcome.result;
        successCount += 1;
        signalCount += result.signalCount;
        signalWriteBatchCount += result.signalWriteBatchCount || 0;
        signalWriteBatchSize = Math.max(signalWriteBatchSize, result.signalWriteBatchSize || 0);
        retryCount += result.retryCount || 0;
        rateLimitWaitMs += result.rateLimitWaitMs || 0;
        successfulProviders.add(result.connectorId);
        this.recordProviderStats(providerStats, result.connectorId, result);
      } else {
        const { account, error } = outcome;
        failureCount += 1;
        const policy = error.connectorSyncPolicy || {};
        retryCount += policy.retryCount || 0;
        rateLimitWaitMs += policy.rateLimitWaitMs || 0;
        this.recordProviderStats(providerStats, account.connectorId, {
          retryCount: policy.retryCount || 0,
          rateLimitWaitMs: policy.rateLimitWaitMs || 0,
          failed: true
        });
        logger.error(`Failed to sync connector account ${account._id}: ${this.safeErrorMessage(error)}`);
      }
    }

    const dependencyFreshness = await this.finalizeDependencyFreshness(workspaceId, successfulProviders);
    const scheduledMetadata = Number.isFinite(Number(options.scheduledWorkspaceCount))
      ? {
        scheduledWorkspaceCount: clamp(options.scheduledWorkspaceCount, 0, 0, 5000),
        scheduledWorkspaceConcurrency: this.getScheduledWorkspaceConcurrency(options.scheduledWorkspaceConcurrency)
      }
      : {};

    return {
      processedCount: accounts.length,
      successCount,
      failureCount,
      metadata: {
        signalCount,
        signalWriteBatchCount,
        signalWriteBatchSize,
        adapterCount: connectorIds.length,
        providerQueueCount: providerQueues.length,
        concurrency,
        retryCount,
        rateLimitWaitMs,
        providerStats,
        dependencyFreshness,
        ...scheduledMetadata
      }
    };
  }

  getAccountSyncConcurrency(value = process.env.SNEUP_CONNECTOR_SYNC_CONCURRENCY) {
    return clamp(value, 3, 1, 8);
  }

  getScheduledWorkspaceConcurrency(value = process.env.SNEUP_CONNECTOR_SCHEDULED_WORKSPACE_CONCURRENCY) {
    return clamp(value, 2, 1, 4);
  }

  groupAccountsByProvider(accounts = []) {
    const queues = new Map();
    for (const account of accounts) {
      const connectorId = String(account?.connectorId || 'unknown');
      const queue = queues.get(connectorId) || [];
      queue.push(account);
      queues.set(connectorId, queue);
    }
    return [...queues.entries()].map(([connectorId, providerAccounts]) => ({ connectorId, accounts: providerAccounts }));
  }

  async syncConnectedAccount(account, options = {}) {
    try {
      return {
        ok: true,
        result: await this.syncAccount(account, {
          ...options,
          deferDependencyFreshness: true
        })
      };
    } catch (error) {
      await this.recordSyncFailure(account, error, options);
      return { ok: false, account, error };
    }
  }

  getScheduledAccountsFilter(workspaceId, connectorIds, now = this.now()) {
    return {
      workspaceId,
      connectorId: { $in: connectorIds },
      $or: [
        { status: 'connected' },
        {
          status: { $in: ['failed', 'needs_attention'] },
          'metadata.connectorSyncFailure.retryable': true,
          'metadata.connectorSyncFailure.nextRetryAt': { $lte: now }
        },
        {
          status: 'failed',
          'metadata.connectorSyncFailure': { $exists: false }
        }
      ]
    };
  }

  getFailureRetryPolicy(environment = process.env) {
    return {
      baseMs: clamp(
        environment.SNEUP_CONNECTOR_FAILURE_RETRY_BASE_MS,
        DEFAULT_FAILURE_RETRY_BASE_MS,
        60 * 1000,
        24 * 60 * 60 * 1000
      ),
      maxMs: clamp(
        environment.SNEUP_CONNECTOR_FAILURE_RETRY_MAX_MS,
        DEFAULT_FAILURE_RETRY_MAX_MS,
        5 * 60 * 1000,
        7 * 24 * 60 * 60 * 1000
      )
    };
  }

  isRetryableFailure(error) {
    const statusCode = Number(error?.statusCode || error?.response?.status || error?.status);
    const message = String(error?.message || '').toLowerCase();
    if ([400, 401, 403, 404, 409, 410, 422].includes(statusCode)) return false;
    if (/(reconnect|credentials? (?:are )?required|token is missing|authorization has expired|invalid expiry)/.test(message)) {
      return false;
    }
    return providerSyncPolicyService.isRetryable(error);
  }

  failureCode(error) {
    const code = String(error?.code || '').trim();
    if (/^[A-Z][A-Z0-9_]{1,63}$/.test(code)) return code;
    const statusCode = Number(error?.statusCode || error?.response?.status || error?.status);
    return Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599
      ? `HTTP_${statusCode}`
      : 'CONNECTOR_SYNC_FAILED';
  }

  async recordSyncFailure(account, error, options = {}) {
    if (!account?.save || account.status === 'disabled' || this.isLifecycleSyncBlock(error)) return null;
    const now = this.now();
    const previous = account.metadata?.connectorSyncFailure || {};
    const consecutiveFailures = Math.min(
      MAX_CONSECUTIVE_FAILURES,
      Math.max(0, Number.parseInt(previous.consecutiveFailures, 10) || 0) + 1
    );
    const retryable = this.isRetryableFailure(error);
    const policy = this.getFailureRetryPolicy(options.environment);
    const retryDelayMs = retryable
      ? Math.min(policy.maxMs, policy.baseMs * (2 ** Math.min(consecutiveFailures - 1, 16)))
      : null;
    const nextRetryAt = retryable ? new Date(now.getTime() + retryDelayMs) : null;

    account.status = retryable ? 'failed' : 'needs_attention';
    account.lastError = this.safeErrorMessage(error);
    account.metadata = {
      ...(account.metadata || {}),
      connectorSyncFailure: {
        consecutiveFailures,
        retryable,
        code: this.failureCode(error),
        lastFailedAt: now,
        ...(nextRetryAt ? { nextRetryAt, retryDelayMs } : {})
      }
    };
    await account.save();
    return account.metadata.connectorSyncFailure;
  }

  isLifecycleSyncBlock(error) {
    return ['SNEUP_CONNECTOR_ACCOUNT_DISABLED', 'SNEUP_CONNECTOR_RECONNECT_REQUIRED'].includes(error?.code);
  }

  assertAccountSyncable(account) {
    if (account?.status === 'disabled') {
      const error = new Error('Reconnect this connector account before running a sync');
      error.statusCode = 409;
      error.code = 'SNEUP_CONNECTOR_ACCOUNT_DISABLED';
      throw error;
    }
    if (account?.status === 'needs_attention' || account?.metadata?.connectorSyncFailure?.retryable === false) {
      const error = new Error('Reconnect or rotate this connector account before running a sync');
      error.statusCode = 409;
      error.code = 'SNEUP_CONNECTOR_RECONNECT_REQUIRED';
      throw error;
    }
  }

  async syncAccount(accountOrId, options = {}) {
    this.requireDatabase();
    let account = accountOrId;
    if (!(typeof accountOrId === 'object' && accountOrId._id)) {
      account = await this.getAccountForSync(
        accountOrId,
        normalizeWorkspaceObjectId(options.workspaceId || getDefaultWorkspaceObjectId())
      );
    }

    if (!account) {
      const error = new Error('Connector account not found');
      error.statusCode = 404;
      throw error;
    }

    this.assertAccountSyncable(account);

    await this.getFeatureFlagService().assertEnabled('connector_sync', {
      workspaceId: account.workspaceId,
      subjectId: options.actor
    });

    if (account.authType === 'oauth2') {
      account = await this.getAccountConnectorService().prepareOAuthAccountForSync(account, {
        actor: options.actor || 'connector-sync'
      });
    }

    const cursor = account.metadata?.workSignalCursor || null;
    const syncResult = await providerSyncPolicyService.run(
      account.connectorId,
      () => workSignalAdapterService.fetchDelta(account, cursor),
      options
    );
    const delta = syncResult.result || {};
    const {
      count: signalCount,
      batchCount: signalWriteBatchCount,
      batchSize: signalWriteBatchSize
    } = await workSignalService.upsertProviderRecords(account, delta.records || [], {
      workspaceId: account.workspaceId,
      actorId: options.actor || 'connector-sync',
      deferDependencyFreshness: options.deferDependencyFreshness === true,
      deferAccountSave: true
    });

    const dependencyFreshness = options.deferDependencyFreshness === true
      ? null
      : await this.finalizeDependencyFreshness(account.workspaceId, [account.connectorId]);

    account.status = 'connected';
    account.lastSyncAt = new Date();
    account.lastError = undefined;
    const nextMetadata = {
      ...(account.metadata || {}),
      workSignalCursor: delta.nextCursor || cursor,
      workSignalAdapter: account.connectorId,
      lastWorkSignalSync: {
        signalCount,
        signalWriteBatchCount,
        signalWriteBatchSize,
        hasMore: Boolean(delta.hasMore),
        retryCount: syncResult.retryCount,
        rateLimitWaitMs: syncResult.rateLimitWaitMs,
        attemptCount: syncResult.attemptCount,
        source: delta.metadata?.source,
        ...copyWorkSignalSyncCounts(delta.metadata),
        dependencyFreshness,
        finishedAt: new Date()
      }
    };
    delete nextMetadata.connectorSyncFailure;
    account.metadata = nextMetadata;
    await account.save();

    return {
      accountId: String(account._id),
      connectorId: account.connectorId,
      signalCount,
      signalWriteBatchCount,
      signalWriteBatchSize,
      nextCursor: delta.nextCursor || cursor,
      retryCount: syncResult.retryCount,
      rateLimitWaitMs: syncResult.rateLimitWaitMs,
      attemptCount: syncResult.attemptCount,
      dependencyFreshness
    };
  }

  async getAccountForSync(accountId, workspaceId) {
    let accountQuery = ConnectorAccount.findOne({ _id: accountId, workspaceId });
    if (typeof accountQuery?.select === 'function') accountQuery = accountQuery.select('+credentials');
    const account = await accountQuery;
    if (!account) {
      const error = new Error('Connector account not found');
      error.statusCode = 404;
      throw error;
    }
    return account;
  }

  async finalizeDependencyFreshness(workspaceId, providers = []) {
    const sourceProviders = [...new Set([...providers].map(provider => String(provider || '').trim()).filter(Boolean))].sort();
    const byProvider = {};
    let markedStale = 0;
    let failureCount = 0;

    for (const sourceProvider of sourceProviders) {
      try {
        const result = await workGraphService.markStaleDependencies(workspaceId, { sourceProvider });
        const count = Number(result?.modifiedCount ?? result?.nModified ?? 0);
        const staleAfterDays = Number(result?.staleAfterDays);
        byProvider[sourceProvider] = {
          markedStale: count,
          ...(Number.isFinite(staleAfterDays) ? { staleAfterDays } : {})
        };
        markedStale += count;
      } catch (error) {
        failureCount += 1;
        byProvider[sourceProvider] = { markedStale: 0, error: this.safeErrorMessage(error) };
        logger.error(`Failed to finalize dependency freshness for ${sourceProvider}: ${this.safeErrorMessage(error)}`);
      }
    }

    return {
      providerCount: sourceProviders.length,
      markedStale,
      failureCount,
      byProvider
    };
  }

  recordProviderStats(stats, connectorId, result = {}) {
    const provider = connectorId || 'unknown';
    const current = stats[provider] || {
      accounts: 0,
      failures: 0,
      retryCount: 0,
      rateLimitWaitMs: 0,
      signalWriteBatchCount: 0,
      signalWriteBatchSize: 0
    };
    current.accounts += 1;
    current.failures += result.failed ? 1 : 0;
    current.retryCount += result.retryCount || 0;
    current.rateLimitWaitMs += result.rateLimitWaitMs || 0;
    current.signalWriteBatchCount += result.signalWriteBatchCount || 0;
    current.signalWriteBatchSize = Math.max(current.signalWriteBatchSize, result.signalWriteBatchSize || 0);
    stats[provider] = current;
  }

  safeErrorMessage(error) {
    const message = String(error?.response?.data?.message || error?.message || 'Connector sync failed');
    return message
      .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+\/=:-]+/gi, '$1 [redacted]')
      .replace(/\b(api[_-]?key|key|token|access[_-]?token|refresh[_-]?token|password|secret)=([^\s&]+)/gi, '$1=[redacted]')
      .slice(0, 500);
  }

  requireDatabase() {
    if (mongoose.connection.readyState !== 1) {
      const error = new Error('Database connection is required to sync connector work signals');
      error.statusCode = 503;
      throw error;
    }
  }
}

const connectorSyncService = new ConnectorSyncService();
module.exports = connectorSyncService;
module.exports.ConnectorSyncService = ConnectorSyncService;
module.exports.DEFAULT_FAILURE_RETRY_BASE_MS = DEFAULT_FAILURE_RETRY_BASE_MS;
module.exports.DEFAULT_FAILURE_RETRY_MAX_MS = DEFAULT_FAILURE_RETRY_MAX_MS;
