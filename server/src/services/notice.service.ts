import fs from 'node:fs';
import path from 'node:path';
import { noticeRepository, NoticeRepository } from '../repositories/notice.repository.js';
import { FileStorage } from '../lib/fileStorage.js';
import { logger } from '../lib/logger.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
} from '../errors/AppError.js';
import type {
  createNoticeSchema,
  updateNoticeSchema,
  publishNoticeSchema,
  archiveNoticeSchema,
  cancelNoticeSchema,
  noticeQuerySchema,
  NoticeDTO,
  NoticeListResponseDTO,
  AudiencePreviewDTO,
} from '../types/notice.js';
import type { UserRole, NoticeStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export class NoticeService {
  private repo: NoticeRepository;

  constructor(repo?: NoticeRepository) {
    this.repo = repo || noticeRepository;
  }

  /**
   * Validates if user has permission to manage notice
   */
  private async verifyManagementPermission(
    user: { id: string; role: UserRole },
    notice: { postedById: string; departmentId?: string | null }
  ): Promise<void> {
    if (user.role === 'REGISTRAR_ADMIN' || user.role === 'DEAN' || user.role === 'EXAM_CONTROLLER') {
      return;
    }

    if (user.role === 'HOD') {
      if (notice.postedById === user.id) return;
      const hodProfile = await prisma.facultyProfile.findUnique({
        where: { userId: user.id },
        select: { departmentId: true },
      });
      if (hodProfile && notice.departmentId && hodProfile.departmentId === notice.departmentId) {
        return;
      }
    }

    if (user.role === 'FACULTY') {
      if (notice.postedById === user.id) return;
    }

    throw new ForbiddenError('You are not authorized to manage or edit this notice.');
  }

  /**
   * Create Notice (Draft, Scheduled, or Published)
   */
  async createNotice(
    user: { id: string; role: UserRole },
    payload: z.infer<typeof createNoticeSchema>,
    ipAddress?: string
  ): Promise<NoticeDTO> {
    if (user.role === 'STUDENT') {
      throw new ForbiddenError('Students are not authorized to create campus notices or circulars.');
    }

    // Role-specific scope restrictions:
    // HODs can only target their own department or department's programs/batches
    if (user.role === 'HOD' && payload.departmentId) {
      const hodProfile = await prisma.facultyProfile.findUnique({
        where: { userId: user.id },
        select: { departmentId: true },
      });
      if (hodProfile && hodProfile.departmentId !== payload.departmentId) {
        throw new ForbiddenError('Department Heads can only create notices for their assigned academic department.');
      }
    }

    let attachmentFileKey: string | null = null;
    let attachmentUrl: string | null = null;

    // Handle optional file attachment
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
        user.id,
        FileStorage.getMimeType(sanitizedName)
      );

      attachmentFileKey = metadata.fileKey;
      attachmentUrl = `/api/notices/files/${metadata.fileKey}`;
    } else if (payload.attachmentFileKey && payload.attachmentFileKey.trim().length > 0) {
      const fileKey = path.basename(payload.attachmentFileKey.trim());
      await FileStorage.verifyUploadOwnership(fileKey, user.id);
      attachmentFileKey = fileKey;
      attachmentUrl = `/api/notices/files/${fileKey}`;
    }

    // Determine initial status & publication timestamp
    let status: NoticeStatus = 'DRAFT';
    let publishAt: Date | null = null;
    let publishedAt: Date | null = null;

    if (payload.publishNow || payload.status === 'PUBLISHED') {
      status = 'PUBLISHED';
      publishedAt = new Date();
      publishAt = publishedAt;
    } else if (payload.publishAt || payload.status === 'SCHEDULED') {
      status = 'SCHEDULED';
      publishAt = payload.publishAt ? new Date(payload.publishAt) : new Date();
    }

    const eventDate = payload.eventDate ? new Date(payload.eventDate) : null;
    const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;

    return this.repo.createNotice(
      {
        title: payload.title,
        content: payload.content,
        category: payload.category,
        priority: payload.priority,
        status,
        targetRole: payload.targetRole || null,
        departmentId: payload.departmentId || null,
        programId: payload.programId || null,
        batchId: payload.batchId || null,
        targetSemester: payload.targetSemester || null,
        isPinned: payload.isPinned,
        eventDate,
        publishAt,
        publishedAt,
        expiresAt,
        attachmentUrl,
        attachmentFileKey,
        postedById: user.id,
      },
      ipAddress
    );
  }

  /**
   * Update existing Notice
   */
  async updateNotice(
    user: { id: string; role: UserRole },
    noticeId: string,
    payload: z.infer<typeof updateNoticeSchema>,
    ipAddress?: string
  ): Promise<NoticeDTO> {
    const rawNotice = await this.repo.findNoticeById(noticeId);
    if (!rawNotice) {
      throw new NotFoundError('Notice not found.');
    }

    await this.verifyManagementPermission(user, rawNotice);

    let attachmentFileKey: string | undefined;
    let attachmentUrl: string | undefined;

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
        user.id,
        FileStorage.getMimeType(sanitizedName)
      );

      attachmentFileKey = metadata.fileKey;
      attachmentUrl = `/api/notices/files/${metadata.fileKey}`;
    } else if (payload.attachmentFileKey && payload.attachmentFileKey.trim().length > 0) {
      const fileKey = path.basename(payload.attachmentFileKey.trim());
      await FileStorage.verifyUploadOwnership(fileKey, user.id);
      attachmentFileKey = fileKey;
      attachmentUrl = `/api/notices/files/${fileKey}`;
    }

    const eventDate = payload.eventDate ? new Date(payload.eventDate) : payload.eventDate === null ? null : undefined;
    const publishAt = payload.publishAt ? new Date(payload.publishAt) : payload.publishAt === null ? null : undefined;
    const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : payload.expiresAt === null ? null : undefined;

    return this.repo.updateNotice(
      noticeId,
      {
        title: payload.title,
        content: payload.content,
        category: payload.category,
        priority: payload.priority,
        targetRole: payload.targetRole,
        departmentId: payload.departmentId,
        programId: payload.programId,
        batchId: payload.batchId,
        targetSemester: payload.targetSemester,
        isPinned: payload.isPinned,
        eventDate,
        publishAt,
        expiresAt,
        attachmentUrl,
        attachmentFileKey,
      },
      user.id,
      ipAddress
    );
  }

  /**
   * Publish or Schedule Notice
   */
  async publishNotice(
    user: { id: string; role: UserRole },
    noticeId: string,
    payload: z.infer<typeof publishNoticeSchema>,
    ipAddress?: string
  ): Promise<NoticeDTO> {
    const rawNotice = await this.repo.findNoticeById(noticeId);
    if (!rawNotice) {
      throw new NotFoundError('Notice not found.');
    }

    await this.verifyManagementPermission(user, rawNotice);

    const publishAt = payload.publishAt ? new Date(payload.publishAt) : null;
    const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : undefined;

    return this.repo.publishNotice(
      noticeId,
      {
        publishNow: payload.publishNow,
        publishAt,
        expiresAt,
      },
      user.id,
      ipAddress
    );
  }

  /**
   * Archive Notice
   */
  async archiveNotice(
    user: { id: string; role: UserRole },
    noticeId: string,
    payload: z.infer<typeof archiveNoticeSchema>,
    ipAddress?: string
  ): Promise<NoticeDTO> {
    const rawNotice = await this.repo.findNoticeById(noticeId);
    if (!rawNotice) {
      throw new NotFoundError('Notice not found.');
    }

    await this.verifyManagementPermission(user, rawNotice);

    return this.repo.archiveNotice(noticeId, payload.reason, user.id, ipAddress);
  }

  /**
   * Cancel Notice
   */
  async cancelNotice(
    user: { id: string; role: UserRole },
    noticeId: string,
    payload: z.infer<typeof cancelNoticeSchema>,
    ipAddress?: string
  ): Promise<NoticeDTO> {
    const rawNotice = await this.repo.findNoticeById(noticeId);
    if (!rawNotice) {
      throw new NotFoundError('Notice not found.');
    }

    await this.verifyManagementPermission(user, rawNotice);

    return this.repo.cancelNotice(noticeId, payload.reason, user.id, ipAddress);
  }

  /**
   * Recipient Feed: List published notices targeted to current user
   */
  async getRecipientFeed(
    user: { id: string; role: UserRole },
    query: z.infer<typeof noticeQuerySchema>
  ): Promise<NoticeListResponseDTO> {
    return this.repo.listRecipientNotices(user, {
      category: query.category,
      priority: query.priority,
      search: query.search,
      pinnedOnly: query.pinnedOnly,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Management Feed: List Drafts, Scheduled, Published, Archived for staff
   */
  async getManagementFeed(
    user: { id: string; role: UserRole },
    query: z.infer<typeof noticeQuerySchema>
  ): Promise<NoticeListResponseDTO> {
    if (user.role === 'STUDENT') {
      throw new ForbiddenError('Students are not authorized to view the notice management console.');
    }

    return this.repo.listManagementNotices(user, {
      status: query.status as NoticeStatus | undefined,
      category: query.category,
      priority: query.priority,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Get single notice detail with strict audience authorization
   */
  async getNoticeDetails(
    user: { id: string; role: UserRole },
    noticeId: string
  ): Promise<NoticeDTO> {
    // Run due scheduled notice check
    await this.repo.processDueScheduledNotices();

    const rawNotice = await this.repo.findNoticeById(noticeId, user.id);
    if (!rawNotice) {
      throw new NotFoundError('Notice not found.');
    }

    const isAuthor = rawNotice.postedById === user.id;
    const isStaff =
      user.role === 'REGISTRAR_ADMIN' ||
      user.role === 'DEAN' ||
      user.role === 'EXAM_CONTROLLER' ||
      user.role === 'HOD';

    // 1. If notice is not PUBLISHED, only author or authorized staff can access it
    if (rawNotice.status !== 'PUBLISHED') {
      if (!isAuthor && !isStaff) {
        throw new ForbiddenError('Notice is not currently published or available for recipient viewing.');
      }
    }

    // 2. If notice is expired, verify if recipient
    if (rawNotice.expiresAt && new Date(rawNotice.expiresAt).getTime() <= Date.now()) {
      if (!isAuthor && !isStaff) {
        throw new ForbiddenError('Notice has expired and is no longer available in the active noticeboard.');
      }
    }

    // 3. Audience enforcement for students
    if (user.role === 'STUDENT') {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: user.id },
        include: { batch: { include: { program: true } } },
      });

      if (rawNotice.targetRole && rawNotice.targetRole !== 'STUDENT') {
        throw new ForbiddenError('This notice is not addressed to students.');
      }

      if (rawNotice.departmentId && studentProfile?.batch?.program?.departmentId !== rawNotice.departmentId) {
        throw new ForbiddenError('This notice is restricted to a different academic department.');
      }

      if (rawNotice.programId && studentProfile?.batch?.programId !== rawNotice.programId) {
        throw new ForbiddenError('This notice is restricted to a different academic program.');
      }

      if (rawNotice.batchId && studentProfile?.batchId !== rawNotice.batchId) {
        throw new ForbiddenError('This notice is restricted to a specific student batch.');
      }

      if (rawNotice.targetSemester && studentProfile?.currentSemester !== rawNotice.targetSemester) {
        throw new ForbiddenError('This notice is restricted to a different academic semester.');
      }

      // Mark acknowledgement
      await this.repo.acknowledgeNotice(noticeId, user.id);
    } else if (user.role === 'FACULTY') {
      if (rawNotice.targetRole && rawNotice.targetRole !== 'FACULTY' && rawNotice.targetRole !== 'HOD') {
        throw new ForbiddenError('This notice is not addressed to faculty members.');
      }
      await this.repo.acknowledgeNotice(noticeId, user.id);
    }

    return this.repo.mapNoticeToDTO(rawNotice, user.id);
  }

  /**
   * Private Attachment Download: Verifies notice existence and audience authorization
   */
  async getNoticeAttachment(
    user: { id: string; role: UserRole },
    noticeId: string
  ): Promise<{ filePath: string; mimeType: string; fileName: string }> {
    const notice = await this.getNoticeDetails(user, noticeId);

    const fileKey = notice.attachmentFileKey || (notice.attachmentUrl ? path.basename(notice.attachmentUrl) : null);
    if (!fileKey) {
      throw new NotFoundError('No file attachment associated with this notice.');
    }

    const safePath = FileStorage.getSafeFilePath(fileKey);
    if (!fs.existsSync(safePath)) {
      throw new NotFoundError('Attachment file not found on disk.');
    }

    return {
      filePath: safePath,
      mimeType: FileStorage.getMimeType(fileKey),
      fileName: fileKey,
    };
  }

  /**
   * Audience Preview Calculation
   */
  async getAudiencePreview(
    user: { id: string; role: UserRole },
    criteria: {
      targetRole?: UserRole | null;
      departmentId?: string | null;
      programId?: string | null;
      batchId?: string | null;
      targetSemester?: number | null;
    }
  ): Promise<AudiencePreviewDTO> {
    if (user.role === 'STUDENT') {
      throw new ForbiddenError('Students are not authorized to preview target audiences.');
    }

    return this.repo.getAudiencePreview(criteria);
  }

  /**
   * Background processor invocation
   */
  async triggerScheduledProcessing(): Promise<number> {
    return this.repo.processDueScheduledNotices();
  }
}

export const noticeService = new NoticeService();
