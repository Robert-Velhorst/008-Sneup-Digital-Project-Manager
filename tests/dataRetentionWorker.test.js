describe('data retention worker', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('processes only opted-in workspaces through distributed job observability', async () => {
    const job = { cancel: jest.fn() };
    const service = {
      listEnabledWorkspaceIds: jest.fn().mockResolvedValue(['workspace-a']),
      apply: jest.fn().mockResolvedValue({ deleted: 2 }),
      markWorkspaceProcessed: jest.fn().mockResolvedValue(true)
    };
    const jobs = {
      trackJob: jest.fn(async (options, callback) => ({ options, result: await callback() }))
    };
    jest.doMock('node-schedule', () => ({ scheduleJob: jest.fn(() => job) }));
    jest.doMock('../src/services/dataRetentionService', () => service);
    jest.doMock('../src/services/jobObservabilityService', () => jobs);
    jest.doMock('../src/utils/logger', () => ({ info: jest.fn() }));

    const worker = require('../src/workers/dataRetentionWorker');
    worker.init();
    const results = await worker.runScheduledRetention();
    worker.stop();

    expect(results).toHaveLength(1);
    expect(jobs.trackJob).toHaveBeenCalledWith(expect.objectContaining({
      jobName: 'privacy.data_retention',
      jobType: 'security',
      workspaceId: 'workspace-a'
    }), expect.any(Function));
    expect(service.apply).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'workspace-a',
      scheduled: true,
      source: 'scheduled'
    }));
    expect(service.markWorkspaceProcessed).toHaveBeenCalledWith('workspace-a');
    expect(job.cancel).toHaveBeenCalledTimes(1);
  });

  test('continues the fair batch after a workspace fails', async () => {
    const service = {
      listEnabledWorkspaceIds: jest.fn().mockResolvedValue(['workspace-a', 'workspace-b']),
      apply: jest.fn()
        .mockRejectedValueOnce(new Error('workspace-a failed'))
        .mockResolvedValueOnce({ deleted: 1 }),
      markWorkspaceProcessed: jest.fn().mockResolvedValue(true)
    };
    const jobs = {
      trackJob: jest.fn(async (_options, callback) => callback())
    };
    const logger = { info: jest.fn(), error: jest.fn() };
    jest.doMock('node-schedule', () => ({ scheduleJob: jest.fn() }));
    jest.doMock('../src/services/dataRetentionService', () => service);
    jest.doMock('../src/services/jobObservabilityService', () => jobs);
    jest.doMock('../src/utils/logger', () => logger);

    const worker = require('../src/workers/dataRetentionWorker');
    const results = await worker.runScheduledRetention();

    expect(service.apply).toHaveBeenCalledTimes(2);
    expect(service.markWorkspaceProcessed).toHaveBeenNthCalledWith(1, 'workspace-a');
    expect(service.markWorkspaceProcessed).toHaveBeenNthCalledWith(2, 'workspace-b');
    expect(results).toEqual([
      expect.objectContaining({ workspaceId: 'workspace-a', failed: true }),
      { deleted: 1 }
    ]);
    expect(logger.error).toHaveBeenCalledWith(
      'Scheduled data retention failed for workspace workspace-a:',
      expect.any(Error)
    );
  });
});
