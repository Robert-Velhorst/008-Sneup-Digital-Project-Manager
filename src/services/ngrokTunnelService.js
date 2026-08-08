const logger = require('../utils/logger');
const { isPlaceholder } = require('../utils/securityConfiguration');

const isEnabled = () => process.env.SNEUP_NGROK_ENABLED === 'true';

const normalizeUrl = (value) => String(value || '').replace(/\/$/, '');

class NgrokTunnelService {
  constructor(options = {}) {
    this.loadNgrok = options.loadNgrok || (() => require('@ngrok/ngrok'));
    this.listener = null;
    this.publicUrl = null;
  }

  validateConfiguration() {
    if (!process.env.NGROK_AUTHTOKEN || isPlaceholder(process.env.NGROK_AUTHTOKEN)) {
      throw new Error('NGROK_AUTHTOKEN is required when the Sneup ngrok tunnel is enabled.');
    }
    if (!process.env.SNEUP_API_KEY || process.env.SNEUP_API_KEY.length < 32 || isPlaceholder(process.env.SNEUP_API_KEY)) {
      throw new Error('A unique SNEUP_API_KEY of at least 32 characters is required before exposing Sneup through ngrok.');
    }
    if (process.env.SNEUP_REQUIRE_API_KEY !== 'true') {
      throw new Error('SNEUP_REQUIRE_API_KEY=true is required before exposing Sneup through ngrok.');
    }
  }

  async start(options = {}) {
    if (!isEnabled()) return null;
    if (this.listener) return this.getStatus();

    this.validateConfiguration();
    const host = options.host || process.env.HOST || '127.0.0.1';
    const port = String(options.port || process.env.PORT || 3000);
    const ngrok = this.loadNgrok();
    const forwardOptions = {
      addr: `http://${host}:${port}`,
      authtoken_from_env: true
    };
    if (process.env.SNEUP_NGROK_DOMAIN) {
      forwardOptions.domain = process.env.SNEUP_NGROK_DOMAIN;
    }

    this.listener = await ngrok.forward(forwardOptions);
    this.publicUrl = normalizeUrl(this.listener.url());
    process.env.SNEUP_PUBLIC_URL = this.publicUrl;
    if (!process.env.WEBHOOK_CALLBACK_URL) {
      process.env.WEBHOOK_CALLBACK_URL = `${this.publicUrl}/api/webhooks/trello`;
    }
    logger.info('Sneup ngrok ingress established', { publicUrl: this.publicUrl });
    return this.getStatus();
  }

  async stop() {
    if (!this.listener) return;
    const listener = this.listener;
    this.listener = null;
    this.publicUrl = null;
    if (typeof listener.close === 'function') {
      await listener.close();
    }
  }

  getStatus() {
    return {
      enabled: isEnabled(),
      connected: Boolean(this.listener),
      publicUrl: this.publicUrl
    };
  }
}

const ngrokTunnelService = new NgrokTunnelService();

module.exports = ngrokTunnelService;
module.exports.NgrokTunnelService = NgrokTunnelService;
module.exports.isEnabled = isEnabled;
