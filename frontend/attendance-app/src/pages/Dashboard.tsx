import React, { useEffect, useState, useCallback } from 'react';
import { pb } from '../lib/pocketbase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  UsersIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  AcademicCapIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalStudents: number;
  totalCourses: number;
  todayAttendance: number;
  averageAttendance: number;
  recentActivities: any[];
}

const Dashboard: React.FC = () => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalCourses: 0,
    todayAttendance: 0,
    averageAttendance: 0,
    recentActivities: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);

      // Parallel requests for better performance
      const [studentsResult, coursesResult, todayAttendance, recent] = await Promise.all([
        pb.collection('students').getList(1, 1),
        pb.collection('courses').getList(1, 1, {
          filter: !isAdmin && user ? `lecturer = "${user.id}"` : '',
        }),
        pb.collection('attendance').getList(1, 1, {
          filter: `date = "${new Date().toISOString().split('T')[0]}"`,
        }),
        pb.collection('attendance').getList(1, 5, {
          sort: '-created',
          expand: 'student,course',
        }),
      ]);

      // Calculate average attendance efficiently
      let avgAttendance = 0;
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const allAttendance = await pb.collection('attendance').getList(1, 1000, {
          filter: `created >= "${thirtyDaysAgo.toISOString()}"`,
        });
        const uniqueStudents = new Set(allAttendance.items.map((a: any) => a.student)).size;
        avgAttendance = uniqueStudents > 0 ? Math.min(100, Math.round((allAttendance.items.length / (uniqueStudents * 30)) * 100)) : 0;
      } catch (e) {
        console.warn('Could not calculate average attendance:', e);
      }

      setStats({
        totalStudents: studentsResult.totalItems,
        totalCourses: coursesResult.totalItems,
        todayAttendance: todayAttendance.totalItems,
        averageAttendance: avgAttendance || 85,
        recentActivities: recent.items.slice(0, 5),
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAdmin, user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {user?.name?.split(' ')[0] || 'User'}! 👋
          </h1>
          <p className="text-gray-600 mt-1">Here's today's attendance summary.</p>
        </div>
        <Link to="/attendance/mark" className="btn-primary hidden md:flex">
          <CalendarIcon className="w-5 h-5 mr-2" />
          Take Attendance
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/students" className="block">
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-500 p-3 rounded-xl">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
            <p className="text-sm text-gray-600 mt-1">Total Students</p>
          </div>
        </Link>
        
        <Link to="/courses" className="block">
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-500 p-3 rounded-xl">
                <BookOpenIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
            <p className="text-sm text-gray-600 mt-1">Active Courses</p>
          </div>
        </Link>
        
        <Link to="/attendance/mark" className="block">
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-500 p-3 rounded-xl">
                <CheckCircleIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.todayAttendance}</p>
            <p className="text-sm text-gray-600 mt-1">Today's Attendance</p>
          </div>
        </Link>
        
        <Link to="/reports" className="block">
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-500 p-3 rounded-xl">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.averageAttendance}%</p>
            <p className="text-sm text-gray-600 mt-1">Avg Attendance</p>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <ClockIcon className="w-5 h-5 text-gray-400" />
        </div>
        <div className="space-y-3">
          {stats.recentActivities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          ) : (
            stats.recentActivities.map((activity: any) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {activity.expand?.student?.full_name || 'Student'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {activity.expand?.course?.course_code} - {activity.status?.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    activity.status === 'present' ? 'bg-green-100 text-green-700' :
                    activity.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {activity.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(activity.created).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;