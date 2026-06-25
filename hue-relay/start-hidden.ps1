$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $PSScriptRoot '.env'
$envExampleFile = Join-Path $PSScriptRoot '.env.example'
$serverPath = Join-Path $PSScriptRoot 'server.js'

if (-not (Test-Path -LiteralPath $envFile) -and (Test-Path -LiteralPath $envExampleFile)) {
  Copy-Item -LiteralPath $envExampleFile -Destination $envFile
  exit 1
}

$escapedServerPath = [regex]::Escape($serverPath)
$existing = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object {
  $_.CommandLine -match $escapedServerPath
}

if ($existing) {
  exit 0
}

Start-Process -FilePath node -ArgumentList "`"$serverPath`"" -WorkingDirectory $repoRoot -WindowStyle Hidden
