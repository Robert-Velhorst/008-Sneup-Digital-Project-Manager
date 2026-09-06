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
$startedProcessRoles[[int]$started.Id] = 'main'
$startedProcesses = @{}
$startedProcesses[[int]$started.Id] = $started

function Update-StartedProcesses {
  $records = @(Get-CimInstance Win32_Process)
  do {
    $added = $false
    foreach ($record in $records) {
      $processId = [int]$record.ProcessId
      $parentId = [int]$record.ParentProcessId
      if ($startedProcesses.ContainsKey($processId) -or -not $startedProcesses.ContainsKey($parentId)) { continue }
      $candidate = Get-Process -Id $processId -ErrorAction SilentlyContinue
      if (-not $candidate) { continue }
      try {
        # Pin the process object, then verify that the enumeration still identifies it.
        # Holding this handle prevents PID reuse until verification/cleanup is finished.
        $null = $candidate.Handle
        $observedStart = ([datetime]$record.CreationDate).ToUniversalTime().ToString('yyyyMMddHHmmssffffff')
        $actualStart = $candidate.StartTime.ToUniversalTime().ToString('yyyyMMddHHmmssffffff')
        if ($observedStart -ne $actualStart -or $candidate.StartTime -lt $startedProcesses[$parentId].StartTime) {
          throw 'A candidate process identity changed during packaged verification.'
        }
        $startedProcesses[$processId] = $candidate
        $candidate = $null
        $role = 'auxiliary'
        if ($record.CommandLine -match '--type=([a-z-]+)') { $role = $Matches[1] }
        $startedProcessRoles[$processId] = $role
        $added = $true
      } finally {
        if ($candidate) { $candidate.Dispose() }
      }
    }
  } while ($added)
}

function Get-RunningStartedProcesses {
  foreach ($process in $startedProcesses.Values) {
    if (-not $process.HasExited) { $process }
  }
}

try {
  # Keep the original process handle alive so its exit status remains available.
  $null = $started.Handle
  $deadline = (Get-Date).AddSeconds(40)
  $health = $null
  do {
    Start-Sleep -Milliseconds 500
    Update-StartedProcesses
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

  Update-StartedProcesses
  $processes = @(Get-RunningStartedProcesses)
  foreach ($process in $processes) { $process.Refresh() }
  $workingSet = ($processes | Measure-Object WorkingSet64 -Sum).Sum
  $privateBytes = ($processes | Measure-Object PrivateMemorySize64 -Sum).Sum
  $cpu = ($processes | Measure-Object CPU -Sum).Sum

  $closeRequested = [SneupPackagedWindow]::RequestClose($started.Id)

  $closeDeadline = (Get-Date).AddSeconds(12)
  $processInventorySettled = $false
  do {
    Start-Sleep -Milliseconds 500
    $allKnownExited = @(Get-RunningStartedProcesses).Count -eq 0
    $knownCount = $startedProcesses.Count
    Update-StartedProcesses
    $remaining = @(Get-RunningStartedProcesses)
    # A parent can spawn a final child between an inventory and its exit.
    $processInventorySettled = $allKnownExited -and $knownCount -eq $startedProcesses.Count
  } while (($remaining.Count -gt 0 -or -not $processInventorySettled) -and (Get-Date) -lt $closeDeadline)
  $mainExited = $started.WaitForExit(0)
  $mainExitCode = if ($mainExited) { $started.ExitCode } else { $null }
  $normalClose = $closeRequested -and $processInventorySettled -and $remaining.Count -eq 0 -and $mainExited -and $null -ne $mainExitCode -and $mainExitCode -eq 0

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
    mainExited = $mainExited
    mainExitCode = $mainExitCode
    remainingProcesses = @($remaining | Select-Object Id, ProcessName, HasExited, @{Name='Role';Expression={$startedProcessRoles[$_.Id]}})
    processInventorySettled = $processInventorySettled
    normalClose = $normalClose
    portReleased = $portReleased
  } | ConvertTo-Json

  if (-not $normalClose) { throw 'The packaged app did not close normally.' }
  if (-not $portReleased) { throw "The packaged app did not release port $Port." }
} finally {
  try {
    if (-not $normalClose) {
      try { Update-StartedProcesses } catch { Write-Warning 'Could not complete the final process inventory; cleanup is limited to verified process handles.' }
      foreach ($process in $startedProcesses.Values) {
        try {
          if (-not $process.HasExited) {
            $process | Stop-Process -Force
            if (-not $process.WaitForExit(2000)) { Write-Warning 'A verified Sneup process did not exit after failed-verification cleanup.' }
          }
        } catch { Write-Warning 'Could not terminate a verified Sneup process after failed verification.' }
      }
    }
  } finally {
    foreach ($process in $startedProcesses.Values) {
      try { $process.Dispose() } catch { Write-Warning 'Could not release a verified process handle.' }
    }
  }
}
