@echo off
echo ========================================
echo Restarting Development Environment
echo ========================================

echo.
echo Step 1: Killing existing Node processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo   - Node processes killed
) else (
    echo   - No Node processes found
)

echo.
echo Step 2: Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo Step 3: Starting Backend Server...
cd server
start "Backend Server" cmd /k "node server.js"
cd ..

echo.
echo Step 4: Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo Step 5: Starting Frontend Dev Server...
start "Frontend Dev Server" cmd /k "npm run dev"

echo.
echo ========================================
echo Development Environment Started!
echo ========================================
echo.
echo Backend:  http://localhost:3002
echo Frontend: Check the Frontend window for the URL
echo           (usually http://localhost:5173 or 5174)
echo.
echo Press any key to close this window...
pause >nul
