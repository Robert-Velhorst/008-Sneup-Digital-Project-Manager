const loadService = () => {
  jest.resetModules();
  const webhookApi = {
    createWebhook: jest.fn().mockResolvedValue({ id: 'webhook-created' }),
    updateWebhook: jest.fn().mockResolvedValue({ id: 'webhook-updated' }),
    deleteWebhook: jest.fn().mockResolvedValue(undefined)
  };
  jest.doMock('../src/services/trelloClient', () => ({ cardApi: {}, webhookApi }));
  return { service: require('../src/services/operationsLedgerService'), webhookApi };
};

describe('approved Trello webhook operations', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test('executes only the exact create, update, and delete payload through Trello', async () => {
    const { service, webhookApi } = loadService();
    const callbackUrl = 'https://sneup.example.com/api/webhooks/trello';

    await expect(service.performTrelloAction({
      actionType: 'trello_webhook_create',
      actionPayload: { boardTrelloId: 'board-1', callbackUrl, description: 'Sneup board webhook' }
    })).resolves.toEqual({ id: 'webhook-created' });
    await expect(service.performTrelloAction({
      actionType: 'trello_webhook_update',
      actionPayload: { boardTrelloId: 'board-1', webhookId: 'webhook-1', callbackUrl, description: 'Sneup board webhook' }
    })).resolves.toEqual({ id: 'webhook-updated' });
    await expect(service.performTrelloAction({
      actionType: 'trello_webhook_delete',
      actionPayload: { boardTrelloId: 'board-1', webhookId: 'webhook-2' }
    })).resolves.toEqual({ deleted: true, webhookId: 'webhook-2' });

    expect(webhookApi.createWebhook).toHaveBeenCalledWith(callbackUrl, 'board-1', 'Sneup board webhook');
    expect(webhookApi.updateWebhook).toHaveBeenCalledWith('webhook-1', {
      callbackURL: callbackUrl,
      description: 'Sneup board webhook'
    });
    expect(webhookApi.deleteWebhook).toHaveBeenCalledWith('webhook-2');
  });

  test('converts an ambiguous webhook mutation into reconciliation evidence', async () => {
    const { service, webhookApi } = loadService();
    webhookApi.updateWebhook.mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }));

    await expect(service.performTrelloAction({
      actionType: 'trello_webhook_update',
      actionPayload: {
        boardTrelloId: 'board-1',
        webhookId: 'webhook-1',
        callbackUrl: 'https://sneup.example.com/api/webhooks/trello',
        description: 'Sneup board webhook'
      }
    })).rejects.toMatchObject({
      code: 'SNEUP_TRELLO_WRITE_RECONCILIATION_REQUIRED',
      pendingSteps: ['webhook_updated']
    });
  });
});
