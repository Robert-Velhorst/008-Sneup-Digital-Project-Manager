// Independent current-proxy evidence; the original cloud-case commands stay intact.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
const root = path.resolve(__dirname, '..');
const compose = fs.readFileSync(path.join(root, 'deploy/hetzner/compose.yaml'), 'utf8').replace(/\r\n/g, '\n');
const caddyBlock = compose.split('\n  caddy:\n')[1]?.split(/\n  [a-zA-Z][\w-]*:\n/)[0];
assert.ok(caddyBlock, 'Missing declared proxy service');
const matches = [...caddyBlock.matchAll(/^    image: (caddy:\d+\.\d+\.\d+-alpine@sha256:[a-f0-9]{64})$/gm)];
assert.equal(matches.length, 1, 'Proxy must declare one exact stable image and digest');
const image = matches[0][1];
const run = args => execFileSync('docker', args, {
  cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024,
  windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe']
});
run(['run', '--rm', '--network', 'none', '--read-only', '--tmpfs', '/data', '--tmpfs', '/config',
  '--cap-drop', 'ALL', '--cap-add', 'NET_BIND_SERVICE', '--security-opt', 'no-new-privileges',
  '--env', 'SNEUP_DOMAIN=sneup.verify.invalid',
  '--volume', `${path.join(root, 'deploy/hetzner/Caddyfile')}:/etc/caddy/Caddyfile:ro`,
  image, 'caddy', 'validate', '--config', '/etc/caddy/Caddyfile']);
const identity = JSON.parse(run(['image', 'inspect', image, '--format', '{{json .Id}}']));
assert.match(identity, /^sha256:[a-f0-9]{64}$/);
process.stdout.write(`${JSON.stringify({ selectedImage: image, actualImageId: identity,
  isolatedConfigurationValidationPassed: true, originalCloudCaseModified: false,
  liveDNSDataTLSOrDeploymentAcceptance: false })}\n`);
