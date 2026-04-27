import React, { useEffect, useState } from 'react';
import { pb, Course, User } from '../lib/pocketbase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  PencilIcon, 
  TrashIcon, 
  PlusIcon, 
  UserGroupIcon, 
  ChevronRightIcon,
  BookOpenIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';

const Courses: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<string[]>([]); // Changed from Set to array
  const [searchStudentTerm, setSearchStudentTerm] = useState('');
  const [formData, setFormData] = useState({
    course_code: '',
    title: '',
    unit: 3,
    lecturer: '',
  });

  useEffect(() => {
    fetchCourses();
    if (isAdmin) {
      fetchLecturers();
    }
  }, []);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      let filter = '';
      if (!isAdmin && user) {
        filter = `lecturer = "${user.id}"`;
      }
      const result = await pb.collection('courses').getList(1, 100, {
        filter,
        sort: 'course_code',
        expand: 'lecturer',
      });
      const courseItems = result.items as unknown as Course[];
      setCourses(courseItems);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLecturers = async () => {
    try {
      const result = await pb.collection('users').getList(1, 100, {
        filter: 'role = "lecturer"',
      });
      const lecturerItems = result.items as unknown as User[];
      setLecturers(lecturerItems);
    } catch (error) {
      console.error('Error fetching lecturers:', error);
    }
  };

  const fetchEnrollments = async (courseId: string) => {
    try {
      const enrollments = await pb.collection('course_enrollments').getList(1, 500, {
        filter: `course = "${courseId}"`,
        expand: 'student',
      });
      const enrolledIds = enrollments.items.map((e: any) => e.student);
      setEnrolledStudentIds(enrolledIds);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedCourse) {
        await pb.collection('courses').update(selectedCourse.id, formData);
        toast.success('Course updated successfully');
      } else {
        await pb.collection('courses').create(formData);
        toast.success('Course added successfully');
      }
      setShowModal(false);
      setSelectedCourse(null);
      resetForm();
      fetchCourses();
    } catch (error: any) {
      console.error('Error saving course:', error);
      toast.error(error.message || 'Failed to save course');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await pb.collection('courses').delete(id);
      toast.success('Course deleted successfully');
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  const handleEdit = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      course_code: course.course_code,
      title: course.title,
      unit: course.unit,
      lecturer: course.lecturer,
    });
    setShowModal(true);
  };

  const handleManageEnrollment = async (course: Course) => {
    setSelectedCourse(course);
    await fetchEnrollments(course.id);
    const students = await pb.collection('students').getList(1, 500);
    setAvailableStudents(students.items);
    setShowEnrollModal(true);
  };

  const handleEnrollStudent = async (studentId: string) => {
    if (!selectedCourse) return;
    try {
      await pb.collection('course_enrollments').create({
        course: selectedCourse.id,
        student: studentId,
        session: new Date().getFullYear().toString(),
      });
      setEnrolledStudentIds((prev) => [...prev, studentId]);
      toast.success('Student enrolled successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to enroll student');
    }
  };

  const handleRemoveEnrollment = async (studentId: string) => {
    if (!selectedCourse) return;
    try {
      const enrollments = await pb.collection('course_enrollments').getList(1, 1, {
        filter: `course = "${selectedCourse.id}" && student = "${studentId}"`,
      });
      if (enrollments.items.length > 0) {
        await pb.collection('course_enrollments').delete(enrollments.items[0].id);
        setEnrolledStudentIds((prev) => prev.filter(id => id !== studentId));
        toast.success('Student removed from course');
      }
    } catch (error) {
      console.error('Error removing enrollment:', error);
      toast.error('Failed to remove student');
    }
  };

  const resetForm = () => {
    setFormData({
      course_code: '',
      title: '',
      unit: 3,
      lecturer: '',
    });
  };

  // Helper function to check if a student is enrolled
  const isEnrolled = (studentId: string) => {
    return enrolledStudentIds.includes(studentId);
  };

  const filteredStudents = availableStudents.filter((student: any) => {
    const term = searchStudentTerm.toLowerCase();
    return student.full_name.toLowerCase().includes(term) ||
           student.matric_number.toLowerCase().includes(term);
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-600 mt-1">Manage courses and student enrollment</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setSelectedCourse(null);
              setShowModal(true);
            }}
            className="btn-primary flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Course
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div key={course.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="inline-flex px-2 py-1 text-xs font-bold rounded bg-primary-100 text-primary-700">
                    {course.course_code}
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-2">{course.title}</h3>
                </div>
                {isAdmin && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(course)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  <span className="font-medium">Units:</span> {course.unit}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Lecturer:</span> {course.lecturer_expand?.name || 'Not assigned'}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleManageEnrollment(course)}
                  className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <UserGroupIcon className="w-4 h-4 mr-2" />
                  Manage Enrollment
                  <ChevronRightIcon className="w-4 h-4 ml-auto" />
                </button>
              )}
            </div>
          </div>
        ))}
        {courses.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl">
            <BookOpenIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No courses found. Add your first course to get started.</p>
          </div>
        )}
      </div>

      {/* Course Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedCourse ? 'Edit Course' : 'Add New Course'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    value={formData.course_code}
                    onChange={(e) => setFormData({ ...formData, course_code: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g., CSC 401"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Units *
                  </label>
                  <input
                    type="number"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: parseInt(e.target.value) })}
                    required
                    min="1"
                    max="6"
                    className="input-field"
                  />
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Lecturer *
                    </label>
                    <select
                      value={formData.lecturer}
                      onChange={(e) => setFormData({ ...formData, lecturer: e.target.value })}
                      required
                      className="input-field"
                    >
                      <option value="">Select Lecturer</option>
                      {lecturers.map((lecturer) => (
                        <option key={lecturer.id} value={lecturer.id}>
                          {lecturer.name} ({lecturer.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => { setShowModal(false); setSelectedCourse(null); resetForm(); }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isLoading} className="btn-primary">
                  {isLoading ? 'Saving...' : 'Save Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enrollment Modal */}
      {showEnrollModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">
                Manage Enrollment: {selectedCourse.course_code}
              </h2>
              <p className="text-sm text-gray-600 mt-1">{selectedCourse.title}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchStudentTerm}
                    onChange={(e) => setSearchStudentTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                {filteredStudents.map((student: any) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{student.full_name}</p>
                      <p className="text-sm text-gray-500">{student.matric_number} - {student.department}</p>
                    </div>
                    {isEnrolled(student.id) ? (
                      <button
                        onClick={() => handleRemoveEnrollment(student.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnrollStudent(student.id)}
                        className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded transition-colors"
                      >
                        Enroll
                      </button>
                    )}
                  </div>
                ))}
                {filteredStudents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No students found
                  </div>
                )}
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end">
              <button
                onClick={() => { setShowEnrollModal(false); setSelectedCourse(null); setSearchStudentTerm(''); }}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;