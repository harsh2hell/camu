import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ServiceUnavailableError,
} from '../errors/AppError.js';
import type {
  LeaveApplicationDTO,
  LeaveAuditLogDTO,
  LeaveApplicationsListResponseDTO,
} from '../types/leave.js';
import type { LeaveStatus, Prisma, UserRole } from '@prisma/client';

export class LeaveRepository {
  /**
   * Helper: Calculates inclusive days between two dates
   */
  private calculateTotalDays(startDate: Date, endDate: Date): number {
    const startMs = new Date(startDate.toISOString().split('T')[0]).getTime();
    const endMs = new Date(endDate.toISOString().split('T')[0]).getTime();
    const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  }

  /**
   * Helper: Maps Prisma LeaveApplication to LeaveApplicationDTO
   */
  private mapApplicationToDTO(app: any): LeaveApplicationDTO {
    const startDate = app.startDate instanceof Date ? app.startDate : new Date(app.startDate);
    const endDate = app.endDate instanceof Date ? app.endDate : new Date(app.endDate);
    const totalDays = this.calculateTotalDays(startDate, endDate);

    return {
      id: app.id,
      studentId: app.studentId,
      studentName: app.student?.fullName || 'Student',
      studentRollNumber: app.student?.studentProfile?.rollNumber || 'N/A',
      studentEmail: app.student?.email,
      departmentName: app.student?.studentProfile?.batch?.program?.department?.name || 'Department of Computing',
      category: (app.category as 'LEAVE' | 'ON_DUTY') || 'LEAVE',
      leaveType: app.leaveType,
      title: app.title || `${app.category === 'ON_DUTY' ? 'On-Duty Pass' : 'Leave Request'} (${app.leaveType})`,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalDays,
      reason: app.reason,
      supportingDocUrl: app.supportingDocUrl,
      supportingFileKey: app.supportingFileKey,
      hasSupportingDocument: Boolean(app.supportingDocUrl || app.supportingFileKey),
      status: app.status as LeaveStatus,
      assignedApproverId: app.assignedApproverId,
      assignedApproverName: app.assignedApprover?.fullName || null,
      approvedBy: app.approvedBy,
      approverName: app.approver?.fullName || null,
      decisionReason: app.decisionReason || app.mentorRemarks || app.hodRemarks || null,
      decidedAt: app.decidedAt ? app.decidedAt.toISOString() : null,
      withdrawnAt: app.withdrawnAt ? app.withdrawnAt.toISOString() : null,
      withdrawalReason: app.withdrawalReason || null,
      mentorRemarks: app.mentorRemarks || null,
      hodRemarks: app.hodRemarks || null,
      auditLogs: (app.auditLogs || []).map((l: any) => this.mapAuditLogToDTO(l)),
      createdAt: app.createdAt instanceof Date ? app.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: app.updatedAt instanceof Date ? app.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Helper: Maps Prisma LeaveAuditLog to LeaveAuditLogDTO
   */
  private mapAuditLogToDTO(log: any): LeaveAuditLogDTO {
    return {
      id: log.id,
      applicationId: log.applicationId,
      action: log.action,
      previousStatus: log.previousStatus,
      newStatus: log.newStatus,
      performedBy: {
        id: log.performedBy?.id || log.performedById,
        fullName: log.performedBy?.fullName || 'System',
        email: log.performedBy?.email || '',
        role: log.performedBy?.role || 'SYSTEM',
      },
      reason: log.reason,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Check for active overlapping applications for a student
   * Overlap rule: [startA <= endB] AND [endA >= startB]
   * Active statuses: PENDING, RECOMMENDED_BY_MENTOR, APPROVED_BY_HOD, APPROVED, NEEDS_CORRECTION
   */
  async findActiveOverlap(
    studentId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string
  ) {
    const activeStatuses: LeaveStatus[] = [
      'PENDING',
      'RECOMMENDED_BY_MENTOR',
      'APPROVED_BY_HOD',
      'APPROVED',
      'NEEDS_CORRECTION',
    ];

    const whereClause: Prisma.LeaveApplicationWhereInput = {
      studentId,
      status: { in: activeStatuses },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    };

    if (excludeId) {
      whereClause.id = { not: excludeId };
    }

    return prisma.leaveApplication.findFirst({
      where: whereClause,
      select: {
        id: true,
        category: true,
        leaveType: true,
        title: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });
  }

  /**
   * Student: Create and submit new Leave or OD application
   */
  async createApplication(
    data: {
      studentId: string;
      category: 'LEAVE' | 'ON_DUTY';
      leaveType: string;
      title: string;
      startDate: Date;
      endDate: Date;
      reason: string;
      supportingDocUrl?: string | null;
      supportingFileKey?: string | null;
    },
    ipAddress?: string
  ): Promise<LeaveApplicationDTO> {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Check for overlapping active applications
        const overlap = await tx.leaveApplication.findFirst({
          where: {
            studentId: data.studentId,
            status: { in: ['PENDING', 'RECOMMENDED_BY_MENTOR', 'APPROVED_BY_HOD', 'APPROVED', 'NEEDS_CORRECTION'] },
            startDate: { lte: data.endDate },
            endDate: { gte: data.startDate },
          },
        });

        if (overlap) {
          const overlapStart = overlap.startDate.toISOString().split('T')[0];
          const overlapEnd = overlap.endDate.toISOString().split('T')[0];
          throw new ConflictError(
            `An active ${overlap.category} application (${overlap.status}) already exists for overlapping dates (${overlapStart} to ${overlapEnd}).`
          );
        }

        // 2. Resolve assigned mentor approver from student profile
        const studentProfile = await tx.studentProfile.findUnique({
          where: { userId: data.studentId },
          select: { mentorFacultyId: true },
        });

        const assignedApproverId = studentProfile?.mentorFacultyId || null;

        // 3. Create LeaveApplication record
        const application = await tx.leaveApplication.create({
          data: {
            studentId: data.studentId,
            category: data.category,
            leaveType: data.leaveType,
            title: data.title,
            startDate: data.startDate,
            endDate: data.endDate,
            reason: data.reason,
            supportingDocUrl: data.supportingDocUrl || null,
            supportingFileKey: data.supportingFileKey || null,
            status: 'PENDING',
            assignedApproverId,
          },
          include: {
            student: {
              include: {
                studentProfile: {
                  include: {
                    batch: { include: { program: { include: { department: true } } } },
                  },
                },
              },
            },
            assignedApprover: { select: { id: true, fullName: true, email: true } },
          },
        });

        // 4. Create initial immutable audit log entry
        await tx.leaveAuditLog.create({
          data: {
            applicationId: application.id,
            action: 'APPLICATION_SUBMITTED',
            previousStatus: null,
            newStatus: 'PENDING',
            performedById: data.studentId,
            reason: data.reason,
            details: {
              category: data.category,
              leaveType: data.leaveType,
              startDate: data.startDate.toISOString().split('T')[0],
              endDate: data.endDate.toISOString().split('T')[0],
              assignedApproverId,
              hasAttachment: Boolean(data.supportingFileKey || data.supportingDocUrl),
            },
            ipAddress: ipAddress || null,
          },
        });

        logger.info('Leave/OD application successfully submitted:', {
          applicationId: application.id,
          studentId: data.studentId,
          category: data.category,
          leaveType: data.leaveType,
        });

        return this.mapApplicationToDTO(application);
      });
    } catch (err) {
      if (err instanceof BadRequestError || err instanceof ConflictError || err instanceof NotFoundError) {
        throw err;
      }
      logger.error('Failed to create leave application:', { data, error: err });
      throw new ServiceUnavailableError('Database service unavailable to create application.');
    }
  }

  /**
   * Find single application by ID with full relations and audit logs
   */
  async findApplicationById(id: string) {
    try {
      const app = await prisma.leaveApplication.findUnique({
        where: { id },
        include: {
          student: {
            include: {
              studentProfile: {
                include: {
                  batch: { include: { program: { include: { department: true } } } },
                },
              },
            },
          },
          assignedApprover: { select: { id: true, fullName: true, email: true, role: true } },
          approver: { select: { id: true, fullName: true, email: true, role: true } },
          auditLogs: {
            include: {
              performedBy: { select: { id: true, fullName: true, email: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return app;
    } catch (err) {
      logger.error('Failed to find leave application by id:', { id, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Student: List own applications with filters and pagination
   */
  async listStudentApplications(
    studentId: string,
    filters: {
      status?: LeaveStatus;
      category?: 'LEAVE' | 'ON_DUTY';
      startDate?: string;
      endDate?: string;
      page: number;
      limit: number;
    }
  ): Promise<LeaveApplicationsListResponseDTO> {
    try {
      const where: Prisma.LeaveApplicationWhereInput = { studentId };

      if (filters.status) where.status = filters.status;
      if (filters.category) where.category = filters.category;
      if (filters.startDate) where.startDate = { gte: new Date(filters.startDate) };
      if (filters.endDate) where.endDate = { lte: new Date(filters.endDate) };

      const skip = (filters.page - 1) * filters.limit;

      const [totalCount, items] = await Promise.all([
        prisma.leaveApplication.count({ where }),
        prisma.leaveApplication.findMany({
          where,
          include: {
            student: {
              include: {
                studentProfile: {
                  include: { batch: { include: { program: { include: { department: true } } } } },
                },
              },
            },
            assignedApprover: { select: { id: true, fullName: true } },
            approver: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: filters.limit,
        }),
      ]);

      return {
        applications: items.map((itm) => this.mapApplicationToDTO(itm)),
        pagination: {
          page: filters.page,
          limit: filters.limit,
          totalCount,
          totalPages: Math.ceil(totalCount / filters.limit) || 1,
        },
      };
    } catch (err) {
      logger.error('Failed to list student applications:', { studentId, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Student: Withdraw application (only while PENDING or NEEDS_CORRECTION)
   */
  async withdrawApplication(
    applicationId: string,
    studentId: string,
    reason?: string,
    ipAddress?: string
  ): Promise<LeaveApplicationDTO> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Concurrency row lock
        const rawRows = await tx.$queryRaw<any[]>`
          SELECT * FROM leave_applications WHERE id = ${applicationId}::uuid FOR UPDATE
        `;

        if (!rawRows || rawRows.length === 0) {
          throw new NotFoundError('Application not found.');
        }

        const app = rawRows[0];

        if (app.student_id !== studentId) {
          throw new ForbiddenError('You are not authorized to withdraw an application belonging to another student.');
        }

        if (app.status === 'WITHDRAWN') {
          throw new BadRequestError('Application has already been withdrawn.');
        }

        if (app.status === 'APPROVED' || app.status === 'REJECTED') {
          throw new ConflictError(`Cannot withdraw an application that has already been finalized as ${app.status}.`);
        }

        const updated = await tx.leaveApplication.update({
          where: { id: applicationId },
          data: {
            status: 'WITHDRAWN',
            withdrawnAt: new Date(),
            withdrawalReason: reason || 'Withdrawn by student',
          },
          include: {
            student: {
              include: {
                studentProfile: {
                  include: { batch: { include: { program: { include: { department: true } } } } },
                },
              },
            },
            assignedApprover: { select: { id: true, fullName: true } },
            approver: { select: { id: true, fullName: true } },
            auditLogs: {
              include: { performedBy: { select: { id: true, fullName: true, email: true, role: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        // Insert immutable audit log
        await tx.leaveAuditLog.create({
          data: {
            applicationId,
            action: 'APPLICATION_WITHDRAWN',
            previousStatus: app.status,
            newStatus: 'WITHDRAWN',
            performedById: studentId,
            reason: reason || 'Withdrawn by applicant',
            ipAddress: ipAddress || null,
          },
        });

        return this.mapApplicationToDTO(updated);
      });
    } catch (err) {
      if (
        err instanceof NotFoundError ||
        err instanceof ForbiddenError ||
        err instanceof BadRequestError ||
        err instanceof ConflictError
      ) {
        throw err;
      }
      logger.error('Failed to withdraw application:', { applicationId, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Student: Resubmit application (only while in NEEDS_CORRECTION)
   */
  async resubmitApplication(
    applicationId: string,
    studentId: string,
    updateData: {
      title?: string;
      startDate?: Date;
      endDate?: Date;
      reason?: string;
      supportingFileKey?: string;
      supportingDocUrl?: string;
    },
    ipAddress?: string
  ): Promise<LeaveApplicationDTO> {
    try {
      return await prisma.$transaction(async (tx) => {
        const rawRows = await tx.$queryRaw<any[]>`
          SELECT * FROM leave_applications WHERE id = ${applicationId}::uuid FOR UPDATE
        `;

        if (!rawRows || rawRows.length === 0) {
          throw new NotFoundError('Application not found.');
        }

        const app = rawRows[0];

        if (app.student_id !== studentId) {
          throw new ForbiddenError('You are not authorized to edit this application.');
        }

        if (app.status !== 'NEEDS_CORRECTION') {
          throw new ConflictError(
            `Only applications in NEEDS_CORRECTION state can be edited and resubmitted (current status: ${app.status}).`
          );
        }

        const newStart = updateData.startDate || new Date(app.start_date);
        const newEnd = updateData.endDate || new Date(app.end_date);

        if (newEnd < newStart) {
          throw new BadRequestError('End date cannot be earlier than start date.');
        }

        // Check for active overlap excluding this application
        const overlap = await tx.leaveApplication.findFirst({
          where: {
            id: { not: applicationId },
            studentId,
            status: { in: ['PENDING', 'RECOMMENDED_BY_MENTOR', 'APPROVED_BY_HOD', 'APPROVED', 'NEEDS_CORRECTION'] },
            startDate: { lte: newEnd },
            endDate: { gte: newStart },
          },
        });

        if (overlap) {
          throw new ConflictError('Updated dates overlap with another active leave or on-duty application.');
        }

        const updated = await tx.leaveApplication.update({
          where: { id: applicationId },
          data: {
            title: updateData.title ?? app.title,
            startDate: newStart,
            endDate: newEnd,
            reason: updateData.reason ?? app.reason,
            supportingFileKey: updateData.supportingFileKey ?? app.supporting_file_key,
            supportingDocUrl: updateData.supportingDocUrl ?? app.supporting_doc_url,
            status: 'PENDING',
          },
          include: {
            student: {
              include: {
                studentProfile: {
                  include: { batch: { include: { program: { include: { department: true } } } } },
                },
              },
            },
            assignedApprover: { select: { id: true, fullName: true } },
            approver: { select: { id: true, fullName: true } },
            auditLogs: {
              include: { performedBy: { select: { id: true, fullName: true, email: true, role: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        await tx.leaveAuditLog.create({
          data: {
            applicationId,
            action: 'APPLICATION_RESUBMITTED',
            previousStatus: 'NEEDS_CORRECTION',
            newStatus: 'PENDING',
            performedById: studentId,
            reason: updateData.reason || 'Applicant addressed correction remarks and resubmitted',
            ipAddress: ipAddress || null,
          },
        });

        return this.mapApplicationToDTO(updated);
      });
    } catch (err) {
      if (
        err instanceof NotFoundError ||
        err instanceof ForbiddenError ||
        err instanceof BadRequestError ||
        err instanceof ConflictError
      ) {
        throw err;
      }
      logger.error('Failed to resubmit application:', { applicationId, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Approver: List pending applications assigned to current approver or within authorized scope
   */
  async listApproverPending(
    approverId: string,
    userRole: UserRole,
    filters: {
      category?: 'LEAVE' | 'ON_DUTY';
      startDate?: string;
      endDate?: string;
      studentId?: string;
      page: number;
      limit: number;
    }
  ): Promise<LeaveApplicationsListResponseDTO> {
    try {
      const where: Prisma.LeaveApplicationWhereInput = {
        status: { in: ['PENDING', 'RECOMMENDED_BY_MENTOR'] },
      };

      if (filters.category) where.category = filters.category;
      if (filters.studentId) where.studentId = filters.studentId;
      if (filters.startDate) where.startDate = { gte: new Date(filters.startDate) };
      if (filters.endDate) where.endDate = { lte: new Date(filters.endDate) };

      // Scope-based filtering:
      // REGISTRAR_ADMIN and DEAN have university-wide review scope
      // HOD reviews applications within their department
      // FACULTY reviews applications assigned to them or their mentored students
      if (userRole === 'FACULTY') {
        where.OR = [
          { assignedApproverId: approverId },
          { student: { studentProfile: { mentorFacultyId: approverId } } },
        ];
      } else if (userRole === 'HOD') {
        const hodProfile = await prisma.facultyProfile.findUnique({
          where: { userId: approverId },
          select: { departmentId: true },
        });
        if (hodProfile) {
          where.student = {
            studentProfile: {
              batch: { program: { departmentId: hodProfile.departmentId } },
            },
          };
        }
      }

      const skip = (filters.page - 1) * filters.limit;

      const [totalCount, items] = await Promise.all([
        prisma.leaveApplication.count({ where }),
        prisma.leaveApplication.findMany({
          where,
          include: {
            student: {
              include: {
                studentProfile: {
                  include: { batch: { include: { program: { include: { department: true } } } } },
                },
              },
            },
            assignedApprover: { select: { id: true, fullName: true } },
            approver: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'asc' },
          skip,
          take: filters.limit,
        }),
      ]);

      return {
        applications: items.map((itm) => this.mapApplicationToDTO(itm)),
        pagination: {
          page: filters.page,
          limit: filters.limit,
          totalCount,
          totalPages: Math.ceil(totalCount / filters.limit) || 1,
        },
      };
    } catch (err) {
      logger.error('Failed to list approver pending queue:', { approverId, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Approver: List decided application history
   */
  async listApproverHistory(
    approverId: string,
    userRole: UserRole,
    filters: {
      status?: LeaveStatus;
      category?: 'LEAVE' | 'ON_DUTY';
      page: number;
      limit: number;
    }
  ): Promise<LeaveApplicationsListResponseDTO> {
    try {
      const where: Prisma.LeaveApplicationWhereInput = {
        status: { in: ['APPROVED', 'REJECTED', 'WITHDRAWN', 'NEEDS_CORRECTION'] },
      };

      if (filters.status) where.status = filters.status;
      if (filters.category) where.category = filters.category;

      if (userRole === 'FACULTY') {
        where.OR = [
          { approvedBy: approverId },
          { assignedApproverId: approverId },
          { student: { studentProfile: { mentorFacultyId: approverId } } },
        ];
      }

      const skip = (filters.page - 1) * filters.limit;

      const [totalCount, items] = await Promise.all([
        prisma.leaveApplication.count({ where }),
        prisma.leaveApplication.findMany({
          where,
          include: {
            student: {
              include: {
                studentProfile: {
                  include: { batch: { include: { program: { include: { department: true } } } } },
                },
              },
            },
            assignedApprover: { select: { id: true, fullName: true } },
            approver: { select: { id: true, fullName: true } },
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: filters.limit,
        }),
      ]);

      return {
        applications: items.map((itm) => this.mapApplicationToDTO(itm)),
        pagination: {
          page: filters.page,
          limit: filters.limit,
          totalCount,
          totalPages: Math.ceil(totalCount / filters.limit) || 1,
        },
      };
    } catch (err) {
      logger.error('Failed to list approver history:', { approverId, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Approver: Concurrency-safe decision on pending application
   * Uses PostgreSQL FOR UPDATE locking to prevent concurrent double-finalization
   */
  async decideApplication(
    applicationId: string,
    approverId: string,
    userRole: UserRole,
    action: 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION',
    reason?: string,
    ipAddress?: string
  ): Promise<LeaveApplicationDTO> {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Concurrency lock on application row
        const rawRows = await tx.$queryRaw<any[]>`
          SELECT * FROM leave_applications WHERE id = ${applicationId}::uuid FOR UPDATE
        `;

        if (!rawRows || rawRows.length === 0) {
          throw new NotFoundError('Application not found.');
        }

        const app = rawRows[0];

        // 2. Prevent self-approval (Student cannot approve their own application)
        if (app.student_id === approverId) {
          throw new ForbiddenError('Security Violation: You cannot approve or decide your own leave/OD application.');
        }

        // 3. Authorization verification
        let isAuthorized = false;
        if (userRole === 'REGISTRAR_ADMIN' || userRole === 'DEAN') {
          isAuthorized = true;
        } else if (app.assigned_approver_id === approverId) {
          isAuthorized = true;
        } else {
          // Check if mentor or department HOD
          const studentProfile = await tx.studentProfile.findUnique({
            where: { userId: app.student_id },
            include: { batch: { include: { program: true } } },
          });

          if (studentProfile?.mentorFacultyId === approverId) {
            isAuthorized = true;
          } else if (userRole === 'HOD') {
            const hodProfile = await tx.facultyProfile.findUnique({
              where: { userId: approverId },
            });
            if (hodProfile && hodProfile.departmentId === studentProfile?.batch?.program?.departmentId) {
              isAuthorized = true;
            }
          }
        }

        if (!isAuthorized) {
          throw new ForbiddenError('You are not authorized to decide applications outside your assigned mentor or department scope.');
        }

        // 4. Concurrency check: Ensure status is currently PENDING (or RECOMMENDED_BY_MENTOR)
        if (app.status !== 'PENDING' && app.status !== 'RECOMMENDED_BY_MENTOR') {
          throw new ConflictError(
            `Application has already been finalized as "${app.status}" by another decision or withdrawn by the applicant.`
          );
        }

        // 5. State transition logic
        let newStatus: LeaveStatus;
        let auditAction: string;

        if (action === 'APPROVE') {
          newStatus = 'APPROVED';
          auditAction = 'APPLICATION_APPROVED';
        } else if (action === 'REJECT') {
          newStatus = 'REJECTED';
          auditAction = 'APPLICATION_REJECTED';
        } else if (action === 'REQUEST_CORRECTION') {
          newStatus = 'NEEDS_CORRECTION';
          auditAction = 'APPLICATION_CORRECTION_REQUESTED';
        } else {
          throw new BadRequestError(`Invalid decision action: ${action}`);
        }

        // 6. Update application
        const updated = await tx.leaveApplication.update({
          where: { id: applicationId },
          data: {
            status: newStatus,
            approvedBy: approverId,
            decisionReason: reason || null,
            mentorRemarks: userRole === 'FACULTY' ? reason : app.mentor_remarks,
            hodRemarks: userRole === 'HOD' ? reason : app.hod_remarks,
            decidedAt: new Date(),
          },
          include: {
            student: {
              include: {
                studentProfile: {
                  include: { batch: { include: { program: { include: { department: true } } } } },
                },
              },
            },
            assignedApprover: { select: { id: true, fullName: true } },
            approver: { select: { id: true, fullName: true, role: true } },
            auditLogs: {
              include: { performedBy: { select: { id: true, fullName: true, email: true, role: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        // 7. Insert immutable audit log
        await tx.leaveAuditLog.create({
          data: {
            applicationId,
            action: auditAction,
            previousStatus: app.status,
            newStatus,
            performedById: approverId,
            reason: reason || null,
            details: {
              action,
              decisionReason: reason || null,
              approverRole: userRole,
            },
            ipAddress: ipAddress || null,
          },
        });

        logger.info('Leave/OD application successfully decided:', {
          applicationId,
          approverId,
          action,
          newStatus,
        });

        return this.mapApplicationToDTO(updated);
      });
    } catch (err) {
      if (
        err instanceof NotFoundError ||
        err instanceof ForbiddenError ||
        err instanceof BadRequestError ||
        err instanceof ConflictError
      ) {
        throw err;
      }
      logger.error('Failed to decide leave application:', { applicationId, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Authoritative lookup: Full audit logs for an application
   */
  async getApplicationAuditLogs(applicationId: string): Promise<LeaveAuditLogDTO[]> {
    try {
      const logs = await prisma.leaveAuditLog.findMany({
        where: { applicationId },
        include: {
          performedBy: { select: { id: true, fullName: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return logs.map((l) => this.mapAuditLogToDTO(l));
    } catch (err) {
      logger.error('Failed to get application audit logs:', { applicationId, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }
}

export const leaveRepository = new LeaveRepository();
