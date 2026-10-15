$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $projectRoot "manifest.json"
$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
$version = [string]$manifest.version

if ($version -notmatch '^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$') {
    throw "Invalid extension version in manifest.json: '$version'"
}

$files = @(
    "manifest.json",
    "content.js",
    "target-app.js",
    "popup.html",
    "popup.js",
    "styles.css"
) | ForEach-Object { Join-Path $projectRoot $_ }

$missingFiles = $files | Where-Object { -not (Test-Path -LiteralPath $_ -PathType Leaf) }
if ($missingFiles) {
    throw "Cannot package extension; required file(s) missing: $($missingFiles -join ', ')"
}

$distPath = Join-Path $projectRoot "dist"
$archivePath = Join-Path $distPath "lkd-scrap-$version.zip"

New-Item -ItemType Directory -Path $distPath -Force | Out-Null
Compress-Archive -LiteralPath $files -DestinationPath $archivePath -Force
Write-Output "Created $archivePath"
