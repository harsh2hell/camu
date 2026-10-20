import { departmentRepository } from '../repositories/department.repository.js';
import { ForbiddenError } from '../errors/AppError.js';
import type { UserRole } from '@prisma/client';

export class DepartmentService {
  /**
   * Enforce server-side anti-IDOR department scoping
   */
  async assertDepartmentAccess(
    user: { id: string; role: UserRole },
    departmentId: string
  ): Promise<void> {
    if (user.role === 'SUPER_ADMIN' || user.role === 'REGISTRAR_ADMIN') {
      return; // Institutional-level administration scope
    }

    if (user.role === 'HOD' || user.role === 'DEAN') {
      const profile = await departmentRepository.getFacultyProfileByUserId(user.id);
      if (!profile || profile.departmentId !== departmentId) {
        throw new ForbiddenError('Access to unauthorized department scope is strictly forbidden');
      }
      return;
    }

    throw new ForbiddenError('Insufficient permissions for department administration');
  }

  async getOverview(user: { id: string; role: UserRole }, departmentId: string) {
    await this.assertDepartmentAccess(user, departmentId);
    return departmentRepository.getDepartmentOverview(departmentId);
  }

  async getFaculty(user: { id: string; role: UserRole }, departmentId: string) {
    await this.assertDepartmentAccess(user, departmentId);
    return departmentRepository.getDepartmentFaculty(departmentId);
  }

  async getStudents(user: { id: string; role: UserRole }, departmentId: string) {
    await this.assertDepartmentAccess(user, departmentId);
    return departmentRepository.getDepartmentStudents(departmentId);
  }

  async getCourseAllocations(user: { id: string; role: UserRole }, departmentId: string) {
    await this.assertDepartmentAccess(user, departmentId);
    return departmentRepository.getCourseAllocations(departmentId);
  }

  async getAttendanceComplianceReport(
    user: { id: string; role: UserRole },
    departmentId: string,
    threshold: number
  ) {
    await this.assertDepartmentAccess(user, departmentId);
    return departmentRepository.getAttendanceComplianceReport(departmentId, threshold);
  }
}

export const departmentService = new DepartmentService();
