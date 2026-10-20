import type { Request, Response, NextFunction } from 'express';
import { notificationService, NotificationService } from '../services/notification.service.js';
import { UnauthorizedError } from '../errors/AppError.js';
import type { NotificationType } from '../types/notification.js';

export class NotificationController {
  private service: NotificationService;

  constructor(service?: NotificationService) {
    this.service = service || notificationService;
  }

  /**
   * GET /api/notifications
   * List paginated notifications for the authenticated user
   */
  async listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const isReadQuery = req.query.isRead;
      let isRead: boolean | undefined = undefined;
      if (isReadQuery === 'true') isRead = true;
      if (isReadQuery === 'false') isRead = false;

      const type = req.query.type as NotificationType | undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

      const result = await this.service.listUserNotifications(req.user.id, {
        isRead,
        type,
        limit,
        offset,
      });

      res.status(200).json({
        success: true,
        status: 'success',
        count: result.notifications.length,
        total: result.total,
        unreadCount: result.unreadCount,
        data: {
          notifications: result.notifications,
          total: result.total,
          unreadCount: result.unreadCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/notifications/unread-count
   * Get unread notification count
   */
  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const result = await this.service.getUnreadCount(req.user.id);

      res.status(200).json({
        success: true,
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Mark a single notification as read
   */
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const notificationId = String(req.params.id);

      const updated = await this.service.markAsRead(req.user.id, notificationId);

      res.status(200).json({
        success: true,
        status: 'success',
        message: 'Notification marked as read.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/notifications/mark-all-read
   * Mark all unread notifications as read
   */
  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const type = req.body.type as NotificationType | undefined;

      const result = await this.service.markAllAsRead(req.user.id, type);

      res.status(200).json({
        success: true,
        status: 'success',
        message: `Marked ${result.markedCount} notification(s) as read.`,
        data: {
          markedCount: result.markedCount,
          updatedCount: result.markedCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/notifications/:id/destination
   * Get authorized notification destination
   */
  async getDestination(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const notificationId = String(req.params.id);

      const notif = await this.service.getNotification(req.user.id, notificationId);

      res.status(200).json({
        success: true,
        status: 'success',
        data: {
          actionUrl: notif.actionUrl,
          resourceType: notif.resourceType,
          resourceId: notif.resourceId,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Delete a single notification
   */
  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const notificationId = String(req.params.id);

      await this.service.deleteNotification(req.user.id, notificationId);

      res.status(200).json({
        success: true,
        status: 'success',
        message: 'Notification deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
