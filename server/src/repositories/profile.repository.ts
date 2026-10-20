import { prisma } from '../lib/prisma.js';
import type {
  StudentProfileDTO,
  AcademicRecordsDTO,
  ProfileAuditLogDTO,
  UpdateProfileInput,
  EnrolledCourseRecordDTO,
} from '../types/profile.js';
import { NotFoundError } from '../errors/AppError.js';
import { logger } from '../lib/logger.js';

export class ProfileRepository {
  /**
   * Helper: Map Prisma profile to StudentProfileDTO
   */
  mapToProfileDTO(profile: any): StudentProfileDTO {
    return {
      id: profile.id,
      userId: profile.userId,
      fullName: profile.user?.fullName || 'Student',
      email: profile.user?.email || '',
      phone: profile.user?.phone || null,
      avatarUrl: profile.user?.avatarUrl || null,
      role: profile.user?.role || 'STUDENT',
      rollNumber: profile.rollNumber,
      registrationNo: profile.registrationNo,
      currentSemester: profile.currentSemester,
      currentCgpa: Number(profile.currentCgpa) || 0,
      program: {
        id: profile.batch?.program?.id || '',
        code: profile.batch?.program?.code || '',
        name: profile.batch?.program?.name || 'Academic Program',
      },
      department: {
        id: profile.batch?.program?.department?.id || '',
        code: profile.batch?.program?.department?.code || '',
        name: profile.batch?.program?.department?.name || 'Department',
      },
      batch: {
        id: profile.batch?.id || '',
        batchName: profile.batch?.batchName || '',
        startYear: profile.batch?.startYear || 2023,
        endYear: profile.batch?.endYear || 2027,
      },
      section: {
        id: profile.section?.id || '',
        name: profile.section?.name || 'Section A',
      },
      mentor: profile.mentor
        ? {
            id: profile.mentor.id,
            fullName: profile.mentor.fullName,
            email: profile.mentor.email,
            phone: profile.mentor.phone || null,
            designation: profile.mentor.facultyProfile?.designation || 'Faculty Mentor',
          }
        : null,
      bloodGroup: profile.bloodGroup || null,
      emergencyContact: profile.emergencyContact || null,
      guardianName: profile.guardianName || null,
      personalEmail: profile.personalEmail || null,
      addressLine: profile.addressLine || null,
      city: profile.city || null,
      state: profile.state || null,
      pincode: profile.pincode || null,
      createdAt: profile.createdAt instanceof Date ? profile.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : null,
    };
  }

  /**
   * Helper: Map ProfileAuditLog to DTO
   */
  mapAuditLogToDTO(log: any): ProfileAuditLogDTO {
    return {
      id: log.id,
      studentProfileId: log.studentProfileId,
      action: log.action,
      changedFields: (log.changedFields as any) || {},
      previousValues: (log.previousValues as any) || {},
      newValues: (log.newValues as any) || {},
      performedBy: {
        id: log.changedBy?.id || '',
        fullName: log.changedBy?.fullName || 'Staff User',
        email: log.changedBy?.email || '',
        role: log.changedBy?.role || 'SYSTEM',
      },
      ipAddress: log.ipAddress || null,
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Find Student Profile by User ID
   */
  async getStudentProfileByUserId(userId: string): Promise<StudentProfileDTO | null> {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        batch: {
          include: {
            program: {
              include: {
                department: true,
              },
            },
          },
        },
        section: true,
        mentor: {
          include: {
            facultyProfile: true,
          },
        },
      },
    });

    if (!profile) return null;
    return this.mapToProfileDTO(profile);
  }

  /**
   * Find Student Profile by Profile ID or User ID
   */
  async findProfileByIdOrUserId(idOrUserId: string): Promise<StudentProfileDTO | null> {
    const profile = await prisma.studentProfile.findFirst({
      where: {
        OR: [{ id: idOrUserId }, { userId: idOrUserId }],
      },
      include: {
        user: true,
        batch: {
          include: {
            program: {
              include: {
                department: true,
              },
            },
          },
        },
        section: true,
        mentor: {
          include: {
            facultyProfile: true,
          },
        },
      },
    });

    if (!profile) return null;
    return this.mapToProfileDTO(profile);
  }

  /**
   * Get all students assigned to a specific mentor
   */
  async getFacultyMentees(mentorFacultyId: string): Promise<StudentProfileDTO[]> {
    const profiles = await prisma.studentProfile.findMany({
      where: { mentorFacultyId },
      include: {
        user: true,
        batch: {
          include: {
            program: {
              include: {
                department: true,
              },
            },
          },
        },
        section: true,
        mentor: {
          include: {
            facultyProfile: true,
          },
        },
      },
      orderBy: [{ rollNumber: 'asc' }],
    });

    return profiles.map((p) => this.mapToProfileDTO(p));
  }

  /**
   * Update permitted student profile attributes with transactional audit logging
   */
  async updateStudentProfile(
    profileId: string,
    data: UpdateProfileInput,
    changedById: string,
    ipAddress?: string
  ): Promise<StudentProfileDTO> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.studentProfile.findUnique({
        where: { id: profileId },
        include: { user: true },
      });

      if (!current) {
        throw new NotFoundError('Student profile record not found');
      }

      const changedFields: Record<string, any> = {};
      const previousValues: Record<string, any> = {};
      const newValues: Record<string, any> = {};

      // 1. Phone update on User table
      let userUpdated = false;
      if (data.phone !== undefined && data.phone !== current.user.phone) {
        changedFields.phone = true;
        previousValues.phone = current.user.phone;
        newValues.phone = data.phone;
        userUpdated = true;
      }

      // 2. Personal fields on StudentProfile table
      const profileFieldsToCheck = [
        'personalEmail',
        'bloodGroup',
        'emergencyContact',
        'guardianName',
        'addressLine',
        'city',
        'state',
        'pincode',
      ] as const;

      const profileUpdateData: Record<string, any> = {};

      for (const field of profileFieldsToCheck) {
        if (data[field] !== undefined) {
          const currentVal = (current as any)[field] ?? null;
          const newVal = data[field] ?? null;
          if (currentVal !== newVal) {
            changedFields[field] = true;
            previousValues[field] = currentVal;
            newValues[field] = newVal;
            profileUpdateData[field] = newVal;
          }
        }
      }

      // If no changes, return current without audit log
      if (Object.keys(changedFields).length === 0) {
        return (await this.getStudentProfileByUserId(current.userId))!;
      }

      // Update User if phone changed
      if (userUpdated) {
        await tx.user.update({
          where: { id: current.userId },
          data: { phone: data.phone },
        });
      }

      // Update StudentProfile
      profileUpdateData.updatedAt = new Date();
      await tx.studentProfile.update({
        where: { id: profileId },
        data: profileUpdateData,
      });

      // Record durable, immutable audit log
      await tx.profileAuditLog.create({
        data: {
          studentProfileId: profileId,
          changedById,
          action: 'PROFILE_CONTACT_UPDATED',
          changedFields,
          previousValues,
          newValues,
          ipAddress: ipAddress || null,
        },
      });

      logger.info('Student profile updated with audit trail', {
        profileId,
        changedById,
        changedFields: Object.keys(changedFields),
      });

      // Reload full profile with relations
      const updatedProfile = await tx.studentProfile.findUnique({
        where: { id: profileId },
        include: {
          user: true,
          batch: {
            include: {
              program: {
                include: {
                  department: true,
                },
              },
            },
          },
          section: true,
          mentor: {
            include: {
              facultyProfile: true,
            },
          },
        },
      });

      return this.mapToProfileDTO(updatedProfile!);
    });
  }

  /**
   * Get authoritative Academic Records & Course Enrollments for a student
   */
  async getStudentAcademicRecords(userId: string): Promise<AcademicRecordsDTO> {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        batch: {
          include: {
            program: {
              include: {
                department: true,
              },
            },
          },
        },
        section: true,
      },
    });

    if (!profile) {
      throw new NotFoundError('Student profile not found for academic records.');
    }

    // Fetch official course enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: userId },
      include: {
        courseOffering: {
          include: {
            course: true,
            primaryFaculty: true,
            examComponents: {
              include: {
                grades: {
                  where: { studentId: userId },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { courseOffering: { academicYear: 'desc' } },
        { courseOffering: { semester: 'desc' } },
        { courseOffering: { course: { code: 'asc' } } },
      ],
    });

    let totalCredits = 0;

    const enrolledCourses: EnrolledCourseRecordDTO[] = enrollments.map((e) => {
      const co = e.courseOffering;
      const c = co.course;
      const credits = Number(c.credits) || 0;
      totalCredits += credits;

      const grades: any[] = [];
      let hasGrades = false;

      if (co.examComponents && co.examComponents.length > 0) {
        for (const ec of co.examComponents) {
          const studentGrade = ec.grades && ec.grades.length > 0 ? ec.grades[0] : null;
          if (studentGrade) {
            hasGrades = true;
            grades.push({
              componentId: ec.id,
              componentName: ec.name,
              maxMarks: Number(ec.maxMarks),
              weightagePercent: Number(ec.weightagePercent),
              obtainedMarks: Number(studentGrade.obtainedMarks),
            });
          }
        }
      }

      return {
        enrollmentId: e.id,
        courseOfferingId: co.id,
        courseCode: c.code,
        courseTitle: c.title,
        credits,
        lectureHours: c.lectureHours,
        tutorialHours: c.tutorialHours,
        practicalHours: c.practicalHours,
        academicYear: co.academicYear,
        semester: co.semester,
        primaryFaculty: {
          id: co.primaryFaculty.id,
          fullName: co.primaryFaculty.fullName,
          email: co.primaryFaculty.email,
        },
        grades,
        hasGradesEntered: hasGrades,
      };
    });

    const cgpa = Number(profile.currentCgpa) || 0;
    let standing = 'PASS CLASS';
    if (cgpa >= 8.5) {
      standing = 'FIRST CLASS WITH DISTINCTION';
    } else if (cgpa >= 6.5) {
      standing = 'FIRST CLASS';
    } else if (cgpa >= 5.0) {
      standing = 'SECOND CLASS';
    }

    return {
      student: {
        id: profile.id,
        userId: profile.userId,
        fullName: profile.user.fullName,
        rollNumber: profile.rollNumber,
        registrationNo: profile.registrationNo,
        currentSemester: profile.currentSemester,
        currentCgpa: cgpa,
      },
      program: {
        id: profile.batch.program.id,
        code: profile.batch.program.code,
        name: profile.batch.program.name,
      },
      department: {
        id: profile.batch.program.department.id,
        code: profile.batch.program.department.code,
        name: profile.batch.program.department.name,
      },
      batch: {
        id: profile.batch.id,
        batchName: profile.batch.batchName,
        startYear: profile.batch.startYear,
        endYear: profile.batch.endYear,
      },
      section: {
        id: profile.section.id,
        name: profile.section.name,
      },
      currentSemester: profile.currentSemester,
      currentCgpa: cgpa,
      totalEnrolledCredits: totalCredits,
      academicStanding: standing,
      enrolledCourses,
      systemDisclosures: {
        isOfficialTranscript: false,
        notice: 'Authoritative online academic record. Official sealed transcripts must be requested through the Controller of Examinations.',
        authoritativeSource: 'DBS Global University ERP Database (PostgreSQL Verified)',
      },
    };
  }

  /**
   * Get Audit Logs for a Student Profile
   */
  async getProfileAuditLogs(studentProfileId: string): Promise<ProfileAuditLogDTO[]> {
    const logs = await prisma.profileAuditLog.findMany({
      where: { studentProfileId },
      include: {
        changedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return logs.map((l) => this.mapAuditLogToDTO(l));
  }
}

export const profileRepository = new ProfileRepository();
