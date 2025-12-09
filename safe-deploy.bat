@echo off
echo ========================================
echo Safe Deployment Script
echo ========================================
echo.
echo This script will:
echo 1. Check for uncommitted changes
echo 2. Pull latest changes from remote
echo 3. Add and commit your changes
echo 4. Push to GitHub
echo 5. Handle common errors
echo.
pause

echo.
echo Step 1: Checking Git Status...
echo ----------------------------------------
git status

echo.
echo Step 2: Checking for uncommitted changes...
echo ----------------------------------------
git diff --quiet
if %ERRORLEVEL% NEQ 0 (
    echo Found uncommitted changes. Adding them...
    git add .
    
    echo.
    set /p commit_msg="Enter commit message (or press Enter for default): "
    if "%commit_msg%"=="" set commit_msg=v1.2.2 - Version tracking and bug fixes
    
    echo Committing with message: %commit_msg%
    git commit -m "%commit_msg%"
) else (
    echo No uncommitted changes found.
    git diff --cached --quiet
    if %ERRORLEVEL% NEQ 0 (
        echo Found staged changes. Committing...
        set /p commit_msg="Enter commit message (or press Enter for default): "
        if "%commit_msg%"=="" set commit_msg=v1.2.2 - Version tracking and bug fixes
        git commit -m "%commit_msg%"
    ) else (
        echo No changes to commit.
        echo Checking if we're ahead of remote...
    )
)

echo.
echo Step 3: Pulling latest changes from remote...
echo ----------------------------------------
git pull origin main --rebase
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️  WARNING: Pull failed or conflicts detected!
    echo.
    echo Please resolve conflicts manually:
    echo 1. Check git status
    echo 2. Resolve conflicts in files
    echo 3. Run: git add .
    echo 4. Run: git rebase --continue
    echo 5. Run this script again
    echo.
    pause
    exit /b 1
)

echo.
echo Step 4: Pushing to GitHub...
echo ----------------------------------------
git push origin main
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Push failed!
    echo.
    echo Common reasons:
    echo 1. Authentication issue - Check your GitHub credentials
    echo 2. Remote has changes - Already pulled, so this is unusual
    echo 3. Network issue - Check your internet connection
    echo.
    echo Try these solutions:
    echo 1. Check GitHub authentication: git config --list
    echo 2. Try push with verbose: git push origin main --verbose
    echo 3. Check remote URL: git remote -v
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ Deployment Successful!
echo ========================================
echo.
echo Your changes have been pushed to GitHub.
echo Vercel will automatically deploy in 2-3 minutes.
echo.
echo Check deployment status:
echo https://vercel.com/dashboard
echo.
echo Production URL:
echo https://newcapacityplanning.vercel.app
echo.
echo After deployment:
echo 1. Clear browser cache (Ctrl+Shift+Delete)
echo 2. Check bottom-left corner for version
echo 3. Should show: v1.2.2 (commit-hash) ^| 🔵 Prod
echo.
echo ========================================
pause
