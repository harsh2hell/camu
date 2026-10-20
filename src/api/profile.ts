import { apiClient } from './client';

export interface StudentProfileDTO {
  id: string;
  userId: string;
  fullName: string;
  email: string;
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

export interface UpdateProfileInput {
  phone?: string | null;
  personalEmail?: string | null;
  bloodGroup?: string | null;
  emergencyContact?: string | null;
  guardianName?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

/**
 * Fetch authenticated student's profile
 */
export async function getMyProfile(): Promise<{ status: string; data: StudentProfileDTO }> {
  return apiClient.get('/profile/me');
}

/**
 * Update authenticated student's permitted profile fields
 */
export async function updateMyProfile(
  payload: UpdateProfileInput
): Promise<{ status: string; message: string; data: StudentProfileDTO }> {
  return apiClient.patch('/profile/me', payload);
}

/**
 * Fetch authenticated student's authoritative academic records & course enrollments
 */
export async function getMyAcademicRecords(): Promise<{ status: string; data: AcademicRecordsDTO }> {
  return apiClient.get('/profile/academic-records');
}

/**
 * Staff lookup of student profile (subject to RBAC / mentorship checks)
 */
export async function getStudentProfile(
  studentId: string
): Promise<{ status: string; data: StudentProfileDTO }> {
  return apiClient.get(`/profile/students/${studentId}`);
}

/**
 * Staff lookup of student academic records
 */
export async function getStudentAcademicRecords(
  studentId: string
): Promise<{ status: string; data: AcademicRecordsDTO }> {
  return apiClient.get(`/profile/academic-records/${studentId}`);
}

/**
 * Faculty mentor queue: get assigned student mentees
 */
export async function getFacultyMentees(): Promise<{
  status: string;
  count: number;
  data: StudentProfileDTO[];
}> {
  return apiClient.get('/profile/mentees');
}

/**
 * Audit trail of profile modifications
 */
export async function getProfileAuditTrail(
  studentId?: string
): Promise<{ status: string; count: number; data: ProfileAuditLogDTO[] }> {
  const url = studentId ? `/profile/audit-trail/${studentId}` : '/profile/audit-trail';
  return apiClient.get(url);
}
