const net = require('node:net');
const { validateReleaseSecurityEnvironment, isProductionSecret } = require('./securityConfiguration');
const { getTrustedProxyIps } = require('./trustedProxyConfiguration');

const fail = message => {
  const error = new Error(message);
  error.code = 'SNEUP_CLOUD_CONFIGURATION';
  throw error;
};

const validateCloudEnvironment = (environment = process.env) => {
  const release = validateReleaseSecurityEnvironment(environment);
  if (environment.SNEUP_REQUIRE_API_KEY !== 'true' || !isProductionSecret(environment.SNEUP_API_KEY)) {
    fail('Cloud deployment requires enforced authentication and a non-placeholder 32+ character API key.');
  }
  if (release.checkedSecrets.some(name => environment[name] === environment.SNEUP_API_KEY)) {
    fail('The cloud API key must be independent of token peppers and connector secrets.');
  }
  if (String(environment.SNEUP_NGROK_ENABLED || '').toLowerCase() !== 'false') {
    fail('Hetzner deployment requires SNEUP_NGROK_ENABLED=false.');
  }
  if (environment.SNEUP_TRUST_REQUEST_HOST === 'true') fail('Cloud callbacks must not trust a request Host header.');
  let url;
  try { url = new URL(environment.SNEUP_PUBLIC_URL); } catch { fail('Cloud deployment requires an explicit public HTTPS origin.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash
    || net.isIP(url.hostname.replace(/^\[|\]$/g, '')) || !url.hostname.includes('.')
    || url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
    fail('Cloud public URL must be a root HTTPS domain without credentials, ports, paths, query parameters, or fragments.');
  }
  if (String(environment.SNEUP_ALLOWED_ORIGINS || '').trim() !== url.origin) {
    fail('Cloud CORS must allow only the exact configured public HTTPS origin.');
  }
  if (!String(environment.MONGODB_URI || '').trim()) fail('Cloud deployment requires an explicit MongoDB URI.');
  getTrustedProxyIps(environment);
  return { valid: true, provider: 'hetzner', publicOrigin: url.origin, secretsExposed: false };
};

module.exports = { validateCloudEnvironment };
