import { apiClient, type ApiResponse } from './client';

export interface DepartmentOverview {
  department: {
    id: string;
    name: string;
    code: string;
  };
  stats: {
    facultyCount: number;
    coursesCount: number;
    activeOfferingsCount: number;
    studentsCount: number;
    assignmentsCount: number;
  };
}

export interface DepartmentDefaulter {
  studentId: string;
  fullName: string;
  rollNumber: string;
  courseCode: string;
  courseTitle: string;
  totalSessions: number;
  attendedSessions: number;
  attendancePercentage: number;
  status: 'CRITICAL' | 'WARNING';
}

export interface DepartmentComplianceReport {
  totalOfferings: number;
  evaluatedStudentCourses: number;
  defaulterCount: number;
  overallComplianceRate: number;
  threshold: number;
  defaulters: DepartmentDefaulter[];
}

export const departmentApi = {
  async getOverview(departmentId: string) {
    return apiClient.get<ApiResponse<DepartmentOverview>>(`/department/${departmentId}/overview`);
  },

  async getFaculty(departmentId: string) {
    return apiClient.get<ApiResponse<any[]>>(`/department/${departmentId}/faculty`);
  },

  async getStudents(departmentId: string) {
    return apiClient.get<ApiResponse<any[]>>(`/department/${departmentId}/students`);
  },

  async getCourseAllocations(departmentId: string) {
    return apiClient.get<ApiResponse<any[]>>(`/department/${departmentId}/course-allocations`);
  },

  async getComplianceReport(departmentId: string, threshold: number = 75) {
    return apiClient.get<ApiResponse<DepartmentComplianceReport>>(
      `/department/${departmentId}/attendance-compliance?threshold=${threshold}`
    );
  },
};
