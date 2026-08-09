const operationsLedgerService = require('../src/services/operationsLedgerService');
const { HaiIntegrationService } = require('../src/services/haiIntegrationService');

describe('HAI integration boundary', () => {
  const originalDemoMode = process.env.SNEUP_DEMO_MODE;

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalDemoMode === undefined) delete process.env.SNEUP_DEMO_MODE;
    else process.env.SNEUP_DEMO_MODE = originalDemoMode;
  });

  test('publishes read and proposal capabilities without approval or execution operations', () => {
    const service = new HaiIntegrationService();
    const manifest = service.getManifest('https://sneup.example');
    const spec = service.getOpenApi('https://sneup.example');

    expect(manifest.safety).toEqual(expect.objectContaining({
      providerWrites: 'never_direct',
      proposalsRequireHumanApproval: true,
      approvalEndpointExposed: false,
      executionEndpointExposed: false
    }));
    expect(manifest.capabilities.map(item => item.permission)).toEqual([
      'integrations:hai:read',
      'integrations:hai:propose'
    ]);
    expect(Object.keys(spec.paths)).toEqual([
      '/api/integrations/hai/snapshot',
      '/api/integrations/hai/proposals'
    ]);
    expect(JSON.stringify(spec)).not.toMatch(/approve|execute-approved/i);
  });

  test('normalizes HAI input, strips unapproved payload fields, and hashes external ids', () => {
    const service = new HaiIntegrationService();
    const command = service.normalizeProposal({
      externalId: 'hai-record-123',
      type: 'delete_card',
      title: 'Review sensitive card',
      reason: 'HAI detected a project risk.',
      severity: 'critical',
      payload: {
        cardId: '507f1f77bcf86cd799439011',
        commentText: 'Post this without approval',
        executable: true,
        approved: true
      }
    });

    expect(command).toMatchObject({
      id: expect.stringMatching(/^hai-[a-f0-9]{24}$/),
      type: 'hai_proposal',
      automatable: false,
      severity: 'critical',
      payload: {
        cardId: '507f1f77bcf86cd799439011',
        integration: 'hai',
        externalIdHash: expect.stringMatching(/^[a-f0-9]{24}$/)
      }
    });
    expect(command.payload).not.toHaveProperty('commentText');
    expect(command.payload).not.toHaveProperty('executable');
    expect(command.payload).not.toHaveProperty('approved');
  });

  test('queues HAI work through the existing recommendation ledger', async () => {
    const service = new HaiIntegrationService();
    jest.spyOn(operationsLedgerService, 'createRecommendationFromAutopilotCommand').mockResolvedValue({
      created: true,
      recommendation: { id: 'recommendation-1', status: 'pending', requiresApproval: true },
      decisionQueueItem: { id: 'decision-1', status: 'open' }
    });

    const result = await service.createProposal({
      externalId: 'hai-record-123',
      type: 'request_update',
      title: 'Request card update',
      reason: 'No activity for five days.'
    }, { workspaceId: '507f1f77bcf86cd799439011', actor: 'HAI service' });

    expect(result.created).toBe(true);
    expect(operationsLedgerService.createRecommendationFromAutopilotCommand).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'request_update', automatable: false }),
      { workspaceId: '507f1f77bcf86cd799439011', actor: 'HAI service' }
    );
  });

  test('publishes stable identifiers from populated demo snapshot records', async () => {
    process.env.SNEUP_DEMO_MODE = 'true';
    const service = new HaiIntegrationService();

    const snapshot = await service.getSnapshot();

    expect(snapshot.demoMode).toBe(true);
    expect(snapshot.decisions[0]).toEqual(expect.objectContaining({
      id: 'demo-decision-recovery',
      boardId: 'demo-board-growth',
      cardId: 'demo-card-growth-recovery'
    }));
    expect(JSON.stringify(snapshot)).not.toContain('[object Object]');
  });
});
