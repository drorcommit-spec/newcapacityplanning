@echo off
echo === GIT STATUS ===
git status
echo.
echo === LAST COMMIT ===
git log -1 --oneline
echo.
echo === REMOTE URL ===
git remote get-url origin
echo.
echo === UNPUSHED COMMITS ===
git log origin/main..HEAD --oneline
