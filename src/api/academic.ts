import { apiClient, type ApiResponse } from './client';

export interface Department {
  id: string;
  name: string;
  code: string;
  _count?: {
    facultyProfiles: number;
    courses: number;
  };
}

export interface Program {
  id: string;
  departmentId: string;
  name: string;
  code: string;
  totalSemesters: number;
  department: Department;
  batches?: any[];
}

export interface Course {
  id: string;
  departmentId: string;
  code: string;
  title: string;
  credits: number;
  lectureHours: number;
  tutorialHours: number;
  practicalHours: number;
  department: Department;
  _count?: { offerings: number };
}

export interface CourseOffering {
  id: string;
  courseId: string;
  sectionId: string;
  primaryFacultyId: string;
  academicYear: string;
  semester: number;
  course: Course;
  section: {
    id: string;
    name: string;
    batch?: { program?: { name: string } };
  };
  primaryFaculty: {
    id: string;
    fullName: string;
    email: string;
  };
  _count?: {
    enrollments: number;
    sessions: number;
  };
}

export const academicApi = {
  async getDepartments() {
    return apiClient.get<ApiResponse<Department[]>>('/academic/departments');
  },

  async getPrograms() {
    return apiClient.get<ApiResponse<Program[]>>('/academic/programs');
  },

  async getCourses(params?: { departmentId?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.departmentId) query.set('departmentId', params.departmentId);
    if (params?.search) query.set('search', params.search);
    return apiClient.get<ApiResponse<Course[]>>(`/academic/courses?${query.toString()}`);
  },

  async createCourse(data: {
    departmentId: string;
    code: string;
    title: string;
    credits: number;
    lectureHours?: number;
    tutorialHours?: number;
    practicalHours?: number;
  }) {
    return apiClient.post<ApiResponse<Course>>('/academic/courses', data);
  },

  async getOfferings(params?: { academicYear?: string; semester?: number; departmentId?: string }) {
    const query = new URLSearchParams();
    if (params?.academicYear) query.set('academicYear', params.academicYear);
    if (params?.semester) query.set('semester', String(params.semester));
    if (params?.departmentId) query.set('departmentId', params.departmentId);
    return apiClient.get<ApiResponse<CourseOffering[]>>(`/academic/offerings?${query.toString()}`);
  },

  async createOffering(data: {
    courseId: string;
    sectionId: string;
    primaryFacultyId: string;
    academicYear?: string;
    semester: number;
  }) {
    return apiClient.post<ApiResponse<CourseOffering>>('/academic/offerings', data);
  },

  async enrollStudent(studentId: string, courseOfferingId: string) {
    return apiClient.post<ApiResponse<any>>('/academic/enrollments', { studentId, courseOfferingId });
  },

  async dropEnrollment(enrollmentId: string) {
    return apiClient.delete<ApiResponse<any>>(`/academic/enrollments/${enrollmentId}`);
  },

  async correctAttendance(data: {
    attendanceRecordId: string;
    newStatus: string;
    reason: string;
    approvalRef?: string;
  }) {
    return apiClient.post<ApiResponse<any>>('/academic/corrections/attendance', data);
  },

  async correctEnrollmentStatus(data: {
    studentId: string;
    status: string;
    reason: string;
    approvalRef?: string;
  }) {
    return apiClient.post<ApiResponse<any>>('/academic/corrections/enrollment-status', data);
  },

  async getCorrectionLogs(params?: { studentId?: string; targetEntity?: string }) {
    const query = new URLSearchParams();
    if (params?.studentId) query.set('studentId', params.studentId);
    if (params?.targetEntity) query.set('targetEntity', params.targetEntity);
    return apiClient.get<ApiResponse<any[]>>(`/academic/corrections/logs?${query.toString()}`);
  },
};
