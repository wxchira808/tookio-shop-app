param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$webAppPath = Join-Path $projectRoot "apps/web"

if (-not (Test-Path $webAppPath)) {
  throw "Web app directory not found: $webAppPath"
}

Set-Location $webAppPath

Write-Host "Starting Tookio Shop web app..."
Write-Host "Running in: $webAppPath"
Write-Host "Press Ctrl+C to stop"

npm run dev
