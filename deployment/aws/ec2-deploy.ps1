param(
  [Parameter(Mandatory = $true)]
  [string]$DeploymentRoot,

  [Parameter(Mandatory = $true)]
  [string]$BundleRoot,

  [string]$ServiceName = "SPLNodeApp",
  [string]$NodeEnv = "production"
)

$ErrorActionPreference = "Stop"

function Invoke-Robocopy {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Source,

    [Parameter(Mandatory = $true)]
    [string]$Destination
  )

  $null = robocopy $Source $Destination /E /R:2 /W:2 /NFL /NDL /NP /NJH /NJS
  $exitCode = $LASTEXITCODE

  if ($exitCode -ge 8) {
    throw "Robocopy failed with exit code $exitCode."
  }
}

if (-not (Test-Path -LiteralPath $BundleRoot)) {
  throw "Bundle root was not found: $BundleRoot"
}

$appRoot = Join-Path $DeploymentRoot "app"
$logsRoot = Join-Path $DeploymentRoot "logs"
$bundleAppRoot = $BundleRoot
$iisConfigSource = Join-Path $BundleRoot "deployment\iis\web.config"
$serverMediaRoot = Join-Path $appRoot "server-media"

New-Item -ItemType Directory -Force -Path $DeploymentRoot | Out-Null
New-Item -ItemType Directory -Force -Path $appRoot | Out-Null
New-Item -ItemType Directory -Force -Path $logsRoot | Out-Null

Write-Host "Copying application files to $appRoot"
Invoke-Robocopy -Source $bundleAppRoot -Destination $appRoot

if (Test-Path -LiteralPath $iisConfigSource) {
  Copy-Item -LiteralPath $iisConfigSource -Destination (Join-Path $DeploymentRoot "web.config") -Force
}

Push-Location $appRoot

try {
  $env:NODE_ENV = $NodeEnv

  Write-Host "Installing backend dependencies"
  npm ci

  Write-Host "Installing frontend dependencies"
  npm ci --prefix spl-frontend

  Write-Host "Building frontend"
  npm run build:frontend

  Write-Host "Validating runtime environment"
  npm run validate:env

  Write-Host "Checking database connectivity"
  npm run db:health
}
finally {
  Pop-Location
}

$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($service) {
  if ($service.Status -ne "Stopped") {
    Write-Host "Stopping service $ServiceName"
    Stop-Service -Name $ServiceName -Force -ErrorAction Stop
  }

  Write-Host "Starting service $ServiceName"
  Start-Service -Name $ServiceName -ErrorAction Stop
}
else {
  Write-Warning "Windows service '$ServiceName' was not found. Register the Node service once, then rerun deployment."
}

if (Test-Path -LiteralPath $serverMediaRoot) {
  Write-Host "Preserved server media at $serverMediaRoot"
}

Write-Host "EC2 deployment completed."
