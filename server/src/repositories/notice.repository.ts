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
  NoticeDTO,
  NoticeListResponseDTO,
  NoticeAuditLogDTO,
  AudiencePreviewDTO,
} from '../types/notice.js';
import type { NoticeStatus, Prisma, UserRole } from '@prisma/client';

export class NoticeRepository {
  /**
   * Helper: Map Prisma Notice to NoticeDTO
   */
  mapNoticeToDTO(n: any, currentUserId?: string): NoticeDTO {
    const isAcknowledged =
      currentUserId && n.acknowledgements
        ? n.acknowledgements.some((a: any) => a.userId === currentUserId || a.user_id === currentUserId)
        : false;

    return {
      id: n.id,
      title: n.title,
      content: n.content,
      category: n.category,
      priority: (n.priority as any) || 'NORMAL',
      status: n.status as NoticeStatus,
      targetRole: n.targetRole || null,
      departmentId: n.departmentId || null,
      departmentName: n.department?.name || null,
      programId: n.programId || null,
      programName: n.program?.name || null,
      batchId: n.batchId || null,
      batchName: n.batch?.batchName || null,
      targetSemester: n.targetSemester || null,
      isPinned: n.isPinned,
      attachmentUrl: n.attachmentUrl || null,
      attachmentFileKey: n.attachmentFileKey || null,
      hasAttachment: Boolean(n.attachmentUrl || n.attachmentFileKey),
      postedById: n.postedById,
      authorName: n.postedBy?.fullName || 'University Administration',
      authorRole: n.postedBy?.role || 'REGISTRAR_ADMIN',
      eventDate: n.eventDate ? n.eventDate.toISOString() : null,
      publishAt: n.publishAt ? n.publishAt.toISOString() : null,
      publishedAt: n.publishedAt ? n.publishedAt.toISOString() : null,
      expiresAt: n.expiresAt ? n.expiresAt.toISOString() : null,
      archivedAt: n.archivedAt ? n.archivedAt.toISOString() : null,
      cancelledAt: n.cancelledAt ? n.cancelledAt.toISOString() : null,
      isAcknowledged,
      acknowledgedCount: n._count?.acknowledgements ?? n.acknowledgements?.length ?? 0,
      auditLogs: (n.auditLogs || []).map((l: any) => this.mapAuditLogToDTO(l)),
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: n.updatedAt instanceof Date ? n.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Helper: Map NoticeAuditLog to DTO
   */
  private mapAuditLogToDTO(log: any): NoticeAuditLogDTO {
    return {
      id: log.id,
      noticeId: log.noticeId || log.notice_id,
      action: log.action,
      previousStatus: log.previousStatus || log.previous_status || null,
      newStatus: log.newStatus || log.new_status,
      performedBy: {
        id: log.performedBy?.id || log.performedById || log.performed_by_id,
        fullName: log.performedBy?.fullName || 'System',
        email: log.performedBy?.email || '',
        role: log.performedBy?.role || 'SYSTEM',
      },
      reason: log.reason,
      details: log.details,
      ipAddress: log.ipAddress || log.ip_address || null,
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Safe Database-Backed Due-Notice Processor:
   * Finds notices in SCHEDULED status whose publish_at <= NOW() and atomically transitions them to PUBLISHED.
   * Multi-instance safe via SKIP LOCKED row selection.
   */
  async processDueScheduledNotices(): Promise<number> {
    const result = await this.processDueScheduledNoticesWithDetails();
    return result.count;
  }

  /**
   * Concurrency-safe scheduled notice processor returning transitioned notice records
   * Multi-instance safe via SKIP LOCKED row selection.
   */
  async processDueScheduledNoticesWithDetails(): Promise<{
    count: number;
    notices: Array<{
      id: string;
      title: string;
      content: string;
      priority: string;
      targetRole?: UserRole | null;
      departmentId?: string | null;
      programId?: string | null;
      batchId?: string | null;
      targetSemester?: number | null;
    }>;
  }> {
    try {
      const now = new Date();
      return await prisma.$transaction(async (tx) => {
        const dueRows = await tx.$queryRaw<any[]>`
          SELECT id, title, content, priority, target_role, department_id, program_id, batch_id, target_semester, posted_by
          FROM notices
          WHERE status = 'SCHEDULED'::notice_status
            AND publish_at IS NOT NULL
            AND publish_at <= ${now}
          FOR UPDATE SKIP LOCKED
        `;

        if (!dueRows || dueRows.length === 0) {
          return { count: 0, notices: [] };
        }

        const transitioned: any[] = [];
        for (const row of dueRows) {
          await tx.notice.update({
            where: { id: row.id },
            data: {
              status: 'PUBLISHED',
              publishedAt: now,
            },
          });

          await tx.noticeAuditLog.create({
            data: {
              noticeId: row.id,
              action: 'SCHEDULED_PUBLISH_AUTO',
              previousStatus: 'SCHEDULED',
              newStatus: 'PUBLISHED',
              performedById: row.posted_by,
              reason: 'Scheduled publication time arrived; automatically published by database processor.',
            },
          });

          transitioned.push({
            id: row.id,
            title: row.title,
            content: row.content,
            priority: row.priority,
            targetRole: row.target_role,
            departmentId: row.department_id,
            programId: row.program_id,
            batchId: row.batch_id,
            targetSemester: row.target_semester,
          });
        }

        logger.info(`Processed ${dueRows.length} scheduled notices to PUBLISHED state.`);
        return { count: dueRows.length, notices: transitioned };
      });
    } catch (err) {
      logger.error('Error during processDueScheduledNotices:', err);
      return { count: 0, notices: [] };
    }
  }

  /**
   * Create Notice (Draft, Scheduled, or Published) with atomic audit trail
   */
  async createNotice(
    data: {
      title: string;
      content: string;
      category: string;
      priority: string;
      status: NoticeStatus;
      targetRole?: UserRole | null;
      departmentId?: string | null;
      programId?: string | null;
      batchId?: string | null;
      targetSemester?: number | null;
      isPinned: boolean;
      eventDate?: Date | null;
      publishAt?: Date | null;
      publishedAt?: Date | null;
      expiresAt?: Date | null;
      attachmentUrl?: string | null;
      attachmentFileKey?: string | null;
      postedById: string;
    },
    ipAddress?: string
  ): Promise<NoticeDTO> {
    try {
      return await prisma.$transaction(async (tx) => {
        const notice = await tx.notice.create({
          data: {
            title: data.title,
            content: data.content,
            category: data.category,
            priority: data.priority,
            status: data.status,
            targetRole: data.targetRole || null,
            departmentId: data.departmentId || null,
            programId: data.programId || null,
            batchId: data.batchId || null,
            targetSemester: data.targetSemester || null,
            isPinned: data.isPinned,
            eventDate: data.eventDate || null,
            publishAt: data.publishAt || null,
            publishedAt: data.status === 'PUBLISHED' ? (data.publishedAt || new Date()) : null,
            expiresAt: data.expiresAt || null,
            attachmentUrl: data.attachmentUrl || null,
            attachmentFileKey: data.attachmentFileKey || null,
            postedById: data.postedById,
          },
          include: {
            postedBy: { select: { id: true, fullName: true, role: true } },
            department: { select: { id: true, name: true } },
            program: { select: { id: true, name: true } },
            batch: { select: { id: true, batchName: true } },
          },
        });

        const actionName =
          data.status === 'PUBLISHED'
            ? 'NOTICE_PUBLISHED'
            : data.status === 'SCHEDULED'
            ? 'NOTICE_SCHEDULED'
            : 'NOTICE_DRAFT_CREATED';

        await tx.noticeAuditLog.create({
          data: {
            noticeId: notice.id,
            action: actionName,
            previousStatus: null,
            newStatus: data.status,
            performedById: data.postedById,
            reason: `Notice created with status ${data.status}`,
            ipAddress: ipAddress || null,
          },
        });

        return this.mapNoticeToDTO(notice, data.postedById);
      });
    } catch (err) {
      logger.error('Failed to create notice:', { data, error: err });
      throw new ServiceUnavailableError('Database service unavailable to create notice.');
    }
  }

  /**
   * Find single notice by ID with full relations & audit logs
   */
  async findNoticeById(id: string, currentUserId?: string): Promise<any> {
    try {
      return await prisma.notice.findUnique({
        where: { id },
        include: {
          postedBy: { select: { id: true, fullName: true, role: true } },
          department: { select: { id: true, name: true } },
          program: { select: { id: true, name: true } },
          batch: { select: { id: true, batchName: true } },
          acknowledgements: {
            select: { userId: true, acknowledgedAt: true },
          },
          auditLogs: {
            include: {
              performedBy: { select: { id: true, fullName: true, email: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { acknowledgements: true },
          },
        },
      });
    } catch (err) {
      logger.error('Failed to find notice by id:', { id, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Edit existing Notice (allowed while DRAFT, SCHEDULED, or PUBLISHED)
   */
  async updateNotice(
    noticeId: string,
    data: {
      title?: string;
      content?: string;
      category?: string;
      priority?: string;
      targetRole?: UserRole | null;
      departmentId?: string | null;
      programId?: string | null;
      batchId?: string | null;
      targetSemester?: number | null;
      isPinned?: boolean;
      eventDate?: Date | null;
      publishAt?: Date | null;
      expiresAt?: Date | null;
      attachmentUrl?: string | null;
      attachmentFileKey?: string | null;
    },
    performedById: string,
    ipAddress?: string
  ): Promise<NoticeDTO> {
    try {
      return await prisma.$transaction(async (tx) => {
        const rawRows = await tx.$queryRaw<any[]>`
          SELECT * FROM notices WHERE id = ${noticeId}::uuid FOR UPDATE
        `;

        if (!rawRows || rawRows.length === 0) {
          throw new NotFoundError('Notice not found.');
        }

        const notice = rawRows[0];

        if (notice.status === 'ARCHIVED' || notice.status === 'CANCELLED') {
          throw new ConflictError(`Cannot edit a notice in ${notice.status} status.`);
        }

        const updated = await tx.notice.update({
          where: { id: noticeId },
          data: {
            title: data.title ?? notice.title,
            content: data.content ?? notice.content,
            category: data.category ?? notice.category,
            priority: data.priority ?? notice.priority,
            targetRole: data.targetRole !== undefined ? data.targetRole : notice.target_role,
            departmentId: data.departmentId !== undefined ? data.departmentId : notice.department_id,
            programId: data.programId !== undefined ? data.programId : notice.program_id,
            batchId: data.batchId !== undefined ? data.batchId : notice.batch_id,
            targetSemester: data.targetSemester !== undefined ? data.targetSemester : notice.target_semester,
            isPinned: data.isPinned ?? notice.is_pinned,
            eventDate: data.eventDate !== undefined ? data.eventDate : notice.event_date,
            publishAt: data.publishAt !== undefined ? data.publishAt : notice.publish_at,
            expiresAt: data.expiresAt !== undefined ? data.expiresAt : notice.expires_at,
            attachmentUrl: data.attachmentUrl !== undefined ? data.attachmentUrl : notice.attachment_url,
            attachmentFileKey: data.attachmentFileKey !== undefined ? data.attachmentFileKey : notice.attachment_file_key,
          },
          include: {
            postedBy: { select: { id: true, fullName: true, role: true } },
            department: { select: { id: true, name: true } },
            program: { select: { id: true, name: true } },
            batch: { select: { id: true, batchName: true } },
          },
        });

        await tx.noticeAuditLog.create({
          data: {
            noticeId,
            action: 'NOTICE_EDITED',
            previousStatus: notice.status,
            newStatus: updated.status,
            performedById,
            reason: 'Notice content or audience metadata updated.',
            ipAddress: ipAddress || null,
          },
        });

        return this.mapNoticeToDTO(updated, performedById);
      });
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof ConflictError || err instanceof ForbiddenError) {
        throw err;
      }
      logger.error('Failed to update notice:', { noticeId, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Publish or Schedule Notice
   */
  async publishNotice(
    noticeId: string,
    options: {
      publishNow: boolean;
      publishAt?: Date | null;
      expiresAt?: Date | null;
    },
    performedById: string,
    ipAddress?: string
  ): Promise<NoticeDTO> {
    try {
      return await prisma.$transaction(async (tx) => {
        const rawRows = await tx.$queryRaw<any[]>`
          SELECT * FROM notices WHERE id = ${noticeId}::uuid FOR UPDATE
        `;

        if (!rawRows || rawRows.length === 0) {
          throw new NotFoundError('Notice not found.');
        }

        const notice = rawRows[0];

        if (notice.status === 'ARCHIVED' || notice.status === 'CANCELLED') {
          throw new ConflictError(`Cannot publish a notice that is ${notice.status}.`);
        }

        const newStatus: NoticeStatus = options.publishNow ? 'PUBLISHED' : 'SCHEDULED';
        const now = new Date();

        const updated = await tx.notice.update({
          where: { id: noticeId },
          data: {
            status: newStatus,
            publishAt: options.publishNow ? now : options.publishAt,
            publishedAt: options.publishNow ? now : null,
            expiresAt: options.expiresAt !== undefined ? options.expiresAt : notice.expires_at,
          },
          include: {
            postedBy: { select: { id: true, fullName: true, role: true } },
            department: { select: { id: true, name: true } },
            program: { select: { id: true, name: true } },
            batch: { select: { id: true, batchName: true } },
          },
        });

        await tx.noticeAuditLog.create({
          data: {
            noticeId,
            action: options.publishNow ? 'NOTICE_PUBLISHED' : 'NOTICE_SCHEDULED',
            previousStatus: notice.status,
            newStatus,
            performedById,
            reason: options.publishNow
              ? 'Notice published immediately to targeted audience.'
              : `Notice scheduled for publication at ${options.publishAt?.toISOString()}`,
            ipAddress: ipAddress || null,
          },
        });

        return this.mapNoticeToDTO(updated, performedById);
      });
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof ConflictError || err instanceof ForbiddenError) {
        throw err;
      }
      logger.error('Failed to publish notice:', { noticeId, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Archive Notice (only while PUBLISHED)
   */
  async archiveNotice(
    noticeId: string,
    reason?: string,
    performedById?: string,
    ipAddress?: string
  ): Promise<NoticeDTO> {
    try {
      return await prisma.$transaction(async (tx) => {
        const rawRows = await tx.$queryRaw<any[]>`
          SELECT * FROM notices WHERE id = ${noticeId}::uuid FOR UPDATE
        `;

        if (!rawRows || rawRows.length === 0) {
          throw new NotFoundError('Notice not found.');
        }

        const notice = rawRows[0];

        if (notice.status !== 'PUBLISHED') {
          throw new ConflictError(`Only PUBLISHED notices can be archived (current status: ${notice.status}).`);
        }

        const updated = await tx.notice.update({
          where: { id: noticeId },
          data: {
            status: 'ARCHIVED',
            archivedAt: new Date(),
          },
          include: {
            postedBy: { select: { id: true, fullName: true, role: true } },
            department: { select: { id: true, name: true } },
            program: { select: { id: true, name: true } },
            batch: { select: { id: true, batchName: true } },
          },
        });

        if (performedById) {
          await tx.noticeAuditLog.create({
            data: {
              noticeId,
              action: 'NOTICE_ARCHIVED',
              previousStatus: 'PUBLISHED',
              newStatus: 'ARCHIVED',
              performedById,
              reason: reason || 'Notice moved to university archives.',
              ipAddress: ipAddress || null,
            },
          });
        }

        return this.mapNoticeToDTO(updated, performedById);
      });
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof ConflictError || err instanceof ForbiddenError) {
        throw err;
      }
      logger.error('Failed to archive notice:', { noticeId, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Cancel Notice
   */
  async cancelNotice(
    noticeId: string,
    reason: string,
    performedById: string,
    ipAddress?: string
  ): Promise<NoticeDTO> {
    try {
      return await prisma.$transaction(async (tx) => {
        const rawRows = await tx.$queryRaw<any[]>`
          SELECT * FROM notices WHERE id = ${noticeId}::uuid FOR UPDATE
        `;

        if (!rawRows || rawRows.length === 0) {
          throw new NotFoundError('Notice not found.');
        }

        const notice = rawRows[0];

        if (notice.status === 'CANCELLED') {
          throw new BadRequestError('Notice has already been cancelled.');
        }

        if (notice.status === 'ARCHIVED') {
          throw new ConflictError('Archived notices cannot be cancelled.');
        }

        const updated = await tx.notice.update({
          where: { id: noticeId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
          include: {
            postedBy: { select: { id: true, fullName: true, role: true } },
            department: { select: { id: true, name: true } },
            program: { select: { id: true, name: true } },
            batch: { select: { id: true, batchName: true } },
          },
        });

        await tx.noticeAuditLog.create({
          data: {
            noticeId,
            action: 'NOTICE_CANCELLED',
            previousStatus: notice.status,
            newStatus: 'CANCELLED',
            performedById,
            reason,
            ipAddress: ipAddress || null,
          },
        });

        return this.mapNoticeToDTO(updated, performedById);
      });
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof ConflictError || err instanceof BadRequestError) {
        throw err;
      }
      logger.error('Failed to cancel notice:', { noticeId, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Audience-Scoped Notice Feed for Recipients (Students & Faculty)
   * Enforces server-side audience matching strictly:
   * - Only PUBLISHED notices
   * - Not expired (expiresAt == null || expiresAt > now)
   * - Audience matches user profile (role, department, program, batch, semester)
   */
  async listRecipientNotices(
    user: { id: string; role: UserRole },
    filters: {
      category?: string;
      priority?: string;
      search?: string;
      pinnedOnly?: boolean;
      page: number;
      limit: number;
    }
  ): Promise<NoticeListResponseDTO> {
    try {
      // 1. Opportunistic run of due scheduled notices processor
      await this.processDueScheduledNotices();

      const now = new Date();

      // Base query: PUBLISHED and not expired
      const where: Prisma.NoticeWhereInput = {
        status: 'PUBLISHED',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      };

      // 2. Audience scoping per role:
      if (user.role === 'STUDENT') {
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { userId: user.id },
          include: {
            batch: {
              include: {
                program: true,
              },
            },
          },
        });

        const batchId = studentProfile?.batchId;
        const programId = studentProfile?.batch?.programId;
        const departmentId = studentProfile?.batch?.program?.departmentId;
        const semester = studentProfile?.currentSemester;

        where.AND = [
          // Target Role: null (all) or STUDENT
          { OR: [{ targetRole: null }, { targetRole: 'STUDENT' }] },
          // Department: null or matches student's department
          { OR: [{ departmentId: null }, ...(departmentId ? [{ departmentId }] : [])] },
          // Program: null or matches student's program
          { OR: [{ programId: null }, ...(programId ? [{ programId }] : [])] },
          // Batch: null or matches student's batch
          { OR: [{ batchId: null }, ...(batchId ? [{ batchId }] : [])] },
          // Semester: null or matches student's semester
          { OR: [{ targetSemester: null }, ...(semester ? [{ targetSemester: semester }] : [])] },
        ];
      } else if (user.role === 'FACULTY' || user.role === 'HOD') {
        const facultyProfile = await prisma.facultyProfile.findUnique({
          where: { userId: user.id },
          select: { departmentId: true },
        });

        const departmentId = facultyProfile?.departmentId;

        where.AND = [
          { OR: [{ targetRole: null }, { targetRole: user.role }] },
          { OR: [{ departmentId: null }, ...(departmentId ? [{ departmentId }] : [])] },
        ];
      } else {
        // REGISTRAR_ADMIN, DEAN, EXAM_CONTROLLER see all published notices
      }

      // Category filter
      if (filters.category && filters.category !== 'ALL') {
        where.category = filters.category;
      }

      // Priority filter
      if (filters.priority) {
        where.priority = filters.priority;
      }

      // Pinned only
      if (filters.pinnedOnly) {
        where.isPinned = true;
      }

      // Search keyword (title or content)
      if (filters.search && filters.search.trim().length > 0) {
        const query = filters.search.trim();
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ];
      }

      const skip = (filters.page - 1) * filters.limit;

      const [totalCount, items, ackCount] = await Promise.all([
        prisma.notice.count({ where }),
        prisma.notice.findMany({
          where,
          include: {
            postedBy: { select: { id: true, fullName: true, role: true } },
            department: { select: { id: true, name: true } },
            program: { select: { id: true, name: true } },
            batch: { select: { id: true, batchName: true } },
            acknowledgements: {
              where: { userId: user.id },
              select: { userId: true },
            },
          },
          orderBy: [
            { isPinned: 'desc' },
            { publishedAt: 'desc' },
            { createdAt: 'desc' },
          ],
          skip,
          take: filters.limit,
        }),
        prisma.noticeAcknowledgement.count({
          where: {
            userId: user.id,
            notice: where,
          },
        }),
      ]);

      const unreadCount = Math.max(0, totalCount - ackCount);

      return {
        notices: items.map((itm) => this.mapNoticeToDTO(itm, user.id)),
        pagination: {
          page: filters.page,
          limit: filters.limit,
          totalCount,
          totalPages: Math.ceil(totalCount / filters.limit) || 1,
        },
        unreadCount,
      };
    } catch (err) {
      logger.error('Failed to list recipient notices:', { userId: user.id, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Management Notice Listing (for authorized staff to manage Drafts, Scheduled, Published, Archived)
   */
  async listManagementNotices(
    user: { id: string; role: UserRole },
    filters: {
      status?: NoticeStatus;
      category?: string;
      priority?: string;
      search?: string;
      page: number;
      limit: number;
    }
  ): Promise<NoticeListResponseDTO> {
    try {
      await this.processDueScheduledNotices();

      const where: Prisma.NoticeWhereInput = {};

      // Role Scoping for Management:
      // REGISTRAR_ADMIN, DEAN, EXAM_CONTROLLER see all notices
      // HOD sees their department notices or notices they created
      // FACULTY sees only notices they posted
      if (user.role === 'FACULTY') {
        where.postedById = user.id;
      } else if (user.role === 'HOD') {
        const hodProfile = await prisma.facultyProfile.findUnique({
          where: { userId: user.id },
          select: { departmentId: true },
        });
        if (hodProfile) {
          where.OR = [
            { postedById: user.id },
            { departmentId: hodProfile.departmentId },
          ];
        } else {
          where.postedById = user.id;
        }
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.category && filters.category !== 'ALL') {
        where.category = filters.category;
      }

      if (filters.priority) {
        where.priority = filters.priority;
      }

      if (filters.search && filters.search.trim().length > 0) {
        const query = filters.search.trim();
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ];
      }

      const skip = (filters.page - 1) * filters.limit;

      const [totalCount, items] = await Promise.all([
        prisma.notice.count({ where }),
        prisma.notice.findMany({
          where,
          include: {
            postedBy: { select: { id: true, fullName: true, role: true } },
            department: { select: { id: true, name: true } },
            program: { select: { id: true, name: true } },
            batch: { select: { id: true, batchName: true } },
            _count: { select: { acknowledgements: true } },
          },
          orderBy: [
            { isPinned: 'desc' },
            { createdAt: 'desc' },
          ],
          skip,
          take: filters.limit,
        }),
      ]);

      return {
        notices: items.map((itm) => this.mapNoticeToDTO(itm, user.id)),
        pagination: {
          page: filters.page,
          limit: filters.limit,
          totalCount,
          totalPages: Math.ceil(totalCount / filters.limit) || 1,
        },
      };
    } catch (err) {
      logger.error('Failed to list management notices:', { userId: user.id, error: err });
      throw new ServiceUnavailableError('Database service unavailable.');
    }
  }

  /**
   * Mark Notice as Read / Acknowledged
   */
  async acknowledgeNotice(noticeId: string, userId: string): Promise<boolean> {
    try {
      await prisma.noticeAcknowledgement.upsert({
        where: {
          noticeId_userId: { noticeId, userId },
        },
        create: {
          noticeId,
          userId,
        },
        update: {
          acknowledgedAt: new Date(),
        },
      });
      return true;
    } catch (err) {
      logger.error('Failed to acknowledge notice:', { noticeId, userId, error: err });
      return false;
    }
  }

  /**
   * Audience Preview: Estimates matching recipients based on target criteria
   */
  async getAudiencePreview(criteria: {
    targetRole?: UserRole | null;
    departmentId?: string | null;
    programId?: string | null;
    batchId?: string | null;
    targetSemester?: number | null;
  }): Promise<AudiencePreviewDTO> {
    try {
      let estimatedCount = 0;
      let desc = 'University-wide audience (all students and faculty)';

      if (criteria.targetRole === 'STUDENT' || !criteria.targetRole) {
        const studentWhere: Prisma.StudentProfileWhereInput = {};

        if (criteria.batchId) {
          studentWhere.batchId = criteria.batchId;
        } else if (criteria.programId) {
          studentWhere.batch = { programId: criteria.programId };
        } else if (criteria.departmentId) {
          studentWhere.batch = { program: { departmentId: criteria.departmentId } };
        }

        if (criteria.targetSemester) {
          studentWhere.currentSemester = criteria.targetSemester;
        }

        const studentCount = await prisma.studentProfile.count({ where: studentWhere });
        estimatedCount += studentCount;

        if (criteria.batchId) {
          const b = await prisma.batch.findUnique({ where: { id: criteria.batchId } });
          desc = `Students in batch ${b?.batchName || criteria.batchId}`;
        } else if (criteria.programId) {
          const p = await prisma.program.findUnique({ where: { id: criteria.programId } });
          desc = `Students enrolled in ${p?.name || criteria.programId}`;
        } else if (criteria.departmentId) {
          const d = await prisma.department.findUnique({ where: { id: criteria.departmentId } });
          desc = `Students in ${d?.name || criteria.departmentId}`;
        }
      }

      if (criteria.targetRole === 'FACULTY' || !criteria.targetRole) {
        const facultyWhere: Prisma.FacultyProfileWhereInput = {};
        if (criteria.departmentId) {
          facultyWhere.departmentId = criteria.departmentId;
        }
        const facultyCount = await prisma.facultyProfile.count({ where: facultyWhere });
        estimatedCount += facultyCount;

        if (criteria.targetRole === 'FACULTY') {
          desc = criteria.departmentId ? 'Faculty in selected department' : 'All University Faculty';
        }
      }

      // Resolve names for DTO
      let deptName: string | null = null;
      let progName: string | null = null;
      let batchName: string | null = null;

      if (criteria.departmentId) {
        const d = await prisma.department.findUnique({ where: { id: criteria.departmentId } });
        deptName = d?.name || null;
      }
      if (criteria.programId) {
        const p = await prisma.program.findUnique({ where: { id: criteria.programId } });
        progName = p?.name || null;
      }
      if (criteria.batchId) {
        const b = await prisma.batch.findUnique({ where: { id: criteria.batchId } });
        batchName = b?.batchName || null;
      }

      return {
        targetRole: criteria.targetRole || null,
        departmentId: criteria.departmentId || null,
        departmentName: deptName,
        programId: criteria.programId || null,
        programName: progName,
        batchId: criteria.batchId || null,
        batchName,
        targetSemester: criteria.targetSemester || null,
        estimatedRecipientCount: estimatedCount,
        audienceDescription: desc,
      };
    } catch (err) {
      logger.error('Failed to calculate audience preview:', err);
      throw new ServiceUnavailableError('Failed to calculate audience preview.');
    }
  }

  /**
   * Resolve list of recipient user IDs matching audience criteria
   */
  async getAudienceUserIds(criteria: {
    targetRole?: UserRole | null;
    departmentId?: string | null;
    programId?: string | null;
    batchId?: string | null;
    targetSemester?: number | null;
  }): Promise<string[]> {
    const userIds = new Set<string>();

    if (criteria.targetRole === 'STUDENT' || !criteria.targetRole) {
      const studentWhere: Prisma.StudentProfileWhereInput = {};
      if (criteria.batchId) {
        studentWhere.batchId = criteria.batchId;
      } else if (criteria.programId) {
        studentWhere.batch = { programId: criteria.programId };
      } else if (criteria.departmentId) {
        studentWhere.batch = { program: { departmentId: criteria.departmentId } };
      }
      if (criteria.targetSemester) {
        studentWhere.currentSemester = criteria.targetSemester;
      }

      const students = await prisma.studentProfile.findMany({
        where: studentWhere,
        select: { userId: true },
      });
      students.forEach((s) => userIds.add(s.userId));
    }

    if (criteria.targetRole === 'FACULTY' || !criteria.targetRole) {
      const facultyWhere: Prisma.FacultyProfileWhereInput = {};
      if (criteria.departmentId) {
        facultyWhere.departmentId = criteria.departmentId;
      }
      const faculty = await prisma.facultyProfile.findMany({
        where: facultyWhere,
        select: { userId: true },
      });
      faculty.forEach((f) => userIds.add(f.userId));
    }

    return Array.from(userIds);
  }
}

export const noticeRepository = new NoticeRepository();
