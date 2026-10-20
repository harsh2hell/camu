import {
  NotificationRepository,
  notificationRepository,
} from '../repositories/notification.repository.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../errors/AppError.js';
import type {
  CreateNotificationInput,
  QueryNotificationInput,
  NotificationDTO,
  NotificationListResponseDTO,
  NotificationType,
} from '../types/notification.js';
import { logger } from '../lib/logger.js';
import type { Prisma } from '@prisma/client';

export class NotificationService {
  private repo: NotificationRepository;

  constructor(repo?: NotificationRepository) {
    this.repo = repo || notificationRepository;
  }

  /**
   * List paginated notifications for the authenticated user
   */
  async listUserNotifications(
    userId: string,
    params: QueryNotificationInput
  ): Promise<NotificationListResponseDTO> {
    return this.repo.listUserNotifications(userId, params);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const count = await this.repo.getUnreadCount(userId);
    return { unreadCount: count };
  }

  /**
   * Mark single notification as read with anti-IDOR verification
   */
  async markAsRead(userId: string, notificationId: string): Promise<NotificationDTO> {
    const notif = await this.repo.findById(notificationId);
    if (!notif) {
      throw new NotFoundError('Notification not found.');
    }

    if (notif.recipientId !== userId) {
      throw new ForbiddenError('You are not authorized to access or modify this notification.');
    }

    const updated = await this.repo.markAsRead(userId, notificationId);
    if (!updated) {
      throw new NotFoundError('Notification not found.');
    }

    return updated;
  }

  /**
   * Mark all unread notifications as read
   */
  async markAllAsRead(
    userId: string,
    type?: NotificationType
  ): Promise<{ markedCount: number }> {
    const count = await this.repo.markAllAsRead(userId, type);
    return { markedCount: count };
  }

  /**
   * Get single notification with anti-IDOR check
   */
  async getNotification(userId: string, notificationId: string): Promise<NotificationDTO> {
    const notif = await this.repo.findById(notificationId);
    if (!notif) {
      throw new NotFoundError('Notification not found.');
    }
    if (notif.recipientId !== userId) {
      throw new ForbiddenError('You are not authorized to view this notification destination.');
    }
    return notif;
  }

  /**
   * Delete a notification with anti-IDOR verification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<{ success: boolean }> {
    const notif = await this.repo.findById(notificationId);
    if (!notif) {
      throw new NotFoundError('Notification not found.');
    }

    if (notif.recipientId !== userId) {
      throw new ForbiddenError('You are not authorized to delete this notification.');
    }

    await this.repo.deleteNotification(userId, notificationId);
    return { success: true };
  }

  /**
   * Helper: Dispatch a single notification (used by committed business events)
   */
  async sendNotification(
    data: CreateNotificationInput,
    tx?: Prisma.TransactionClient
  ): Promise<NotificationDTO | null> {
    try {
      return await this.repo.createNotification(data, tx);
    } catch (err: any) {
      logger.error('Failed to create notification:', {
        recipientId: data.recipientId,
        type: data.type,
        error: err.message,
      });
      // Do not crash primary business workflow if notification write encounters non-critical error
      return null;
    }
  }

  /**
   * Helper: Dispatch broadcast / batch notifications (used by committed business events)
   */
  async sendBatchNotifications(
    recipientIds: string[],
    template: Omit<CreateNotificationInput, 'recipientId'>,
    tx?: Prisma.TransactionClient
  ): Promise<number> {
    try {
      return await this.repo.createBatchNotifications(recipientIds, template, tx);
    } catch (err: any) {
      logger.error('Failed to create batch notifications:', {
        count: recipientIds.length,
        type: template.type,
        error: err.message,
      });
      return 0;
    }
  }
}

export const notificationService = new NotificationService();
