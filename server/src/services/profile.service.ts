import { prisma } from '../lib/prisma.js';
import {
  ProfileRepository,
  profileRepository,
} from '../repositories/profile.repository.js';
import type {
  StudentProfileDTO,
  AcademicRecordsDTO,
  ProfileAuditLogDTO,
  UpdateProfileInput,
} from '../types/profile.js';
import { PROTECTED_PROFILE_FIELDS } from '../types/profile.js';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '../errors/AppError.js';
import type { UserRole } from '@prisma/client';
import { logger } from '../lib/logger.js';

export class ProfileService {
  private repo: ProfileRepository;

  constructor(repo?: ProfileRepository) {
    this.repo = repo || profileRepository;
  }

  /**
   * Helper to verify if faculty/staff is authorized to view a student's profile
   */
  private async verifyStaffStudentAccess(
    staffUser: { id: string; role: UserRole },
    studentUserId: string,
    studentDepartmentId: string,
    studentMentorId?: string | null
  ): Promise<void> {
    // 1. Institutional Admins, Deans, and Exam Controllers have broad institutional authorization
    if (
      staffUser.role === 'REGISTRAR_ADMIN' ||
      staffUser.role === 'DEAN' ||
      staffUser.role === 'EXAM_CONTROLLER'
    ) {
      return;
    }

    // 2. Assigned Faculty Mentor has direct mentorship authorization
    if (studentMentorId && studentMentorId === staffUser.id) {
      return;
    }

    // 3. Department Head (HOD) has departmental authorization
    if (staffUser.role === 'HOD') {
      const hodProfile = await prisma.facultyProfile.findUnique({
        where: { userId: staffUser.id },
        select: { departmentId: true },
      });
      if (hodProfile && hodProfile.departmentId === studentDepartmentId) {
        return;
      }
    }

    // Unauthorized access attempt
    logger.warn('Unauthorized student profile access attempt by faculty', {
      staffUserId: staffUser.id,
      staffRole: staffUser.role,
      targetStudentUserId: studentUserId,
    });

    throw new ForbiddenError(
      'Faculty access is restricted to assigned mentees or authorized departmental leadership.'
    );
  }

  /**
   * Get authenticated user's own student profile
   */
  async getMyProfile(user: { id: string; role: UserRole }): Promise<StudentProfileDTO> {
    if (user.role !== 'STUDENT') {
      throw new BadRequestError('Current user is not a student. Faculty and staff should query staff endpoints.');
    }

    const profile = await this.repo.getStudentProfileByUserId(user.id);
    if (!profile) {
      throw new NotFoundError('Student profile record not found for authenticated user.');
    }

    return profile;
  }

  /**
   * Get a specific student profile with strict anti-IDOR authorization
   */
  async getStudentProfile(
    caller: { id: string; role: UserRole },
    targetStudentIdOrUserId: string
  ): Promise<StudentProfileDTO> {
    const profile = await this.repo.findProfileByIdOrUserId(targetStudentIdOrUserId);
    if (!profile) {
      throw new NotFoundError(`Student profile not found for identifier '${targetStudentIdOrUserId}'.`);
    }

    // If caller is student, must only access own profile
    if (caller.role === 'STUDENT') {
      if (profile.userId !== caller.id) {
        throw new ForbiddenError('Students are strictly prohibited from viewing another student’s profile.');
      }
      return profile;
    }

    // If caller is faculty or staff, verify institutional relationship
    await this.verifyStaffStudentAccess(
      caller,
      profile.userId,
      profile.department.id,
      profile.mentor?.id
    );

    return profile;
  }

  /**
   * Update authenticated student's permitted profile fields
   */
  async updateMyProfile(
    user: { id: string; role: UserRole },
    input: UpdateProfileInput & Record<string, any>,
    ipAddress?: string
  ): Promise<StudentProfileDTO> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenError('Only authenticated students may edit student profile contact records.');
    }

    // 1. Check for any attempt to modify protected institutional attributes
    for (const key of Object.keys(input)) {
      if ((PROTECTED_PROFILE_FIELDS as readonly string[]).includes(key)) {
        throw new ForbiddenError(
          `Modification of protected institutional attribute '${key}' is strictly prohibited. Official identity, enrollment, and academic attributes are centrally administered.`
        );
      }
    }

    const currentProfile = await this.repo.getStudentProfileByUserId(user.id);
    if (!currentProfile) {
      throw new NotFoundError('Student profile record not found.');
    }

    return this.repo.updateStudentProfile(currentProfile.id, input, user.id, ipAddress);
  }

  /**
   * Get authenticated student's own authoritative academic records
   */
  async getMyAcademicRecords(user: { id: string; role: UserRole }): Promise<AcademicRecordsDTO> {
    if (user.role !== 'STUDENT') {
      throw new BadRequestError('Academic records view is available for student accounts.');
    }

    return this.repo.getStudentAcademicRecords(user.id);
  }

  /**
   * Get a specific student's authoritative academic records with RBAC scoping
   */
  async getStudentAcademicRecords(
    caller: { id: string; role: UserRole },
    targetStudentIdOrUserId: string
  ): Promise<AcademicRecordsDTO> {
    const profile = await this.repo.findProfileByIdOrUserId(targetStudentIdOrUserId);
    if (!profile) {
      throw new NotFoundError(`Student profile not found for identifier '${targetStudentIdOrUserId}'.`);
    }

    if (caller.role === 'STUDENT') {
      if (profile.userId !== caller.id) {
        throw new ForbiddenError('Students cannot access another student’s academic records or gradebook.');
      }
      return this.repo.getStudentAcademicRecords(profile.userId);
    }

    // Verify staff access
    await this.verifyStaffStudentAccess(
      caller,
      profile.userId,
      profile.department.id,
      profile.mentor?.id
    );

    return this.repo.getStudentAcademicRecords(profile.userId);
  }

  /**
   * Get faculty mentor's assigned mentees
   */
  async getFacultyMentees(facultyUser: { id: string; role: UserRole }): Promise<StudentProfileDTO[]> {
    if (facultyUser.role === 'STUDENT') {
      throw new ForbiddenError('Students do not have access to faculty mentorship queues.');
    }

    return this.repo.getFacultyMentees(facultyUser.id);
  }

  /**
   * Get profile audit trail
   */
  async getProfileAuditTrail(
    caller: { id: string; role: UserRole },
    studentIdOrUserId: string
  ): Promise<ProfileAuditLogDTO[]> {
    const profile = await this.repo.findProfileByIdOrUserId(studentIdOrUserId);
    if (!profile) {
      throw new NotFoundError('Student profile not found.');
    }

    if (caller.role === 'STUDENT') {
      if (profile.userId !== caller.id) {
        throw new ForbiddenError('Students cannot view audit trails of other profiles.');
      }
    } else {
      await this.verifyStaffStudentAccess(
        caller,
        profile.userId,
        profile.department.id,
        profile.mentor?.id
      );
    }

    return this.repo.getProfileAuditLogs(profile.id);
  }
}

export const profileService = new ProfileService();
