param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileAppPath = Join-Path $projectRoot "apps/mobile"

if (-not (Test-Path $mobileAppPath)) {
  throw "Mobile app directory not found: $mobileAppPath"
}

Set-Location $mobileAppPath

Write-Host "Starting Tookio Shop mobile app..."
Write-Host "Running in: $mobileAppPath"
Write-Host "Expo Go: scan the QR code shown in this window"
Write-Host "Press Ctrl+C to stop"

npx expo start --go --lan --clear
