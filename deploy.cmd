@echo off
cd /d "%~dp0"
echo ========================================
echo   Deploy: Sync Obsidian ^> Build ^> Push ^> Server
echo ========================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\deploy.ps1 %*
if %errorlevel% neq 0 (
  echo.
  echo Deploy failed. Check the output above.
  pause
  exit /b %errorlevel%
)
echo.
pause
