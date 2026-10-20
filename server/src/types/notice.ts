import { z } from 'zod';
import type { NoticeStatus, UserRole } from '@prisma/client';

export const noticeCategoryEnum = z.enum([
  'ACADEMIC',
  'EXAM',
  'EVENT',
  'HOLIDAY',
  'PLACEMENT',
  'ADMINISTRATIVE',
  'GENERAL',
]);

export const noticePriorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

export const noticeStatusEnum = z.enum([
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
  'CANCELLED',
]);

export const targetRoleEnum = z.enum([
  'STUDENT',
  'FACULTY',
  'HOD',
  'DEAN',
  'REGISTRAR_ADMIN',
  'EXAM_CONTROLLER',
]);

// 1. Create Notice Schema
export const createNoticeSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(255),
    content: z.string().trim().min(5, 'Content must be at least 5 characters').max(50000),
    category: noticeCategoryEnum.default('ACADEMIC'),
    priority: noticePriorityEnum.default('NORMAL'),
    status: noticeStatusEnum.optional(),
    targetRole: targetRoleEnum.optional().nullable(),
    departmentId: z.string().uuid().optional().nullable(),
    programId: z.string().uuid().optional().nullable(),
    batchId: z.string().uuid().optional().nullable(),
    targetSemester: z.coerce.number().int().min(1).max(12).optional().nullable(),
    isPinned: z.boolean().default(false),
    eventDate: z.string().optional().nullable(),
    publishAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    publishNow: z.boolean().default(false),
    fileData: z.string().optional(),
    fileName: z.string().optional(),
    attachmentFileKey: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.publishAt && data.expiresAt) {
        const pub = new Date(data.publishAt);
        const exp = new Date(data.expiresAt);
        return exp > pub;
      }
      return true;
    },
    {
      message: 'Expiry date must be later than publication date',
      path: ['expiresAt'],
    }
  );

// 2. Update Notice Schema
export const updateNoticeSchema = z
  .object({
    title: z.string().trim().min(3).max(255).optional(),
    content: z.string().trim().min(5).max(50000).optional(),
    category: noticeCategoryEnum.optional(),
    priority: noticePriorityEnum.optional(),
    targetRole: targetRoleEnum.optional().nullable(),
    departmentId: z.string().uuid().optional().nullable(),
    programId: z.string().uuid().optional().nullable(),
    batchId: z.string().uuid().optional().nullable(),
    targetSemester: z.coerce.number().int().min(1).max(12).optional().nullable(),
    isPinned: z.boolean().optional(),
    eventDate: z.string().optional().nullable(),
    publishAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    fileData: z.string().optional(),
    fileName: z.string().optional(),
    attachmentFileKey: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.publishAt && data.expiresAt) {
        const pub = new Date(data.publishAt);
        const exp = new Date(data.expiresAt);
        return exp > pub;
      }
      return true;
    },
    {
      message: 'Expiry date must be later than publication date',
      path: ['expiresAt'],
    }
  );

// 3. Publish / Schedule Notice Schema
export const publishNoticeSchema = z
  .object({
    publishNow: z.boolean().default(true),
    publishAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (!data.publishNow && !data.publishAt) {
        return false;
      }
      return true;
    },
    {
      message: 'A future publication date is required when scheduling a notice',
      path: ['publishAt'],
    }
  )
  .refine(
    (data) => {
      if (data.publishAt) {
        const pub = new Date(data.publishAt);
        return !isNaN(pub.getTime()) && pub.getTime() > Date.now() - 60000;
      }
      return true;
    },
    {
      message: 'Scheduled publication date must be in the future',
      path: ['publishAt'],
    }
  );

// 4. Archive Schema
export const archiveNoticeSchema = z
  .object({
    reason: z.string().trim().max(1000).optional(),
  })
  .optional()
  .default({});

// 5. Cancel Schema
export const cancelNoticeSchema = z.object({
  reason: z.string().trim().min(3, 'Reason is required when cancelling a notice').max(1000),
});

// 6. Param Schema
export const noticeIdParamSchema = z.object({
  id: z.string().uuid('Valid notice UUID is required'),
});

// 7. Query Schema
export const noticeQuerySchema = z.object({
  status: noticeStatusEnum.optional(),
  category: z.string().optional(),
  priority: noticePriorityEnum.optional(),
  search: z.string().optional(),
  pinnedOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// TypeScript DTOs
export interface NoticeAuditLogDTO {
  id: string;
  noticeId: string;
  action: string;
  previousStatus?: string | null;
  newStatus: string;
  performedBy: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  reason?: string | null;
  details?: any;
  ipAddress?: string | null;
  createdAt: string;
}

export interface NoticeDTO {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: NoticeStatus;
  targetRole?: UserRole | null;
  departmentId?: string | null;
  departmentName?: string | null;
  programId?: string | null;
  programName?: string | null;
  batchId?: string | null;
  batchName?: string | null;
  targetSemester?: number | null;
  isPinned: boolean;
  attachmentUrl?: string | null;
  attachmentFileKey?: string | null;
  hasAttachment: boolean;
  postedById: string;
  authorName: string;
  authorRole: string;
  eventDate?: string | null;
  publishAt?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
  archivedAt?: string | null;
  cancelledAt?: string | null;
  isAcknowledged?: boolean;
  acknowledgedCount?: number;
  auditLogs?: NoticeAuditLogDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface NoticeListResponseDTO {
  notices: NoticeDTO[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  unreadCount?: number;
}

export interface AudiencePreviewDTO {
  targetRole?: UserRole | null;
  departmentId?: string | null;
  departmentName?: string | null;
  programId?: string | null;
  programName?: string | null;
  batchId?: string | null;
  batchName?: string | null;
  targetSemester?: number | null;
  estimatedRecipientCount: number;
  audienceDescription: string;
}
