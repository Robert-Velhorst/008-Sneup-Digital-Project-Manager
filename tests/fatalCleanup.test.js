const { EventEmitter } = require('node:events');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { registerProcessHandlers } = require('../src/utils/processHandlers');

describe('fatal errors retain runtime cleanup ownership', () => {
  test.each(['exception', 'rejection'])('%s cannot let Winston exit before cleanup finishes', scenario => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sneup-fatal-cleanup-'));
    try {
      const result = spawnSync(process.execPath, [path.join(__dirname, 'fixtures', 'fatal-cleanup.js'), scenario], {
        encoding: 'utf8', windowsHide: true, timeout: 12000,
        env: { ...process.env, NODE_ENV: 'production', SNEUP_LOG_DIR: directory }
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stdout.trim().split(/\r?\n/)).toEqual(['cleanup-started', 'cleanup-completed']);
      const logName = scenario === 'exception' ? 'exceptions.log' : 'rejections.log';
      expect(fs.readFileSync(path.join(directory, logName), 'utf8')).toContain('Controlled fatal');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }, 15000);

  test('a standalone logger still exits on a fatal error when no runtime handler is installed', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sneup-fatal-cleanup-'));
    try {
      const result = spawnSync(process.execPath, [path.join(__dirname, 'fixtures', 'fatal-cleanup.js'), 'standalone'], {
        encoding: 'utf8', windowsHide: true, timeout: 12000,
        env: { ...process.env, NODE_ENV: 'production', SNEUP_LOG_DIR: directory }
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stdout).not.toContain('cleanup-started');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }, 15000);

  test.each(['uncaughtException', 'unhandledRejection'])('a %s during signal shutdown changes the final exit to failure without duplicating cleanup', async event => {
    const runtime = new EventEmitter();
    runtime.exit = jest.fn();
    const logger = { info: jest.fn(), error: jest.fn() };
    let finish;
    const shutdown = jest.fn(() => new Promise(resolve => { finish = resolve; }));
    registerProcessHandlers(logger, { runtime, shutdown });
    runtime.emit('SIGTERM');
    runtime.emit(event, new Error('Fatal error during drain'));
    runtime.emit('SIGINT');
    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(runtime.exit).not.toHaveBeenCalled();
    finish();
    await new Promise(resolve => setImmediate(resolve));
    expect(runtime.exit).toHaveBeenCalledTimes(1);
    expect(runtime.exit).toHaveBeenCalledWith(1);
  });
});
