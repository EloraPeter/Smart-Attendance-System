import React, { useEffect, useState, useCallback } from 'react';
import { pb, Course, Student } from '../lib/pocketbase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  MagnifyingGlassIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon 
} from '@heroicons/react/24/outline';

const MarkAttendance: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasMarkedToday, setHasMarkedToday] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingAttendanceRecords, setExistingAttendanceRecords] = useState<any[]>([]);

  useEffect(() => {
    fetchCourses();
  }, []);

  // Reload when course or date changes
  useEffect(() => {
    if (selectedCourse) {
      loadAttendanceData();
    }
  }, [selectedCourse, selectedDate]);

  const fetchCourses = useCallback(async () => {
    try {
      let filter = '';
      if (!isAdmin && user) {
        filter = `lecturer = "${user.id}"`;
      }
      const result = await pb.collection('courses').getList(1, 100, {
        filter,
        expand: 'lecturer',
      });
      const courseItems = result.items as unknown as Course[];
      setCourses(courseItems);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    }
  }, [isAdmin, user]);

  const loadAttendanceData = async () => {
    if (!selectedCourse) return;
    
    try {
      setIsLoading(true);
      
      // Get enrolled students
      const enrollments = await pb.collection('course_enrollments').getList(1, 500, {
        filter: `course = "${selectedCourse}"`,
        expand: 'student',
      });
      
      const enrolledStudents = enrollments.items
        .map((e: any) => e.expand?.student)
        .filter(Boolean);
      setStudents(enrolledStudents);
      
      // Check existing attendance for this date
      const dateStr = selectedDate;
      const existingAttendance = await pb.collection('attendance').getList(1, 500, {
        filter: `course = "${selectedCourse}" && date = "${dateStr}"`,
      });
      
      setExistingAttendanceRecords(existingAttendance.items);
      
      if (existingAttendance.items.length > 0) {
        setHasMarkedToday(true);
        const statusMap: Record<string, string> = {};
        existingAttendance.items.forEach((record: any) => {
          statusMap[record.student] = record.status;
        });
        setAttendanceStatus(statusMap);
      } else {
        setHasMarkedToday(false);
        const initialStatus: Record<string, string> = {};
        enrolledStudents.forEach((student: Student) => {
          initialStatus[student.id] = '';
        });
        setAttendanceStatus(initialStatus);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load student data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: string) => {
    if (hasMarkedToday) {
      toast.error('Attendance already marked for this date. Change the date to edit.');
      return;
    }
    setAttendanceStatus((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }

    if (hasMarkedToday) {
      toast.error(`Attendance already marked for ${selectedDate}. Please select a different date.`);
      return;
    }

    // Count how many students have been marked
    const markedStudents = Object.entries(attendanceStatus).filter(([_, status]) => status && status !== '');
    if (markedStudents.length === 0) {
      toast.error('Please mark attendance for at least one student');
      return;
    }

    setSaving(true);

    try {
      // Delete any existing attendance for this date/course (safety check)
      if (existingAttendanceRecords.length > 0) {
        for (const record of existingAttendanceRecords) {
          await pb.collection('attendance').delete(record.id);
        }
      }

      // Create new attendance records
      const attendanceRecords = Object.entries(attendanceStatus)
        .filter(([_, status]) => status && status !== '')
        .map(([studentId, status]) => ({
          student: studentId,
          course: selectedCourse,
          date: selectedDate,
          status: status,
          timestamp: new Date().toISOString(),
          lecturer: user?.id,
        }));

      // Save all records
      for (const record of attendanceRecords) {
        await pb.collection('attendance').create(record);
      }
      
      toast.success(`✅ Attendance saved for ${attendanceRecords.length} students on ${selectedDate}`);
      
      // IMPORTANT: Reload the data to show saved status
      await loadAttendanceData();
      
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      toast.error(error.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter((student) =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.matric_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const presentCount = Object.values(attendanceStatus).filter(s => s === 'present').length;
  const lateCount = Object.values(attendanceStatus).filter(s => s === 'late').length;
  const absentCount = Object.values(attendanceStatus).filter(s => s === 'absent').length;
  const markedCount = presentCount + lateCount + absentCount;

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
        <p className="text-gray-600 mt-1">Record student attendance for your courses</p>
      </div>

      {/* Selection Panel */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="input-field"
            >
              <option value="">-- Choose a course --</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.course_code} - {course.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field"
            />
            {isToday && !hasMarkedToday && (
              <p className="text-xs text-green-600 mt-1">✓ Today's attendance - You can mark now</p>
            )}
            {hasMarkedToday && (
              <p className="text-xs text-blue-600 mt-1">ℹ Attendance already recorded for this date</p>
            )}
          </div>
        </div>
      </div>

      {selectedCourse && (
        <>
          {/* Summary Bar */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex flex-wrap gap-4">
                <div className="text-center min-w-[70px]">
                  <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                  <p className="text-xs text-gray-600">Present</p>
                </div>
                <div className="text-center min-w-[70px]">
                  <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
                  <p className="text-xs text-gray-600">Late</p>
                </div>
                <div className="text-center min-w-[70px]">
                  <p className="text-2xl font-bold text-red-600">{absentCount}</p>
                  <p className="text-xs text-gray-600">Absent</p>
                </div>
                <div className="text-center min-w-[70px]">
                  <p className="text-2xl font-bold text-gray-600">{students.length}</p>
                  <p className="text-xs text-gray-600">Enrolled</p>
                </div>
              </div>
              {!hasMarkedToday && markedCount > 0 && (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="btn-primary flex items-center"
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> Saving...</>
                  ) : (
                    <><CheckCircleIcon className="w-5 h-5 mr-2" /> Save Attendance ({markedCount})</>
                  )}
                </button>
              )}
              {hasMarkedToday && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                  Attendance recorded for {selectedDate}
                </span>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or matric number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Student List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matric No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Full Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="inline-flex items-center">
                          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                          Loading students...
                        </div>
                       </td>
                    </tr>
                  ) : filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.matric_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {student.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasMarkedToday ? (
                          // Show status as text when already marked
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                            attendanceStatus[student.id] === 'present' ? 'bg-green-100 text-green-700' :
                            attendanceStatus[student.id] === 'late' ? 'bg-yellow-100 text-yellow-700' :
                            attendanceStatus[student.id] === 'absent' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {attendanceStatus[student.id] ? attendanceStatus[student.id].toUpperCase() : 'NOT MARKED'}
                          </span>
                        ) : (
                          // Show buttons when editable
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleStatusChange(student.id, 'present')}
                              className={`p-2 rounded-lg transition-all ${
                                attendanceStatus[student.id] === 'present'
                                  ? 'bg-green-500 text-white shadow-md ring-2 ring-green-300'
                                  : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                              }`}
                              title="Present"
                            >
                              <CheckCircleIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(student.id, 'late')}
                              className={`p-2 rounded-lg transition-all ${
                                attendanceStatus[student.id] === 'late'
                                  ? 'bg-yellow-500 text-white shadow-md ring-2 ring-yellow-300'
                                  : 'bg-gray-100 text-gray-400 hover:bg-yellow-100 hover:text-yellow-600'
                              }`}
                              title="Late"
                            >
                              <ClockIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(student.id, 'absent')}
                              className={`p-2 rounded-lg transition-all ${
                                attendanceStatus[student.id] === 'absent'
                                  ? 'bg-red-500 text-white shadow-md ring-2 ring-red-300'
                                  : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'
                              }`}
                              title="Absent"
                            >
                              <XCircleIcon className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!isLoading && filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        {searchTerm ? 'No students match your search' : 'No students enrolled in this course'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MarkAttendance;