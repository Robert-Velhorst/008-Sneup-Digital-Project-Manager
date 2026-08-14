const schedule = require('node-schedule');
const logger = require('../utils/logger');
const notificationService = require('../services/notificationService');
const jobObservabilityService = require('../services/jobObservabilityService');
const { observeScheduledJob } = require('../utils/scheduledJob');

class NotificationWorker {
  constructor() {
    this.jobs = {};
  }

  init() {
    if (this.jobs.reconciliationAlerts) return;

    this.jobs.reconciliationAlerts = observeScheduledJob(schedule.scheduleJob(
      process.env.SNEUP_NOTIFICATION_CRON || '*/15 * * * *',
      async () => this.runScheduledReconciliationAlerts()
    ), { logger, jobName: 'notifications.reconciliation_alerts' });
    this.jobs.weeklyStatusReports = observeScheduledJob(schedule.scheduleJob(
      process.env.SNEUP_REPORT_DELIVERY_CRON || '*/15 * * * *',
      async () => this.runScheduledReports()
    ), { logger, jobName: 'notifications.weekly_status_reports' });
    this.jobs.dailyOperationsBriefs = observeScheduledJob(schedule.scheduleJob(
      process.env.SNEUP_DAILY_BRIEF_DELIVERY_CRON || process.env.SNEUP_REPORT_DELIVERY_CRON || '*/15 * * * *',
      async () => this.runScheduledDailyOperationsBriefs()
    ), { logger, jobName: 'notifications.daily_operations_briefs' });

    if (Object.values(this.jobs).some(job => !job)) {
      this.stop();
      const error = new Error('Notification schedules could not be created');
      error.code = 'SNEUP_NOTIFICATION_SCHEDULE_INVALID';
      throw error;
    }

    logger.info('Notification worker initialized');
  }

  async runScheduledReconciliationAlerts() {
    const workspaceIds = await notificationService.listActiveReconciliationWorkspaceIds();
    const results = [];

    for (const workspaceId of workspaceIds) {
      results.push(await jobObservabilityService.trackJob({
        jobName: 'notifications.reconciliation_alerts',
        jobType: 'system',
        triggerType: 'scheduled',
        workspaceId
      }, () => notificationService.dispatchReconciliationAlerts({ workspaceId })));
    }

    return results;
  }

  async runScheduledReports() {
    const workspaceIds = await notificationService.listActiveReportWorkspaceIds();
    const results = [];

    for (const workspaceId of workspaceIds) {
      results.push(await jobObservabilityService.trackJob({
        jobName: 'notifications.weekly_status_reports',
        jobType: 'system',
        triggerType: 'scheduled',
        workspaceId
      }, () => notificationService.dispatchScheduledReports({ workspaceId })));
    }

    return results;
  }

  async runScheduledDailyOperationsBriefs() {
    const workspaceIds = await notificationService.listActiveDailyBriefWorkspaceIds();
    const results = [];

    for (const workspaceId of workspaceIds) {
      results.push(await jobObservabilityService.trackJob({
        jobName: 'notifications.daily_operations_briefs',
        jobType: 'system',
        triggerType: 'scheduled',
        workspaceId
      }, () => notificationService.dispatchScheduledDailyOperationsBriefs({ workspaceId })));
    }

    return results;
  }

  stop() {
    Object.values(this.jobs).forEach(job => job?.cancel());
    this.jobs = {};
    logger.info('Notification worker stopped');
  }
}

module.exports = new NotificationWorker();
