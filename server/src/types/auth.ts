import { z } from 'zod';
import type { UserRole } from '@prisma/client';

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email, Roll number, or Employee ID is required'),
  password: z.string().min(1, 'Password is required'),
  expectedRole: z.enum([
    'STUDENT',
    'FACULTY',
    'ADMIN',
    'HOD',
    'DEAN',
    'REGISTRAR_ADMIN',
    'EXAM_CONTROLLER',
    'ADMISSIONS_OFFICER',
    'FINANCE_OFFICER',
    'IT_SUPPORT',
    'SUPER_ADMIN',
  ]).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface SafeStudentProfile {
  rollNumber: string;
  registrationNo: string;
  currentSemester: number;
  currentCgpa: number;
}

export interface SafeFacultyProfile {
  employeeCode: string;
  designation: string;
  departmentId: string;
}

export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string | null;
  phone?: string | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  studentProfile?: SafeStudentProfile | null;
  facultyProfile?: SafeFacultyProfile | null;
}

export interface AuthSessionData {
  user: SafeUser;
  sessionToken: string;
  expiresAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
      sessionToken?: string;
    }
  }
}
