const jobLeaseService = require('../src/services/jobLeaseService');
const { JobLeaseService } = require('../src/services/jobLeaseService');
const jobObservabilityService = require('../src/services/jobObservabilityService');
const JobControlModel = require('../src/models/JobControl');
const fs = require('fs');
const path = require('path');

const WORKSPACE_ID = '507f1f77bcf86cd799439011';

describe('distributed workspace job leases', () => {
  afterEach(() => jest.restoreAllMocks());

  test('keeps lease identity private and indexes expiration by workspace', () => {
    expect(JobControlModel.schema.path('leaseToken').options.select).toBe(false);
    expect(JobControlModel.schema.path('leaseOwner').options.select).toBe(false);
    expect(JobControlModel.schema.indexes()).toEqual(expect.arrayContaining([
      [expect.objectContaining({ workspaceId: 1, leaseExpiresAt: 1 }), expect.any(Object)]
    ]));
  });

  test('atomically acquires an expiring lease and treats unique contention as busy', async () => {
    const JobControl = {
      findOneAndUpdate: jest.fn()
        .mockResolvedValueOnce({ _id: 'control-1' })
        .mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 11000 }))
    };
    const now = new Date('2026-08-09T08:00:00.000Z');
    const randomUUID = jest.fn()
      .mockReturnValueOnce('instance-1')
      .mockReturnValueOnce('lease-1')
      .mockReturnValueOnce('lease-2');
    const service = new JobLeaseService({
      JobControl,
      isDatabaseReady: () => true,
      now: () => now,
      randomUUID
    });

    const acquired = await service.acquire({
      workspaceId: WORKSPACE_ID,
      jobName: 'analytics.generate_all',
      triggerType: 'scheduled'
    });
    const contended = await service.acquire({
      workspaceId: WORKSPACE_ID,
      jobName: 'analytics.generate_all',
      triggerType: 'scheduled'
    });

    expect(acquired).toMatchObject({ acquired: true, protected: true, token: 'lease-1' });
    expect(contended).toMatchObject({ acquired: false, protected: true, token: 'lease-2' });
    expect(JobControl.findOneAndUpdate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      workspaceId: WORKSPACE_ID,
      jobName: 'analytics.generate_all',
      status: { $ne: 'paused' },
      $or: [
        { leaseExpiresAt: null },
        { leaseExpiresAt: { $lte: now } }
      ]
    }), expect.objectContaining({
      $set: expect.objectContaining({
        leaseToken: 'lease-1',
        leaseOwner: 'instance-1',
        leaseAcquiredAt: now,
        leaseExpiresAt: new Date('2026-08-09T08:05:00.000Z')
      })
    }), expect.objectContaining({ new: true, upsert: true }));
  });

  test('does not serialize webhook events and binds renew and release to the exact token', async () => {
    const JobControl = {
      findOneAndUpdate: jest.fn().mockResolvedValue({ _id: 'control-1' }),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 })
    };
    let now = new Date('2026-08-09T08:00:00.000Z');
    const service = new JobLeaseService({
      JobControl,
      isDatabaseReady: () => true,
      now: () => now,
      randomUUID: jest.fn()
        .mockReturnValueOnce('instance-1')
        .mockReturnValueOnce('lease-1')
    });

    await expect(service.acquire({
      workspaceId: WORKSPACE_ID,
      jobName: 'trello.webhook_event',
      triggerType: 'webhook'
    })).resolves.toEqual({ acquired: true, protected: false });
    expect(JobControl.findOneAndUpdate).not.toHaveBeenCalled();

    const lease = await service.acquire({
      workspaceId: WORKSPACE_ID,
      jobName: 'interventions.process_all',
      triggerType: 'worker'
    });
    now = new Date('2026-08-09T08:02:00.000Z');

    await expect(service.renew(lease)).resolves.toBe(true);
    await expect(service.release(lease)).resolves.toBe(true);
    expect(JobControl.updateOne).toHaveBeenNthCalledWith(1, {
      workspaceId: WORKSPACE_ID,
      jobName: 'interventions.process_all',
      leaseToken: 'lease-1'
    }, {
      $set: {
        leaseHeartbeatAt: now,
        leaseExpiresAt: new Date('2026-08-09T08:07:00.000Z')
      }
    });
    expect(JobControl.updateOne).toHaveBeenNthCalledWith(2, expect.objectContaining({
      leaseToken: 'lease-1'
    }), {
      $unset: expect.objectContaining({
        leaseToken: '',
        leaseOwner: '',
        leaseExpiresAt: ''
      })
    });
  });

  test('records scheduled contention without running the callback', async () => {
    jest.spyOn(jobObservabilityService, 'isJobPaused').mockResolvedValue(false);
    jest.spyOn(jobLeaseService, 'acquire').mockResolvedValue({ acquired: false, protected: true });
    const recordSkippedRun = jest.spyOn(jobObservabilityService, 'recordSkippedRun')
      .mockResolvedValue({ status: 'skipped' });
    const callback = jest.fn();

    await expect(jobObservabilityService.trackJob({
      workspaceId: WORKSPACE_ID,
      jobName: 'analytics.generate_all',
      triggerType: 'scheduled'
    }, callback)).resolves.toEqual({ skipped: true, reason: 'distributed_lease_held' });

    expect(callback).not.toHaveBeenCalled();
    expect(recordSkippedRun).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: expect.anything(),
      jobName: 'analytics.generate_all'
    }), 'Another Sneup instance already holds this workspace job lease');
  });

  test('returns a conflict for a contended manual run', async () => {
    jest.spyOn(jobObservabilityService, 'isJobPaused').mockResolvedValue(false);
    jest.spyOn(jobLeaseService, 'acquire').mockResolvedValue({ acquired: false, protected: true });
    jest.spyOn(jobObservabilityService, 'recordSkippedRun').mockResolvedValue({ status: 'skipped' });

    await expect(jobObservabilityService.trackJob({
      workspaceId: WORKSPACE_ID,
      jobName: 'analytics.generate_all',
      triggerType: 'manual'
    }, jest.fn())).rejects.toMatchObject({
      code: 'SNEUP_JOB_ALREADY_RUNNING',
      statusCode: 409
    });
  });

  test('releases the lease after a failed job and retains failed-run evidence', async () => {
    const lease = {
      acquired: true,
      protected: true,
      workspaceId: WORKSPACE_ID,
      jobName: 'analytics.generate_all',
      token: 'lease-1',
      durationMs: 300000
    };
    const run = { _id: 'run-1', startedAt: new Date() };
    jest.spyOn(jobObservabilityService, 'isJobPaused').mockResolvedValue(false);
    jest.spyOn(jobLeaseService, 'acquire').mockResolvedValue(lease);
    jest.spyOn(jobLeaseService, 'startHeartbeat').mockReturnValue({ timer: true });
    const stopHeartbeat = jest.spyOn(jobLeaseService, 'stopHeartbeat').mockReturnValue(undefined);
    const release = jest.spyOn(jobLeaseService, 'release').mockResolvedValue(true);
    jest.spyOn(jobObservabilityService, 'startRun').mockResolvedValue(run);
    const finishRun = jest.spyOn(jobObservabilityService, 'finishRun').mockResolvedValue(run);

    await expect(jobObservabilityService.trackJob({
      workspaceId: WORKSPACE_ID,
      jobName: 'analytics.generate_all',
      triggerType: 'scheduled'
    }, async () => {
      throw new Error('analysis failed');
    })).rejects.toThrow('analysis failed');

    expect(finishRun).toHaveBeenCalledWith(run, 'failed', { errorMessage: 'analysis failed' });
    expect(stopHeartbeat).toHaveBeenCalledWith({ timer: true });
    expect(release).toHaveBeenCalledWith(lease);
  });

  test('surfaces active leases as running health and counts skipped contention', () => {
    const now = new Date('2026-08-09T08:00:00.000Z');
    const dashboard = jobObservabilityService.buildDashboard([{
      _id: 'run-active',
      jobName: 'analytics.generate_all',
      jobType: 'analytics',
      triggerType: 'scheduled',
      status: 'running',
      startedAt: new Date('2026-08-09T07:59:00.000Z')
    }, {
      _id: 'run-skipped',
      jobName: 'analytics.generate_all',
      jobType: 'analytics',
      triggerType: 'scheduled',
      status: 'skipped',
      startedAt: new Date('2026-08-09T07:58:00.000Z'),
      finishedAt: new Date('2026-08-09T07:58:00.000Z'),
      metadata: { skippedReason: 'Another Sneup instance already holds this workspace job lease' }
    }], now, [{
      jobName: 'analytics.generate_all',
      status: 'active',
      leaseExpiresAt: new Date('2026-08-09T08:04:00.000Z')
    }]);

    expect(dashboard.health.find(job => job.jobName === 'analytics.generate_all')).toMatchObject({
      status: 'running',
      leaseActive: true,
      leaseExpiresAt: new Date('2026-08-09T08:04:00.000Z')
    });
    expect(dashboard.summary).toMatchObject({ activeLeases: 1, runningJobs: 1, skippedRuns: 1 });
  });

  test('wires protected and skipped lease evidence into Job Health', () => {
    const dashboardSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

    expect(dashboardSource).toContain('summary.activeLeases');
    expect(dashboardSource).toContain('summary.skippedRuns');
    expect(dashboardSource).toContain('!job.leaseActive');
    expect(dashboardSource).toContain('job.metadata?.skippedReason');
  });
});
