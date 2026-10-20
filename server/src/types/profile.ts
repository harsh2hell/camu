import { z } from 'zod';

export const bloodGroupEnum = z.enum([
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
]);

// 1. Permitted Student Profile Updates
export const updateProfileSchema = z
  .object({
    phone: z
      .string()
      .trim()
      .regex(/^(\+?[0-9\s\-()]{7,20})$/, 'Phone number must be between 7 and 20 digits')
      .optional()
      .nullable(),
    personalEmail: z
      .string()
      .trim()
      .email('Invalid email address format')
      .max(255)
      .optional()
      .nullable(),
    bloodGroup: bloodGroupEnum.optional().nullable(),
    emergencyContact: z
      .string()
      .trim()
      .min(5, 'Emergency contact number must be at least 5 digits')
      .max(20)
      .optional()
      .nullable(),
    guardianName: z
      .string()
      .trim()
      .min(2, 'Guardian name must be at least 2 characters')
      .max(128)
      .optional()
      .nullable(),
    addressLine: z.string().trim().max(255).optional().nullable(),
    city: z.string().trim().max(64).optional().nullable(),
    state: z.string().trim().max(64).optional().nullable(),
    pincode: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9\s\-]{3,12}$/, 'Invalid postal / PIN code format')
      .optional()
      .nullable(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Protected fields that MUST NOT be modified by students
export const PROTECTED_PROFILE_FIELDS = [
  'id',
  'userId',
  'user_id',
  'role',
  'rollNumber',
  'roll_number',
  'registrationNo',
  'registration_no',
  'batchId',
  'batch_id',
  'sectionId',
  'section_id',
  'currentSemester',
  'current_semester',
  'currentCgpa',
  'current_cgpa',
  'mentorFacultyId',
  'mentor_faculty_id',
  'email',
  'fullName',
  'full_name',
  'isActive',
  'is_active',
] as const;

// 2. TypeScript DTO Interfaces
export interface StudentProfileDTO {
  id: string;
  userId: string;
  fullName: string;
  email: string; // institutional email
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  rollNumber: string;
  registrationNo: string;
  currentSemester: number;
  currentCgpa: number;
  program: {
    id: string;
    code: string;
    name: string;
  };
  department: {
    id: string;
    code: string;
    name: string;
  };
  batch: {
    id: string;
    batchName: string;
    startYear: number;
    endYear: number;
  };
  section: {
    id: string;
    name: string;
  };
  mentor: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    designation?: string | null;
  } | null;
  bloodGroup: string | null;
  emergencyContact: string | null;
  guardianName: string | null;
  personalEmail: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface EnrolledCourseGradeDTO {
  componentId: string;
  componentName: string;
  maxMarks: number;
  weightagePercent: number;
  obtainedMarks: number;
}

export interface EnrolledCourseRecordDTO {
  enrollmentId: string;
  courseOfferingId: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  lectureHours: number;
  tutorialHours: number;
  practicalHours: number;
  academicYear: string;
  semester: number;
  primaryFaculty: {
    id: string;
    fullName: string;
    email: string;
  };
  grades: EnrolledCourseGradeDTO[];
  hasGradesEntered: boolean;
}

export interface AcademicRecordsDTO {
  student: {
    id: string;
    userId: string;
    fullName: string;
    rollNumber: string;
    registrationNo: string;
    currentSemester: number;
    currentCgpa: number;
  };
  program: {
    id: string;
    code: string;
    name: string;
  };
  department: {
    id: string;
    code: string;
    name: string;
  };
  batch: {
    id: string;
    batchName: string;
    startYear: number;
    endYear: number;
  };
  section: {
    id: string;
    name: string;
  };
  currentSemester: number;
  currentCgpa: number;
  totalEnrolledCredits: number;
  academicStanding: string;
  enrolledCourses: EnrolledCourseRecordDTO[];
  systemDisclosures: {
    isOfficialTranscript: boolean;
    notice: string;
    authoritativeSource: string;
  };
}

export interface ProfileAuditLogDTO {
  id: string;
  studentProfileId: string;
  action: string;
  changedFields: Record<string, any>;
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
  performedBy: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  ipAddress: string | null;
  createdAt: string;
}
