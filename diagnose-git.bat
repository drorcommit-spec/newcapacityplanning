@echo off
echo ========================================
echo Git Push Diagnostics
echo ========================================
echo.

echo 1. Checking Git Status...
echo ----------------------------------------
git status
echo.

echo 2. Checking Uncommitted Changes...
echo ----------------------------------------
git diff --stat
echo.

echo 3. Checking Staged Changes...
echo ----------------------------------------
git diff --cached --stat
echo.

echo 4. Checking Remote Connection...
echo ----------------------------------------
git remote -v
echo.

echo 5. Checking Current Branch...
echo ----------------------------------------
git branch
echo.

echo 6. Checking Last Commit...
echo ----------------------------------------
git log -1 --oneline
echo.

echo 7. Checking if Ahead/Behind Remote...
echo ----------------------------------------
git status -sb
echo.

echo ========================================
echo Common Issues and Solutions:
echo ========================================
echo.
echo Issue 1: "Everything up-to-date"
echo   - No new commits to push
echo   - Solution: Make sure you committed changes first
echo   - Run: git add . && git commit -m "message"
echo.
echo Issue 2: "Failed to push"
echo   - Remote has changes you don't have
echo   - Solution: Pull first, then push
echo   - Run: git pull origin main
echo.
echo Issue 3: "Authentication failed"
echo   - Git credentials expired
echo   - Solution: Re-authenticate with GitHub
echo   - Run: git config --global credential.helper wincred
echo.
echo Issue 4: "Permission denied"
echo   - SSH key or token issue
echo   - Solution: Use HTTPS or update SSH key
echo.
echo Issue 5: "Rejected - non-fast-forward"
echo   - Remote has commits you don't have
echo   - Solution: Pull and merge first
echo   - Run: git pull --rebase origin main
echo.
pause
