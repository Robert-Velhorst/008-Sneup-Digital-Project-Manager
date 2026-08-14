const { EventEmitter } = require('events');

const createJob = () => {
  const job = new EventEmitter();
  job.cancel = jest.fn(() => true);
  return job;
};

describe('scheduled job drain', () => {
  test('cancellation waits for an invocation that is already running', async () => {
    const {
      activeScheduledJobs,
      cancelScheduledJob,
      observeScheduledJob,
      waitForScheduledJobs
    } = require('../src/utils/scheduledJob');
    const job = createJob();

    observeScheduledJob(job, { jobName: 'analytics.generate_all' });
    job.emit('run');
    cancelScheduledJob(job);

    expect(activeScheduledJobs()).toEqual([{ jobName: 'analytics.generate_all', active: 1 }]);
    const drain = waitForScheduledJobs({ timeoutMs: 1000 });
    let drained = false;
    void drain.then(() => { drained = true; });
    await Promise.resolve();
    expect(drained).toBe(false);

    job.emit('success', { processedCount: 1 });
    await expect(drain).resolves.toEqual({ drained: true, activeJobs: 0 });
    expect(activeScheduledJobs()).toEqual([]);
    expect(job.cancel).toHaveBeenCalledTimes(1);
  });

  test('a stuck invocation fails with bounded non-secret job metadata', async () => {
    const {
      activeScheduledJobs,
      cancelScheduledJob,
      observeScheduledJob,
      waitForScheduledJobs
    } = require('../src/utils/scheduledJob');
    const job = createJob();
    const logger = { error: jest.fn() };

    observeScheduledJob(job, { logger, jobName: 'connectors.work_signals_sync' });
    job.emit('run');
    cancelScheduledJob(job);

    await expect(waitForScheduledJobs({ timeoutMs: 20 })).rejects.toMatchObject({
      code: 'SNEUP_SCHEDULED_JOB_DRAIN_TIMEOUT',
      activeJobs: 1,
      jobNames: ['connectors.work_signals_sync']
    });

    job.emit('error', Object.assign(new Error('private provider token=secret'), { code: 'PROVIDER_TIMEOUT' }));
    expect(logger.error).toHaveBeenCalledWith('Scheduled job execution failed', {
      jobName: 'connectors.work_signals_sync',
      code: 'PROVIDER_TIMEOUT'
    });
    expect(activeScheduledJobs()).toEqual([]);
  });
});
