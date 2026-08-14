describe('runtime scheduler lifecycle', () => {
  afterEach(() => {
    jest.dontMock('node-schedule');
    jest.resetModules();
    jest.clearAllMocks();
  });

  const mockScheduler = () => {
    const jobs = [];
    const scheduleJob = jest.fn(() => {
      const job = { cancel: jest.fn() };
      jobs.push(job);
      return job;
    });
    jest.doMock('node-schedule', () => ({ scheduleJob }));
    return { jobs, scheduleJob };
  };

  test('analytics initialization is idempotent and can restart after stop', () => {
    const { jobs, scheduleJob } = mockScheduler();
    const analyticsService = require('../src/services/analyticsService');

    const first = analyticsService.initAnalytics();
    expect(analyticsService.initAnalytics()).toBe(first);
    expect(scheduleJob).toHaveBeenCalledTimes(1);

    analyticsService.stopAnalytics();
    analyticsService.stopAnalytics();
    expect(jobs[0].cancel).toHaveBeenCalledTimes(1);

    expect(analyticsService.initAnalytics()).not.toBe(first);
    expect(scheduleJob).toHaveBeenCalledTimes(2);
    analyticsService.stopAnalytics();
    expect(jobs[1].cancel).toHaveBeenCalledTimes(1);
  });

  test('Trello synchronization owns and resets both recurring schedules', () => {
    const { jobs, scheduleJob } = mockScheduler();
    const trelloSync = require('../src/services/trelloSync');

    trelloSync.scheduleSync('workspace-1');
    trelloSync.scheduleSync('workspace-1');
    expect(scheduleJob).toHaveBeenCalledTimes(2);

    trelloSync.stopSync();
    expect(jobs.slice(0, 2).every(job => job.cancel.mock.calls.length === 1)).toBe(true);

    trelloSync.scheduleSync('workspace-1');
    expect(scheduleJob).toHaveBeenCalledTimes(4);
    trelloSync.stopSync();
    expect(jobs.slice(2).every(job => job.cancel.mock.calls.length === 1)).toBe(true);
  });

  test.each([
    ['intervention', '../src/workers/interventionWorker', 5],
    ['performance', '../src/workers/performanceWorker', 3],
    ['notification', '../src/workers/notificationWorker', 3]
  ])('%s worker does not duplicate jobs and clears them on stop', (_name, modulePath, expectedJobs) => {
    const { jobs, scheduleJob } = mockScheduler();
    const worker = require(modulePath);

    worker.init();
    worker.init();
    expect(scheduleJob).toHaveBeenCalledTimes(expectedJobs);

    worker.stop();
    expect(jobs.every(job => job.cancel.mock.calls.length === 1)).toBe(true);

    worker.init();
    expect(scheduleJob).toHaveBeenCalledTimes(expectedJobs * 2);
    worker.stop();
    expect(jobs.every(job => job.cancel.mock.calls.length === 1)).toBe(true);
  });

  test('invalid schedules fail startup after cancelling any jobs already created', () => {
    const firstJob = { cancel: jest.fn() };
    const scheduleJob = jest.fn()
      .mockReturnValueOnce(firstJob)
      .mockReturnValueOnce(null);
    jest.doMock('node-schedule', () => ({ scheduleJob }));
    const trelloSync = require('../src/services/trelloSync');

    expect(() => trelloSync.scheduleSync('workspace-1')).toThrow(expect.objectContaining({
      code: 'SNEUP_TRELLO_SCHEDULE_INVALID'
    }));
    expect(firstJob.cancel).toHaveBeenCalledTimes(1);
  });

  test('scheduled callback failures are observed without becoming uncaught EventEmitter errors', () => {
    const { EventEmitter } = require('events');
    const { observeScheduledJob } = require('../src/utils/scheduledJob');
    const job = new EventEmitter();
    const logger = { error: jest.fn() };
    const failure = Object.assign(new Error('private provider failure'), { code: 'PROVIDER_UNAVAILABLE' });

    observeScheduledJob(job, { logger, jobName: 'connectors.work_signals_sync' });

    expect(() => job.emit('error', failure)).not.toThrow();
    expect(logger.error).toHaveBeenCalledWith('Scheduled job execution failed', {
      jobName: 'connectors.work_signals_sync',
      code: 'PROVIDER_UNAVAILABLE'
    });
    expect(logger.error.mock.calls.flat().join(' ')).not.toContain(failure.message);
  });
});
