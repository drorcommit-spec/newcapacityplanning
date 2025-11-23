@echo off
echo Starting Product Capacity Planning Platform...
echo.

echo Installing dependencies...
cd server
call npm install
cd ..

echo.
echo Starting backend server...
start "Backend Server" cmd /k "cd server && npm start"

timeout /t 3 /nobreak > nul

echo Starting frontend...
start "Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5175
echo ========================================
echo.
echo Press any key to close this window...
pause > nul
