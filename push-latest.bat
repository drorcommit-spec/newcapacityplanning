@echo off
echo.
echo ========================================
echo Pushing Latest Changes to GitHub
echo ========================================
echo.

set GIT="C:\Program Files\Git\bin\git.exe"

echo Staging all changes...
%GIT% add .

echo.
echo Committing changes...
%GIT% commit -m "Add capacity warnings, allocation sorting, and team multi-select filter"

echo.
echo Pushing to capacityplanning repository...
%GIT% push vercel-repo main

echo.
echo Pushing to Capacity_Planning repository...
%GIT% push origin main

echo.
echo ========================================
echo Successfully pushed to GitHub!
echo ========================================
echo.
echo Changes included:
echo - HubSpot email import feature
echo - Region and Activity Close Date fields
echo - Project max capacity warnings
echo - Allocation sorting by size
echo - Team multi-select filter with "No Team" option
echo - TypeScript error fixes
echo.
pause
