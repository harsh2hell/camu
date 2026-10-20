import { prisma } from '../lib/prisma.js';
import type { Prisma } from '@prisma/client';
import type {
  CreateNotificationInput,
  QueryNotificationInput,
  NotificationDTO,
  NotificationListResponseDTO,
  NotificationType,
  NotificationPriority,
} from '../types/notification.js';

export class NotificationRepository {
  /**
   * Helper: Map Prisma Notification model to DTO
   */
  private mapToDTO(notif: any): NotificationDTO {
    return {
      id: notif.id,
      recipientId: notif.recipientId,
      type: notif.type as NotificationType,
      title: notif.title,
      message: notif.message,
      priority: notif.priority as NotificationPriority,
      isRead: notif.isRead,
      readAt: notif.readAt ? notif.readAt.toISOString() : null,
      resourceType: notif.resourceType || null,
      resourceId: notif.resourceId || null,
      actionUrl: notif.actionUrl || null,
      metadata: (notif.metadata as Record<string, any>) || {},
      idempotencyKey: notif.idempotencyKey || null,
      expiresAt: notif.expiresAt ? notif.expiresAt.toISOString() : null,
      createdAt: notif.createdAt.toISOString(),
    };
  }

  /**
   * Create a single database-backed notification with duplicate event idempotency
   */
  async createNotification(
    data: CreateNotificationInput,
    tx?: Prisma.TransactionClient
  ): Promise<NotificationDTO | null> {
    const client = tx || prisma;

    // If an idempotency key is present, check whether this notification has already been created
    if (data.idempotencyKey) {
      const existing = await client.notification.findFirst({
        where: {
          recipientId: data.recipientId,
          idempotencyKey: data.idempotencyKey,
        },
      });
      if (existing) {
        return this.mapToDTO(existing);
      }
    }

    try {
      const created = await client.notification.create({
        data: {
          recipientId: data.recipientId,
          type: data.type,
          title: data.title,
          message: data.message,
          priority: data.priority || 'MEDIUM',
          resourceType: data.resourceType || null,
          resourceId: data.resourceId || null,
          actionUrl: data.actionUrl || null,
          metadata: data.metadata || {},
          idempotencyKey: data.idempotencyKey || null,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        },
      });
      return this.mapToDTO(created);
    } catch (err: any) {
      // Handle race condition on unique index uq_notifications_recipient_idempotency gracefully
      if (err.code === 'P2002' && data.idempotencyKey) {
        const duplicate = await client.notification.findFirst({
          where: {
            recipientId: data.recipientId,
            idempotencyKey: data.idempotencyKey,
          },
        });
        if (duplicate) return this.mapToDTO(duplicate);
      }
      throw err;
    }
  }

  /**
   * Create batch notifications for multiple recipients (e.g. broadcast notices, new assignments)
   */
  async createBatchNotifications(
    recipientIds: string[],
    template: Omit<CreateNotificationInput, 'recipientId'>,
    tx?: Prisma.TransactionClient
  ): Promise<number> {
    if (!recipientIds || recipientIds.length === 0) return 0;
    const client = tx || prisma;

    const rows = recipientIds.map((recipientId) => ({
      recipientId,
      type: template.type,
      title: template.title,
      message: template.message,
      priority: template.priority || 'MEDIUM',
      resourceType: template.resourceType || null,
      resourceId: template.resourceId || null,
      actionUrl: template.actionUrl || null,
      metadata: template.metadata || {},
      idempotencyKey: template.idempotencyKey
        ? `${template.idempotencyKey}:${recipientId}`
        : null,
      expiresAt: template.expiresAt ? new Date(template.expiresAt) : null,
    }));

    const result = await client.notification.createMany({
      data: rows,
      skipDuplicates: true,
    });

    return result.count;
  }

  /**
   * List paginated notifications strictly scoped to the authenticated user
   */
  async listUserNotifications(
    userId: string,
    params: QueryNotificationInput
  ): Promise<NotificationListResponseDTO> {
    const where: Prisma.NotificationWhereInput = {
      recipientId: userId,
    };

    if (params.isRead !== undefined) {
      where.isRead = params.isRead;
    }

    if (params.type) {
      where.type = params.type;
    }

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip: params.offset,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          recipientId: userId,
          isRead: false,
        },
      }),
    ]);

    return {
      notifications: items.map((n) => this.mapToDTO(n)),
      total,
      unreadCount,
    };
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });
  }

  /**
   * Find a notification by ID
   */
  async findById(notificationId: string): Promise<NotificationDTO | null> {
    const notif = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    return notif ? this.mapToDTO(notif) : null;
  }

  /**
   * Mark a single notification as read (Anti-IDOR: recipientId strictly enforced)
   */
  async markAsRead(
    userId: string,
    notificationId: string,
    tx?: Prisma.TransactionClient
  ): Promise<NotificationDTO | null> {
    const client = tx || prisma;

    const notif = await client.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: userId,
      },
    });

    if (!notif) return null;

    if (notif.isRead) {
      return this.mapToDTO(notif);
    }

    const updated = await client.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return this.mapToDTO(updated);
  }

  /**
   * Mark all unread notifications as read for a user
   */
  async markAllAsRead(
    userId: string,
    type?: NotificationType,
    tx?: Prisma.TransactionClient
  ): Promise<number> {
    const client = tx || prisma;

    const where: Prisma.NotificationWhereInput = {
      recipientId: userId,
      isRead: false,
    };

    if (type) {
      where.type = type;
    }

    const result = await client.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Delete a notification (Anti-IDOR: recipientId strictly enforced)
   */
  async deleteNotification(
    userId: string,
    notificationId: string,
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = tx || prisma;

    const notif = await client.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: userId,
      },
    });

    if (!notif) return false;

    await client.notification.delete({
      where: { id: notificationId },
    });

    return true;
  }
}

export const notificationRepository = new NotificationRepository();
