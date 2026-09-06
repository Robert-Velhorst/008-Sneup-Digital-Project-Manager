param(
  [ValidateSet('clean', 'failed', 'unknown', 'lingering', 'close-rejected', 'port-busy', 'reused-child', 'identity-race', 'late-child', 'final-inventory-race')]
  [string]$Scenario = 'clean'
)

$ErrorActionPreference = 'Stop'
$verifier = Join-Path $PSScriptRoot '../../scripts/verify-packaged-release.ps1'
$version = (Get-Content (Join-Path $PSScriptRoot '../../package.json') -Raw | ConvertFrom-Json).version
$global:SneupFixture = @{ now = [datetime]::UtcNow; processPolls = 0; portPolls = 0; cleanupCalls = 0; killed = @(); disposed = @(); pinned = @() }
$global:SneupFixture.main = [pscustomobject]@{
  Id = 101
  ProcessName = 'Sneup'
  HasExited = $false
  ExitCode = $(if ($Scenario -eq 'failed') { 1 } elseif ($Scenario -eq 'unknown') { $null } else { 0 })
  StartTime = $global:SneupFixture.now.AddSeconds(-10)
  WorkingSet64 = 1048576
  PrivateMemorySize64 = 1048576
  CPU = 0.1
}
$global:SneupFixture.child = [pscustomobject]@{ Id = 102; ProcessName = 'Sneup'; HasExited = $false; StartTime = $global:SneupFixture.now.AddSeconds(-9); WorkingSet64 = 1024; PrivateMemorySize64 = 1024; CPU = 0.1 }
$global:SneupFixture.late = [pscustomobject]@{ Id = 103; ProcessName = 'Sneup'; HasExited = $false; StartTime = $global:SneupFixture.now.AddSeconds(-1); WorkingSet64 = 1024; PrivateMemorySize64 = 1024; CPU = 0.1 }
$global:SneupFixture.unrelated = [pscustomobject]@{ Id = 102; ProcessName = 'Unrelated'; HasExited = $false; StartTime = $global:SneupFixture.now; WorkingSet64 = 1024; PrivateMemorySize64 = 1024; CPU = 0.1 }
foreach ($process in @($global:SneupFixture.main, $global:SneupFixture.child, $global:SneupFixture.late, $global:SneupFixture.unrelated)) {
  $process | Add-Member ScriptMethod WaitForExit { param($Timeout) return $this.HasExited }
  $process | Add-Member ScriptMethod Refresh {}
  $process | Add-Member ScriptProperty Handle { $global:SneupFixture.pinned += $this.ProcessName + ':' + $this.Id; return 123 }
  $process | Add-Member ScriptMethod Dispose { $global:SneupFixture.disposed += $this.ProcessName + ':' + $this.Id }
}

# Replace OS boundaries, but execute the real verifier and its acceptance rules.
Add-Type -TypeDefinition @'
public static class SneupPackagedWindow {
  public static bool CloseRequested = true;
  public static bool Attempted = false;
  public static bool RequestClose(int processId) { Attempted = true; return CloseRequested; }
}
'@
[SneupPackagedWindow]::CloseRequested = $Scenario -ne 'close-rejected'
function Add-Type { param($TypeDefinition) }
function Start-Process { param($FilePath, $WorkingDirectory, $WindowStyle, [switch]$PassThru) return $global:SneupFixture.main }
function Get-Process {
  [CmdletBinding()] param($Id, $Name)
  if ($Name) { return }
  $global:SneupFixture.processPolls += 1
  foreach ($processId in @($Id)) {
    if ($processId -eq 101 -and -not $global:SneupFixture.main.HasExited) { $global:SneupFixture.main }
    if ($processId -eq 102) {
      if ($Scenario -eq 'identity-race' -or ($Scenario -eq 'reused-child' -and [SneupPackagedWindow]::Attempted)) { $global:SneupFixture.unrelated }
      elseif (-not $global:SneupFixture.child.HasExited) { $global:SneupFixture.child }
    }
    if ($processId -eq 103 -and $Scenario -in @('late-child', 'final-inventory-race') -and [SneupPackagedWindow]::Attempted) { $global:SneupFixture.late }
  }
}
function Get-CimInstance {
  param($ClassName)
  [pscustomobject]@{ ProcessId = 101; ParentProcessId = 1; CreationDate = $global:SneupFixture.main.StartTime; CommandLine = 'fixture' }
  [pscustomobject]@{ ProcessId = 102; ParentProcessId = 101; CreationDate = $global:SneupFixture.child.StartTime; CommandLine = 'fixture --type=renderer' }
  if (($Scenario -eq 'late-child' -or ($Scenario -eq 'final-inventory-race' -and $global:SneupFixture.finalInventorySeen)) -and [SneupPackagedWindow]::Attempted) {
    [pscustomobject]@{ ProcessId = 103; ParentProcessId = 102; CreationDate = $global:SneupFixture.late.StartTime; CommandLine = 'fixture --type=utility' }
  }
  if ($Scenario -eq 'final-inventory-race' -and [SneupPackagedWindow]::Attempted) {
    $global:SneupFixture.finalInventorySeen = $true
    $global:SneupFixture.main.HasExited = $true
    $global:SneupFixture.child.HasExited = $true
  }
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
  if ([SneupPackagedWindow]::Attempted -and $Scenario -ne 'final-inventory-race') {
    $global:SneupFixture.main.HasExited = $true
    $global:SneupFixture.child.HasExited = $Scenario -ne 'lingering'
  }
}
function Stop-Process {
  [CmdletBinding()] param([Parameter(ValueFromPipeline)]$InputObject, [switch]$Force)
  process { $global:SneupFixture.cleanupCalls += 1; $global:SneupFixture.killed += $InputObject.ProcessName + ':' + $InputObject.Id; $InputObject.HasExited = $true }
}

$captured = [System.Collections.Generic.List[object]]::new()
$failure = $null
try {
  & $verifier -ExecutablePath $PSCommandPath -SampleSeconds 0 3>$null | ForEach-Object { $captured.Add($_) }
} catch {
  $failure = $_.Exception.Message
}
$report = if ($captured.Count) { ($captured -join "`n") | ConvertFrom-Json } else { $null }
[pscustomobject]@{ accepted = $null -eq $failure; error = $failure; report = $report; killed = $global:SneupFixture.killed; disposed = $global:SneupFixture.disposed; pinned = $global:SneupFixture.pinned } | ConvertTo-Json -Depth 8 -Compress
