@echo off
echo ========================================
echo Commit and Deploy Version 1.2.2
echo ========================================
echo.
echo This will:
echo 1. Add all new files (version system, docs, etc.)
echo 2. Commit with message "v1.2.2 - Add version tracking system"
echo 3. Push to GitHub
echo 4. Trigger Vercel deployment
echo.
pause

echo.
echo Step 1: Adding all files...
git add .

echo.
echo Step 2: Committing changes...
git commit -m "v1.2.2 - Add version tracking system and bug fixes"

echo.
echo Step 3: Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo Deployment Initiated!
echo ========================================
echo.
echo Vercel will automatically deploy in 2-3 minutes.
echo.
echo Check deployment status:
echo https://vercel.com/dashboard
echo.
echo Production URL:
echo https://newcapacityplanning.vercel.app
echo.
echo After deployment, check bottom-left corner:
echo Should show: v1.2.2 (new-hash) ^| 🔵 Prod
echo.
echo ========================================
echo IMPORTANT: Clear browser cache!
echo ========================================
echo Press Ctrl+Shift+Delete in browser
echo Or use Incognito/Private mode
echo.
pause
