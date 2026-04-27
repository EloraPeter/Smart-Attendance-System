========================================
  ATTENDANCE MANAGEMENT SYSTEM
  Version 1.0 - Complete Solution
========================================

SYSTEM REQUIREMENTS:
- Windows 10/11, Mac OS, or Linux
- 4GB RAM minimum
- 500MB free disk space

QUICK START:

1. Make sure PocketBase is in the 'backend' folder
2. Double-click 'start-system.bat'
3. Wait for browser to open automatically
4. Login with:
   Email: lecturer@demo.com
   Password: lecturer123

OR for admin access:
   Email: admin@demo.com
   Password: admin123

FEATURES:
✅ Student Management (Add/Edit/Delete)
✅ Course Management with Enrollment
✅ Mark Attendance (Present/Absent/Late)
✅ Automatic Percentage Calculation
✅ Generate Reports (CSV/Print)
✅ Real-time Updates
✅ Responsive Design

HOW TO USE:

1. FIRST TIME:
   - Start the system using start-system.bat
   - Login with provided credentials
   - Add students to the system
   - Create courses and assign lecturers
   - Enroll students in courses

2. MARKING ATTENDANCE:
   - Go to "Mark Attendance" from sidebar
   - Select a course from dropdown
   - Choose date (defaults to today)
   - Click Present/Late/Absent for each student
   - Click Save button to save attendance

3. REPORTS:
   - Go to "Reports" from sidebar
   - Select course and date range
   - Click "Generate Report"
   - Export to CSV or Print

4. MANAGING DATA:
   - Students: Add student profiles
   - Courses: Create courses and manage enrollment
   - Dashboard: View statistics and activity

DATA STORAGE:
- All data is stored in the 'backend/pb_data' folder
- Backup this folder to save your data
- To migrate to another computer, copy the entire folder

TROUBLESHOOTING:

❌ "Port already in use"
   → Close other applications using port 3000 or 8090
   → Restart your computer

❌ Browser doesn't open
   → Manually go to http://localhost:3000

❌ Cannot login
   → Make sure PocketBase is running (check task manager)
   → Default credentials: lecturer@demo.com / lecturer123

❌ Attendance not saving
   → Check that students are enrolled in the course
   → Make sure date is correct

TECHNICAL SUPPORT:
For issues, contact your system administrator.

========================================
  Developed with React + PocketBase
========================================