describe('Trello client resource and partial-write safety', () => {
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
    jest.dontMock('trello.js');
    jest.resetModules();
  });

  test('applies the bounded Trello timeout and transport limits to every request', () => {
    const { buildTrelloClientOptions } = require('../src/utils/trelloConfiguration');

    expect(buildTrelloClientOptions({
      TRELLO_API_KEY: 'key',
      TRELLO_API_TOKEN: 'token',
      SNEUP_TRELLO_TIMEOUT_MS: '23000'
    })).toEqual({
      key: 'key',
      token: 'token',
      baseRequestConfig: {
        timeout: 23000,
        maxContentLength: 16 * 1024 * 1024,
        maxBodyLength: 256 * 1024,
        maxRedirects: 0
      }
    });
  });

  test('passes the bounded transport configuration into the live Trello client', () => {
    jest.resetModules();
    const TrelloClient = jest.fn(() => ({}));
    jest.doMock('trello.js', () => ({ TrelloClient }));
    process.env.TRELLO_API_KEY = 'key';
    process.env.TRELLO_API_TOKEN = 'token';
    process.env.SNEUP_TRELLO_TIMEOUT_MS = '17000';

    const { initTrelloClient } = require('../src/services/trelloClient');
    initTrelloClient();

    expect(TrelloClient).toHaveBeenCalledWith(expect.objectContaining({
      key: 'key',
      token: 'token',
      baseRequestConfig: expect.objectContaining({ timeout: 17000, maxRedirects: 0 })
    }));
  });

  test.each(['999', '60001', 'not-a-number', '1200.5'])(
    'rejects unsafe or invalid Trello timeout %s',
    (timeout) => {
      const { buildTrelloClientOptions } = require('../src/utils/trelloConfiguration');
      expect(() => buildTrelloClientOptions({
        TRELLO_API_KEY: 'key',
        TRELLO_API_TOKEN: 'token',
        SNEUP_TRELLO_TIMEOUT_MS: timeout
      })).toThrow(expect.objectContaining({ code: 'SNEUP_TRELLO_CONFIGURATION' }));
    }
  );

  test('records bounded step evidence when checklist item creation is only partially confirmed', async () => {
    const createCardChecklist = jest.fn().mockResolvedValue({ id: 'checklist-1' });
    const createChecklistCheckItems = jest.fn()
      .mockResolvedValueOnce({ id: 'item-1' })
      .mockRejectedValueOnce(Object.assign(new Error('Provider unavailable'), { response: { status: 503 } }));
    const TrelloClient = jest.fn(() => ({
      cards: { createCardChecklist },
      checklists: { createChecklistCheckItems }
    }));
    jest.doMock('trello.js', () => ({ TrelloClient }));
    process.env.TRELLO_API_KEY = 'key';
    process.env.TRELLO_API_TOKEN = 'token';

    const { cardApi } = require('../src/services/trelloClient');
    await expect(cardApi.addChecklist('card-1', 'Launch', ['Review', 'Publish']))
      .rejects.toMatchObject({
        code: 'SNEUP_TRELLO_WRITE_RECONCILIATION_REQUIRED',
        requiresReconciliation: true,
        confirmedSteps: ['checklist_created', 'checklist_item_1_created'],
        pendingSteps: ['checklist_item_2_created']
      });
  });

  test('blocks every low-level Trello mutator while the provider emergency stop is active', async () => {
    const TrelloClient = jest.fn(() => ({}));
    jest.doMock('trello.js', () => ({ TrelloClient }));
    process.env.TRELLO_API_KEY = 'key';
    process.env.TRELLO_API_TOKEN = 'token';
    process.env.SNEUP_PROVIDER_WRITES_DISABLED = 'true';
    const { cardApi, webhookApi } = require('../src/services/trelloClient');
    const operations = [
      () => cardApi.addComment('card-1', 'Comment'),
      () => cardApi.updateCard('card-1', { due: new Date().toISOString() }),
      () => cardApi.moveCard('card-1', 'list-1'),
      () => cardApi.addMember('card-1', 'member-1'),
      () => cardApi.removeMember('card-1', 'member-1'),
      () => cardApi.addLabel('card-1', 'Risk'),
      () => cardApi.addChecklist('card-1', 'Next', ['Review']),
      () => webhookApi.createWebhook('https://sneup.example/api/webhooks/trello', 'board-1'),
      () => webhookApi.updateWebhook('webhook-1', { callbackURL: 'https://sneup.example/api/webhooks/trello' }),
      () => webhookApi.deleteWebhook('webhook-1')
    ];

    for (const operation of operations) {
      await expect(operation()).rejects.toMatchObject({ code: 'SNEUP_PROVIDER_WRITES_DISABLED' });
    }
    expect(TrelloClient).not.toHaveBeenCalled();
  });
});
