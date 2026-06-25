@echo off
setlocal
cd /d "%~dp0"

if not exist "hue-relay\.env" (
  echo No Hue relay .env found.
  echo.
  echo Creating hue-relay\.env from hue-relay\.env.example...
  copy "hue-relay\.env.example" "hue-relay\.env" >nul
  echo.
  echo Edit hue-relay\.env, add your HUE_USERNAME and HUE_RELAY_SECRET, then run this again.
  echo.
  pause
  exit /b 1
)

echo Starting NoA Hue Relay...
echo Keep this window open while using Hue from NoA.
echo.
node "hue-relay\server.js"
pause
