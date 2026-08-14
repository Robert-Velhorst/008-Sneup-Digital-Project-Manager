describe('workspace deletion worker drain', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('shares an active maintenance pass and waits for it during stop', async () => {
    let finishRecovery;
    const recovery = new Promise(resolve => { finishRecovery = resolve; });
    const service = {
      recoverInterruptedDeletions: jest.fn(() => recovery),
      runDueCleanupPasses: jest.fn().mockResolvedValue(2)
    };
    jest.doMock('../src/services/workspaceDeletionService', () => service);
    jest.doMock('../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));
    const worker = require('../src/workers/workspaceDeletionWorker');

    const first = worker.run();
    expect(worker.run()).toBe(first);
    const stop = worker.stop();
    let stopped = false;
    void stop.then(() => { stopped = true; });
    await Promise.resolve();
    expect(stopped).toBe(false);

    finishRecovery(1);
    await expect(stop).resolves.toBeUndefined();
    expect(service.recoverInterruptedDeletions).toHaveBeenCalledTimes(1);
    expect(service.runDueCleanupPasses).toHaveBeenCalledTimes(1);
  });
});
