const net = require('node:net');

const TRELLO_WEBHOOK_ACTIONS = Object.freeze({
  CREATE: 'trello_webhook_create',
  UPDATE: 'trello_webhook_update',
  DELETE: 'trello_webhook_delete'
});

const isPrivateIpv4 = (hostname) => {
  if (net.isIP(hostname) !== 4) return false;
  const [a, b] = hostname.split('.').map(Number);
  return a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168);
};

const configurationError = (message) => Object.assign(new Error(message), {
  code: 'SNEUP_TRELLO_WEBHOOK_CONFIGURATION',
  statusCode: 500
});

const normalizeTrelloWebhookCallbackUrl = (value) => {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch {
    throw configurationError('WEBHOOK_CALLBACK_URL must be a valid public HTTPS Trello callback URL.');
  }

  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:'
    || url.username
    || url.password
    || url.port
    || url.pathname !== '/api/webhooks/trello'
    || url.search
    || url.hash
    || !hostname
    || hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || net.isIP(hostname) === 6
    || isPrivateIpv4(hostname)
  ) {
    throw configurationError('WEBHOOK_CALLBACK_URL must be a public HTTPS origin plus /api/webhooks/trello, without credentials, a custom port, query, or fragment.');
  }

  return url.toString();
};

const webhookCallbackUrl = (webhook = {}) => String(
  webhook.callbackURL || webhook.callbackUrl || webhook.callback_url || ''
).trim();

module.exports = {
  TRELLO_WEBHOOK_ACTIONS,
  normalizeTrelloWebhookCallbackUrl,
  webhookCallbackUrl
};
