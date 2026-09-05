param(
  [int]$Port = 3211,
  [int]$SampleSeconds = 30,
  [string]$ExecutablePath = "release\win-unpacked\Sneup.exe"
)

$ErrorActionPreference = 'Stop'
$resolvedExecutable = (Resolve-Path -LiteralPath $ExecutablePath).Path
$workingDirectory = Split-Path -Parent $resolvedExecutable

if (Get-Process -Name Sneup -ErrorAction SilentlyContinue) {
  throw 'Close every existing Sneup process before running packaged verification.'
}
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
  throw "Port $Port is already in use."
}

# MainWindowHandle excludes hidden windows. Target only our app's named window
# and send the same close message as its title-bar button, without terminating it.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class SneupPackagedWindow {
  private delegate bool WindowCallback(IntPtr window, IntPtr state);
  [DllImport("user32.dll")]
  private static extern bool EnumWindows(WindowCallback callback, IntPtr state);
  [DllImport("user32.dll")]
  private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  private static extern int GetWindowText(IntPtr window, StringBuilder text, int capacity);
  [DllImport("user32.dll")]
  private static extern bool PostMessage(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);

  public static bool RequestClose(int processId) {
    bool requested = false;
    EnumWindows(delegate(IntPtr window, IntPtr state) {
      uint owner;
      GetWindowThreadProcessId(window, out owner);
      if (owner != (uint)processId) return true;
      var title = new StringBuilder(256);
      GetWindowText(window, title, title.Capacity);
      if (title.ToString() == "Sneup Command Center" || title.ToString() == "Sneup Digital Project Manager") {
        requested = PostMessage(window, 0x0010, IntPtr.Zero, IntPtr.Zero) || requested;
      }
      return true;
    }, IntPtr.Zero);
    return requested;
  }
}
'@

$env:SNEUP_DEMO_MODE = 'true'
$env:PORT = [string]$Port
$started = Start-Process -FilePath $resolvedExecutable -WorkingDirectory $workingDirectory -WindowStyle Hidden -PassThru
$normalClose = $false
$startedProcessRoles = @{}

function Get-StartedProcessIds {
  $records = @(Get-CimInstance Win32_Process)
  $ids = [System.Collections.Generic.HashSet[int]]::new()
  [void]$ids.Add($started.Id)
  do {
    $added = $false
    foreach ($record in $records) {
      if ($ids.Contains([int]$record.ParentProcessId) -and $ids.Add([int]$record.ProcessId)) {
        $added = $true
      }
    }
  } while ($added)
  foreach ($record in $records) {
    if (-not $ids.Contains([int]$record.ProcessId)) { continue }
    $role = 'auxiliary'
    if ($record.ProcessId -eq $started.Id) { $role = 'main' }
    elseif ($record.CommandLine -match '--type=([a-z-]+)') { $role = $Matches[1] }
    $startedProcessRoles[[int]$record.ProcessId] = $role
  }
  return @($ids)
}

try {
  $deadline = (Get-Date).AddSeconds(40)
  $health = $null
  do {
    Start-Sleep -Milliseconds 500
    try {
      $health = Invoke-RestMethod "http://127.0.0.1:$Port/health" -TimeoutSec 2
    } catch {
      $health = $null
    }
  } while (-not $health -and (Get-Date) -lt $deadline)

  if (-not $health) {
    throw 'The packaged command center did not become healthy within 40 seconds.'
  }

  $expectedVersion = (Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\package.json') -Raw | ConvertFrom-Json).version
  $product = Invoke-RestMethod "http://127.0.0.1:$Port/api" -TimeoutSec 5
  $diagnostics = (Invoke-RestMethod "http://127.0.0.1:$Port/api/v1/security/diagnostics" -TimeoutSec 5).data.diagnostics
  $haiManifest = (Invoke-RestMethod "http://127.0.0.1:$Port/api/integrations/hai/manifest" -TimeoutSec 5).manifest

  if ($health.status -ne 'ok') { throw "Unexpected packaged health status: $($health.status)" }
  if ($product.version -ne $expectedVersion) { throw "Packaged version $($product.version) does not match $expectedVersion." }
  if ($diagnostics.mode -ne 'demo' -or @($diagnostics.checks).Count -ne 9 -or $diagnostics.secretsExposed -ne $false) {
    throw 'Packaged diagnostics did not retain the expected redacted nine-check demo contract.'
  }
  if ($haiManifest.safety.providerWrites -ne 'never_direct') {
    throw 'The packaged HAI manifest did not retain the never-direct provider-write policy.'
  }
  Start-Sleep -Seconds ([Math]::Max(0, $SampleSeconds))

  $startedProcessIds = Get-StartedProcessIds
  $processes = @(Get-Process -Id $startedProcessIds -ErrorAction SilentlyContinue)
  $workingSet = ($processes | Measure-Object WorkingSet64 -Sum).Sum
  $privateBytes = ($processes | Measure-Object PrivateMemorySize64 -Sum).Sum
  $cpu = ($processes | Measure-Object CPU -Sum).Sum

  $closeRequested = [SneupPackagedWindow]::RequestClose($started.Id)

  $closeDeadline = (Get-Date).AddSeconds(12)
  do {
    Start-Sleep -Milliseconds 500
    $remaining = @(Get-Process -Id $startedProcessIds -ErrorAction SilentlyContinue)
  } while ($remaining.Count -gt 0 -and (Get-Date) -lt $closeDeadline)
  $normalClose = $closeRequested -and $remaining.Count -eq 0

  Start-Sleep -Seconds 1
  $portReleased = -not [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)

  [pscustomobject]@{
    success = $normalClose -and $portReleased
    healthStatus = $health.status
    productVersion = $product.version
    diagnosticsStatus = $diagnostics.status
    diagnosticsMode = $diagnostics.mode
    diagnosticsChecks = @($diagnostics.checks).Count
    secretsExposed = $diagnostics.secretsExposed
    haiWritePolicy = $haiManifest.safety.providerWrites
    processCount = $processes.Count
    workingSetMb = [Math]::Round($workingSet / 1MB, 1)
    privateMb = [Math]::Round($privateBytes / 1MB, 1)
    cpuSeconds = [Math]::Round($cpu, 3)
    closeRequested = $closeRequested
    mainProcessId = $started.Id
    mainExited = $started.HasExited
    remainingProcesses = @($remaining | Select-Object Id, ProcessName, HasExited, @{Name='Role';Expression={$startedProcessRoles[$_.Id]}})
    normalClose = $normalClose
    portReleased = $portReleased
  } | ConvertTo-Json

  if (-not $normalClose) { throw 'The packaged app did not close normally.' }
  if (-not $portReleased) { throw "The packaged app did not release port $Port." }
} finally {
  if (-not $normalClose) {
    Get-Process -Id (Get-StartedProcessIds) -ErrorAction SilentlyContinue | Stop-Process -Force
  }
}
