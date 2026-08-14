const {
  TRELLO_WEBHOOK_ACTIONS,
  normalizeTrelloWebhookCallbackUrl,
  webhookCallbackUrl
} = require('../src/utils/trelloWebhookConfiguration');

describe('Trello webhook configuration', () => {
  test('accepts one exact public HTTPS callback path', () => {
    expect(normalizeTrelloWebhookCallbackUrl('https://sneup.example.com/api/webhooks/trello'))
      .toBe('https://sneup.example.com/api/webhooks/trello');
    expect(webhookCallbackUrl({ callbackURL: 'https://old.example/api/webhooks/trello' }))
      .toBe('https://old.example/api/webhooks/trello');
    expect(Object.values(TRELLO_WEBHOOK_ACTIONS)).toEqual([
      'trello_webhook_create',
      'trello_webhook_update',
      'trello_webhook_delete'
    ]);
  });

  test.each([
    'http://sneup.example.com/api/webhooks/trello',
    'https://localhost/api/webhooks/trello',
    'https://127.0.0.1/api/webhooks/trello',
    'https://sneup.local/api/webhooks/trello',
    'https://user:secret@sneup.example.com/api/webhooks/trello',
    'https://sneup.example.com:8443/api/webhooks/trello',
    'https://sneup.example.com/api/webhooks/other',
    'https://sneup.example.com/api/webhooks/trello?token=secret',
    'not-a-url'
  ])('rejects unsafe callback URL %s', (value) => {
    expect(() => normalizeTrelloWebhookCallbackUrl(value)).toThrow(expect.objectContaining({
      code: 'SNEUP_TRELLO_WEBHOOK_CONFIGURATION'
    }));
  });
});
