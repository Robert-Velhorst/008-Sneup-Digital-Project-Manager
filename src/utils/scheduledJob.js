const observeScheduledJob = (job, options = {}) => {
  if (!job || typeof job.on !== 'function') return job;
  const logger = options.logger;
  const jobName = String(options.jobName || 'scheduled.job').slice(0, 120);

  job.on('error', (error) => {
    logger?.error?.('Scheduled job execution failed', {
      jobName,
      code: error?.code || 'scheduled_job_failed'
    });
  });

  return job;
};

module.exports = { observeScheduledJob };
