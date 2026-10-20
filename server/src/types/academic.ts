import { z } from 'zod';

export const createCourseSchema = z.object({
  departmentId: z.string().uuid('Valid department UUID required'),
  code: z.string().trim().min(2).max(32),
  title: z.string().trim().min(3).max(255),
  credits: z.coerce.number().int().min(1).max(20).default(4),
  lectureHours: z.coerce.number().int().min(0).max(20).default(3),
  tutorialHours: z.coerce.number().int().min(0).max(20).default(0),
  practicalHours: z.coerce.number().int().min(0).max(20).default(2),
  syllabusDocUrl: z.string().url().optional(),
});

export const createOfferingSchema = z.object({
  courseId: z.string().uuid('Valid course UUID required'),
  sectionId: z.string().uuid('Valid section UUID required'),
  primaryFacultyId: z.string().uuid('Valid faculty user UUID required'),
  academicYear: z.string().trim().min(4).max(32).default('2026-27'),
  semester: z.coerce.number().int().min(1).max(12),
});

export const enrollStudentCourseSchema = z.object({
  studentId: z.string().uuid('Valid student user UUID required'),
  courseOfferingId: z.string().uuid('Valid course offering UUID required'),
});

export const correctAttendanceSchema = z.object({
  attendanceRecordId: z.string().uuid('Valid attendance record UUID required'),
  newStatus: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  reason: z.string().trim().min(5, 'A detailed reason (min 5 chars) is mandatory for academic corrections').max(500),
  approvalRef: z.string().trim().max(100).optional(),
});

export const correctEnrollmentStatusSchema = z.object({
  studentId: z.string().uuid('Valid student user UUID required'),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'WITHDRAWN', 'GRADUATED']),
  reason: z.string().trim().min(5, 'A detailed reason (min 5 chars) is mandatory for status changes').max(500),
  approvalRef: z.string().trim().max(100).optional(),
});

export const academicLogsQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  targetEntity: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
