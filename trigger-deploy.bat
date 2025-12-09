@echo off
echo ========================================
echo Trigger New Vercel Deployment
echo ========================================
echo.

cd /d "%~dp0"

echo Creating a small change to trigger deployment...
echo.

REM Add a comment to package.json to trigger a new commit
echo // Trigger deployment > .deploy-trigger

echo Adding files...
git add .deploy-trigger

echo.
echo Committing...
git commit -m "Trigger Vercel deployment with latest changes"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo Cleaning up...
del .deploy-trigger

echo.
echo ========================================
echo Deployment Triggered!
echo ========================================
echo.
echo Vercel will now build with the LATEST commit.
echo This should include all the version.ts fixes.
echo.
echo Wait 2-3 minutes, then check:
echo https://vercel.com/dashboard
echo.
echo The build should succeed this time!
echo.
pause
