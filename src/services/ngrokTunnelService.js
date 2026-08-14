const logger = require('../utils/logger');
const { isPlaceholder } = require('../utils/securityConfiguration');

const isEnabled = () => String(process.env.SNEUP_NGROK_ENABLED || '').toLowerCase() === 'true';

const configurationError = (message) => Object.assign(new Error(message), {
  code: 'SNEUP_NGROK_CONFIGURATION'
});

const normalizeTunnelUrl = (value) => {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch {
    throw configurationError('ngrok returned an invalid public URL. The tunnel was closed.');
  }

  if (
    url.protocol !== 'https:'
    || url.username
    || url.password
    || url.port
    || url.pathname !== '/'
    || url.search
    || url.hash
  ) {
    throw configurationError('ngrok must return a root HTTPS origin without credentials, a custom port, query parameters, or a fragment. The tunnel was closed.');
  }

  return url.origin;
};

const captureEnvironmentValue = (name) => ({
  present: Object.prototype.hasOwnProperty.call(process.env, name),
  value: process.env[name]
});

const restoreEnvironmentValue = (name, snapshot) => {
  if (snapshot.present) process.env[name] = snapshot.value;
  else delete process.env[name];
};

class NgrokTunnelService {
  constructor(options = {}) {
    this.loadNgrok = options.loadNgrok || (() => require('@ngrok/ngrok'));
    this.listener = null;
    this.publicUrl = null;
    this.startPromise = null;
    this.managedEnvironment = null;
  }

  validateConfiguration() {
    const authToken = String(process.env.NGROK_AUTHTOKEN || '').trim();
    const apiKey = String(process.env.SNEUP_API_KEY || '').trim();
    if (!authToken || isPlaceholder(authToken)) {
      throw new Error('NGROK_AUTHTOKEN is required when the Sneup ngrok tunnel is enabled.');
    }
    if (!apiKey || apiKey.length < 32 || isPlaceholder(apiKey)) {
      throw new Error('A unique SNEUP_API_KEY of at least 32 characters is required before exposing Sneup through ngrok.');
    }
    if (process.env.SNEUP_REQUIRE_API_KEY !== 'true') {
      throw new Error('SNEUP_REQUIRE_API_KEY=true is required before exposing Sneup through ngrok.');
    }
  }

  async start(options = {}) {
    if (!isEnabled()) return null;
    if (this.listener) return this.getStatus();
    if (this.startPromise) return this.startPromise;

    this.startPromise = this.startTunnel(options);
    try {
      return await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  async startTunnel(options = {}) {
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

    const listener = await ngrok.forward(forwardOptions);
    let publicUrl;
    try {
      publicUrl = normalizeTunnelUrl(listener?.url?.());
    } catch (error) {
      try {
        if (typeof listener?.close === 'function') await listener.close();
      } catch {
        error.tunnelCloseFailed = true;
      }
      throw error;
    }

    const callbackUrl = `${publicUrl}/api/webhooks/trello`;
    const publicUrlSnapshot = captureEnvironmentValue('SNEUP_PUBLIC_URL');
    const callbackUrlSnapshot = captureEnvironmentValue('WEBHOOK_CALLBACK_URL');
    const managesCallbackUrl = !String(callbackUrlSnapshot.value || '').trim();

    this.listener = listener;
    this.publicUrl = publicUrl;
    this.managedEnvironment = {
      publicUrl: { assigned: publicUrl, snapshot: publicUrlSnapshot },
      callbackUrl: managesCallbackUrl
        ? { assigned: callbackUrl, snapshot: callbackUrlSnapshot }
        : null
    };
    process.env.SNEUP_PUBLIC_URL = this.publicUrl;
    if (managesCallbackUrl) {
      process.env.WEBHOOK_CALLBACK_URL = callbackUrl;
    }
    logger.info('Sneup ngrok ingress established', { publicUrl: this.publicUrl });
    return this.getStatus();
  }

  async stop() {
    if (this.startPromise && !this.listener) {
      try {
        await this.startPromise;
      } catch {
        return;
      }
    }
    if (!this.listener) return;
    const listener = this.listener;
    const managedEnvironment = this.managedEnvironment;
    this.listener = null;
    this.publicUrl = null;
    this.managedEnvironment = null;
    try {
      if (typeof listener.close === 'function') {
        await listener.close();
      }
    } finally {
      if (managedEnvironment?.publicUrl
        && process.env.SNEUP_PUBLIC_URL === managedEnvironment.publicUrl.assigned) {
        restoreEnvironmentValue('SNEUP_PUBLIC_URL', managedEnvironment.publicUrl.snapshot);
      }
      if (managedEnvironment?.callbackUrl
        && process.env.WEBHOOK_CALLBACK_URL === managedEnvironment.callbackUrl.assigned) {
        restoreEnvironmentValue('WEBHOOK_CALLBACK_URL', managedEnvironment.callbackUrl.snapshot);
      }
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
module.exports.normalizeTunnelUrl = normalizeTunnelUrl;
