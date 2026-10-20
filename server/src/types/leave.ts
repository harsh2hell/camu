import { z } from 'zod';
import type { LeaveStatus } from '@prisma/client';

export const leaveCategoryEnum = z.enum(['LEAVE', 'ON_DUTY']);

export const leaveStatusEnum = z.enum([
  'PENDING',
  'RECOMMENDED_BY_MENTOR',
  'APPROVED_BY_HOD',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
  'NEEDS_CORRECTION',
]);

export const leaveTypeEnum = z.enum([
  'MEDICAL',
  'CASUAL',
  'ACADEMIC',
  'OD_HACKATHON',
  'OD_SPORTS',
  'OD_CONFERENCE',
  'OD_CULTURAL',
  'OD_PLACEMENT',
  'OD_OTHER',
]);

// Create Application Schema
export const createLeaveApplicationSchema = z
  .object({
    category: leaveCategoryEnum.default('LEAVE'),
    leaveType: z.string().trim().min(2, 'Leave/OD type is required').max(32),
    title: z.string().trim().min(3, 'Title/Event name must be at least 3 characters').max(255),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
    reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(2000),
    fileData: z.string().optional(), // Base64 uploaded document
    fileName: z.string().optional(),
    supportingDocKey: z.string().optional(), // Or reference to pre-uploaded fileKey
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
    },
    {
      message: 'End date cannot be earlier than start date',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      if (data.fileData && !data.fileName) {
        return false;
      }
      return true;
    },
    {
      message: 'File name is required when file data is attached',
      path: ['fileName'],
    }
  );

// Withdraw Application Schema
export const withdrawApplicationSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

// Resubmit Application Schema (when in NEEDS_CORRECTION)
export const resubmitApplicationSchema = z
  .object({
    title: z.string().trim().min(3).max(255).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    reason: z.string().trim().min(5).max(2000).optional(),
    fileData: z.string().optional(),
    fileName: z.string().optional(),
    supportingDocKey: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return end >= start;
      }
      return true;
    },
    {
      message: 'End date cannot be earlier than start date',
      path: ['endDate'],
    }
  );

// Approver Decision Schema
export const decideApplicationSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT', 'REQUEST_CORRECTION']),
    reason: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => {
      if ((data.action === 'REJECT' || data.action === 'REQUEST_CORRECTION') && (!data.reason || data.reason.trim().length < 3)) {
        return false;
      }
      return true;
    },
    {
      message: 'A detailed reason (min 3 chars) is required when rejecting or requesting correction',
      path: ['reason'],
    }
  );

// URL Param Schema
export const applicationIdParamSchema = z.object({
  id: z.string().uuid('Valid application UUID is required'),
});

// Query Schema
export const queryApplicationsSchema = z.object({
  status: leaveStatusEnum.optional(),
  category: leaveCategoryEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  studentId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// TypeScript DTOs
export interface LeaveAuditLogDTO {
  id: string;
  applicationId: string;
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

export interface LeaveApplicationDTO {
  id: string;
  studentId: string;
  studentName: string;
  studentRollNumber: string;
  studentEmail?: string;
  departmentName?: string;
  category: 'LEAVE' | 'ON_DUTY';
  leaveType: string;
  title: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  supportingDocUrl?: string | null;
  supportingFileKey?: string | null;
  hasSupportingDocument: boolean;
  status: LeaveStatus;
  assignedApproverId?: string | null;
  assignedApproverName?: string | null;
  approvedBy?: string | null;
  approverName?: string | null;
  decisionReason?: string | null;
  decidedAt?: string | null;
  withdrawnAt?: string | null;
  withdrawalReason?: string | null;
  mentorRemarks?: string | null;
  hodRemarks?: string | null;
  auditLogs?: LeaveAuditLogDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface LeaveApplicationsListResponseDTO {
  applications: LeaveApplicationDTO[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}
