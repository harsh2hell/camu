import { z } from 'zod';

// 1. Enums & Constants
export const TICKET_CATEGORIES = [
  'ACADEMIC',
  'EXAMINATION',
  'FINANCE',
  'HOSTEL',
  'FACILITY',
  'GENERAL',
  'ATTENDANCE',
  'IT_PORTAL',
  'FEES_FINANCE',
  'EXAMINATIONS',
  'HOSTEL_CAMPUS',
  'GENERAL_INQUIRY',
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_STUDENT',
  'RESOLVED',
  'CLOSED',
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

// State transition validation map
export const VALID_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_STUDENT', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['WAITING_FOR_STUDENT', 'RESOLVED', 'CLOSED'],
  WAITING_FOR_STUDENT: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS', 'OPEN'], // Reopening permitted with explicit reason
  CLOSED: ['OPEN'], // Closed tickets can only be reopened by Admin under exceptional circumstances
};

// 2. Zod Validation Schemas
export const createTicketSchema = z.object({
  category: z.enum(TICKET_CATEGORIES, {
    message: `Category must be one of: ${TICKET_CATEGORIES.join(', ')}`,
  }),
  priority: z.enum(TICKET_PRIORITIES).optional().default('MEDIUM'),
  subject: z
    .string()
    .trim()
    .min(5, 'Subject must be at least 5 characters')
    .max(255, 'Subject must not exceed 255 characters'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must not exceed 5000 characters'),
  departmentId: z.string().uuid().optional().nullable(),
  attachmentFileKey: z.string().trim().max(255).optional().nullable(),
  attachmentName: z.string().trim().max(255).optional().nullable(),
  studentId: z.string().optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const addMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message cannot exceed 5000 characters'),
  isInternal: z.boolean().optional().default(false),
  attachmentFileKey: z.string().trim().max(255).optional().nullable(),
  attachmentName: z.string().trim().max(255).optional().nullable(),
});

export type AddMessageInput = z.infer<typeof addMessageSchema>;

export const updateTicketStatusSchema = z.object({
  status: z.enum(TICKET_STATUSES, {
    message: `Status must be one of: ${TICKET_STATUSES.join(', ')}`,
  }),
  reason: z.string().trim().min(3).max(1000).optional(),
  resolutionNotes: z.string().trim().min(5).max(2000).optional(),
});

export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;

export const assignTicketSchema = z.object({
  assignedStaffId: z.string().uuid().nullable(),
  reason: z.string().trim().max(500).optional(),
});

export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

export const reopenTicketSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'Reopening reason must be at least 5 characters')
    .max(1000, 'Reopening reason cannot exceed 1000 characters'),
});

export type ReopenTicketInput = z.infer<typeof reopenTicketSchema>;

// 3. TypeScript DTO Interfaces
export interface TicketUserDTO {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface TicketMessageDTO {
  id: string;
  ticketId: string;
  sender: TicketUserDTO;
  message: string;
  isInternal: boolean;
  attachmentFileKey: string | null;
  attachmentName: string | null;
  createdAt: string;
}

export interface TicketAuditLogDTO {
  id: string;
  ticketId: string;
  performedBy: TicketUserDTO;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  previousAssignee: TicketUserDTO | null;
  newAssignee: TicketUserDTO | null;
  reason: string | null;
  details: Record<string, any>;
  ipAddress: string | null;
  createdAt: string;
}

export interface SupportTicketDTO {
  id: string;
  ticketNumber: string;
  studentId: string;
  student: {
    id: string;
    fullName: string;
    email: string;
    rollNumber?: string;
    programName?: string;
    departmentName?: string;
    semester?: number;
  };
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  department: {
    id: string;
    code: string;
    name: string;
  } | null;
  assignedStaffId: string | null;
  assignedStaff: TicketUserDTO | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  resolvedBy: TicketUserDTO | null;
  closedAt: string | null;
  closedBy: TicketUserDTO | null;
  reopenedAt: string | null;
  reopenedBy: TicketUserDTO | null;
  reopenReason: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetailDTO extends SupportTicketDTO {
  messages: TicketMessageDTO[];
  auditLogs: TicketAuditLogDTO[];
}

export interface TicketQueueSummaryDTO {
  totalOpen: number;
  totalInProgress: number;
  totalWaitingForStudent: number;
  totalResolved: number;
  totalClosed: number;
  totalAssignedToMe: number;
  recentCount: number;
}
