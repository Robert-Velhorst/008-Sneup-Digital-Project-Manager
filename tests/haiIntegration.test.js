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
    expect(manifest.capabilities.map(item => item.path)).toEqual([
      'https://sneup.example/api/v1/integrations/hai/snapshot',
      'https://sneup.example/api/v1/integrations/hai/proposals'
    ]);
    expect(manifest.openapi).toBe('https://sneup.example/api/v1/integrations/hai/openapi.json');
    expect(Object.keys(spec.paths)).toEqual([
      '/api/v1/integrations/hai/snapshot',
      '/api/v1/integrations/hai/proposals'
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

  test.each(['raw', 'populated', 'hydrated'])('preserves BSON identifiers in %s live snapshot records', async (shape) => {
    process.env.SNEUP_DEMO_MODE = 'false';
    const { Types } = require('mongoose');
    const id = new Types.ObjectId();
    const boardId = new Types.ObjectId();
    const cardId = new Types.ObjectId();
    const record = {
      _id: id,
      boardId: shape === 'populated' ? { _id: boardId, name: 'Private board metadata' } : boardId,
      cardId: shape === 'populated' ? { _id: cardId, description: 'Private card metadata' } : cardId,
      status: 'failed',
      title: 'Review work'
    };
    if (shape === 'hydrated') {
      const Board = require('../src/models/Board');
      const Card = require('../src/models/Card');
      record.boardId = new Board({ _id: boardId, name: 'Private board metadata' });
      record.cardId = new Card({ _id: cardId, description: 'Private card metadata' });
    }
    jest.spyOn(operationsLedgerService, 'getWorkspaceLedger').mockResolvedValue({
      decisions: [record], recommendations: [record], actions: [record],
      followUps: [record], findings: [record], healthSnapshots: [record]
    });

    const snapshot = await new HaiIntegrationService().getSnapshot();
    for (const section of ['decisions', 'recommendations', 'failedActions', 'dueFollowUps', 'findings', 'boardHealth']) {
      expect(snapshot[section][0]).toMatchObject({
        id: id.toHexString(), boardId: boardId.toHexString(), cardId: cardId.toHexString()
      });
    }
    expect(JSON.stringify(snapshot)).not.toMatch(/Private board metadata|Private card metadata|\[object Object\]/);
  });

  test('does not stringify arbitrary populated objects into public identifiers', async () => {
    process.env.SNEUP_DEMO_MODE = 'false';
    const toString = jest.fn(() => 'private nested metadata');
    jest.spyOn(operationsLedgerService, 'getWorkspaceLedger').mockResolvedValue({
      decisions: [{ _id: { toString }, boardId: { _id: { toString } }, cardId: { id: { toString } } }]
    });
    const snapshot = await new HaiIntegrationService().getSnapshot();
    expect(snapshot.decisions[0]).toMatchObject({ id: '', boardId: null, cardId: null });
    expect(toString).not.toHaveBeenCalled();
    expect(JSON.stringify(snapshot)).not.toContain('private nested metadata');
  });
});
