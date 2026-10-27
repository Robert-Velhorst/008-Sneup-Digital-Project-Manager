// Owned hosted CI metadata probe: no credentials, provider calls or application startup.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

assert.equal(process.version, 'v26.12.1');
assert.equal(process.platform, 'linux');
assert.notEqual(process.getuid(), 0);
assert.equal(process.cwd(), '/app');
const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
assert.match(osRelease, /^VERSION_ID=(?:"13"|13)$/m);
assert.match(osRelease, /^VERSION_CODENAME=trixie$/m);

const copiedSourceSha256 = Object.create(null);
const record = relative => {
  const absolute = path.resolve('/app', relative);
  assert.ok(absolute.startsWith('/app/'));
  const descriptor = fs.openSync(absolute, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(descriptor);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolute).sort()) record(path.posix.join(relative, entry));
    } else {
      assert.ok(stat.isFile());
      copiedSourceSha256[relative] = crypto.createHash('sha256').update(fs.readFileSync(descriptor)).digest('hex');
    }
  } finally {
    fs.closeSync(descriptor);
  }
};
for (const entry of ['package.json', 'package-lock.json', 'src', 'public', 'scripts']) record(entry);

process.stdout.write(`${JSON.stringify({
  node: process.version,
  versions: process.versions,
  platform: process.platform,
  architecture: process.arch,
  uid: process.getuid(),
  osRelease,
  copiedSourceSha256
}, null, 2)}\n`);
