@echo off
setlocal
cd /d "%~dp0"

set "PS1_PATH=%~dp0hue-relay\start-hidden.ps1"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_DIR%\NoA Hue Relay.lnk"

if not exist "%PS1_PATH%" (
  echo Could not find:
  echo %PS1_PATH%
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$shell = New-Object -ComObject WScript.Shell; $shortcut = $shell.CreateShortcut('%SHORTCUT_PATH%'); $shortcut.TargetPath = 'powershell.exe'; $shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%PS1_PATH%""'; $shortcut.WorkingDirectory = '%~dp0'; $shortcut.IconLocation = 'powershell.exe,0'; $shortcut.WindowStyle = 7; $shortcut.Save()"

if errorlevel 1 (
  echo Failed to create the startup shortcut.
  pause
  exit /b 1
)

echo Installed startup shortcut:
echo %SHORTCUT_PATH%
echo It will run automatically on sign-in.
pause
