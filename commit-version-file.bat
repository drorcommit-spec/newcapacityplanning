@echo off
echo ========================================
echo Commit version.ts to Fix Build
echo ========================================
echo.

cd /d "%~dp0"

echo Adding version.ts and .gitignore...
git add src/version.ts .gitignore

echo.
echo Committing...
git commit -m "Fix build: Add version.ts to repository"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo Done!
echo ========================================
echo.
echo Vercel will now rebuild automatically.
echo Wait 2-3 minutes, then check:
echo https://newcapacityplanning.vercel.app
echo.
echo Bottom-left should show: v1.2.2 (commit-hash) ^| 🔵 Prod
echo.
pause
