param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileScript = Join-Path $projectRoot "start-mobile.ps1"

$webAppPath = Join-Path $projectRoot "apps/web"
$webScript = Join-Path $projectRoot "start-web.ps1"

if (-not (Test-Path $mobileScript)) {
  throw "Missing script: $mobileScript"
}

Write-Host "Starting Tookio Shop development terminals..."

if (Test-Path $webAppPath -PathType Container -and Test-Path $webScript) {
  Write-Host "Web app detected - opening a web terminal as well."

  Start-Process powershell.exe -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $webScript
  )
} else {
  Write-Host "No web app folder found in this workspace, so only the mobile Expo terminal will be opened."
}

Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $mobileScript
)

Write-Host "Launched web and mobile terminals."
