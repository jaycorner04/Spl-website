param(
  [Parameter(Mandatory = $true)]
  [string]$DeploymentRoot,

  [string]$ServiceName = "SPLNodeApp",
  [string]$NodeExePath = "C:\Program Files\nodejs\node.exe",
  [string]$NssmExePath = "C:\nssm\win64\nssm.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $NssmExePath)) {
  throw "NSSM executable not found at $NssmExePath"
}

if (-not (Test-Path -LiteralPath $NodeExePath)) {
  throw "Node executable not found at $NodeExePath"
}

$appRoot = Join-Path $DeploymentRoot "app"
$logsRoot = Join-Path $DeploymentRoot "logs"
$stdoutLog = Join-Path $logsRoot "node-stdout.log"
$stderrLog = Join-Path $logsRoot "node-stderr.log"

New-Item -ItemType Directory -Force -Path $DeploymentRoot | Out-Null
New-Item -ItemType Directory -Force -Path $appRoot | Out-Null
New-Item -ItemType Directory -Force -Path $logsRoot | Out-Null

& $NssmExePath install $ServiceName $NodeExePath "server.js"
& $NssmExePath set $ServiceName AppDirectory $appRoot
& $NssmExePath set $ServiceName AppStdout $stdoutLog
& $NssmExePath set $ServiceName AppStderr $stderrLog
& $NssmExePath set $ServiceName AppRotateFiles 1
& $NssmExePath set $ServiceName AppRotateOnline 1
& $NssmExePath set $ServiceName AppRotateSeconds 86400
& $NssmExePath set $ServiceName AppRotateBytes 10485760
& $NssmExePath set $ServiceName AppEnvironmentExtra "NODE_ENV=production"
& $NssmExePath set $ServiceName Start SERVICE_AUTO_START

Write-Host "Windows service '$ServiceName' is configured for $appRoot"
