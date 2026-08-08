const {
  getDuplicateReleaseSecrets,
  getMissingReleaseSecrets,
  isPlaceholder,
  isProduction
} = require('../utils/securityConfiguration');
const { getProviderWriteSafetyStatus } = require('./providerWriteSafetyService');

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

const diagnostic = (id, status, summary) => ({ id, status, summary });

const nodeMajor = (version = process.versions.node) => Number.parseInt(String(version).split('.')[0], 10);

const getRuntimeDiagnostics = ({ environment = process.env, nodeVersion = process.versions.node } = {}) => {
  const checks = [];
  const production = isProduction(environment);
  const demoMode = String(environment.SNEUP_DEMO_MODE || '').toLowerCase() === 'true';
  const liveMode = !demoMode;
  const host = String(environment.HOST || '127.0.0.1').trim().toLowerCase();
  const hasMongoUri = Boolean(String(environment.MONGODB_URI || '').trim());
  const hasTrelloKey = Boolean(String(environment.TRELLO_API_KEY || '').trim());
  const hasTrelloToken = Boolean(String(environment.TRELLO_API_TOKEN || '').trim());
  const trelloPlaceholder = isPlaceholder(environment.TRELLO_API_KEY) || isPlaceholder(environment.TRELLO_API_TOKEN);

  checks.push(nodeMajor(nodeVersion) >= 18
    ? diagnostic('node_runtime', 'ok', `Node.js ${nodeVersion} satisfies the supported runtime`)
    : diagnostic('node_runtime', 'error', `Node.js ${nodeVersion} is unsupported; Node.js 18 or newer is required`));

  checks.push(diagnostic('runtime_mode', 'ok', demoMode
    ? 'Demo mode is active and external writes remain unavailable'
    : 'Live mode is selected'));

  if (demoMode) {
    checks.push(diagnostic('database_configuration', 'ok', 'Database connectivity is optional in demo mode'));
  } else if (hasMongoUri) {
    checks.push(diagnostic('database_configuration', 'ok', 'A MongoDB URI is configured'));
  } else {
    checks.push(diagnostic('database_configuration', production ? 'error' : 'warning',
      production ? 'Live production mode requires an explicit MongoDB URI' : 'MongoDB URI is not explicit; the local default will be used'));
  }

  if (hasTrelloKey !== hasTrelloToken) {
    checks.push(diagnostic('trello_credentials', 'error', 'Trello API key and token must be configured together'));
  } else if (!hasTrelloKey) {
    checks.push(diagnostic('trello_credentials', liveMode ? 'warning' : 'ok',
      liveMode ? 'Trello is not connected; the critical path cannot sync or execute' : 'Trello is intentionally not required in demo mode'));
  } else if (trelloPlaceholder) {
    checks.push(diagnostic('trello_credentials', production ? 'error' : 'warning', 'Trello credentials still use example placeholders'));
  } else {
    checks.push(diagnostic('trello_credentials', 'ok', 'A Trello credential pair is configured'));
  }

  if (production && liveMode) {
    const missing = getMissingReleaseSecrets(environment);
    const duplicates = getDuplicateReleaseSecrets(environment);
    checks.push(missing.length === 0 && duplicates.length === 0
      ? diagnostic('production_secrets', 'ok', 'Production token and connector secrets are present and purpose-separated')
      : diagnostic('production_secrets', 'error', `${missing.length} missing or placeholder and ${duplicates.length} reused production secret group(s)`));
  } else {
    checks.push(diagnostic('production_secrets', 'ok', 'Production secret enforcement is not active for this runtime mode'));
  }

  const remotelyExposed = !LOOPBACK_HOSTS.has(host);
  const apiKeyRequired = String(environment.SNEUP_REQUIRE_API_KEY || '').toLowerCase() === 'true';
  const apiKeyConfigured = Boolean(String(environment.SNEUP_API_KEY || '').trim()) && !isPlaceholder(environment.SNEUP_API_KEY);
  checks.push(remotelyExposed && (!apiKeyRequired || !apiKeyConfigured)
    ? diagnostic('remote_api_access', 'error', 'A non-loopback host requires an enabled, non-placeholder API key')
    : diagnostic('remote_api_access', 'ok', remotelyExposed ? 'Remote API access is protected by an API key' : 'The HTTP server is bound to loopback'));

  const ngrokEnabled = String(environment.SNEUP_NGROK_ENABLED || '').toLowerCase() === 'true';
  const ngrokTokenConfigured = Boolean(String(environment.NGROK_AUTHTOKEN || '').trim()) && !isPlaceholder(environment.NGROK_AUTHTOKEN);
  const ngrokApiKeyStrong = apiKeyConfigured && String(environment.SNEUP_API_KEY).length >= 32;
  checks.push(ngrokEnabled && (!ngrokTokenConfigured || !apiKeyRequired || !ngrokApiKeyStrong)
    ? diagnostic('ngrok_ingress', 'error', 'ngrok ingress requires an auth token, enforced API authentication, and a unique API key of at least 32 characters')
    : diagnostic('ngrok_ingress', 'ok', ngrokEnabled ? 'ngrok ingress prerequisites are configured' : 'ngrok ingress is disabled'));

  const writeSafety = getProviderWriteSafetyStatus(environment);
  checks.push(diagnostic('provider_write_safety', writeSafety.enabled || demoMode ? 'ok' : 'warning',
    demoMode
      ? 'Demo mode is read-only; all provider writes are unavailable'
      : writeSafety.enabled
        ? 'Provider writes require approval and the emergency stop is inactive'
        : 'The emergency stop is active; all provider writes are blocked'));

  const counts = checks.reduce((result, check) => {
    result[check.status] += 1;
    return result;
  }, { ok: 0, warning: 0, error: 0 });

  return {
    status: counts.error > 0 ? 'error' : counts.warning > 0 ? 'warning' : 'ok',
    ready: counts.error === 0,
    liveCriticalPathReady: liveMode && counts.error === 0 && hasMongoUri && hasTrelloKey && hasTrelloToken && !trelloPlaceholder,
    mode: demoMode ? 'demo' : 'live',
    providerWrites: writeSafety,
    counts,
    checks,
    secretsExposed: false
  };
};

const getRuntimeReadiness = ({
  environment = process.env,
  databaseState = 'disconnected',
  initialized = false
} = {}) => {
  const diagnostics = getRuntimeDiagnostics({ environment });
  const demoMode = diagnostics.mode === 'demo';
  const databaseReady = databaseState === 'connected';
  const serving = initialized && (demoMode || databaseReady);
  const degraded = serving && (!diagnostics.liveCriticalPathReady || diagnostics.providerWrites.enabled === false);

  return {
    status: serving ? (degraded ? 'degraded' : 'ready') : 'not_ready',
    ready: serving,
    mode: diagnostics.mode,
    database: databaseState,
    initialized: Boolean(initialized),
    criticalPathReady: serving && diagnostics.liveCriticalPathReady,
    providerWrites: diagnostics.providerWrites,
    diagnostics: {
      status: diagnostics.status,
      errorCount: diagnostics.counts.error,
      warningCount: diagnostics.counts.warning
    },
    secretsExposed: false
  };
};

module.exports = {
  getRuntimeDiagnostics,
  getRuntimeReadiness
};
