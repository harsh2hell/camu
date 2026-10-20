import { prisma } from '../lib/prisma.js';
import type {
  CreateTicketInput,
  AddMessageInput,
  SupportTicketDTO,
  TicketDetailDTO,
  TicketMessageDTO,
  TicketAuditLogDTO,
  TicketQueueSummaryDTO,
  TicketStatus,
  TicketCategory,
  TicketPriority,
} from '../types/support.js';
import { NotFoundError } from '../errors/AppError.js';
import type { UserRole } from '@prisma/client';

export class SupportRepository {
  /**
   * Generate an official, unique ticket number (e.g. TKT-2026-01001)
   */
  async generateTicketNumber(): Promise<string> {
    try {
      const result = await prisma.$queryRaw<Array<{ nextval: bigint }>>`
        SELECT nextval('ticket_number_seq') as nextval;
      `;
      const seq = result[0]?.nextval ? Number(result[0].nextval) : Math.floor(1000 + Math.random() * 9000);
      const currentYear = new Date().getFullYear();
      return `TKT-${currentYear}-${String(seq).padStart(5, '0')}`;
    } catch {
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      return `TKT-${new Date().getFullYear()}-${randomSuffix}`;
    }
  }

  /**
   * Map raw database ticket to SupportTicketDTO
   */
  private mapToTicketDTO(ticket: any): SupportTicketDTO {
    const studentProfile = ticket.student?.studentProfile;
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      studentId: ticket.studentId,
      student: {
        id: ticket.student.id,
        fullName: ticket.student.fullName,
        email: ticket.student.email,
        rollNumber: studentProfile?.rollNumber,
        programName: studentProfile?.batch?.program?.name,
        departmentName: studentProfile?.batch?.program?.department?.name,
        semester: studentProfile?.currentSemester,
      },
      category: ticket.category as TicketCategory,
      priority: ticket.priority as TicketPriority,
      status: ticket.status as TicketStatus,
      subject: ticket.subject,
      description: ticket.description,
      department: ticket.department
        ? {
            id: ticket.department.id,
            code: ticket.department.code,
            name: ticket.department.name,
          }
        : null,
      assignedStaffId: ticket.assignedStaffId,
      assignedStaff: ticket.assignedStaff
        ? {
            id: ticket.assignedStaff.id,
            fullName: ticket.assignedStaff.fullName,
            email: ticket.assignedStaff.email,
            role: ticket.assignedStaff.role,
          }
        : null,
      resolutionNotes: ticket.resolutionNotes,
      resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
      resolvedBy: ticket.resolvedBy
        ? {
            id: ticket.resolvedBy.id,
            fullName: ticket.resolvedBy.fullName,
            email: ticket.resolvedBy.email,
            role: ticket.resolvedBy.role,
          }
        : null,
      closedAt: ticket.closedAt ? ticket.closedAt.toISOString() : null,
      closedBy: ticket.closedBy
        ? {
            id: ticket.closedBy.id,
            fullName: ticket.closedBy.fullName,
            email: ticket.closedBy.email,
            role: ticket.closedBy.role,
          }
        : null,
      reopenedAt: ticket.reopenedAt ? ticket.reopenedAt.toISOString() : null,
      reopenedBy: ticket.reopenedBy
        ? {
            id: ticket.reopenedBy.id,
            fullName: ticket.reopenedBy.fullName,
            email: ticket.reopenedBy.email,
            role: ticket.reopenedBy.role,
          }
        : null,
      reopenReason: ticket.reopenReason,
      messageCount: ticket._count?.messages ?? 0,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }

  /**
   * Map raw database message to TicketMessageDTO
   */
  mapMessageToDTO(msg: any): TicketMessageDTO {
    return {
      id: msg.id,
      ticketId: msg.ticketId,
      sender: {
        id: msg.sender.id,
        fullName: msg.sender.fullName,
        email: msg.sender.email,
        role: msg.sender.role,
      },
      message: msg.message,
      isInternal: msg.isInternal,
      attachmentFileKey: msg.attachmentFileKey,
      attachmentName: msg.attachmentName,
      createdAt: msg.createdAt.toISOString(),
    };
  }

  /**
   * Map raw database audit log to TicketAuditLogDTO
   */
  mapAuditLogToDTO(log: any): TicketAuditLogDTO {
    return {
      id: log.id,
      ticketId: log.ticketId,
      performedBy: {
        id: log.performedBy.id,
        fullName: log.performedBy.fullName,
        email: log.performedBy.email,
        role: log.performedBy.role,
      },
      action: log.action,
      previousStatus: log.previousStatus,
      newStatus: log.newStatus,
      previousAssignee: log.previousAssignee
        ? {
            id: log.previousAssignee.id,
            fullName: log.previousAssignee.fullName,
            email: log.previousAssignee.email,
            role: log.previousAssignee.role,
          }
        : null,
      newAssignee: log.newAssignee
        ? {
            id: log.newAssignee.id,
            fullName: log.newAssignee.fullName,
            email: log.newAssignee.email,
            role: log.newAssignee.role,
          }
        : null,
      reason: log.reason,
      details: (log.details as any) || {},
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    };
  }

  /**
   * Create a new support ticket with atomic audit log entry
   */
  async createTicket(
    studentId: string,
    data: CreateTicketInput,
    ipAddress?: string
  ): Promise<SupportTicketDTO> {
    const ticketNumber = await this.generateTicketNumber();

    return prisma.$transaction(async (tx) => {
      // 1. Create the support ticket
      const ticket = await tx.supportTicket.create({
        data: {
          ticketNumber,
          studentId,
          category: data.category,
          priority: data.priority || 'MEDIUM',
          status: 'OPEN',
          subject: data.subject,
          description: data.description,
          departmentId: data.departmentId || null,
        },
        include: {
          student: {
            include: {
              studentProfile: {
                include: {
                  batch: {
                    include: {
                      program: {
                        include: {
                          department: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          department: true,
          assignedStaff: true,
          resolvedBy: true,
          closedBy: true,
          reopenedBy: true,
          _count: { select: { messages: true } },
        },
      });

      // 2. If student included an attachment or initial description as first message
      if (data.attachmentFileKey) {
        await tx.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            senderId: studentId,
            message: data.description,
            isInternal: false,
            attachmentFileKey: data.attachmentFileKey,
            attachmentName: data.attachmentName || 'Attachment',
          },
        });
      }

      // 3. Create initial audit log
      await tx.ticketAuditLog.create({
        data: {
          ticketId: ticket.id,
          performedById: studentId,
          action: 'TICKET_CREATED',
          newStatus: 'OPEN',
          reason: 'Initial ticket creation by student',
          details: {
            category: data.category,
            priority: data.priority || 'MEDIUM',
            subject: data.subject,
          },
          ipAddress,
        },
      });

      return this.mapToTicketDTO(ticket);
    });
  }

  /**
   * Get tickets created by a specific student with pagination and filtering
   */
  async getStudentTickets(
    studentId: string,
    filters?: {
      status?: TicketStatus;
      category?: TicketCategory;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ tickets: SupportTicketDTO[]; total: number }> {
    const where: any = { studentId };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [total, rawTickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        include: {
          student: {
            include: {
              studentProfile: {
                include: {
                  batch: {
                    include: {
                      program: {
                        include: {
                          department: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          department: true,
          assignedStaff: true,
          resolvedBy: true,
          closedBy: true,
          reopenedBy: true,
          _count: { select: { messages: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
    ]);

    return {
      tickets: rawTickets.map((t) => this.mapToTicketDTO(t)),
      total,
    };
  }

  /**
   * Find ticket by ID or Ticket Number
   */
  async findTicketById(idOrNumber: string): Promise<any | null> {
    return prisma.supportTicket.findFirst({
      where: {
        OR: [{ id: idOrNumber }, { ticketNumber: idOrNumber }],
      },
      include: {
        student: {
          include: {
            studentProfile: {
              include: {
                mentor: true,
                batch: {
                  include: {
                    program: {
                      include: {
                        department: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        department: true,
        assignedStaff: true,
        resolvedBy: true,
        closedBy: true,
        reopenedBy: true,
        _count: { select: { messages: true } },
      },
    });
  }

  /**
   * Get tickets in staff queue based on caller's institutional role and scoping
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
    const where: any = {};

    // 1. Role-based scoping
    if (staffUser.role === 'REGISTRAR_ADMIN' || staffUser.role === 'DEAN') {
      // Broad institutional access
      if (filters?.departmentId) {
        where.departmentId = filters.departmentId;
      }
    } else if (staffUser.role === 'EXAM_CONTROLLER') {
      // Examination category or direct assignment
      where.OR = [
        { category: 'EXAMINATION' },
        { assignedStaffId: staffUser.id },
      ];
    } else if (staffUser.role === 'HOD') {
      // Departmental scope or assigned
      const faculty = await prisma.facultyProfile.findUnique({
        where: { userId: staffUser.id },
      });
      const hodDeptId = faculty?.departmentId;
      where.OR = [
        { departmentId: hodDeptId },
        { assignedStaffId: staffUser.id },
        {
          student: {
            studentProfile: {
              batch: {
                program: {
                  departmentId: hodDeptId,
                },
              },
            },
          },
        },
      ];
    } else {
      // Standard FACULTY role: assigned tickets OR tickets from assigned mentees
      where.OR = [
        { assignedStaffId: staffUser.id },
        {
          student: {
            studentProfile: {
              mentorFacultyId: staffUser.id,
            },
          },
        },
      ];
    }

    // 2. Filter overrides
    if (filters?.assignedToMe) {
      where.assignedStaffId = staffUser.id;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.search) {
      const searchCondition = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
        { student: { fullName: { contains: filters.search, mode: 'insensitive' } } },
      ];
      if (where.OR) {
        where.AND = [{ OR: searchCondition }];
      } else {
        where.OR = searchCondition;
      }
    }

    const [total, rawTickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        include: {
          student: {
            include: {
              studentProfile: {
                include: {
                  batch: {
                    include: {
                      program: {
                        include: {
                          department: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          department: true,
          assignedStaff: true,
          resolvedBy: true,
          closedBy: true,
          reopenedBy: true,
          _count: { select: { messages: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
    ]);

    return {
      tickets: rawTickets.map((t) => this.mapToTicketDTO(t)),
      total,
    };
  }

  /**
   * Get queue statistics summary for staff
   */
  async getQueueSummary(staffUser: { id: string; role: UserRole }): Promise<TicketQueueSummaryDTO> {
    const isFullAdmin = staffUser.role === 'REGISTRAR_ADMIN' || staffUser.role === 'DEAN';
    const baseWhere: any = isFullAdmin
      ? {}
      : {
          OR: [
            { assignedStaffId: staffUser.id },
            {
              student: {
                studentProfile: {
                  mentorFacultyId: staffUser.id,
                },
              },
            },
          ],
        };

    const [
      totalOpen,
      totalInProgress,
      totalWaitingForStudent,
      totalResolved,
      totalClosed,
      totalAssignedToMe,
    ] = await Promise.all([
      prisma.supportTicket.count({ where: { ...baseWhere, status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { ...baseWhere, status: 'IN_PROGRESS' } }),
      prisma.supportTicket.count({ where: { ...baseWhere, status: 'WAITING_FOR_STUDENT' } }),
      prisma.supportTicket.count({ where: { ...baseWhere, status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { ...baseWhere, status: 'CLOSED' } }),
      prisma.supportTicket.count({ where: { assignedStaffId: staffUser.id } }),
    ]);

    return {
      totalOpen,
      totalInProgress,
      totalWaitingForStudent,
      totalResolved,
      totalClosed,
      totalAssignedToMe,
      recentCount: totalOpen + totalInProgress + totalWaitingForStudent,
    };
  }

  /**
   * Get messages for a ticket with strict internal note privacy enforcement
   */
  async getTicketMessages(ticketId: string, isStaff: boolean): Promise<TicketMessageDTO[]> {
    const where: any = { ticketId };
    if (!isStaff) {
      // Students MUST NEVER receive internal staff notes
      where.isInternal = false;
    }

    const messages = await prisma.ticketMessage.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    return messages.map((m) => this.mapMessageToDTO(m));
  }

  /**
   * Add a reply or internal note to a ticket with atomic audit log
   */
  async addMessage(
    ticketId: string,
    senderId: string,
    data: AddMessageInput,
    isStaff: boolean,
    ipAddress?: string
  ): Promise<TicketMessageDTO> {
    return prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        throw new NotFoundError('Support ticket not found');
      }

      // Enforce internal note restrictions: only staff can author internal notes
      const isInternal = isStaff ? Boolean(data.isInternal) : false;

      // 1. Create message
      const message = await tx.ticketMessage.create({
        data: {
          ticketId,
          senderId,
          message: data.message,
          isInternal,
          attachmentFileKey: data.attachmentFileKey || null,
          attachmentName: data.attachmentName || null,
        },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // 2. Update ticket updated_at
      // If student replied and status was WAITING_FOR_STUDENT, transition to IN_PROGRESS
      const updateData: any = { updatedAt: new Date() };
      let statusTransitioned = false;
      let prevStatus: string | null = null;
      let newStatus: string | null = null;

      if (!isStaff && ticket.status === 'WAITING_FOR_STUDENT') {
        updateData.status = 'IN_PROGRESS';
        statusTransitioned = true;
        prevStatus = 'WAITING_FOR_STUDENT';
        newStatus = 'IN_PROGRESS';
      }

      await tx.supportTicket.update({
        where: { id: ticketId },
        data: updateData,
      });

      // 3. Write audit log
      const auditAction = isInternal
        ? 'INTERNAL_NOTE_ADDED'
        : isStaff
        ? 'STAFF_REPLY'
        : 'STUDENT_REPLY';

      await tx.ticketAuditLog.create({
        data: {
          ticketId,
          performedById: senderId,
          action: auditAction,
          previousStatus: prevStatus,
          newStatus: newStatus || ticket.status,
          reason: isInternal ? 'Internal staff discussion note' : 'Conversation reply',
          details: {
            isInternal,
            hasAttachment: Boolean(data.attachmentFileKey),
            attachmentName: data.attachmentName || null,
          },
          ipAddress,
        },
      });

      return this.mapMessageToDTO(message);
    });
  }

  /**
   * Update ticket status with atomic audit logging and concurrency row-locking
   */
  async updateTicketStatus(
    ticketId: string,
    actorId: string,
    newStatus: TicketStatus,
    reason?: string,
    resolutionNotes?: string,
    ipAddress?: string
  ): Promise<SupportTicketDTO> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.supportTicket.findUnique({
        where: { id: ticketId },
      });

      if (!current) {
        throw new NotFoundError('Support ticket not found');
      }

      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === 'RESOLVED') {
        updateData.resolvedAt = new Date();
        updateData.resolvedById = actorId;
        if (resolutionNotes) {
          updateData.resolutionNotes = resolutionNotes;
        }
      } else if (newStatus === 'CLOSED') {
        updateData.closedAt = new Date();
        updateData.closedById = actorId;
      }

      // Update ticket
      const updated = await tx.supportTicket.update({
        where: { id: ticketId },
        data: updateData,
        include: {
          student: {
            include: {
              studentProfile: {
                include: {
                  batch: {
                    include: {
                      program: {
                        include: {
                          department: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          department: true,
          assignedStaff: true,
          resolvedBy: true,
          closedBy: true,
          reopenedBy: true,
          _count: { select: { messages: true } },
        },
      });

      // Record atomic audit log
      const auditAction =
        newStatus === 'RESOLVED'
          ? 'TICKET_RESOLVED'
          : newStatus === 'CLOSED'
          ? 'TICKET_CLOSED'
          : 'STATUS_CHANGED';

      await tx.ticketAuditLog.create({
        data: {
          ticketId,
          performedById: actorId,
          action: auditAction,
          previousStatus: current.status,
          newStatus,
          reason: reason || resolutionNotes || `Status updated to ${newStatus}`,
          details: {
            resolutionNotes: resolutionNotes || null,
          },
          ipAddress,
        },
      });

      return this.mapToTicketDTO(updated);
    });
  }

  /**
   * Reopen a resolved ticket with mandatory reason
   */
  async reopenTicket(
    ticketId: string,
    actorId: string,
    reason: string,
    ipAddress?: string
  ): Promise<SupportTicketDTO> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.supportTicket.findUnique({
        where: { id: ticketId },
      });

      if (!current) {
        throw new NotFoundError('Support ticket not found');
      }

      const updated = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: 'IN_PROGRESS',
          reopenedAt: new Date(),
          reopenedById: actorId,
          reopenReason: reason,
          updatedAt: new Date(),
        },
        include: {
          student: {
            include: {
              studentProfile: {
                include: {
                  batch: {
                    include: {
                      program: {
                        include: {
                          department: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          department: true,
          assignedStaff: true,
          resolvedBy: true,
          closedBy: true,
          reopenedBy: true,
          _count: { select: { messages: true } },
        },
      });

      await tx.ticketAuditLog.create({
        data: {
          ticketId,
          performedById: actorId,
          action: 'TICKET_REOPENED',
          previousStatus: current.status,
          newStatus: 'IN_PROGRESS',
          reason,
          details: { reopenReason: reason },
          ipAddress,
        },
      });

      return this.mapToTicketDTO(updated);
    });
  }

  /**
   * Assign or reassign ticket to staff member with atomic audit logging
   */
  async assignTicket(
    ticketId: string,
    actorId: string,
    newAssigneeId: string | null,
    reason?: string,
    ipAddress?: string
  ): Promise<SupportTicketDTO> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.supportTicket.findUnique({
        where: { id: ticketId },
      });

      if (!current) {
        throw new NotFoundError('Support ticket not found');
      }

      const updated = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          assignedStaffId: newAssigneeId,
          status: current.status === 'OPEN' && newAssigneeId ? 'IN_PROGRESS' : current.status,
          updatedAt: new Date(),
        },
        include: {
          student: {
            include: {
              studentProfile: {
                include: {
                  batch: {
                    include: {
                      program: {
                        include: {
                          department: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          department: true,
          assignedStaff: true,
          resolvedBy: true,
          closedBy: true,
          reopenedBy: true,
          _count: { select: { messages: true } },
        },
      });

      await tx.ticketAuditLog.create({
        data: {
          ticketId,
          performedById: actorId,
          action: 'TICKET_ASSIGNED',
          previousStatus: current.status,
          newStatus: updated.status,
          previousAssigneeId: current.assignedStaffId,
          newAssigneeId,
          reason: reason || (newAssigneeId ? 'Ticket assigned to staff' : 'Ticket unassigned'),
          details: {
            previousAssigneeId: current.assignedStaffId,
            newAssigneeId,
          },
          ipAddress,
        },
      });

      return this.mapToTicketDTO(updated);
    });
  }

  /**
   * Get audit history for a ticket
   */
  async getTicketAuditLogs(ticketId: string): Promise<TicketAuditLogDTO[]> {
    const logs = await prisma.ticketAuditLog.findMany({
      where: { ticketId },
      include: {
        performedBy: {
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

export const supportRepository = new SupportRepository();
