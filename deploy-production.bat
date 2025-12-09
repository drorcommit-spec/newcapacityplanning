@echo off
echo ========================================
echo Product Capacity Platform - Production Deployment
echo ========================================
echo.
echo Current version: 1.2.2
echo.
echo This script will:
echo 1. Commit all changes
echo 2. Push to main branch
echo 3. Trigger automatic Vercel deployment
echo.
pause

echo.
echo Step 1: Adding all changes...
git add .

echo.
echo Step 2: Committing changes...
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=v1.2.2 - Production release

git commit -m "%commit_msg%"

echo.
echo Step 3: Pushing to main branch...
git push origin main

echo.
echo ========================================
echo Deployment initiated!
echo ========================================
echo.
echo Vercel will automatically deploy from main branch.
echo This usually takes 2-3 minutes.
echo.
echo Check deployment status at:
echo https://vercel.com/dashboard
echo.
echo Production URL:
echo https://newcapacityplanning.vercel.app
echo.
echo ========================================
echo IMPORTANT: Verify after deployment
echo ========================================
echo 1. No debug alerts when adding allocations
echo 2. Inline project creation works
echo 3. Copy member shows all allocations
echo 4. Dashboard KPI subtitle is correct
echo.
pause
