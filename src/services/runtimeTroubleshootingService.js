const { getRuntimeDiagnostics } = require('./runtimeDiagnosticsService');

const CHECK_GUIDANCE = Object.freeze({
  node_runtime: {
    title: 'Application runtime',
    action: 'Install Node.js 22 or newer for a server deployment, or reinstall the current Sneup desktop release.'
  },
  runtime_mode: {
    title: 'Workspace mode',
    action: 'Choose demo for read-only evaluation or live after the database and Trello connection are ready.'
  },
  database_configuration: {
    title: 'Database',
    action: 'Configure MONGODB_URI in the protected runtime environment, then restart Sneup in live mode.'
  },
  trello_credentials: {
    title: 'Trello connection',
    action: 'Configure the Trello API key and token together in the protected runtime environment, then restart Sneup.'
  },
  production_secrets: {
    title: 'Production secrets',
    action: 'Configure five distinct 32-character-or-longer token and connector secrets before a live production start.'
  },
  remote_api_access: {
    title: 'Remote API protection',
    action: 'Keep the server on loopback, or require API authentication with a unique non-placeholder key.'
  },
  ngrok_ingress: {
    title: 'Cloud tunnel',
    action: 'Configure the ngrok token, require API authentication, and use a unique API key of at least 32 characters.'
  },
  provider_write_safety: {
    title: 'Provider-write safety',
    action: 'Review the emergency stop and approval policy before allowing any approved Trello action to execute.'
  }
});

const guidanceFor = (check) => CHECK_GUIDANCE[check.id] || {
  title: check.id.replaceAll('_', ' '),
  action: 'Review this runtime check before continuing.'
};

const getRuntimeTroubleshooting = (options = {}) => {
  const diagnostics = getRuntimeDiagnostics(options);
  const checks = diagnostics.checks.map((check) => {
    const guidance = guidanceFor(check);
    return {
      id: check.id,
      title: guidance.title,
      status: check.status,
      summary: check.summary,
      action: check.status === 'ok' ? null : guidance.action
    };
  });
  const next = checks.find(check => check.status === 'error')
    || checks.find(check => check.status === 'warning');

  return {
    status: diagnostics.status,
    ready: diagnostics.ready,
    liveCriticalPathReady: diagnostics.liveCriticalPathReady,
    mode: diagnostics.mode,
    counts: diagnostics.counts,
    checks,
    nextAction: next ? { checkId: next.id, title: next.title, action: next.action } : null,
    providerWrites: diagnostics.providerWrites,
    secretsExposed: false
  };
};

module.exports = {
  CHECK_GUIDANCE,
  getRuntimeTroubleshooting
};
