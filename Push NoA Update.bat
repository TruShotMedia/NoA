@echo off
setlocal
cd /d "%~dp0"

set "BASH_EXE="

where bash >nul 2>nul
if %errorlevel% equ 0 (
  set "BASH_EXE=bash"
)

if "%BASH_EXE%"=="" if exist "C:\Program Files\Git\bin\bash.exe" (
  set "BASH_EXE=C:\Program Files\Git\bin\bash.exe"
)

if "%BASH_EXE%"=="" if exist "C:\Program Files\Git\usr\bin\bash.exe" (
  set "BASH_EXE=C:\Program Files\Git\usr\bin\bash.exe"
)

if "%BASH_EXE%"=="" (
  echo Git Bash was not found.
  echo Install Git for Windows, then run this again.
  pause
  exit /b 1
)

"%BASH_EXE%" "%~dp0push-update.sh"
pause
