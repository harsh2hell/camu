import fs from 'node:fs';
import path from 'node:path';
import { LeaveRepository } from '../repositories/leave.repository.js';
import { FileStorage } from '../lib/fileStorage.js';
import { logger } from '../lib/logger.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
} from '../errors/AppError.js';
import { notificationService } from './notification.service.js';
import type {
  createLeaveApplicationSchema,
  withdrawApplicationSchema,
  resubmitApplicationSchema,
  decideApplicationSchema,
  queryApplicationsSchema,
  LeaveApplicationDTO,
  LeaveApplicationsListResponseDTO,
} from '../types/leave.js';
import type { UserRole, LeaveStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export class LeaveService {
  private leaveRepository: LeaveRepository;

  constructor(leaveRepo?: LeaveRepository) {
    this.leaveRepository = leaveRepo || new LeaveRepository();
  }

  /**
   * Student: Create and submit new Leave or OD application with optional secure document
   */
  async createApplication(
    studentUserId: string,
    userRole: UserRole,
    payload: z.infer<typeof createLeaveApplicationSchema>,
    ipAddress?: string
  ): Promise<LeaveApplicationDTO> {
    if (userRole !== 'STUDENT') {
      throw new ForbiddenError('Only registered students are permitted to submit leave or OD applications.');
    }

    let supportingFileKey: string | null = null;
    let supportingDocUrl: string | null = null;

    // Handle optional file attachment:
    // Option A: Direct base64 upload
    if (payload.fileData && payload.fileName) {
      const pureBase64 = payload.fileData.includes(',')
        ? payload.fileData.split(',')[1]
        : payload.fileData;

      const buffer = Buffer.from(pureBase64, 'base64');
      const { ext, sanitizedName } = FileStorage.validateFileBuffer(buffer, payload.fileName);

      const metadata = await FileStorage.saveSecureFile(
        buffer,
        ext,
        sanitizedName,
        studentUserId,
        FileStorage.getMimeType(sanitizedName)
      );

      supportingFileKey = metadata.fileKey;
      supportingDocUrl = `/api/leave-od/applications/files/${metadata.fileKey}`;
    } else if (payload.supportingDocKey && payload.supportingDocKey.trim().length > 0) {
      // Option B: Pre-uploaded file reference
      const fileKey = path.basename(payload.supportingDocKey.trim());
      // Verify ownership: must belong to the submitting student
      await FileStorage.verifyUploadOwnership(fileKey, studentUserId);
      supportingFileKey = fileKey;
      supportingDocUrl = `/api/leave-od/applications/files/${fileKey}`;
    }

    const startDate = new Date(`${payload.startDate}T00:00:00.000Z`);
    const endDate = new Date(`${payload.endDate}T23:59:59.999Z`);

    return this.leaveRepository.createApplication(
      {
        studentId: studentUserId,
        category: payload.category || 'LEAVE',
        leaveType: payload.leaveType,
        title: payload.title,
        startDate,
        endDate,
        reason: payload.reason,
        supportingFileKey,
        supportingDocUrl,
      },
      ipAddress
    );
  }

  /**
   * Student: Get own applications with filters and pagination
   */
  async getStudentApplications(
    studentUserId: string,
    userRole: UserRole,
    query: z.infer<typeof queryApplicationsSchema>
  ): Promise<LeaveApplicationsListResponseDTO> {
    if (userRole !== 'STUDENT' && userRole !== 'REGISTRAR_ADMIN') {
      throw new ForbiddenError('Unauthorized to access student application list.');
    }

    return this.leaveRepository.listStudentApplications(studentUserId, {
      status: query.status as LeaveStatus | undefined,
      category: query.category as 'LEAVE' | 'ON_DUTY' | undefined,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Get single application details with full audit trail and authorization enforcement
   */
  async getApplicationDetails(
    user: { id: string; role: UserRole },
    applicationId: string
  ): Promise<LeaveApplicationDTO> {
    const rawApp = await this.leaveRepository.findApplicationById(applicationId);
    if (!rawApp) {
      throw new NotFoundError('Leave/OD application not found.');
    }

    // Role-based Resource Authorization:
    if (user.role === 'STUDENT') {
      if (rawApp.studentId !== user.id) {
        throw new ForbiddenError('You are not authorized to view an application belonging to another student.');
      }
    } else if (user.role === 'FACULTY') {
      const isAssigned = rawApp.assignedApproverId === user.id;
      const isMentor = rawApp.student?.studentProfile?.mentorFacultyId === user.id;
      const isApprover = rawApp.approvedBy === user.id;

      if (!isAssigned && !isMentor && !isApprover) {
        throw new ForbiddenError('You are not authorized to view applications outside your assigned mentor or approver scope.');
      }
    } else if (user.role === 'HOD') {
      const hodProfile = await prisma.facultyProfile.findUnique({
        where: { userId: user.id },
        select: { departmentId: true },
      });
      const studentDeptId = rawApp.student?.studentProfile?.batch?.program?.departmentId;
      if (hodProfile && studentDeptId && hodProfile.departmentId !== studentDeptId) {
        throw new ForbiddenError('You are not authorized to view applications outside your academic department.');
      }
    }

    // Map to DTO
    const startDate = rawApp.startDate instanceof Date ? rawApp.startDate : new Date(rawApp.startDate);
    const endDate = rawApp.endDate instanceof Date ? rawApp.endDate : new Date(rawApp.endDate);
    const startMs = new Date(startDate.toISOString().split('T')[0]).getTime();
    const endMs = new Date(endDate.toISOString().split('T')[0]).getTime();
    const totalDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);

    return {
      id: rawApp.id,
      studentId: rawApp.studentId,
      studentName: rawApp.student?.fullName || 'Student',
      studentRollNumber: rawApp.student?.studentProfile?.rollNumber || 'N/A',
      studentEmail: rawApp.student?.email,
      departmentName: rawApp.student?.studentProfile?.batch?.program?.department?.name || 'Department of Computing',
      category: (rawApp.category as 'LEAVE' | 'ON_DUTY') || 'LEAVE',
      leaveType: rawApp.leaveType,
      title: rawApp.title || `${rawApp.category === 'ON_DUTY' ? 'On-Duty Pass' : 'Leave Request'} (${rawApp.leaveType})`,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalDays,
      reason: rawApp.reason,
      supportingDocUrl: rawApp.supportingDocUrl,
      supportingFileKey: rawApp.supportingFileKey,
      hasSupportingDocument: Boolean(rawApp.supportingDocUrl || rawApp.supportingFileKey),
      status: rawApp.status as LeaveStatus,
      assignedApproverId: rawApp.assignedApproverId,
      assignedApproverName: rawApp.assignedApprover?.fullName || null,
      approvedBy: rawApp.approvedBy,
      approverName: rawApp.approver?.fullName || null,
      decisionReason: rawApp.decisionReason || rawApp.mentorRemarks || rawApp.hodRemarks || null,
      decidedAt: rawApp.decidedAt ? rawApp.decidedAt.toISOString() : null,
      withdrawnAt: rawApp.withdrawnAt ? rawApp.withdrawnAt.toISOString() : null,
      withdrawalReason: rawApp.withdrawalReason || null,
      mentorRemarks: rawApp.mentorRemarks || null,
      hodRemarks: rawApp.hodRemarks || null,
      auditLogs: (rawApp.auditLogs || []).map((l: any) => ({
        id: l.id,
        applicationId: l.applicationId,
        action: l.action,
        previousStatus: l.previousStatus,
        newStatus: l.newStatus,
        performedBy: {
          id: l.performedBy?.id || l.performedById,
          fullName: l.performedBy?.fullName || 'System',
          email: l.performedBy?.email || '',
          role: l.performedBy?.role || 'SYSTEM',
        },
        reason: l.reason,
        details: l.details,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : new Date().toISOString(),
      })),
      createdAt: rawApp.createdAt instanceof Date ? rawApp.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: rawApp.updatedAt instanceof Date ? rawApp.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Student: Withdraw application (only while PENDING or NEEDS_CORRECTION)
   */
  async withdrawApplication(
    studentUserId: string,
    applicationId: string,
    payload: z.infer<typeof withdrawApplicationSchema>,
    ipAddress?: string
  ): Promise<LeaveApplicationDTO> {
    return this.leaveRepository.withdrawApplication(
      applicationId,
      studentUserId,
      payload.reason,
      ipAddress
    );
  }

  /**
   * Student: Resubmit application (only when in NEEDS_CORRECTION)
   */
  async resubmitApplication(
    studentUserId: string,
    applicationId: string,
    payload: z.infer<typeof resubmitApplicationSchema>,
    ipAddress?: string
  ): Promise<LeaveApplicationDTO> {
    let supportingFileKey: string | undefined;
    let supportingDocUrl: string | undefined;

    // Handle new document attachment if provided
    if (payload.fileData && payload.fileName) {
      const pureBase64 = payload.fileData.includes(',')
        ? payload.fileData.split(',')[1]
        : payload.fileData;

      const buffer = Buffer.from(pureBase64, 'base64');
      const { ext, sanitizedName } = FileStorage.validateFileBuffer(buffer, payload.fileName);

      const metadata = await FileStorage.saveSecureFile(
        buffer,
        ext,
        sanitizedName,
        studentUserId,
        FileStorage.getMimeType(sanitizedName)
      );

      supportingFileKey = metadata.fileKey;
      supportingDocUrl = `/api/leave-od/applications/files/${metadata.fileKey}`;
    } else if (payload.supportingDocKey && payload.supportingDocKey.trim().length > 0) {
      const fileKey = path.basename(payload.supportingDocKey.trim());
      await FileStorage.verifyUploadOwnership(fileKey, studentUserId);
      supportingFileKey = fileKey;
      supportingDocUrl = `/api/leave-od/applications/files/${fileKey}`;
    }

    const startDate = payload.startDate ? new Date(`${payload.startDate}T00:00:00.000Z`) : undefined;
    const endDate = payload.endDate ? new Date(`${payload.endDate}T23:59:59.999Z`) : undefined;

    return this.leaveRepository.resubmitApplication(
      applicationId,
      studentUserId,
      {
        title: payload.title,
        startDate,
        endDate,
        reason: payload.reason,
        supportingFileKey,
        supportingDocUrl,
      },
      ipAddress
    );
  }

  /**
   * Approver: List pending applications assigned to current approver or within authorized scope
   */
  async listApproverPending(
    approverUser: { id: string; role: UserRole },
    query: z.infer<typeof queryApplicationsSchema>
  ): Promise<LeaveApplicationsListResponseDTO> {
    if (approverUser.role === 'STUDENT') {
      throw new ForbiddenError('Students are not authorized to view the approver queue.');
    }

    return this.leaveRepository.listApproverPending(approverUser.id, approverUser.role, {
      category: query.category as 'LEAVE' | 'ON_DUTY' | undefined,
      startDate: query.startDate,
      endDate: query.endDate,
      studentId: query.studentId,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Approver: List decision history
   */
  async listApproverHistory(
    approverUser: { id: string; role: UserRole },
    query: z.infer<typeof queryApplicationsSchema>
  ): Promise<LeaveApplicationsListResponseDTO> {
    if (approverUser.role === 'STUDENT') {
      throw new ForbiddenError('Students are not authorized to view decision history queue.');
    }

    return this.leaveRepository.listApproverHistory(approverUser.id, approverUser.role, {
      status: query.status as LeaveStatus | undefined,
      category: query.category as 'LEAVE' | 'ON_DUTY' | undefined,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Approver: Decide pending application (APPROVE, REJECT, REQUEST_CORRECTION)
   * Prevents self-approval, enforces row lock, records immutable audit log.
   * If approved, triggers policy-isolated attendance integration hook.
   */
  async decideApplication(
    approverUser: { id: string; role: UserRole },
    applicationId: string,
    payload: z.infer<typeof decideApplicationSchema>,
    ipAddress?: string
  ): Promise<LeaveApplicationDTO> {
    if (approverUser.role === 'STUDENT') {
      throw new ForbiddenError('Students are not authorized to review or decide applications.');
    }

    const decided = await this.leaveRepository.decideApplication(
      applicationId,
      approverUser.id,
      approverUser.role,
      payload.action,
      payload.reason,
      ipAddress
    );

    // CRITICAL: Attendance integration hook
    // If approved, verify policy before any attendance mutation
    if (payload.action === 'APPROVE') {
      await this.syncApprovedLeaveToAttendance(applicationId);
    }

    // Trigger notification to student regarding the approver's decision
    await notificationService.sendNotification({
      recipientId: decided.studentId,
      type: 'LEAVE_OD',
      title: `Leave/OD Application ${payload.action === 'APPROVE' ? 'Approved' : payload.action === 'REJECT' ? 'Rejected' : 'Correction Requested'}`,
      message: `Your ${decided.category.replace('_', ' ')} request (${decided.startDate} to ${decided.endDate}) has been ${payload.action === 'APPROVE' ? 'approved' : payload.action === 'REJECT' ? 'rejected' : 'flagged for correction'} by ${approverUser.role}.${payload.reason ? ' Note: ' + payload.reason : ''}`,
      priority: payload.action === 'APPROVE' ? 'MEDIUM' : 'HIGH',
      resourceType: 'LEAVE_APPLICATION',
      resourceId: applicationId,
      actionUrl: '/student-dashboard?tab=leave-od',
      idempotencyKey: `LEAVE_DECISION:${applicationId}:${payload.action}`,
    });

    return decided;
  }

  /**
   * Private Document Download: Securely retrieves supporting document with resource-level authorization
   */
  async getSupportingDocument(
    user: { id: string; role: UserRole },
    applicationId: string
  ): Promise<{ filePath: string; mimeType: string; fileName: string }> {
    const rawApp = await this.leaveRepository.findApplicationById(applicationId);
    if (!rawApp) {
      throw new NotFoundError('Leave/OD application not found.');
    }

    const fileKey = rawApp.supportingFileKey || (rawApp.supportingDocUrl ? path.basename(rawApp.supportingDocUrl) : null);
    if (!fileKey) {
      throw new NotFoundError('No supporting document attached to this application.');
    }

    // Authorization:
    // 1. Student can ONLY access their own application's document
    if (user.role === 'STUDENT') {
      if (rawApp.studentId !== user.id) {
        throw new ForbiddenError('You are not authorized to access documents belonging to another student.');
      }
    } else if (user.role === 'FACULTY') {
      const isAssigned = rawApp.assignedApproverId === user.id;
      const isMentor = rawApp.student?.studentProfile?.mentorFacultyId === user.id;
      const isApprover = rawApp.approvedBy === user.id;

      if (!isAssigned && !isMentor && !isApprover) {
        throw new ForbiddenError('You are not authorized to access supporting documents outside your assigned scope.');
      }
    } else if (user.role === 'HOD') {
      const hodProfile = await prisma.facultyProfile.findUnique({
        where: { userId: user.id },
        select: { departmentId: true },
      });
      const studentDeptId = rawApp.student?.studentProfile?.batch?.program?.departmentId;
      if (hodProfile && studentDeptId && hodProfile.departmentId !== studentDeptId) {
        throw new ForbiddenError('You are not authorized to access supporting documents outside your department.');
      }
    }

    const safePath = FileStorage.getSafeFilePath(fileKey);
    if (!fs.existsSync(safePath)) {
      throw new NotFoundError('Supporting document file not found on disk.');
    }

    return {
      filePath: safePath,
      mimeType: FileStorage.getMimeType(fileKey),
      fileName: fileKey,
    };
  }

  /**
   * CRITICAL ATTENDANCE INTEGRATION HOOK
   *
   * By default: Keeps leave/OD approval separate from attendance mutation.
   * Approval must not automatically mark attendance as PRESENT, ON_DUTY, or EXEMPTED
   * unless the official academic senate policy explicitly authorizes that action.
   */
  async syncApprovedLeaveToAttendance(applicationId: string): Promise<{
    applied: boolean;
    reason: string;
    mutatedSessionsCount?: number;
  }> {
    const isAutoAttendanceEnabled = process.env.AUTO_ATTENDANCE_LEAVE_MUTATION === 'true';

    if (!isAutoAttendanceEnabled) {
      logger.info(
        'Leave/OD approval recorded. Automatic attendance mutation remains disabled pending institutional Academic Senate policy approval.',
        {
          applicationId,
          policyStatus: 'MUTATION_DEFERRED_PENDING_POLICY_CONFIRMATION',
        }
      );
      return {
        applied: false,
        reason: 'Automatic attendance mutation is disabled pending official institutional policy confirmation.',
      };
    }

    // If future policy is enabled:
    try {
      const app = await prisma.leaveApplication.findUnique({
        where: { id: applicationId },
      });

      if (!app || app.status !== 'APPROVED') {
        return { applied: false, reason: 'Application is not in approved state.' };
      }

      // Check applicable date range
      const sessions = await prisma.attendanceSession.findMany({
        where: {
          sessionDate: {
            gte: app.startDate,
            lte: app.endDate,
          },
          isLocked: false, // PRESERVE SESSION LOCKING: Never alter locked sessions
        },
      });

      let mutatedCount = 0;
      // Map application category to authorized attendance status
      const targetStatus = app.category === 'ON_DUTY' ? 'ON_DUTY' : 'EXEMPTED';

      for (const session of sessions) {
        // Idempotency: verify if already marked with this status
        const existingRecord = await prisma.attendanceRecord.findUnique({
          where: {
            sessionId_studentId: {
              sessionId: session.id,
              studentId: app.studentId,
            },
          },
        });

        if (existingRecord && existingRecord.status !== targetStatus) {
          await prisma.attendanceRecord.update({
            where: { id: existingRecord.id },
            data: {
              status: targetStatus,
              remarks: `Policy-approved ${app.category}: ${app.title}`,
            },
          });
          mutatedCount++;
        }
      }

      logger.info('Attendance synchronized for approved leave under active policy:', {
        applicationId,
        mutatedCount,
      });

      return {
        applied: true,
        reason: 'Attendance synchronized under active institutional policy.',
        mutatedSessionsCount: mutatedCount,
      };
    } catch (err) {
      logger.error('Failed to sync approved leave with attendance:', {
        applicationId,
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        applied: false,
        reason: 'Error occurred during attendance synchronization.',
      };
    }
  }
}

export const leaveService = new LeaveService();
