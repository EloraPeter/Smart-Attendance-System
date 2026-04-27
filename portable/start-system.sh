#!/bin/bash
echo "========================================"
echo "   ATTENDANCE MANAGEMENT SYSTEM"
echo "========================================"
echo ""

cd backend
./pocketbase serve --http=127.0.0.1:8090 &
PB_PID=$!

sleep 3

cd ../frontend/attendance-app
npx serve -s build -l 3000 &
WEB_PID=$!

echo ""
echo "System is running!"
echo "Access at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"

wait $WEB_PID