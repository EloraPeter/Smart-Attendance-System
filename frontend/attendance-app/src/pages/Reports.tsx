import React, { useEffect, useState, useCallback } from 'react';
import { pb, Course, Student } from '../lib/pocketbase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { DocumentArrowDownIcon, PrinterIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface ReportData {
  student: Student;
  present: number;
  late: number;
  absent: number;
  total: number;
  percentage: number;
}

const Reports: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState({ totalStudents: 0, averageAttendance: 0, totalClasses: 0 });
  const [sortBy, setSortBy] = useState<'name' | 'percentage'>('percentage');

  const fetchCourses = useCallback(async () => {
    try {
      let filter = '';
      if (!isAdmin && user) {
        filter = `lecturer = "${user.id}"`;
      }
      const result = await pb.collection('courses').getList(1, 100, { filter });
      const courseItems = result.items as unknown as Course[];
      setCourses(courseItems);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    }
  }, [isAdmin, user]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Helper function to escape HTML
  const escapeHtml = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const generateReport = async () => {
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }

    setIsLoading(true);

    try {
      // Get enrolled students
      const enrollments = await pb.collection('course_enrollments').getList(1, 500, {
        filter: `course = "${selectedCourse}"`,  // Fixed: Use backticks
        expand: 'student',
      });

      const students = enrollments.items
        .map((e: any) => e.expand?.student)
        .filter((student: any) => student !== null && student !== undefined);

      if (students.length === 0) {
        toast.error('No students enrolled in this course');
        setIsLoading(false);
        return;
      }

      // Build attendance filter
      let attendanceFilter = `course = "${selectedCourse}"`;  // Fixed: Use backticks

      // Format dates properly for PocketBase
      if (startDate) {
        let formattedStartDate = startDate;
        if (startDate.includes('/')) {
          const parts = startDate.split('/');
          formattedStartDate = `${parts[2]}-${parts[1]}-${parts[0]}`;  // Fixed: Use backticks
        }
        attendanceFilter += ` && date >= "${formattedStartDate}"`;  // Fixed: Use backticks
      }
      if (endDate) {
        let formattedEndDate = endDate;
        if (endDate.includes('/')) {
          const parts = endDate.split('/');
          formattedEndDate = `${parts[2]}-${parts[1]}-${parts[0]}`;  // Fixed: Use backticks
        }
        attendanceFilter += ` && date <= "${formattedEndDate}"`;  // Fixed: Use backticks
      }

      console.log('Attendance filter:', attendanceFilter);

      const attendanceRecords = await pb.collection('attendance').getList(1, 5000, {
        filter: attendanceFilter,
        sort: '-date',
      });

      console.log('Found attendance records:', attendanceRecords.items.length);

      // Calculate stats per student
      let report: ReportData[] = students.map((student: Student) => {
        const studentRecords = attendanceRecords.items.filter((r: any) => r.student === student.id);
        const present = studentRecords.filter((r: any) => r.status === 'present').length;
        const late = studentRecords.filter((r: any) => r.status === 'late').length;
        const absent = studentRecords.filter((r: any) => r.status === 'absent').length;
        const total = studentRecords.length;
        const percentage = total > 0 ? ((present + late) / total) * 100 : 0;

        return { student, present, late, absent, total, percentage };
      });

      // Sort based on selected option
      if (sortBy === 'name') {
        report.sort((a, b) => a.student.full_name.localeCompare(b.student.full_name));
      } else {
        report.sort((a, b) => b.percentage - a.percentage);
      }

      setReportData(report);

      // Calculate summary
      const totalStudents = report.length;
      const avgAttendance = totalStudents > 0
        ? report.reduce((sum, r) => sum + r.percentage, 0) / totalStudents
        : 0;

      const uniqueDates: string[] = [];
      attendanceRecords.items.forEach((r: any) => {
        if (!uniqueDates.includes(r.date)) {
          uniqueDates.push(r.date);
        }
      });

      setSummary({
        totalStudents,
        averageAttendance: avgAttendance,
        totalClasses: uniqueDates.length
      });

      if (report.length > 0 && attendanceRecords.items.length > 0) {
        toast.success(`Report generated with ${attendanceRecords.items.length} attendance records`);  // Fixed: Use backticks
      } else if (attendanceRecords.items.length === 0) {
        toast('No attendance records found for selected period', { icon: '📊' });
      }

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };



  const exportToCSV = () => {
    if (reportData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const course = courses.find(c => c.id === selectedCourse);
    const headers = ['Matric Number', 'Full Name', 'Department', 'Level', 'Present', 'Late', 'Absent', 'Total Classes', 'Percentage (%)'];
    const rows = reportData.map(r => [
      r.student.matric_number,
      r.student.full_name,
      r.student.department,
      r.student.level,
      r.present,
      r.late,
      r.absent,
      r.total,
      r.percentage.toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${course?.course_code || 'report'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const printReport = () => {
    if (reportData.length === 0) {
      toast.error('No data to print');
      return;
    }

    const course = courses.find(c => c.id === selectedCourse);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print');
      return;
    }

    // Safe access with fallbacks
    const courseCode = course?.course_code || 'N/A';
    const courseTitle = course?.title || 'N/A';
    const userName = user?.name || user?.email || 'System';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance Report - ${escapeHtml(courseCode)}</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              margin: 40px; 
              background: white;
            }
            h1 { color: #1e3a8a; margin-bottom: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { 
              margin: 20px 0; 
              padding: 15px; 
              background: #f3f4f6; 
              border-radius: 8px;
              display: flex;
              justify-content: space-around;
              text-align: center;
            }
            .summary-item {
              flex: 1;
            }
            .summary-value {
              font-size: 24px;
              font-weight: bold;
              color: #1e3a8a;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px; 
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: left; 
            }
            th { 
              background-color: #3b82f6; 
              color: white; 
              font-weight: 600;
            }
            tr:nth-child(even) { background-color: #f9fafb; }
            .footer { 
              margin-top: 30px; 
              text-align: center; 
              font-size: 12px; 
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .good { color: #16a34a; font-weight: bold; }
            .warning { color: #eab308; font-weight: bold; }
            .danger { color: #dc2626; font-weight: bold; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Attendance Report</h1>
            <p><strong>Course:</strong> ${escapeHtml(courseCode)} - ${escapeHtml(courseTitle)}</p>
            <p><strong>Period:</strong> ${startDate || 'Start'} to ${endDate || 'Present'}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div class="summary">
            <div class="summary-item">
              <div class="summary-value">${summary.totalStudents}</div>
              <div>Total Students</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${summary.totalClasses}</div>
              <div>Total Classes</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${summary.averageAttendance.toFixed(2)}%</div>
              <div>Average Attendance</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Matric No.</th>
                <th>Name</th>
                <th class="text-center">Present</th>
                <th class="text-center">Late</th>
                <th class="text-center">Absent</th>
                <th class="text-center">Total</th>
                <th class="text-center">%</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(r => `
                <tr>
                  <td>${escapeHtml(r.student.matric_number)}</td>
                  <td>${escapeHtml(r.student.full_name)}</td>
                  <td class="text-center">${r.present}</td>
                  <td class="text-center">${r.late}</td>
                  <td class="text-center">${r.absent}</td>
                  <td class="text-center">${r.total}</td>
                  <td class="text-center ${r.percentage >= 75 ? 'good' : r.percentage >= 50 ? 'warning' : 'danger'}">
                    ${r.percentage.toFixed(2)}%
                  </td>
                </table>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>Attendance Management System - Automated Report</p>
            <p>Report generated by ${escapeHtml(userName)}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getPercentageColor = (percentage: number): string => {
    if (percentage >= 75) return 'text-green-600 font-bold';
    if (percentage >= 50) return 'text-yellow-600 font-bold';
    return 'text-red-600 font-bold';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1>
        <p className="text-gray-600 mt-1">Generate and export attendance reports</p>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setReportData([]);
              }}
              className="input-field"
            >
              <option value="">-- Select a course --</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.course_code} - {course.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date (Optional)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date (Optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'percentage')}
              className="input-field"
            >
              <option value="percentage">Sort by Percentage (Highest First)</option>
              <option value="name">Sort by Name (A-Z)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setReportData([]);
                toast.success('Filters cleared');
              }}
              className="w-full btn-secondary flex items-center justify-center"
            >
              Clear Filters
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={isLoading || !selectedCourse}
              className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> Generating...</>
              ) : (
                <><ChartBarIcon className="w-5 h-5 mr-2" /> Generate Report</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Report Results */}
      {reportData.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-3xl font-bold text-gray-900">{summary.totalStudents}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <p className="text-sm text-gray-600">Average Attendance</p>
              <p className="text-3xl font-bold text-primary-600">{summary.averageAttendance.toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <p className="text-sm text-gray-600">Total Classes Held</p>
              <p className="text-3xl font-bold text-blue-600">{summary.totalClasses}</p>
            </div>
          </div>

          <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
            <strong>ℹ️ Note:</strong> Attendance percentage = (Present + Late) / Total Classes × 100%
          </div>

          {/* Export Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={exportToCSV}
              className="btn-secondary flex items-center"
            >
              <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
              Export CSV
            </button>
            <button
              onClick={printReport}
              className="btn-secondary flex items-center"
            >
              <PrinterIcon className="w-5 h-5 mr-2" />
              Print Report
            </button>
          </div>

          {/* Report Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matric No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Late</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map((item, index) => (
                    <tr key={item.student.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.student.matric_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.student.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-green-600 font-medium">
                        {item.present}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-yellow-600 font-medium">
                        {item.late}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-red-600 font-medium">
                        {item.absent}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                        {item.total}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className={getPercentageColor(item.percentage)}>
                          {item.percentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>* Students with attendance below 75% may be at risk</p>
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && selectedCourse && reportData.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <ChartBarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Click "Generate Report" to view attendance data</p>
        </div>
      )}
    </div>
  );
};

export default Reports;