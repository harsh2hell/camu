import { z } from 'zod';


export const attendanceStatusEnum = z.enum([
  'PRESENT',
  'ABSENT',
  'ON_DUTY',
  'MEDICAL_LEAVE',
  'EXEMPTED',
]);

export const createAttendanceSessionSchema = z.object({
  courseOfferingId: z.string().min(1, 'Course offering ID is required'),
  sessionDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  startTime: z.string().min(1, 'Start time is required (e.g. 10:00 AM)'),
  topicTaught: z.string().max(255).optional(),
  slotId: z.string().optional(),
});

export const studentAttendanceRecordItemSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  status: attendanceStatusEnum,
  remarks: z.string().max(255).optional(),
});

export const recordAttendanceBatchSchema = z.object({
  records: z
    .array(studentAttendanceRecordItemSchema)
    .min(1, 'At least one student attendance record is required')
    .max(200, 'Batch size cannot exceed 200 students per session'),
  lockSession: z.boolean().optional().default(false),
});

export type CreateAttendanceSessionInput = z.infer<typeof createAttendanceSessionSchema>;
export type StudentAttendanceRecordItem = z.infer<typeof studentAttendanceRecordItemSchema>;
export type RecordAttendanceBatchInput = z.infer<typeof recordAttendanceBatchSchema>;

export interface AttendanceSessionDTO {
  id: string;
  courseOfferingId: string;
  courseCode: string;
  courseTitle: string;
  facultyId: string;
  facultyName: string;
  sessionDate: Date;
  startTime: string;
  topicTaught?: string | null;
  markedAt: Date;
  isLocked: boolean;
  totalRecordsMarked?: number;
}

export interface EnrolledStudentDTO {
  studentUserId: string;
  studentProfileId: string;
  rollNumber: string;
  registrationNo: string;
  fullName: string;
  avatarUrl?: string | null;
  currentAttendancePercent: number;
}

export interface DefaulterStudentDTO {
  studentUserId: string;
  rollNumber: string;
  fullName: string;
  attended: number;
  conducted: number;
  percentage: number;
  status: 'warning' | 'danger';
  isDebarred: boolean;
}
