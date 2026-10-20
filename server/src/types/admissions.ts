import { z } from 'zod';
import type { AdmissionApplicationStatus } from '@prisma/client';

export const createApplicationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(255).optional(),
  applicantName: z.string().min(2, 'Applicant name must be at least 2 characters').max(255).optional(),
  email: z.string().email('Valid email address is required').optional(),
  applicantEmail: z.string().email('Valid email address is required').optional(),
  phone: z.string().min(8, 'Phone number must be at least 8 digits').max(32).optional(),
  applicantPhone: z.string().min(8, 'Phone number must be at least 8 digits').max(32).optional(),
  dateOfBirth: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Format: YYYY-MM-DD')).optional(),
  gender: z.string().max(32).optional(),
  programId: z.string().uuid('Valid program ID is required'),
  academicYear: z.string().regex(/^\d{4}-\d{2,4}$/, 'Format: YYYY-YY or YYYY-YYYY (e.g. 2026-27)'),
  entranceExamScore: z.number().min(0).max(1000).optional(),
  highSchoolPercentage: z.number().min(0).max(100).optional(),
  intermediatePercentage: z.number().min(0).max(100).optional(),
  previousEducation: z.record(z.any()).optional(),
  documents: z.array(z.any()).optional(),
  documentsChecklist: z.array(z.object({
    documentType: z.string().min(1),
    isVerified: z.boolean().default(false),
    fileUrl: z.string().optional(),
    verifiedAt: z.string().optional(),
  })).optional(),
  reviewNotes: z.string().max(2000).optional(),
});

export const updateApplicationSchema = z.object({
  fullName: z.string().min(2).max(255).optional(),
  applicantName: z.string().min(2).max(255).optional(),
  phone: z.string().min(8).max(32).optional(),
  applicantPhone: z.string().min(8).max(32).optional(),
  entranceExamScore: z.number().min(0).max(1000).optional(),
  highSchoolPercentage: z.number().min(0).max(100).optional(),
  intermediatePercentage: z.number().min(0).max(100).optional(),
  previousEducation: z.record(z.any()).optional(),
  documents: z.array(z.any()).optional(),
  documentsChecklist: z.array(z.object({
    documentType: z.string().min(1),
    isVerified: z.boolean(),
    fileUrl: z.string().optional(),
    verifiedAt: z.string().optional(),
  })).optional(),
  reviewNotes: z.string().max(2000).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum([
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'SHORTLISTED',
    'OFFER_MADE',
    'OFFER_EXTENDED',
    'OFFER_ACCEPTED',
    'ADMITTED',
    'ENROLLED',
    'REJECTED',
    'WITHDRAWN',
  ] as const),
  reason: z.string().max(1000).optional(),
  offerLetterUrl: z.string().url().optional(),
});

export const addReviewNoteSchema = z.object({
  note: z.string().min(1, 'Note cannot be empty').max(2000).optional(),
  reviewNotes: z.string().min(1).max(2000).optional(),
});

export const enrollApplicantSchema = z.object({
  batchId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export const queryApplicationsSchema = z.object({
  search: z.string().optional(),
  programId: z.string().uuid().optional(),
  status: z.string().optional(),
  academicYear: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type AddReviewNoteInput = z.infer<typeof addReviewNoteSchema>;
export type EnrollApplicantInput = z.infer<typeof enrollApplicantSchema>;
export type QueryApplicationsInput = z.infer<typeof queryApplicationsSchema>;

export interface AdmissionApplicationDTO {
  id: string;
  applicationNumber: string;
  fullName: string;
  applicantName: string;
  email: string;
  applicantEmail: string;
  phone: string;
  applicantPhone: string;
  dateOfBirth: string;
  gender: string | null;
  programId: string;
  program: {
    id: string;
    code: string;
    name: string;
    department: {
      id: string;
      code: string;
      name: string;
    };
  };
  academicYear: string;
  status: AdmissionApplicationStatus;
  entranceExamScore: number | null;
  highSchoolPercentage?: number | null;
  intermediatePercentage?: number | null;
  previousEducation: any | null;
  documentsChecklist: any | null;
  documents?: any | null;
  reviewNotes: string | null;
  decisionReason: string | null;
  decidedBy: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  decidedAt: string | null;
  offerLetterUrl: string | null;
  enrolledStudentProfileId: string | null;
  enrolledStudent?: {
    id: string;
    rollNumber: string;
    registrationNo: string;
    user: {
      id: string;
      email: string;
      fullName: string;
    };
  } | null;
  enrolledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdmissionAuditLogDTO {
  id: string;
  applicationId: string;
  action: string;
  previousStatus: string | null;
  newStatus: string;
  performedBy: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  reason: string | null;
  details: any | null;
  ipAddress: string | null;
  createdAt: string;
}
