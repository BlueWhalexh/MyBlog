param(
  [string]$Config = "sync-config.json",
  [switch]$IncludeImages,
  [switch]$DeleteMissing,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $scriptDir
Set-Location $root

$syncArgs = @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  (Join-Path $scriptDir "sync-obsidian.ps1"),
  "-Config",
  $Config,
  "-Incremental"
)

if ($IncludeImages) { $syncArgs += "-IncludeImages" }
if ($DeleteMissing) { $syncArgs += "-DeleteMissing" }
if ($DryRun) { $syncArgs += "-DryRun" }

Write-Host "Syncing Obsidian notes..."
& powershell.exe @syncArgs

if ($DryRun) {
  Write-Host "Dry run complete. Build skipped."
  exit 0
}

Write-Host "Building static site..."
& npm.cmd run build
