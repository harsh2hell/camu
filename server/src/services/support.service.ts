import { supportRepository, SupportRepository } from '../repositories/support.repository.js';
import type {
  CreateTicketInput,
  AddMessageInput,
  UpdateTicketStatusInput,
  AssignTicketInput,
  ReopenTicketInput,
  SupportTicketDTO,
  TicketDetailDTO,
  TicketMessageDTO,
  TicketAuditLogDTO,
  TicketQueueSummaryDTO,
  TicketStatus,
  TicketCategory,
} from '../types/support.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../errors/AppError.js';
import { VALID_STATUS_TRANSITIONS } from '../types/support.js';
import type { UserRole } from '@prisma/client';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { notificationService } from './notification.service.js';

export class SupportService {
  constructor(private repo: SupportRepository = supportRepository) {}

  /**
   * Scoped verification for staff access to a specific ticket
   */
  private async verifyStaffTicketAccess(
    staffUser: { id: string; role: UserRole },
    ticket: any
  ): Promise<void> {
    // 1. Institutional Admins, Deans have universal queue authorization
    if (staffUser.role === 'REGISTRAR_ADMIN' || staffUser.role === 'DEAN') {
      return;
    }

    // 2. Examination Controller has access to EXAMINATION tickets
    if (staffUser.role === 'EXAM_CONTROLLER') {
      if (ticket.category === 'EXAMINATION' || ticket.assignedStaffId === staffUser.id) {
        return;
      }
    }

    // 3. Directly assigned staff has authorization
    if (ticket.assignedStaffId === staffUser.id) {
      return;
    }

    // 4. Assigned faculty mentor of the student has authorization
    const mentorId = ticket.student?.studentProfile?.mentor?.id;
    if (mentorId && mentorId === staffUser.id) {
      return;
    }

    // 5. Department Head (HOD) of the student or ticket's department has authorization
    if (staffUser.role === 'HOD') {
      const hodProfile = await prisma.facultyProfile.findUnique({
        where: { userId: staffUser.id },
        select: { departmentId: true },
      });
      const hodDeptId = hodProfile?.departmentId;
      const studentDeptId = ticket.student?.studentProfile?.batch?.program?.departmentId;
      if (
        hodDeptId &&
        (ticket.departmentId === hodDeptId || studentDeptId === hodDeptId)
      ) {
        return;
      }
    }

    logger.warn('Unauthorized staff ticket access attempt', {
      staffUserId: staffUser.id,
      staffRole: staffUser.role,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
    });

    throw new ForbiddenError(
      'Access denied: You are not authorized to view or manage tickets outside your assigned mentorship or department queue.'
    );
  }

  /**
   * Create a new support ticket (Student only)
   */
  async createTicket(
    user: { id: string; role: UserRole },
    input: CreateTicketInput,
    ipAddress?: string
  ): Promise<SupportTicketDTO> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenError('Only authenticated students can submit support and grievance tickets.');
    }

    // Verify attachment if provided
    if (input.attachmentFileKey) {
      const fileRecord = await prisma.uploadedFile.findUnique({
        where: { fileKey: input.attachmentFileKey },
      });
      if (!fileRecord) {
        logger.warn('Attachment key provided does not exist in uploaded_files', {
          fileKey: input.attachmentFileKey,
        });
      }
    }

    return this.repo.createTicket(user.id, input, ipAddress);
  }

  /**
   * Get authenticated student's own tickets
   */
  async getMyTickets(
    user: { id: string; role: UserRole },
    filters?: {
      status?: TicketStatus;
      category?: TicketCategory;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ tickets: SupportTicketDTO[]; total: number }> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenError('Staff users must query the staff helpdesk queue.');
    }

    return this.repo.getStudentTickets(user.id, filters);
  }

  /**
   * Get full ticket details with conversation thread & audit history
   */
  async getTicketDetail(
    caller: { id: string; role: UserRole },
    ticketIdOrNumber: string
  ): Promise<TicketDetailDTO> {
    const rawTicket = await this.repo.findTicketById(ticketIdOrNumber);
    if (!rawTicket) {
      throw new NotFoundError(`Support ticket '${ticketIdOrNumber}' not found.`);
    }

    const isStudent = caller.role === 'STUDENT';

    // Anti-IDOR Authorization Check
    if (isStudent) {
      if (rawTicket.studentId !== caller.id) {
        throw new ForbiddenError('Students are strictly prohibited from viewing tickets belonging to other students.');
      }
    } else {
      await this.verifyStaffTicketAccess(caller, rawTicket);
    }

    // Messages with strict internal note protection
    // isStaff is true ONLY for authorized staff members
    const isStaff = !isStudent;
    const [messages, auditLogs] = await Promise.all([
      this.repo.getTicketMessages(rawTicket.id, isStaff),
      this.repo.getTicketAuditLogs(rawTicket.id),
    ]);

    const studentProfile = rawTicket.student?.studentProfile;
    return {
      id: rawTicket.id,
      ticketNumber: rawTicket.ticketNumber,
      studentId: rawTicket.studentId,
      assignedStaffId: rawTicket.assignedStaffId,
      student: {
        id: rawTicket.student.id,
        fullName: rawTicket.student.fullName,
        email: rawTicket.student.email,
        rollNumber: studentProfile?.rollNumber,
        programName: studentProfile?.batch?.program?.name,
        departmentName: studentProfile?.batch?.program?.department?.name,
        semester: studentProfile?.currentSemester,
      },
      category: rawTicket.category as TicketCategory,
      priority: rawTicket.priority as any,
      status: rawTicket.status as TicketStatus,
      subject: rawTicket.subject,
      description: rawTicket.description,
      department: rawTicket.department
        ? {
            id: rawTicket.department.id,
            code: rawTicket.department.code,
            name: rawTicket.department.name,
          }
        : null,
      assignedStaff: rawTicket.assignedStaff
        ? {
            id: rawTicket.assignedStaff.id,
            fullName: rawTicket.assignedStaff.fullName,
            email: rawTicket.assignedStaff.email,
            role: rawTicket.assignedStaff.role,
          }
        : null,
      resolutionNotes: rawTicket.resolutionNotes,
      resolvedAt: rawTicket.resolvedAt ? rawTicket.resolvedAt.toISOString() : null,
      resolvedBy: rawTicket.resolvedBy
        ? {
            id: rawTicket.resolvedBy.id,
            fullName: rawTicket.resolvedBy.fullName,
            email: rawTicket.resolvedBy.email,
            role: rawTicket.resolvedBy.role,
          }
        : null,
      closedAt: rawTicket.closedAt ? rawTicket.closedAt.toISOString() : null,
      closedBy: rawTicket.closedBy
        ? {
            id: rawTicket.closedBy.id,
            fullName: rawTicket.closedBy.fullName,
            email: rawTicket.closedBy.email,
            role: rawTicket.closedBy.role,
          }
        : null,
      reopenedAt: rawTicket.reopenedAt ? rawTicket.reopenedAt.toISOString() : null,
      reopenedBy: rawTicket.reopenedBy
        ? {
            id: rawTicket.reopenedBy.id,
            fullName: rawTicket.reopenedBy.fullName,
            email: rawTicket.reopenedBy.email,
            role: rawTicket.reopenedBy.role,
          }
        : null,
      reopenReason: rawTicket.reopenReason,
      messageCount: messages.length,
      createdAt: rawTicket.createdAt.toISOString(),
      updatedAt: rawTicket.updatedAt.toISOString(),
      messages,
      auditLogs,
    };
  }

  /**
   * Add a reply or internal note to a ticket
   */
  async addMessage(
    caller: { id: string; role: UserRole },
    ticketId: string,
    input: AddMessageInput,
    ipAddress?: string
  ): Promise<TicketMessageDTO> {
    const rawTicket = await this.repo.findTicketById(ticketId);
    if (!rawTicket) {
      throw new NotFoundError(`Support ticket '${ticketId}' not found.`);
    }

    const isStudent = caller.role === 'STUDENT';

    // Anti-IDOR Authorization Check
    if (isStudent) {
      if (rawTicket.studentId !== caller.id) {
        throw new ForbiddenError('Students cannot respond to tickets belonging to other students.');
      }

      // Check if ticket is closed
      if (rawTicket.status === 'CLOSED') {
        throw new BadRequestError('This ticket is closed. Please reopen the ticket or submit a new request to reply.');
      }

      // Students cannot post internal notes
      if (input.isInternal) {
        throw new ForbiddenError('Students are not permitted to author internal staff notes.');
      }
    } else {
      await this.verifyStaffTicketAccess(caller, rawTicket);
    }

    const msg = await this.repo.addMessage(
      rawTicket.id,
      caller.id,
      input,
      !isStudent,
      ipAddress
    );

    // Notification Integration:
    // If staff posted a public reply (isInternal = false), notify the student.
    // Internal notes (isInternal = true) MUST NEVER trigger student notifications or be exposed!
    if (!isStudent && !input.isInternal) {
      await notificationService.sendNotification({
        recipientId: rawTicket.studentId,
        type: 'SUPPORT_TICKET',
        title: `Response on Support Ticket ${rawTicket.ticketNumber}`,
        message: `An institutional representative responded to your ticket: "${rawTicket.subject}".`,
        priority: 'MEDIUM',
        resourceType: 'SUPPORT_TICKET',
        resourceId: rawTicket.id,
        actionUrl: '/student-dashboard?tab=support',
        idempotencyKey: `TICKET_MSG:${msg.id}`,
      });
    } else if (isStudent && rawTicket.assignedStaffId) {
      // If student posted a response, notify the assigned staff member
      await notificationService.sendNotification({
        recipientId: rawTicket.assignedStaffId,
        type: 'SUPPORT_TICKET',
        title: `Student Reply on Ticket ${rawTicket.ticketNumber}`,
        message: `Student replied to ticket: "${rawTicket.subject}".`,
        priority: 'MEDIUM',
        resourceType: 'SUPPORT_TICKET',
        resourceId: rawTicket.id,
        actionUrl: '/staff-helpdesk',
        idempotencyKey: `TICKET_MSG:${msg.id}`,
      });
    }

    return msg;
  }

  /**
   * Update ticket status through validated state transitions
   */
  async updateTicketStatus(
    staffUser: { id: string; role: UserRole },
    ticketId: string,
    input: UpdateTicketStatusInput,
    ipAddress?: string
  ): Promise<SupportTicketDTO> {
    if (staffUser.role === 'STUDENT') {
      throw new ForbiddenError('Students cannot update ticket lifecycle statuses directly. Use the reopen endpoint if eligible.');
    }

    const rawTicket = await this.repo.findTicketById(ticketId);
    if (!rawTicket) {
      throw new NotFoundError(`Support ticket '${ticketId}' not found.`);
    }

    await this.verifyStaffTicketAccess(staffUser, rawTicket);

    const currentStatus = rawTicket.status as TicketStatus;
    const newStatus = input.status;

    // Validate state machine
    if (currentStatus === newStatus) {
      return this.repo.findTicketById(ticketId);
    }

    const allowedNextStatuses = VALID_STATUS_TRANSITIONS[currentStatus];
    if (!allowedNextStatuses || !allowedNextStatuses.includes(newStatus)) {
      throw new BadRequestError(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. Permitted transitions: ${allowedNextStatuses?.join(', ') || 'None'}`
      );
    }

    // Enforce resolution notes when resolving a ticket
    if (newStatus === 'RESOLVED' && (!input.resolutionNotes || !input.resolutionNotes.trim())) {
      throw new BadRequestError('Resolution notes are required when transitioning a ticket to RESOLVED.');
    }

    // Closed tickets can only be reopened by REGISTRAR_ADMIN
    if (currentStatus === 'CLOSED' && staffUser.role !== 'REGISTRAR_ADMIN') {
      throw new ForbiddenError('Only Registrar Administrators can transition closed tickets.');
    }

    const updated = await this.repo.updateTicketStatus(
      rawTicket.id,
      staffUser.id,
      newStatus,
      input.reason,
      input.resolutionNotes,
      ipAddress
    );

    // Notify student on resolution or closure
    if (newStatus === 'RESOLVED' || newStatus === 'CLOSED') {
      await notificationService.sendNotification({
        recipientId: rawTicket.studentId,
        type: 'SUPPORT_TICKET',
        title: `Ticket ${rawTicket.ticketNumber} ${newStatus === 'RESOLVED' ? 'Resolved' : 'Closed'}`,
        message: `Your support ticket "${rawTicket.subject}" has been marked as ${newStatus.toLowerCase()}.${input.resolutionNotes ? ' Resolution: ' + input.resolutionNotes : ''}`,
        priority: 'MEDIUM',
        resourceType: 'SUPPORT_TICKET',
        resourceId: rawTicket.id,
        actionUrl: '/student-dashboard?tab=support',
        idempotencyKey: `TICKET_STATUS:${rawTicket.id}:${newStatus}`,
      });
    }

    return updated;
  }

  /**
   * Reopen a resolved ticket (Student or Staff)
   */
  async reopenTicket(
    caller: { id: string; role: UserRole },
    ticketId: string,
    input: ReopenTicketInput,
    ipAddress?: string
  ): Promise<SupportTicketDTO> {
    const rawTicket = await this.repo.findTicketById(ticketId);
    if (!rawTicket) {
      throw new NotFoundError(`Support ticket '${ticketId}' not found.`);
    }

    if (caller.role === 'STUDENT') {
      if (rawTicket.studentId !== caller.id) {
        throw new ForbiddenError('Students cannot reopen tickets belonging to other students.');
      }
      if (rawTicket.status !== 'RESOLVED') {
        throw new BadRequestError(
          `Only RESOLVED tickets can be reopened by students. Current status is '${rawTicket.status}'. For closed tickets, please raise a new ticket.`
        );
      }
    } else {
      await this.verifyStaffTicketAccess(caller, rawTicket);
      if (rawTicket.status === 'CLOSED' && caller.role !== 'REGISTRAR_ADMIN') {
        throw new ForbiddenError('Only Registrar Administrators can reopen closed tickets.');
      }
    }

    return this.repo.reopenTicket(rawTicket.id, caller.id, input.reason, ipAddress);
  }

  /**
   * Assign or reassign ticket
   */
  async assignTicket(
    staffUser: { id: string; role: UserRole },
    ticketId: string,
    input: AssignTicketInput,
    ipAddress?: string
  ): Promise<SupportTicketDTO> {
    if (staffUser.role === 'STUDENT') {
      throw new ForbiddenError('Students cannot assign tickets.');
    }

    const rawTicket = await this.repo.findTicketById(ticketId);
    if (!rawTicket) {
      throw new NotFoundError(`Support ticket '${ticketId}' not found.`);
    }

    await this.verifyStaffTicketAccess(staffUser, rawTicket);

    // Verify assigned staff user exists and has a staff role
    if (input.assignedStaffId) {
      const targetStaff = await prisma.user.findUnique({
        where: { id: input.assignedStaffId },
      });
      if (!targetStaff || targetStaff.role === 'STUDENT') {
        throw new BadRequestError('Assignee must be an active faculty or staff member.');
      }
    }

    const assigned = await this.repo.assignTicket(
      rawTicket.id,
      staffUser.id,
      input.assignedStaffId,
      input.reason,
      ipAddress
    );

    // If assigned to a staff member (other than the assigner themselves), send notification
    if (input.assignedStaffId && input.assignedStaffId !== staffUser.id) {
      await notificationService.sendNotification({
        recipientId: input.assignedStaffId,
        type: 'SUPPORT_TICKET',
        title: `Ticket Assigned: ${rawTicket.ticketNumber}`,
        message: `You have been assigned to support ticket: "${rawTicket.subject}".`,
        priority: 'MEDIUM',
        resourceType: 'SUPPORT_TICKET',
        resourceId: rawTicket.id,
        actionUrl: '/staff-helpdesk',
        idempotencyKey: `TICKET_ASSIGN:${rawTicket.id}:${input.assignedStaffId}`,
      });
    }

    return assigned;
  }

  /**
   * Get staff support queue with RBAC and filter scoping
   */
  async getStaffQueue(
    staffUser: { id: string; role: UserRole },
    filters?: {
      status?: TicketStatus;
      category?: TicketCategory;
      departmentId?: string;
      assignedToMe?: boolean;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ tickets: SupportTicketDTO[]; total: number }> {
    if (staffUser.role === 'STUDENT') {
      throw new ForbiddenError('Students cannot access the staff support queue.');
    }

    return this.repo.getStaffQueue(staffUser, filters);
  }

  /**
   * Get queue summary counts
   */
  async getQueueSummary(staffUser: { id: string; role: UserRole }): Promise<TicketQueueSummaryDTO> {
    if (staffUser.role === 'STUDENT') {
      throw new ForbiddenError('Students cannot access staff queue statistics.');
    }

    return this.repo.getQueueSummary(staffUser);
  }

  /**
   * Get audit history for a ticket
   */
  async getTicketAuditLogs(
    caller: { id: string; role: UserRole },
    ticketId: string
  ): Promise<TicketAuditLogDTO[]> {
    const rawTicket = await this.repo.findTicketById(ticketId);
    if (!rawTicket) {
      throw new NotFoundError(`Support ticket '${ticketId}' not found.`);
    }

    if (caller.role === 'STUDENT') {
      if (rawTicket.studentId !== caller.id) {
        throw new ForbiddenError('Students cannot view audit trails of other students’ tickets.');
      }
    } else {
      await this.verifyStaffTicketAccess(caller, rawTicket);
    }

    return this.repo.getTicketAuditLogs(rawTicket.id);
  }
}

export const supportService = new SupportService();
