@echo off
echo Stopping Attendance Management System...
taskkill /F /IM pocketbase.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
echo System stopped.
pause