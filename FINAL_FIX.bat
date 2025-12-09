@echo off
echo ========================================
echo FINAL FIX - Commit version.ts
echo ========================================
echo.

cd /d "%~dp0"

echo Adding ALL files including version.ts...
git add -A

echo.
echo Committing...
git commit -m "FINAL FIX: Add version.ts with APP_VERSION to repo"

echo.
echo Pushing...
git push origin main

echo.
echo ========================================
echo NOW GO TO VERCEL DASHBOARD
echo ========================================
echo.
echo 1. Go to: https://vercel.com/dashboard
echo 2. Find your project
echo 3. Click "..." menu on latest deployment
echo 4. Click "Redeploy"
echo 5. Wait 2-3 minutes
echo.
echo This will force Vercel to use the LATEST commit!
echo.
pause
