const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const project = `sneup-cloud-verification-${crypto.randomBytes(8).toString('hex')}`;
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'sneup-cloud-verification-'));
const envFile = path.join(temporary, '.env');
const configFile = path.join(temporary, 'compose.json');
const environment = {
  SNEUP_DOMAIN: 'sneup.verify.invalid', SNEUP_IMAGE_TAG: 'hetzner-verification',
  SNEUP_PROXY_SUBNET: '10.255.108.0/24', SNEUP_PROXY_IP: '10.255.108.2',
  SNEUP_DATA_SUBNET: '10.255.109.0/24',
  TRELLO_API_KEY: '', TRELLO_API_TOKEN: '', TRELLO_WEBHOOK_SECRET: '', SNEUP_PROVIDER_WRITES_DISABLED: 'true'
};
for (const name of ['SNEUP_API_KEY', 'SNEUP_API_TOKEN_PEPPER', 'SNEUP_SESSION_TOKEN_PEPPER',
  'SNEUP_INVITE_TOKEN_PEPPER', 'CONNECTOR_ENCRYPTION_KEY', 'CONNECTOR_STATE_SECRET',
  'SNEUP_MONGO_ROOT_PASSWORD', 'SNEUP_MONGO_PASSWORD']) {
  environment[name] = crypto.randomBytes(32).toString('hex');
}
fs.writeFileSync(envFile, Object.entries(environment).map(([key, value]) => `${key}=${value}`).join('\n'), { mode: 0o600 });
let compose = ['compose', '--project-name', project, '--env-file', envFile, '-f', path.join(root, 'deploy/hetzner/compose.yaml')];
const redact = value => {
  let detail = String(value);
  for (const secret of Object.values(environment).filter(value => value.length >= 32)) {
    detail = detail.split(secret).join('[REDACTED]');
  }
  return detail.replace(/[a-f0-9]{64}/gi, '[REDACTED]');
};
const docker = args => {
  try {
    return execFileSync('docker', args, { cwd: root, env: { ...process.env, ...environment }, encoding: 'utf8', timeout: args.includes('up') ? 420000 : 45000, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const detail = redact(error.stderr || error.stdout || error.message || '').slice(-4096);
    throw new Error(`Cloud container verification failed for owned project ${project}: ${detail}`);
  }
};

try {
  process.stdout.write('Validating private cloud configuration and Caddy...\n');
  const config = JSON.parse(docker([...compose, 'config', '--format', 'json']));
  assert.equal(config.services.app.ports, undefined);
  assert.equal(config.services.mongo.ports, undefined);
  assert.equal(config.services.app.read_only, true);
  assert.equal(config.services.app.environment.SNEUP_NGROK_ENABLED, 'false');
  assert.equal(config.networks.data.internal, true);
  docker(['run', '--rm', '--env', 'SNEUP_DOMAIN=sneup.verify.invalid', '--volume', `${path.join(root, 'deploy/hetzner/Caddyfile')}:/etc/caddy/Caddyfile:ro`, 'caddy:2', 'caddy', 'validate', '--config', '/etc/caddy/Caddyfile']);
  // Exercise the actual proxy over private HTTP, without public ports or ACME.
  delete config.services.caddy.ports;
  config.services.caddy.environment.SNEUP_DOMAIN = 'http://sneup.verify.invalid:80';
  fs.writeFileSync(configFile, JSON.stringify(config), { mode: 0o600 });
  compose = ['compose', '--project-name', project, '-f', configFile];
  process.stdout.write('Starting owned MongoDB, app, and private Caddy fixture...\n');
  try {
    docker([...compose, 'up', '--detach', '--no-build', '--wait', '--wait-timeout', '360', 'app', 'caddy']);
  } catch (error) {
    let diagnostics = '';
    try {
      diagnostics += docker([...compose, 'logs', '--no-color', '--tail', '30', 'mongo', 'app']);
      diagnostics += docker([...compose, 'exec', '-T', 'app', 'node', '-e', `
        const fs = require('node:fs');
        for (const name of fs.readdirSync('/app/logs').filter(name => name.endsWith('.log'))) {
          const file = fs.readFileSync('/app/logs/' + name, 'utf8');
          console.log(file.slice(-12000));
        }
        fetch('http://127.0.0.1:3000/ready', { signal: AbortSignal.timeout(3000) })
          .then(async response => console.log(response.status, await response.text()))
          .catch(() => console.log('Readiness endpoint unavailable'));
      `]);
    } catch { /* Preserve the original failure if the container already exited. */ }
    throw new Error(`${error.message}\n${redact(diagnostics).slice(-16000)}`);
  }
  const appId = docker([...compose, 'ps', '--quiet', 'app']).trim();
  const container = JSON.parse(docker(['inspect', appId]))[0];
  assert.equal(container.Config.Labels['com.docker.compose.project'], project);
  assert.equal(container.Config.User, 'node');
  assert.equal(container.HostConfig.ReadonlyRootfs, true);
  assert.equal(container.HostConfig.Memory, 1073741824);
  assert.equal(docker([...compose, 'exec', '-T', 'app', 'node', '-p', "require('./package.json').version"]).trim(), require('../package.json').version);
  const probe = `
    const assert = require('node:assert/strict');
    async function read(url, headers = {}) {
      const response = await fetch('http://127.0.0.1:3000' + url, { headers });
      return { status: response.status, data: await response.json() };
    }
    (async () => {
      const ready = await read('/ready');
      assert.equal(ready.status, 200);
      assert.equal(ready.data.mode, 'live');
      assert.equal(ready.data.database, 'connected');
      assert.equal(ready.data.providerWrites.mode, 'emergency_stop');
      assert.equal((await read('/api/v1/workspaces/current')).status, 401);
      assert.equal((await read('/api/v1/workspaces/current', { 'X-Forwarded-For': '127.0.0.1' })).status, 401);
      const headers = { 'X-Sneup-Api-Key': process.env.SNEUP_API_KEY };
      const workspace = await read('/api/v1/workspaces/current', headers);
      assert.equal(workspace.status, 200);
      assert.ok(workspace.data.data.workspace.id);
      const manifest = await read('/api/v1/integrations/hai/manifest', headers);
      assert.equal(manifest.status, 200);
      let proxyReady = false;
      for (let count = 0; count < 20 && !proxyReady; count++) {
        try {
          proxyReady = (await fetch('http://caddy:80/ready', { headers: { Host: 'sneup.verify.invalid' } })).status === 200;
        } catch {}
        if (!proxyReady) await new Promise(resolve => setTimeout(resolve, 500));
      }
      assert.ok(proxyReady);
      const unauthenticatedProxy = await fetch('http://caddy:80/api/v1/workspaces/current', {
        headers: { Host: 'sneup.verify.invalid', 'X-Forwarded-For': '127.0.0.1' }
      });
      assert.equal(unauthenticatedProxy.status, 401);
      const authenticatedProxy = await fetch('http://caddy:80/api/v1/workspaces/current', {
        headers: { ...headers, Host: 'sneup.verify.invalid', Origin: 'https://sneup.verify.invalid' }
      });
      assert.equal(authenticatedProxy.status, 200);
      console.log(JSON.stringify({ liveDatabase: true, unauthenticatedDenied: true, forgedLocalhostDenied: true,
        authenticatedWorkspace: true, haiManifest: true, providerWritesDisabled: true, realCaddyHttp: true }));
    })().catch(() => { console.error('Cloud HTTP smoke failed'); process.exitCode = 1; });
  `;
  const evidence = JSON.parse(docker([...compose, 'exec', '-T', 'app', 'node', '-e', probe]).trim());
  docker([...compose, 'stop', '--timeout', '30', 'app']);
  const stopped = JSON.parse(docker(['inspect', appId]))[0];
  assert.equal(stopped.State.Running, false);
  assert.equal(stopped.State.ExitCode, 0);
  console.log(JSON.stringify({ success: true, project, ...evidence, caddyConfigValid: true,
    privateMongo: true, nonRootReadOnlyApp: true, boundedMemory: true, gracefulExit: true,
    realHetznerDeployment: false, liveTlsAcceptance: false }));
} finally {
  process.stdout.write('Removing only the owned synthetic fixture...\n');
  // Never clean a caller-supplied project or production volume.
  assert.match(project, /^sneup-cloud-verification-[a-f0-9]{16}$/);
  const containers = docker(['ps', '--all', '--quiet', '--filter', `label=com.docker.compose.project=${project}`]).trim().split(/\s+/).filter(Boolean);
  for (const id of containers) {
    assert.equal(JSON.parse(docker(['inspect', id]))[0].Config.Labels['com.docker.compose.project'], project);
  }
  docker([...compose, 'down', '--volumes', '--remove-orphans']);
  fs.unlinkSync(envFile);
  if (fs.existsSync(configFile)) fs.unlinkSync(configFile);
  fs.rmdirSync(temporary);
}
