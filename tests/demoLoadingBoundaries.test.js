describe('demo runtime loading boundaries', () => {
  const originalDemoMode = process.env.SNEUP_DEMO_MODE;

  beforeEach(() => {
    jest.resetModules();
    process.env.SNEUP_DEMO_MODE = 'true';
    jest.doMock('mongoose', () => {
      throw new Error('MongoDB runtime should not load for the demo overview');
    });
  });

  afterEach(() => {
    jest.dontMock('mongoose');
    if (originalDemoMode === undefined) delete process.env.SNEUP_DEMO_MODE;
    else process.env.SNEUP_DEMO_MODE = originalDemoMode;
  });

  test('builds mission control, the operations brief, and job health without MongoDB', async () => {
    const autopilotService = require('../src/services/autopilotService');
    const operationsBriefService = require('../src/services/operationsBriefService');
    const jobObservabilityService = require('../src/services/jobObservabilityService');

    const [missionControl, operationsBrief, jobDashboard] = await Promise.all([
      autopilotService.getMissionControl({ workspaceId: 'demo' }),
      operationsBriefService.getDailyBrief({ workspaceId: 'demo' }),
      jobObservabilityService.getDashboard({ workspaceId: 'demo' })
    ]);

    expect(missionControl).toMatchObject({ mode: 'demo' });
    expect(operationsBrief).toMatchObject({ mode: 'demo' });
    expect(jobDashboard).toMatchObject({ mode: 'demo' });
  });
});
