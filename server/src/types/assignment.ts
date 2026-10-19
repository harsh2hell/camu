import { z } from 'zod';
import type { AssignmentSubmissionStatus } from '@prisma/client';

export const createAssignmentSchema = z.object({
  courseOfferingId: z.string().uuid('Invalid course offering ID'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(255, 'Title cannot exceed 255 characters'),
  description: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentFileName: z.string().optional(),
  attachmentData: z.string().optional(),
  dueDate: z.string().datetime('Due date must be a valid ISO-8601 datetime string'),
  totalMarks: z.coerce.number().int().min(1, 'Total marks must be at least 1').max(1000, 'Total marks cannot exceed 1000').default(100),
  isPublished: z.boolean().default(true),
});

export const updateAssignmentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255, 'Title cannot exceed 255 characters').optional(),
  description: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentFileName: z.string().optional(),
  attachmentData: z.string().optional(),
  dueDate: z.string().datetime('Due date must be a valid ISO-8601 datetime string').optional(),
  totalMarks: z.coerce.number().int().min(1).max(1000).optional(),
  isPublished: z.boolean().optional(),
});

export const submitAssignmentSchema = z.object({
  submissionFileUrl: z.string().optional(),
  submissionText: z.string().optional(),
  fileName: z.string().max(255).optional(),
  fileData: z.string().optional(),
}).refine(
  (data) => (data.submissionFileUrl && data.submissionFileUrl.trim().length > 0) || 
            (data.submissionText && data.submissionText.trim().length > 0) ||
            (data.fileData && data.fileData.trim().length > 0),
  { message: 'Submission must contain either a file upload or submission text/code' }
);

export const gradeSubmissionSchema = z.object({
  score: z.coerce.number().min(0, 'Score cannot be negative'),
  feedback: z.string().optional(),
});

export const assignmentIdParamSchema = z.object({
  id: z.string().uuid('Invalid assignment ID'),
});

export const gradeParamSchema = z.object({
  id: z.string().uuid('Invalid assignment ID'),
  submissionId: z.string().uuid('Invalid submission ID'),
});

export const fileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(255),
  fileData: z.string().min(1, 'File base64 data is required'), // base64 encoded
  mimeType: z.string().optional(),
});

export interface StudentAssignmentItemDTO {
  id: string;
  courseOfferingId: string;
  courseCode: string;
  courseTitle: string;
  title: string;
  description: string | null;
  attachmentUrl: string | null;
  dueDate: string;
  totalMarks: number;
  isOverdue: boolean;
  submissionStatus: AssignmentSubmissionStatus | 'PENDING';
  mySubmission?: {
    id: string;
    submittedAt: string;
    submissionFileUrl: string | null;
    submissionText: string | null;
    status: AssignmentSubmissionStatus;
    score: number | null;
    feedback: string | null;
    gradedAt: string | null;
  } | null;
}

export interface FacultyAssignmentItemDTO {
  id: string;
  courseOfferingId: string;
  courseCode: string;
  courseTitle: string;
  sectionName: string;
  title: string;
  description: string | null;
  attachmentUrl: string | null;
  dueDate: string;
  totalMarks: number;
  isPublished: boolean;
  createdAt: string;
  totalSubmissions: number;
  gradedSubmissions: number;
  pendingReviewCount: number;
}

export interface SubmissionDetailsDTO {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentRollNo: string;
  submissionFileUrl: string | null;
  submissionText: string | null;
  submittedAt: string;
  status: AssignmentSubmissionStatus;
  score: number | null;
  feedback: string | null;
  gradedBy: string | null;
  gradedAt: string | null;
}
