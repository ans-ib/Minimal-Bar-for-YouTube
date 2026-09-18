<#
.SYNOPSIS
  Packages the extension for the Chrome Web Store.

.DESCRIPTION
  Reads manifest.json, collects exactly the files it references (manifest,
  content scripts, CSS, icons, popup) plus the popup's own assets, and writes
  dist/<name>-<version>.zip.
  Entry paths inside the zip use forward slashes, which the Web Store
  requires; PowerShell 5.1's Compress-Archive writes backslashes and can
  produce a zip the store rejects with "manifest missing", so it is not used.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1
#>
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

$manifestPath = Join-Path $root 'manifest.json'
$manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $manifest.version) { throw 'manifest.json has no version' }

# Collect every path the manifest references.
$files = New-Object System.Collections.Generic.List[string]
$files.Add('manifest.json')
foreach ($cs in $manifest.content_scripts) {
  foreach ($js in $cs.js)  { $files.Add($js) }
  foreach ($css in $cs.css) { $files.Add($css) }
}
foreach ($icon in $manifest.icons.PSObject.Properties) { $files.Add($icon.Value) }
if ($manifest.action -and $manifest.action.default_popup) { $files.Add($manifest.action.default_popup) }
if ($manifest.options_ui -and $manifest.options_ui.page) { $files.Add($manifest.options_ui.page) }

# The popup page loads its own CSS/JS, which the manifest does not list.
$popupDir = Join-Path $root 'popup'
if (Test-Path $popupDir) {
  Get-ChildItem $popupDir -File | ForEach-Object { $files.Add("popup/$($_.Name)") }
}
$files = @($files | Select-Object -Unique)

foreach ($rel in $files) {
  if (-not (Test-Path (Join-Path $root $rel))) { throw "manifest.json references a missing file: $rel" }
}

# Syntax-check the scripts when Node is available.
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  foreach ($rel in ($files | Where-Object { $_ -like '*.js' })) {
    & $node.Source --check (Join-Path $root $rel)
    if ($LASTEXITCODE -ne 0) { throw "Syntax error in $rel" }
  }
}

$slug = (($manifest.name -replace '[^A-Za-z0-9]+', '-').Trim('-')).ToLower()
$distDir = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $distDir | Out-Null
$zipPath = Join-Path $distDir "$slug-$($manifest.version).zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($rel in $files) {
    $full = Join-Path $root $rel
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip, $full, $rel, [System.IO.Compression.CompressionLevel]::Optimal)
    Write-Host "  + $rel"
  }
} finally {
  $zip.Dispose()
}

$size = [math]::Round((Get-Item $zipPath).Length / 1KB, 1)
Write-Host "Packaged $($files.Count) files -> $zipPath ($size KB)"
