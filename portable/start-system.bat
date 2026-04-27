@echo off
title Attendance Management System
color 0A

echo ========================================
echo    ATTENDANCE MANAGEMENT SYSTEM
echo ========================================
echo.
echo Starting PocketBase database server...
echo.

cd backend
start /B pocketbase serve --http=127.0.0.1:8090

echo Waiting for database to start...
timeout /t 3 /nobreak >nul

echo.
echo Starting web application...
echo.

cd ../frontend/attendance-app
start /B npx serve -s build -l 3000

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo    SYSTEM IS RUNNING!
echo ========================================
echo.
echo Access the system at: http://localhost:3000
echo.
echo Login credentials:
echo   Lecturer: lecturer@demo.com / lecturer123
echo   Admin:    admin@demo.com / admin123
echo.
echo Close this window to stop the system.
echo.

start http://localhost:3000

pause >nul