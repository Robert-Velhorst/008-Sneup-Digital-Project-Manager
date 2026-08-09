const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createSupportBundle } = require('../src/services/supportBundleService');

describe('support bundle service', () => {
  test('writes one atomic redacted bundle without logs, user data, or secret values', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sneup-support-'));
    const environment = {
      NODE_ENV: 'development',
      SNEUP_DEMO_MODE: 'false',
      MONGODB_URI: 'mongodb://private-user:private-password@database.example/sneup',
      TRELLO_API_KEY: 'private-key',
      TRELLO_API_TOKEN: 'private-token'
    };
    try {
      const result = await createSupportBundle({
        outputDirectory: directory,
        environment,
        now: new Date('2026-08-09T12:34:56.789Z'),
        platform: 'win32',
        architecture: 'x64',
        nodeVersion: '24.6.0'
      });
      const raw = await fs.readFile(result.filePath, 'utf8');
      const parsed = JSON.parse(raw);

      expect(result.fileName).toBe('sneup-support-2026-08-09T12-34-56-789Z.json');
      expect(parsed).toMatchObject({
        runtime: { platform: 'win32', architecture: 'x64', node: '24.6.0' },
        secretsExposed: false,
        excluded: expect.arrayContaining(['credentials', 'logs', 'user data'])
      });
      expect(raw).not.toContain(environment.MONGODB_URI);
      expect(raw).not.toContain(environment.TRELLO_API_TOKEN);
      expect((await fs.readdir(directory)).filter(name => name.endsWith('.tmp'))).toEqual([]);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  test('rejects an ambiguous relative output directory', async () => {
    await expect(createSupportBundle({ outputDirectory: 'output/support' }))
      .rejects.toMatchObject({ code: 'SNEUP_SUPPORT_DIRECTORY_INVALID' });
  });
});
