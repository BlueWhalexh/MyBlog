@echo off
cd /d "%~dp0"
echo === Obsidian Sync ===
node scripts/sync.mjs
if %errorlevel% neq 0 (
  echo Sync failed, skipping build.
  pause
  exit /b %errorlevel%
)
echo.
echo === Quartz Build ===
npx quartz build
echo.
echo === Done ===
pause
