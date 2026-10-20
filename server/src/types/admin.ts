import { z } from 'zod';

export const userRoleEnum = z.enum([
  'STUDENT',
  'FACULTY',
  'HOD',
  'DEAN',
  'REGISTRAR_ADMIN',
  'EXAM_CONTROLLER',
  'ADMISSIONS_OFFICER',
  'FINANCE_OFFICER',
  'IT_SUPPORT',
  'SUPER_ADMIN',
]);

export const listUsersQuerySchema = z.object({
  role: userRoleEnum.optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid('Valid user UUID required'),
});

export const updateUserRoleSchema = z.object({
  role: userRoleEnum,
  reason: z.string().trim().min(5, 'Mandatory reason (min 5 chars) required for role modification').max(500),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().min(5, 'Mandatory reason (min 5 chars) required for account status modification').max(500),
});

export const adminAuditLogsQuerySchema = z.object({
  targetUserId: z.string().uuid().optional(),
  action: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
