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

  test('does not mistake a recycled child PID for a lingering Sneup process or terminate it', () => {
    const result = runScenario('reused-child');
    expect(result.killed).not.toContain('Unrelated:102');
    expect(result.accepted).toBe(true);
    expect(result.disposed).toEqual(expect.arrayContaining(['Sneup:101', 'Sneup:102']));
  });

  test('refuses a process identity change between enumeration and opening its handle', () => {
    const result = runScenario('identity-race');
    expect(result.accepted).toBe(false);
    expect(result.killed).not.toContain('Unrelated:102');
    expect(result.disposed).toContain('Unrelated:102');
  });

  test('detects and cleans up a descendant first observed after the close request', () => {
    const result = runScenario('late-child');
    expect(result.accepted).toBe(false);
    expect(result.report.remainingProcesses).toEqual(expect.arrayContaining([expect.objectContaining({ Id: 103 })]));
    expect(result.killed).toContain('Sneup:103');
    expect(result.disposed).toEqual(expect.arrayContaining(['Sneup:101', 'Sneup:102', 'Sneup:103']));
  });

  test('reconciles the inventory after observing parent exit before claiming a clean shutdown', () => {
    const result = runScenario('final-inventory-race');
    expect(result.accepted).toBe(false);
    expect(result.report.remainingProcesses).toEqual(expect.arrayContaining([expect.objectContaining({ Id: 103 })]));
    expect(result.killed).toContain('Sneup:103');
  });
});
