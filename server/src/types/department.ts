import { z } from 'zod';

export const departmentIdParamSchema = z.object({
  departmentId: z.string().uuid('Valid department UUID required'),
});

export const complianceQuerySchema = z.object({
  threshold: z.coerce.number().min(0).max(100).default(75),
  academicYear: z.string().optional(),
  semester: z.coerce.number().int().optional(),
});
