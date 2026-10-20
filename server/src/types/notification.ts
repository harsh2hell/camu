import { z } from 'zod';

// 1. Enums & Constants
export const NOTIFICATION_TYPES = [
  'NOTICE',
  'ASSIGNMENT',
  'LEAVE_OD',
  'FINANCE',
  'SUPPORT_TICKET',
  'ACADEMIC',
  'SYSTEM',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_RESOURCE_TYPES = [
  'NOTICE',
  'ASSIGNMENT',
  'LEAVE_APPLICATION',
  'FEE_INVOICE',
  'FEE_RECEIPT',
  'SUPPORT_TICKET',
] as const;

export type NotificationResourceType = (typeof NOTIFICATION_RESOURCE_TYPES)[number];

// 2. Zod Validation Schemas
export const createNotificationSchema = z.object({
  recipientId: z.string().uuid(),
  type: z.enum(NOTIFICATION_TYPES, {
    message: `Type must be one of: ${NOTIFICATION_TYPES.join(', ')}`,
  }),
  title: z
    .string()
    .trim()
    .min(1, 'Title must not be empty')
    .max(255, 'Title must not exceed 255 characters'),
  message: z
    .string()
    .trim()
    .min(1, 'Message must not be empty')
    .max(5000, 'Message must not exceed 5000 characters'),
  priority: z.enum(NOTIFICATION_PRIORITIES).optional().default('MEDIUM'),
  resourceType: z.string().trim().max(64).optional().nullable(),
  resourceId: z.string().trim().max(255).optional().nullable(),
  actionUrl: z.string().trim().max(255).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  idempotencyKey: z.string().trim().max(128).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export type CreateNotificationInput = z.input<typeof createNotificationSchema>;

export const queryNotificationSchema = z.object({
  isRead: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type QueryNotificationInput = z.infer<typeof queryNotificationSchema>;

export const markAllReadSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES).optional(),
});

export type MarkAllReadInput = z.infer<typeof markAllReadSchema>;

// 3. TypeScript DTO Interfaces
export interface NotificationDTO {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  readAt: string | null;
  resourceType: string | null;
  resourceId: string | null;
  actionUrl: string | null;
  metadata: Record<string, any>;
  idempotencyKey: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface NotificationListResponseDTO {
  notifications: NotificationDTO[];
  total: number;
  unreadCount: number;
}

export interface UnreadCountResponseDTO {
  unreadCount: number;
}
