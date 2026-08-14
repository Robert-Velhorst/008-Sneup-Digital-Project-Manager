const originalEnvironment = { ...process.env };

describe('job observability persistence safety', () => {
  afterEach(() => {
    process.env = { ...originalEnvironment };
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  test('sanitizes credential-bearing failure messages before retaining job history', async () => {
    process.env.SNEUP_DEMO_MODE = 'true';
    const jobObservabilityService = require('../src/services/jobObservabilityService');
    const run = {
      _id: 'memory-run-1',
      inMemory: true,
      jobName: 'connectors.work_signals_sync',
      startedAt: new Date()
    };

    const finished = await jobObservabilityService.finishRun(run, 'failed', {
      errorMessage: 'Provider failed https://user:pass@example.com/tasks?token=provider-token Authorization: Bearer bearer-token'
    });

    expect(finished.errorMessage).toContain('[REDACTED]');
    expect(finished.errorMessage).not.toContain('user:pass');
    expect(finished.errorMessage).not.toContain('provider-token');
    expect(finished.errorMessage).not.toContain('bearer-token');
    expect(finished.errorMessage.length).toBeLessThanOrEqual(500);
  });
});
