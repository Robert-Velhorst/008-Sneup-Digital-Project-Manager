require('dotenv').config();

const { getRuntimeDiagnostics } = require('../src/services/runtimeDiagnosticsService');

const report = getRuntimeDiagnostics();
const json = process.argv.includes('--json');

if (json) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  process.stdout.write(`Sneup doctor: ${report.status.toUpperCase()} (${report.mode} mode)\n`);
  report.checks.forEach((check) => {
    process.stdout.write(`[${check.status.toUpperCase()}] ${check.id}: ${check.summary}\n`);
  });
  process.stdout.write(`Critical path ready: ${report.liveCriticalPathReady ? 'yes' : 'no'}\n`);
  process.stdout.write('Secret values exposed: no\n');
}

if (!report.ready) process.exitCode = 1;
