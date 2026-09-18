@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem MeetHalfway Windows launcher.
rem IMPORTANT: Extract the entire ZIP before running this file.

if not exist "package.json" (
  echo [ERROR] package.json was not found.
  echo [ERROR] Do not run this CMD from inside the ZIP archive.
  echo [INFO]  Right-click the ZIP, choose Extract All, then run this CMD in the extracted folder.
  echo.
  pause
  exit /b 1
)

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Windows PowerShell was not found.
  pause
  exit /b 1
)

set "PROJECT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$p=$env:PROJECT_DIR; Get-ChildItem -LiteralPath $p -Recurse -File -ErrorAction SilentlyContinue ^| Unblock-File -ErrorAction SilentlyContinue" >nul 2>nul

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\github-bootstrap.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo [ERROR] Deployment bootstrap stopped with exit code %EXIT_CODE%.
  echo [INFO]  Read ADMIN_SETUP.md and GITHUB_PAGES.md for recovery steps.
) else (
  echo [OK] Deployment bootstrap finished.
)
echo.
pause
exit /b %EXIT_CODE%
