@echo off
echo ========================================
echo Puzzle - Deploy All Changes
echo ========================================
echo.

REM Step 1: Generate version
echo [1/5] Generating version...
node scripts/generate-version.js
if errorlevel 1 (
    echo ERROR: Failed to generate version
    pause
    exit /b 1
)
echo ✓ Version generated
echo.

REM Step 2: Build the app
echo [2/5] Building application...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo ✓ Build completed
echo.

REM Step 3: Git add all changes
echo [3/5] Adding changes to git...
git add -A
if errorlevel 1 (
    echo ERROR: Git add failed
    pause
    exit /b 1
)
echo ✓ Changes staged
echo.

REM Step 4: Commit changes
echo [4/5] Committing changes...
git commit -m "Add History nav link, favicon, and fix project card 0%% allocation styling"
if errorlevel 1 (
    echo WARNING: Nothing to commit or commit failed
    echo Continuing anyway...
)
echo ✓ Changes committed
echo.

REM Step 5: Push to GitHub
echo [5/5] Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo ERROR: Git push failed
    pause
    exit /b 1
)
echo ✓ Pushed to GitHub
echo.

echo ========================================
echo ✓ DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Changes have been:
echo   - Built and optimized
echo   - Committed to git
echo   - Pushed to GitHub
echo.
echo Vercel will automatically deploy to production.
echo Check: https://vercel.com/your-project
echo.
pause
