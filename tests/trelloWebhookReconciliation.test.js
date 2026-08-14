const loadService = ({ callbackUrl, boards = [], webhooks = [] } = {}) => {
  jest.resetModules();
  process.env.WEBHOOK_CALLBACK_URL = callbackUrl || '';
  const queueTrelloWebhookRecommendation = jest.fn()
    .mockImplementation(async spec => ({ recommendation: { _id: `recommendation-${spec.actionType}` }, created: true }));
  const trackJob = jest.fn(async (_options, callback) => callback());
  const trelloClient = {
    initTrelloClient: jest.fn(),
    webhookApi: {
      getWebhooks: jest.fn().mockResolvedValue(webhooks),
      createWebhook: jest.fn(),
      updateWebhook: jest.fn(),
      deleteWebhook: jest.fn()
    }
  };

  jest.doMock('../src/services/trelloClient', () => trelloClient);
  jest.doMock('../src/models/Board', () => ({ find: jest.fn().mockResolvedValue(boards) }));
  jest.doMock('../src/models/List', () => ({}));
  jest.doMock('../src/models/Card', () => ({}));
  jest.doMock('../src/models/Member', () => ({}));
  jest.doMock('../src/models/Comment', () => ({}));
  jest.doMock('../src/services/operationsLedgerService', () => ({ queueTrelloWebhookRecommendation }));
  jest.doMock('../src/services/jobObservabilityService', () => ({ trackJob }));
  jest.doMock('../src/services/workspaceScopeService', () => ({
    getDefaultWorkspaceObjectId: () => 'workspace-1',
    normalizeWorkspaceObjectId: value => value
  }));

  return {
    service: require('../src/services/trelloSync'),
    queueTrelloWebhookRecommendation,
    trackJob,
    trelloClient
  };
};

describe('approval-gated Trello webhook reconciliation', () => {
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
    jest.resetModules();
  });

  test('skips all provider reads when no callback is configured', async () => {
    const harness = loadService();
    await expect(harness.service.reconcileTrelloWebhooks('workspace-1')).resolves.toMatchObject({
      skipped: true,
      providerWrites: false
    });
    expect(harness.trackJob).not.toHaveBeenCalled();
    expect(harness.trelloClient.webhookApi.getWebhooks).not.toHaveBeenCalled();
  });

  test('queues exact create, stale update, and duplicate delete decisions without provider writes', async () => {
    const callbackUrl = 'https://sneup.example.com/api/webhooks/trello';
    const boards = [
      { _id: 'board-1', trelloId: 'trello-board-1' },
      { _id: 'board-2', trelloId: 'trello-board-2' },
      { _id: 'board-3', trelloId: 'trello-board-3' }
    ];
    const harness = loadService({
      callbackUrl,
      boards,
      webhooks: [
        { id: 'webhook-20', idModel: 'trello-board-2', callbackURL: 'https://old.example/api/webhooks/trello' },
        { id: 'webhook-21', idModel: 'trello-board-2', callbackURL: 'https://duplicate.example/api/webhooks/trello' },
        { id: 'webhook-30', idModel: 'trello-board-3', callbackURL: callbackUrl },
        { id: 'webhook-31', idModel: 'trello-board-3', callbackURL: 'https://old.example/api/webhooks/trello' }
      ]
    });

    await expect(harness.service.reconcileTrelloWebhooks('workspace-1')).resolves.toMatchObject({
      processedCount: 3,
      successCount: 3,
      providerWrites: false,
      metadata: { queuedRecommendations: 4 }
    });
    expect(harness.queueTrelloWebhookRecommendation.mock.calls.map(([spec]) => ({
      boardId: spec.boardId,
      actionType: spec.actionType,
      webhookId: spec.webhookId
    }))).toEqual([
      { boardId: 'board-1', actionType: 'trello_webhook_create', webhookId: undefined },
      { boardId: 'board-2', actionType: 'trello_webhook_update', webhookId: 'webhook-20' },
      { boardId: 'board-2', actionType: 'trello_webhook_delete', webhookId: 'webhook-21' },
      { boardId: 'board-3', actionType: 'trello_webhook_delete', webhookId: 'webhook-31' }
    ]);
    expect(harness.trelloClient.webhookApi.createWebhook).not.toHaveBeenCalled();
    expect(harness.trelloClient.webhookApi.updateWebhook).not.toHaveBeenCalled();
    expect(harness.trelloClient.webhookApi.deleteWebhook).not.toHaveBeenCalled();
  });

  test('rejects an unsafe callback before reading provider state', async () => {
    const harness = loadService({
      callbackUrl: 'http://127.0.0.1/api/webhooks/trello',
      boards: [{ _id: 'board-1', trelloId: 'trello-board-1' }]
    });
    await expect(harness.service.reconcileTrelloWebhooks('workspace-1')).rejects.toMatchObject({
      code: 'SNEUP_TRELLO_WEBHOOK_CONFIGURATION'
    });
    expect(harness.trelloClient.webhookApi.getWebhooks).not.toHaveBeenCalled();
    expect(harness.queueTrelloWebhookRecommendation).not.toHaveBeenCalled();
  });
});
