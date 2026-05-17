param(
  [switch]$Force,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $scriptDir
Set-Location $root

$sshKey = "C:\Users\xuehang\.ssh\do_digitalocean_ed25519"
$sshHost = "xuehang@146.190.97.62"
$serverPath = "/opt/tech-blog"

# ── Helper ──
function Step-Next($num, $title) {
  Write-Host "`n=== [$num/$totalSteps] $title ===" -ForegroundColor Cyan
}

function Step-Ok($msg) {
  Write-Host "  [$([char]0x2713)] $msg" -ForegroundColor Green
}

function Step-Skip($msg) {
  Write-Host "  [-] $msg" -ForegroundColor Yellow
}

$totalSteps = 5

# ── Phase 1: Sync Obsidian ──
Step-Next 1 "Sync Obsidian Notes"

if ($DryRun) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/sync-obsidian.ps1 -Config sync-config.json -Incremental -DryRun
} else {
  npm.cmd run sync
  Step-Ok "Obsidian notes synced"
}

# ── Phase 2: Check & Build ──
Step-Next 2 "TypeScript Check + Build"

if (-not $DryRun) {
  npm.cmd run check
  Step-Ok "TypeScript check passed"
  npm.cmd run build
  Step-Ok "Build complete"
} else {
  Step-Skip "Skipped (dry-run)"
}

# ── Phase 3: Verify ──
Step-Next 3 "Verify Build Output"

if (-not $DryRun) {
  npm.cmd run verify
  Step-Ok "Build verification passed"
} else {
  Step-Skip "Skipped (dry-run)"
}

# ── Phase 4: Git Commit & Push ──
Step-Next 4 "Git Commit & Push"

$changes = git status --short
if (-not $changes) {
  Write-Host "  No changes to commit." -ForegroundColor Yellow
} else {
  git status --short
  git diff --stat

  if ($DryRun) {
    Step-Skip "Would commit and push (dry-run)"
  } else {
    $commitMsg = "更新博客笔记 $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

    if (-not $Force) {
      Write-Host "`nReady to commit and push. Continue? [Y/n] " -ForegroundColor Yellow -NoNewline
      $input = Read-Host
      if ($input -eq "n" -or $input -eq "N") {
        Write-Host "  Aborted by user." -ForegroundColor Red
        exit 1
      }
    }

    git add .
    git commit -m $commitMsg
    Step-Ok "Committed: $commitMsg"
    git push origin main
    Step-Ok "Pushed to origin/main"
  }
}

# ── Phase 5: Server Deploy ──
Step-Next 5 "Server Deploy ($sshHost : $serverPath)"

if ($DryRun) {
  Write-Host "  [DRY-RUN] Would SSH to server: git pull + rebuild" -ForegroundColor Yellow
} else {
  $serverCmd = "cd $serverPath && git pull origin main && node quartz/bootstrap-cli.mjs build && node scripts/verify.mjs"
  Write-Host "  Connecting to server (first time may prompt for host key)..."
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -i $sshKey $sshHost $serverCmd
  if ($LASTEXITCODE -eq 0) {
    Step-Ok "Server updated and verified"
  } else {
    Write-Host "  Server deploy failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
  }
}

# ── Done ──
Write-Host "`n========================================" -ForegroundColor Cyan
if ($DryRun) {
  Write-Host "  Dry-run complete. Run without -DryRun to deploy." -ForegroundColor Green
} else {
  Write-Host "  Deploy complete! Site updated." -ForegroundColor Green
}
Write-Host "========================================" -ForegroundColor Cyan
