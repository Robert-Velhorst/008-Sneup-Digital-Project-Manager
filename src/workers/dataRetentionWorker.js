const schedule = require('node-schedule');
const logger = require('../utils/logger');
const dataRetentionService = require('../services/dataRetentionService');
const jobObservabilityService = require('../services/jobObservabilityService');
const { cancelScheduledJob, observeScheduledJob } = require('../utils/scheduledJob');

class DataRetentionWorker {
  constructor() {
    this.job = null;
    this.activeRun = null;
  }

  init() {
    if (this.job) return this.job;
    this.job = observeScheduledJob(schedule.scheduleJob(
      process.env.SNEUP_DATA_RETENTION_CRON || '45 3 * * *',
      () => this.runScheduledRetention()
    ), { logger, jobName: 'privacy.data_retention' });
    if (!this.job) {
      const error = new Error('Data retention schedule could not be created');
      error.code = 'SNEUP_DATA_RETENTION_SCHEDULE_INVALID';
      throw error;
    }
    logger.info('Data retention worker initialized');
    return this.job;
  }

  async runScheduledRetention() {
    if (this.activeRun) return { skipped: true, reason: 'retention_in_progress' };
    const run = this.runRetentionPass();
    this.activeRun = run;
    try {
      return await run;
    } finally {
      this.activeRun = null;
    }
  }

  async runRetentionPass() {
    const limit = Math.min(Math.max(Number.parseInt(process.env.SNEUP_DATA_RETENTION_WORKSPACE_BATCH_SIZE, 10) || 100, 1), 500);
    const workspaceIds = await dataRetentionService.listEnabledWorkspaceIds({ limit });
    const results = [];
    for (const workspaceId of workspaceIds) {
      let attempted = false;
      try {
        const result = await jobObservabilityService.trackJob({
          jobName: 'privacy.data_retention',
          jobType: 'security',
          triggerType: 'scheduled',
          workspaceId
        }, async () => {
          attempted = true;
          return dataRetentionService.apply({
            workspaceId,
            scheduled: true,
            actor: 'sneup-data-retention',
            source: 'scheduled'
          });
        });
        results.push(result);
        if (result?.skipped !== true) attempted = true;
      } catch (error) {
        logger.error(`Scheduled data retention failed for workspace ${workspaceId}:`, error);
        results.push({ workspaceId: String(workspaceId), failed: true, error: error.message });
      } finally {
        if (attempted) {
          try {
            await dataRetentionService.markWorkspaceProcessed(workspaceId);
          } catch (error) {
            logger.error(`Failed to advance data retention fairness for workspace ${workspaceId}:`, error);
          }
        }
      }
    }
    return results;
  }

  async stop() {
    cancelScheduledJob(this.job);
    this.job = null;
    if (this.activeRun) await this.activeRun;
    logger.info('Data retention worker stopped');
  }
}

module.exports = new DataRetentionWorker();
