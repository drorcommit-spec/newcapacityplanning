@echo off
echo ========================================
echo Restarting Dev Server with Version Info
echo ========================================
echo.
echo Current version: 1.2.2 (c103a3b)
echo.
echo This will:
echo 1. Stop any running dev server
echo 2. Start the dev server
echo 3. Open browser to check version
echo.
pause

echo.
echo Starting dev server...
echo.
echo Look for version in BOTTOM-LEFT corner:
echo v1.2.2 (c103a3b) ^| 🟢 Dev
echo.

start cmd /k "cd /d %~dp0 && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo Opening browser...
start http://localhost:5174

echo.
echo ========================================
echo Check the bottom-left corner!
echo ========================================
echo.
echo You should see: v1.2.2 (c103a3b) ^| 🟢 Dev
echo.
echo If you don't see it:
echo 1. Hard refresh: Ctrl+Shift+R
echo 2. Clear cache: Ctrl+Shift+Delete
echo 3. Check browser console for errors
echo.
pause
