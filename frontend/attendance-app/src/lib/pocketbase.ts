import PocketBase from 'pocketbase';

// Auto-detect PocketBase URL
const getPocketBaseUrl = () => {
  if (window.location.port === '3000') {
    return 'http://127.0.0.1:8090';
  }
  return process.env.REACT_APP_PB_URL || 'http://127.0.0.1:8090';
};

export const pb = new PocketBase(getPocketBaseUrl());

// IMPORTANT: Disable auto-cancellation to fix the "autocancelled" errors
pb.autoCancellation(false);

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'lecturer' | 'admin';
  created: string;
  updated: string;
  collectionId?: string;
  collectionName?: string;
}

export interface Student {
  id: string;
  matric_number: string;
  full_name: string;
  department: string;
  level: string;
  email?: string;
  phone?: string;
  created: string;
  updated: string;
  collectionId?: string;
  collectionName?: string;
}

export interface Course {
  id: string;
  course_code: string;
  title: string;
  unit: number;
  lecturer: string;
  lecturer_expand?: User;
  created: string;
  updated: string;
  collectionId?: string;
  collectionName?: string;
}

export interface Attendance {
  id: string;
  student: string;
  student_expand?: Student;
  course: string;
  course_expand?: Course;
  date: string;
  status: 'present' | 'absent' | 'late';
  timestamp: string;
  lecturer: string;
  lecturer_expand?: User;
  created: string;
  updated: string;
}

export interface CourseEnrollment {
  id: string;
  course: string;
  course_expand?: Course;
  student: string;
  student_expand?: Student;
  session: string;
  created: string;
  updated: string;
}

// Helper functions
export const getAttendanceStats = (attendance: Attendance[], studentId?: string) => {
  let filtered = attendance;
  if (studentId) {
    filtered = attendance.filter(a => a.student === studentId);
  }
  
  const present = filtered.filter(a => a.status === 'present').length;
  const late = filtered.filter(a => a.status === 'late').length;
  const absent = filtered.filter(a => a.status === 'absent').length;
  const total = filtered.length;
  const percentage = total > 0 ? ((present + late) / total) * 100 : 0;
  
  return { present, late, absent, total, percentage };
};

export const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};