import { academicRepository } from '../repositories/academic.repository.js';
import { BadRequestError } from '../errors/AppError.js';

export class AcademicService {
  async getDepartments() {
    return academicRepository.getDepartments();
  }

  async getPrograms() {
    return academicRepository.getPrograms();
  }

  async getCourses(filters?: { departmentId?: string; search?: string }) {
    return academicRepository.getCourses(filters);
  }

  async createCourse(data: {
    departmentId: string;
    code: string;
    title: string;
    credits: number;
    lectureHours: number;
    tutorialHours: number;
    practicalHours: number;
    syllabusDocUrl?: string;
  }) {
    return academicRepository.createCourse(data);
  }

  async getOfferings(filters?: { academicYear?: string; semester?: number; departmentId?: string }) {
    return academicRepository.getOfferings(filters);
  }

  async createOffering(data: {
    courseId: string;
    sectionId: string;
    primaryFacultyId: string;
    academicYear: string;
    semester: number;
  }) {
    return academicRepository.createOffering(data);
  }

  async enrollStudent(studentId: string, courseOfferingId: string) {
    return academicRepository.enrollStudent(studentId, courseOfferingId);
  }

  async dropEnrollment(enrollmentId: string) {
    return academicRepository.dropEnrollment(enrollmentId);
  }

  async correctAttendanceRecord(params: {
    attendanceRecordId: string;
    newStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    reason: string;
    approvalRef?: string;
    performedById: string;
    ipAddress?: string;
  }) {
    if (!params.reason || params.reason.trim().length < 5) {
      throw new BadRequestError('A valid justification reason is required for attendance correction');
    }
    return academicRepository.correctAttendanceRecord(params);
  }

  async correctStudentEnrollmentStatus(params: {
    studentId: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN' | 'GRADUATED';
    reason: string;
    approvalRef?: string;
    performedById: string;
    ipAddress?: string;
  }) {
    if (!params.reason || params.reason.trim().length < 5) {
      throw new BadRequestError('A valid justification reason is required for status correction');
    }
    return academicRepository.correctStudentEnrollmentStatus(params);
  }

  async getCorrectionLogs(filters?: { studentId?: string; targetEntity?: string; limit?: number }) {
    return academicRepository.getCorrectionLogs(filters);
  }
}

export const academicService = new AcademicService();
