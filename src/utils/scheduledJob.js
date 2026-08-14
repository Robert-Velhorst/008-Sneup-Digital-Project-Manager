const observedJobs = new Set();
const jobStates = new WeakMap();
const drainWaiters = new Set();

const notifyDrainWaiters = () => {
  for (const waiter of drainWaiters) waiter();
};

const releaseState = (state) => {
  observedJobs.delete(state);
  state.job.removeListener?.('run', state.onRun);
  state.job.removeListener?.('success', state.onSuccess);
  state.job.removeListener?.('error', state.onError);
  notifyDrainWaiters();
};

const observeScheduledJob = (job, options = {}) => {
  if (!job || typeof job.on !== 'function') return job;
  if (jobStates.has(job)) return job;

  const logger = options.logger;
  const jobName = String(options.jobName || 'scheduled.job').slice(0, 120);
  const state = {
    active: 0,
    cancelled: false,
    job,
    jobName
  };

  const settle = () => {
    state.active = Math.max(0, state.active - 1);
    if (state.cancelled && state.active === 0) releaseState(state);
    else notifyDrainWaiters();
  };

  state.onRun = () => {
    state.active += 1;
  };
  state.onSuccess = settle;
  state.onError = (error) => {
    try {
      logger?.error?.('Scheduled job execution failed', {
        jobName,
        code: error?.code || 'scheduled_job_failed'
      });
    } finally {
      settle();
    }
  };

  job.on('run', state.onRun);
  job.on('success', state.onSuccess);
  job.on('error', state.onError);
  jobStates.set(job, state);
  observedJobs.add(state);
  return job;
};

const cancelScheduledJob = (job) => {
  if (!job) return false;
  const result = typeof job.cancel === 'function' ? job.cancel() : false;
  const state = jobStates.get(job);
  if (!state) return result;
  state.cancelled = true;
  if (state.active === 0) releaseState(state);
  return result;
};

const activeScheduledJobs = () => [...observedJobs]
  .filter(state => state.active > 0)
  .map(state => ({ jobName: state.jobName, active: state.active }));

const waitForScheduledJobs = (options = {}) => {
  const timeoutMs = Number(options.timeoutMs);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    const error = new Error('Scheduled job drain timeout must be a positive integer');
    error.code = 'SNEUP_SCHEDULED_JOB_DRAIN_CONFIGURATION';
    throw error;
  }

  if (activeScheduledJobs().length === 0) {
    return Promise.resolve({ drained: true, activeJobs: 0 });
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      drainWaiters.delete(check);
      callback(value);
    };
    const check = () => {
      if (activeScheduledJobs().length === 0) {
        finish(resolve, { drained: true, activeJobs: 0 });
      }
    };

    drainWaiters.add(check);
    timer = setTimeout(() => {
      const active = activeScheduledJobs();
      const error = new Error('Scheduled jobs did not finish before the shutdown deadline');
      error.code = 'SNEUP_SCHEDULED_JOB_DRAIN_TIMEOUT';
      error.activeJobs = active.reduce((total, item) => total + item.active, 0);
      error.jobNames = [...new Set(active.map(item => item.jobName))].sort();
      finish(reject, error);
    }, timeoutMs);
    check();
  });
};

module.exports = {
  activeScheduledJobs,
  cancelScheduledJob,
  observeScheduledJob,
  waitForScheduledJobs
};
