$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$relayPort = 8787

$ngrokCommand = Get-Command ngrok -ErrorAction Stop
$escapedNgrok = [regex]::Escape($ngrokCommand.Source)
$existing = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -like 'ngrok*' -or ($_.CommandLine -match $escapedNgrok -and $_.CommandLine -match '\bhttp\b' -and $_.CommandLine -match '\b8787\b')
}

if ($existing) {
  exit 0
}

Start-Process -FilePath $ngrokCommand.Source -ArgumentList @('http', "$relayPort") -WorkingDirectory $repoRoot -WindowStyle Hidden
