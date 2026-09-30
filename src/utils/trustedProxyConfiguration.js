const net = require('node:net');
const { isProductionSecret } = require('./securityConfiguration');

const getTrustedProxyIps = (environment = process.env) => {
  const value = String(environment.SNEUP_TRUSTED_PROXY_IPS || '').trim();
  if (!value) return [];
  const ips = [...new Set(value.split(',').map(ip => ip.trim()))];
  if (ips.length > 16 || ips.some(ip => !net.isIP(ip))) {
    const error = new Error('Trusted proxies must be an explicit list of at most 16 IP addresses; wildcard and hop-count trust are not supported.');
    error.code = 'SNEUP_TRUSTED_PROXY_CONFIGURATION';
    throw error;
  }
  if (environment.SNEUP_REQUIRE_API_KEY !== 'true' || !isProductionSecret(environment.SNEUP_API_KEY)) {
    const error = new Error('Trusted proxies require enforced API authentication and a non-placeholder 32+ character API key.');
    error.code = 'SNEUP_TRUSTED_PROXY_AUTHENTICATION';
    throw error;
  }
  return ips;
};

module.exports = { getTrustedProxyIps };
