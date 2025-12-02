@echo off
echo Updating git remote URL...
git remote set-url origin https://github.com/drorcommit-spec/newcapacityplanning.git
echo.
echo Current remote URL:
git remote -v
echo.
echo Press any key to push to GitHub...
pause
git push origin main
