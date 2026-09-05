param(
  [ValidateSet('clean', 'failed', 'unknown', 'lingering', 'close-rejected', 'port-busy')]
  [string]$Scenario = 'clean'
)

$ErrorActionPreference = 'Stop'
$verifier = Join-Path $PSScriptRoot '../../scripts/verify-packaged-release.ps1'
$version = (Get-Content (Join-Path $PSScriptRoot '../../package.json') -Raw | ConvertFrom-Json).version
$global:SneupFixture = @{ now = [datetime]::UtcNow; processPolls = 0; portPolls = 0; cleanupCalls = 0 }
$global:SneupFixture.main = [pscustomobject]@{
  Id = 101
  ProcessName = 'Sneup'
  HasExited = $true
  ExitCode = $(if ($Scenario -eq 'failed') { 1 } elseif ($Scenario -eq 'unknown') { $null } else { 0 })
  Handle = 123
  WorkingSet64 = 1048576
  PrivateMemorySize64 = 1048576
  CPU = 0.1
}
$global:SneupFixture.main | Add-Member ScriptMethod WaitForExit { param($Timeout) return $this.HasExited }
$global:SneupFixture.main | Add-Member ScriptMethod Refresh {}
$global:SneupFixture.main | Add-Member ScriptMethod Dispose {}
$global:SneupFixture.child = [pscustomobject]@{ Id = 102; ProcessName = 'Sneup'; HasExited = $false }

# Replace OS boundaries, but execute the real verifier and its acceptance rules.
Add-Type -TypeDefinition @'
public static class SneupPackagedWindow {
  public static bool CloseRequested = true;
  public static bool RequestClose(int processId) { return CloseRequested; }
}
'@
[SneupPackagedWindow]::CloseRequested = $Scenario -ne 'close-rejected'
function Add-Type { param($TypeDefinition) }
function Start-Process { param($FilePath, $WorkingDirectory, $WindowStyle, [switch]$PassThru) return $global:SneupFixture.main }
function Get-Process {
  [CmdletBinding()] param($Id, $Name)
  if ($Name) { return }
  $global:SneupFixture.processPolls += 1
  if ($global:SneupFixture.processPolls -eq 1) { return $global:SneupFixture.main }
  if ($Scenario -eq 'lingering') { return $global:SneupFixture.child }
}
function Get-CimInstance {
  param($ClassName)
  [pscustomobject]@{ ProcessId = 101; ParentProcessId = 1; CommandLine = 'fixture' }
  [pscustomobject]@{ ProcessId = 102; ParentProcessId = 101; CommandLine = 'fixture --type=renderer' }
}
function Get-NetTCPConnection {
  [CmdletBinding()] param($LocalPort, $State)
  $global:SneupFixture.portPolls += 1
  if ($Scenario -eq 'port-busy' -and $global:SneupFixture.portPolls -gt 1) { [pscustomobject]@{ State = 'Listen' } }
}
function Invoke-RestMethod {
  param($Uri, $TimeoutSec)
  switch -Wildcard ($Uri) {
    '*/health' { return @{ status = 'ok' } }
    '*/api' { return @{ version = $version } }
    '*/diagnostics' { return @{ data = @{ diagnostics = @{ status = 'ok'; mode = 'demo'; checks = @(1..9); secretsExposed = $false } } } }
    '*/manifest' { return @{ manifest = @{ safety = @{ providerWrites = 'never_direct' } } } }
    default { throw 'Unexpected fixture request' }
  }
}
function Get-Date { return $global:SneupFixture.now }
function Start-Sleep {
  param($Milliseconds = 0, $Seconds = 0)
  $global:SneupFixture.now = $global:SneupFixture.now.AddMilliseconds($Milliseconds).AddSeconds($Seconds)
}
function Stop-Process { [CmdletBinding()] param([Parameter(ValueFromPipeline)]$InputObject, [switch]$Force) process { $global:SneupFixture.cleanupCalls += 1 } }

$captured = [System.Collections.Generic.List[object]]::new()
$failure = $null
try {
  & $verifier -ExecutablePath $PSCommandPath -SampleSeconds 0 | ForEach-Object { $captured.Add($_) }
} catch {
  $failure = $_.Exception.Message
}
$report = if ($captured.Count) { ($captured -join "`n") | ConvertFrom-Json } else { $null }
[pscustomobject]@{ accepted = $null -eq $failure; error = $failure; report = $report } | ConvertTo-Json -Depth 8 -Compress
