import type { Request, Response, NextFunction } from 'express';
import { noticeService } from '../services/notice.service.js';
import { UnauthorizedError } from '../errors/AppError.js';
import type { UserRole } from '@prisma/client';

export class NoticeController {
  /**
   * GET /api/notices
   * Recipient feed for student / faculty noticeboard
   */
  async getRecipientFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await noticeService.getRecipientFeed(
        { id: req.user.id, role: req.user.role as UserRole },
        req.query as any
      );
      res.status(200).json({
        status: 'success',
        count: result.notices.length,
        unreadCount: result.unreadCount,
        data: result.notices,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/notices/manage
   * Management console feed for staff (Drafts, Scheduled, Published, Archived)
   */
  async getManagementFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await noticeService.getManagementFeed(
        { id: req.user.id, role: req.user.role as UserRole },
        req.query as any
      );
      res.status(200).json({
        status: 'success',
        count: result.notices.length,
        data: result.notices,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/notices
   * Create notice (Draft, Scheduled, or Published)
   */
  async createNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const ipAddress = req.ip || req.socket.remoteAddress;
      const notice = await noticeService.createNotice(
        { id: req.user.id, role: req.user.role as UserRole },
        req.body,
        ipAddress
      );
      res.status(201).json({
        status: 'success',
        success: true,
        message: `Notice successfully created as ${notice.status}.`,
        data: notice,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET or POST /api/notices/audience-preview
   * Preview estimated recipient count for audience criteria
   */
  async getAudiencePreview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const criteria = req.method === 'POST' ? req.body : req.query;
      const preview = await noticeService.getAudiencePreview(
        { id: req.user.id, role: req.user.role as UserRole },
        criteria as any
      );
      res.status(200).json({
        status: 'success',
        data: preview,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/notices/process-scheduled
   * Process due scheduled notices
   */
  async processScheduled(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const processedCount = await noticeService.triggerScheduledProcessing();
      res.status(200).json({
        status: 'success',
        data: { processedCount },
        processedCount,
        message: `Successfully processed ${processedCount} scheduled notices.`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/notices/:id
   * Get single notice detail
   */
  async getNoticeDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const noticeId = String(req.params.id);
      const notice = await noticeService.getNoticeDetails(
        { id: req.user.id, role: req.user.role as UserRole },
        noticeId
      );
      res.status(200).json({
        status: 'success',
        data: notice,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/notices/:id
   * Edit existing notice
   */
  async updateNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const noticeId = String(req.params.id);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const updated = await noticeService.updateNotice(
        { id: req.user.id, role: req.user.role as UserRole },
        noticeId,
        req.body,
        ipAddress
      );
      res.status(200).json({
        status: 'success',
        message: 'Notice updated successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/notices/:id/publish
   * Publish or schedule notice
   */
  async publishNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const noticeId = String(req.params.id);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const updated = await noticeService.publishNotice(
        { id: req.user.id, role: req.user.role as UserRole },
        noticeId,
        req.body,
        ipAddress
      );
      res.status(200).json({
        status: 'success',
        message: `Notice status updated to ${updated.status}.`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/notices/:id/archive
   * Move published notice to archives
   */
  async archiveNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const noticeId = String(req.params.id);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const archived = await noticeService.archiveNotice(
        { id: req.user.id, role: req.user.role as UserRole },
        noticeId,
        req.body,
        ipAddress
      );
      res.status(200).json({
        status: 'success',
        message: 'Notice successfully archived.',
        data: archived,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/notices/:id/cancel
   * Cancel notice
   */
  async cancelNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const noticeId = String(req.params.id);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const cancelled = await noticeService.cancelNotice(
        { id: req.user.id, role: req.user.role as UserRole },
        noticeId,
        req.body,
        ipAddress
      );
      res.status(200).json({
        status: 'success',
        message: 'Notice successfully cancelled.',
        data: cancelled,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/notices/:id/attachment
   * Secure private download of notice attachment
   */
  async downloadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const noticeId = String(req.params.id);
      const doc = await noticeService.getNoticeAttachment(
        { id: req.user.id, role: req.user.role as UserRole },
        noticeId
      );

      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.sendFile(doc.filePath);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/notices/:id/audit-trail
   * View immutable audit trail for a notice
   */
  async getNoticeAuditTrail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const noticeId = String(req.params.id);
      const notice = await noticeService.getNoticeDetails(
        { id: req.user.id, role: req.user.role as UserRole },
        noticeId
      );
      res.status(200).json({
        status: 'success',
        count: notice.auditLogs?.length || 0,
        data: notice.auditLogs || [],
      });
    } catch (err) {
      next(err);
    }
  }
}

export const noticeController = new NoticeController();
