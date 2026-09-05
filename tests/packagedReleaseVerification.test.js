const path = require('node:path');
const { execFileSync } = require('node:child_process');

// The Windows CI job runs this explicitly; Linux quality checks do not need PowerShell.
const windowsDescribe = process.platform === 'win32' ? describe : describe.skip;
const runScenario = (scenario) => JSON.parse(execFileSync('powershell.exe', [
  '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
  path.join(__dirname, 'fixtures', 'packaged-verifier-harness.ps1'), '-Scenario', scenario
], { encoding: 'utf8', windowsHide: true, timeout: 30000 }));

windowsDescribe('packaged release shutdown acceptance', () => {
  test('accepts a requested clean exit with no descendants and a released port', () => {
    const result = runScenario('clean');
    expect(result.accepted).toBe(true);
    expect(result.report.success).toBe(true);
  });

  test.each(['failed', 'unknown'])('rejects a %s main-process exit even when processes disappear', (scenario) => {
    const result = runScenario(scenario);
    expect(result.accepted).toBe(false);
    expect(result.report.success).toBe(false);
  });

  test.each(['lingering', 'close-rejected', 'port-busy'])('retains the %s shutdown gate', (scenario) => {
    const result = runScenario(scenario);
    expect(result.accepted).toBe(false);
    expect(result.report.success).toBe(false);
  });
});
