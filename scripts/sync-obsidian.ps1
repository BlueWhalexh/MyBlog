param(
  [string]$Config = "sync-config.json",
  [string]$VaultPath = "",

  [string]$SourceSubdir = "",
  [string]$Destination = "content/imported",
  [switch]$IncludeImages,
  [switch]$Incremental,
  [switch]$DeleteMissing,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Resolve-InWorkspace([string]$Path) {
  $root = (Resolve-Path ".").Path
  $full = [System.IO.Path]::GetFullPath((Join-Path $root $Path))
  if (-not $full.StartsWith($root)) {
    throw "Destination must stay inside workspace: $Path"
  }
  return $full
}

function Get-RelativePathCompat([string]$BasePath, [string]$TargetPath) {
  $baseFull = [System.IO.Path]::GetFullPath($BasePath)
  if (-not $baseFull.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $baseFull += [System.IO.Path]::DirectorySeparatorChar
  }
  $targetFull = [System.IO.Path]::GetFullPath($TargetPath)
  $baseUri = New-Object System.Uri($baseFull)
  $targetUri = New-Object System.Uri($targetFull)
  $relativeUri = $baseUri.MakeRelativeUri($targetUri)
  return [System.Uri]::UnescapeDataString($relativeUri.ToString()).Replace("/", [System.IO.Path]::DirectorySeparatorChar)
}

function Merge-ArraySetting($Value, $Fallback) {
  if ($null -eq $Value) {
    return $Fallback
  }
  return @($Value)
}

if ($Config -and (Test-Path -LiteralPath $Config)) {
  $configData = Get-Content -Raw -Encoding UTF8 -LiteralPath $Config | ConvertFrom-Json
  if (-not $VaultPath -and $configData.vaultPath) { $VaultPath = $configData.vaultPath }
  if (-not $SourceSubdir -and $configData.sourceSubdir) { $SourceSubdir = $configData.sourceSubdir }
  if ($Destination -eq "content/imported" -and $configData.destination) { $Destination = $configData.destination }
  if (-not $IncludeImages -and $configData.includeImages) { $IncludeImages = [bool]$configData.includeImages }
  if (-not $DeleteMissing -and $configData.deleteMissing) { $DeleteMissing = [bool]$configData.deleteMissing }
}

if (-not $VaultPath) {
  throw "VaultPath is required. Set it in sync-config.json or pass -VaultPath."
}

$sourceRoot = if ($SourceSubdir) {
  Join-Path $VaultPath $SourceSubdir
} else {
  $VaultPath
}

if (-not (Test-Path -LiteralPath $sourceRoot)) {
  throw "Source path does not exist: $sourceRoot"
}

$destRoot = Resolve-InWorkspace $Destination
$assetRoot = Resolve-InWorkspace "public/obsidian-assets"

$defaultExcludedPathParts = @(
  ".obsidian",
  ".trash",
  "private",
  "Private",
  "draft",
  "Draft",
  "secret",
  "Secret",
  "daily",
  "Daily",
  "todo",
  "Todo",
  "template",
  "Template",
  "claude",
  "Claude",
  "intern",
  "Intern"
)

$defaultIncludeExtensions = @(".md")
$excludedPathParts = $defaultExcludedPathParts
$includeExtensions = $defaultIncludeExtensions

if ($configData) {
  $excludedPathParts = Merge-ArraySetting $configData.excludePathParts $defaultExcludedPathParts
  $includeExtensions = Merge-ArraySetting $configData.includeExtensions $defaultIncludeExtensions
}

$markdownFiles = Get-ChildItem -LiteralPath $sourceRoot -Recurse -File -Filter "*.md" | Where-Object {
  $path = $_.FullName
  $relativePath = Get-RelativePathCompat $sourceRoot $path
  $pathParts = $relativePath -split "[\\/]"
  $isHidden = $pathParts | Where-Object { $_.StartsWith(".") }
  $extension = [System.IO.Path]::GetExtension($path)
  $isAllowedExtension = $includeExtensions -contains $extension
  $isExcludedByName = $excludedPathParts | Where-Object {
    $pathParts -contains $_ -or $_ -eq [System.IO.Path]::GetFileNameWithoutExtension($path)
  }
  -not $isHidden -and -not $isExcludedByName -and $isAllowedExtension
}

Write-Host "Markdown files to sync: $($markdownFiles.Count)"
Write-Host "Destination: $destRoot"
Write-Host "Mode: $(if ($Incremental) { 'incremental' } else { 'copy' })"

if (-not $DryRun) {
  New-Item -ItemType Directory -Force -Path $destRoot | Out-Null
  if ($IncludeImages) {
    New-Item -ItemType Directory -Force -Path $assetRoot | Out-Null
  }
}

$imagePattern = '!\[\[([^\]]+\.(png|jpg|jpeg|gif|webp|svg))\]\]'
$syncedImages = New-Object System.Collections.Generic.HashSet[string]
$seenTargets = New-Object System.Collections.Generic.HashSet[string]
$copiedCount = 0
$skippedCount = 0

foreach ($file in $markdownFiles) {
  $relative = Get-RelativePathCompat $sourceRoot $file.FullName
  $target = Join-Path $destRoot $relative
  $targetDir = Split-Path -Parent $target
  [void]$seenTargets.Add(([System.IO.Path]::GetFullPath($target)).ToLowerInvariant())

  $shouldCopy = $true
  if ($Incremental -and (Test-Path -LiteralPath $target)) {
    $targetItem = Get-Item -LiteralPath $target
    $shouldCopy = ($file.Length -ne $targetItem.Length) -or ($file.LastWriteTimeUtc -gt $targetItem.LastWriteTimeUtc)
  }

  if (-not $shouldCopy) {
    $skippedCount += 1
    if ($DryRun) { Write-Host "[skip] $relative" }
    continue
  }

  $content = Get-Content -Raw -Encoding UTF8 -LiteralPath $file.FullName

  if ($IncludeImages) {
    $content = [regex]::Replace($content, $imagePattern, {
      param($match)
      $imageName = $match.Groups[1].Value
      $fileName = [System.IO.Path]::GetFileName($imageName)
      $found = Get-ChildItem -LiteralPath $VaultPath -Recurse -File -Filter $fileName | Select-Object -First 1
      if ($found) {
        $assetName = $found.Name
        $assetTarget = Join-Path $assetRoot $assetName
        if (-not $DryRun -and -not $syncedImages.Contains($assetName)) {
          Copy-Item -LiteralPath $found.FullName -Destination $assetTarget -Force
          [void]$syncedImages.Add($assetName)
        }
        return "![[$assetName]]"
      }
      return $match.Value
    })
  }

  if ($DryRun) {
    Write-Host "[copy] $relative"
  } else {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    Set-Content -LiteralPath $target -Value $content -Encoding utf8
    (Get-Item -LiteralPath $target).LastWriteTimeUtc = $file.LastWriteTimeUtc
  }
  $copiedCount += 1
}

$deletedCount = 0
if ($DeleteMissing -and (Test-Path -LiteralPath $destRoot)) {
  $existing = Get-ChildItem -LiteralPath $destRoot -Recurse -File -Filter "*.md"
  foreach ($targetFile in $existing) {
    $fullTarget = ([System.IO.Path]::GetFullPath($targetFile.FullName)).ToLowerInvariant()
    if (-not $seenTargets.Contains($fullTarget)) {
      $relativeTarget = Get-RelativePathCompat $destRoot $targetFile.FullName
      if ($DryRun) {
        Write-Host "[delete] $relativeTarget"
      } else {
        Remove-Item -LiteralPath $targetFile.FullName -Force
      }
      $deletedCount += 1
    }
  }
}

if ($IncludeImages) {
  Write-Host "Images synced: $($syncedImages.Count)"
}

Write-Host "Copied: $copiedCount"
Write-Host "Skipped: $skippedCount"
Write-Host "Deleted: $deletedCount"
Write-Host "Done. Run: npm.cmd run build"
