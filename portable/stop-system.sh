#!/bin/bash
echo "Stopping Attendance Management System..."
pkill -f pocketbase
pkill -f serve
echo "System stopped."