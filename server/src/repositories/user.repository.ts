import { prisma } from '../lib/prisma.js';
import type { SafeUser } from '../types/auth.js';
import { passwordService } from '../services/password.service.js';
import type { UserRole } from '@prisma/client';
import { config } from '../config/env.js';
import { ServiceUnavailableError } from '../errors/AppError.js';

export interface UserWithPassword {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string | null;
  phone?: string | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  studentProfile?: {
    rollNumber: string;
    registrationNo: string;
    currentSemester: number;
    currentCgpa: number;
  } | null;
  facultyProfile?: {
    employeeCode: string;
    designation: string;
    departmentId: string;
  } | null;
}

// Explicitly identified development fixture accounts for isolated development & automated testing
export const DEV_STUDENT_USER_ID = 'a0000000-0000-4000-8000-000000000001';
export const DEV_FACULTY_USER_ID = 'a0000000-0000-4000-8000-000000000002';
export const DEV_ADMIN_USER_ID = 'a0000000-0000-4000-8000-000000000099';
export const DEV_ADMISSIONS_USER_ID = 'a0000000-0000-4000-8000-000000000051';
export const DEV_FINANCE_USER_ID = 'a0000000-0000-4000-8000-000000000052';
export const DEV_IT_USER_ID = 'a0000000-0000-4000-8000-000000000053';
export const DEV_HOD_USER_ID = 'a0000000-0000-4000-8000-000000000054';
export const DEV_SUPERADMIN_USER_ID = 'a0000000-0000-4000-8000-000000000055';

const DEV_STUDENT_HASH = await passwordService.hashPassword('Password@Dev123');
const DEV_FACULTY_HASH = await passwordService.hashPassword('Password@Dev123');
const DEV_ADMIN_HASH = await passwordService.hashPassword('Password@Dev123');
const DEV_SHARED_HASH = await passwordService.hashPassword('Password@Dev123');

const DEV_ACCOUNTS: UserWithPassword[] = [
  {
    id: DEV_STUDENT_USER_ID,
    email: 'student.dev@dgu.ac.in',
    passwordHash: DEV_STUDENT_HASH,
    fullName: 'Harendra Pratap Singh (Dev Fixture)',
    role: 'STUDENT',
    isActive: true,
    avatarUrl: '/harendra_avatar.png',
    phone: '+91 9876543210',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    studentProfile: {
      rollNumber: '0251BTCS097',
      registrationNo: 'DBS25UG25234',
      currentSemester: 3,
      currentCgpa: 8.64,
    },
    facultyProfile: null,
  },
  {
    id: DEV_FACULTY_USER_ID,
    email: 'faculty.dev@dgu.ac.in',
    passwordHash: DEV_FACULTY_HASH,
    fullName: 'Dr. Rajesh Sharma (Dev Fixture)',
    role: 'FACULTY',
    isActive: true,
    phone: '+91 9876543211',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    studentProfile: null,
    facultyProfile: {
      employeeCode: 'FAC-108',
      designation: 'Head of Computer Science & AI',
      departmentId: 'd0000000-0000-4000-8000-000000000001',
    },
  },
  {
    id: DEV_ADMIN_USER_ID,
    email: 'admin.dev@dgu.ac.in',
    passwordHash: DEV_ADMIN_HASH,
    fullName: 'Office of the Registrar (Dev Admin)',
    role: 'REGISTRAR_ADMIN',
    isActive: true,
    phone: '+91 9876543299',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    studentProfile: null,
    facultyProfile: null,
  },
  {
    id: DEV_ADMISSIONS_USER_ID,
    email: 'admissions.dev@dgu.ac.in',
    passwordHash: DEV_SHARED_HASH,
    fullName: 'Admissions Office (Dev Fixture)',
    role: 'ADMISSIONS_OFFICER',
    isActive: true,
    phone: '+91 9876543212',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    studentProfile: null,
    facultyProfile: null,
  },
  {
    id: DEV_FINANCE_USER_ID,
    email: 'finance.dev@dgu.ac.in',
    passwordHash: DEV_SHARED_HASH,
    fullName: 'Finance & Accounts Office (Dev Fixture)',
    role: 'FINANCE_OFFICER',
    isActive: true,
    phone: '+91 9876543213',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    studentProfile: null,
    facultyProfile: null,
  },
  {
    id: DEV_IT_USER_ID,
    email: 'it.dev@dgu.ac.in',
    passwordHash: DEV_SHARED_HASH,
    fullName: 'IT & Support Center (Dev Fixture)',
    role: 'IT_SUPPORT',
    isActive: true,
    phone: '+91 9876543214',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    studentProfile: null,
    facultyProfile: null,
  },
  {
    id: DEV_HOD_USER_ID,
    email: 'hod.dev@dgu.ac.in',
    passwordHash: DEV_SHARED_HASH,
    fullName: 'Prof. Alok Gupta (HOD CSE Dev)',
    role: 'HOD',
    isActive: true,
    phone: '+91 9876543215',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    studentProfile: null,
    facultyProfile: {
      employeeCode: 'FAC-HOD-01',
      designation: 'Head of Department - Computer Science & Engineering',
      departmentId: 'd0000000-0000-4000-8000-000000000001',
    },
  },
  {
    id: DEV_SUPERADMIN_USER_ID,
    email: 'superadmin.dev@dgu.ac.in',
    passwordHash: DEV_SHARED_HASH,
    fullName: 'University Super Administrator',
    role: 'SUPER_ADMIN',
    isActive: true,
    phone: '+91 9876543216',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    studentProfile: null,
    facultyProfile: null,
  },
];

export class UserRepository {
  async findByIdentifier(identifier: string): Promise<UserWithPassword | null> {
    const trimmed = identifier.trim().toLowerCase();

    // In production, strictly reject development fixture accounts
    if (config.NODE_ENV === 'production') {
      const isDevFixture =
        trimmed.endsWith('.dev@dgu.ac.in') ||
        trimmed.includes('dev-fixture') ||
        DEV_ACCOUNTS.some(
          (u) =>
            u.email.toLowerCase() === trimmed ||
            u.studentProfile?.rollNumber.toLowerCase() === trimmed ||
            u.facultyProfile?.employeeCode.toLowerCase() === trimmed
        );
      if (isDevFixture) {
        return null;
      }
    }

    let dbError: unknown = null;
    // 1. Attempt PostgreSQL lookup via Prisma if database is available
    try {
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: trimmed, mode: 'insensitive' } },
            { studentProfile: { rollNumber: { equals: trimmed, mode: 'insensitive' } } },
            { facultyProfile: { employeeCode: { equals: trimmed, mode: 'insensitive' } } },
          ],
        },
        include: {
          studentProfile: true,
          facultyProfile: true,
        },
      });

      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          passwordHash: dbUser.passwordHash,
          fullName: dbUser.fullName,
          role: dbUser.role,
          isActive: dbUser.isActive,
          avatarUrl: dbUser.avatarUrl,
          phone: dbUser.phone,
          lastLoginAt: dbUser.lastLoginAt,
          createdAt: dbUser.createdAt,
          studentProfile: dbUser.studentProfile
            ? {
                rollNumber: dbUser.studentProfile.rollNumber,
                registrationNo: dbUser.studentProfile.registrationNo,
                currentSemester: dbUser.studentProfile.currentSemester,
                currentCgpa: Number(dbUser.studentProfile.currentCgpa),
              }
            : null,
          facultyProfile: dbUser.facultyProfile
            ? {
                employeeCode: dbUser.facultyProfile.employeeCode,
                designation: dbUser.facultyProfile.designation,
                departmentId: dbUser.facultyProfile.departmentId,
              }
            : null,
        };
      }
    } catch (err) {
      dbError = err;
    }

    // In production, reject development fixtures and fail safely on DB error
    if (config.NODE_ENV === 'production') {
      if (dbError) {
        throw new ServiceUnavailableError('Database service is unavailable in production');
      }
      return null;
    }

    // 2. Fallback to isolated development accounts for tests & dev mode
    const devUser = DEV_ACCOUNTS.find(
      (u) =>
        u.email.toLowerCase() === trimmed ||
        u.studentProfile?.rollNumber.toLowerCase() === trimmed ||
        u.facultyProfile?.employeeCode.toLowerCase() === trimmed
    );

    return devUser ?? null;
  }

  async findById(id: string): Promise<SafeUser | null> {
    let dbError: unknown = null;
    // 1. Attempt database lookup
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id },
        include: {
          studentProfile: true,
          facultyProfile: true,
        },
      });

      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          role: dbUser.role,
          isActive: dbUser.isActive,
          avatarUrl: dbUser.avatarUrl,
          phone: dbUser.phone,
          lastLoginAt: dbUser.lastLoginAt,
          createdAt: dbUser.createdAt,
          studentProfile: dbUser.studentProfile
            ? {
                rollNumber: dbUser.studentProfile.rollNumber,
                registrationNo: dbUser.studentProfile.registrationNo,
                currentSemester: dbUser.studentProfile.currentSemester,
                currentCgpa: Number(dbUser.studentProfile.currentCgpa),
              }
            : null,
          facultyProfile: dbUser.facultyProfile
            ? {
                employeeCode: dbUser.facultyProfile.employeeCode,
                designation: dbUser.facultyProfile.designation,
                departmentId: dbUser.facultyProfile.departmentId,
              }
            : null,
        };
      }
    } catch (err) {
      dbError = err;
    }

    // In production, reject development fixtures and fail safely on DB error
    if (config.NODE_ENV === 'production') {
      if (dbError) {
        throw new ServiceUnavailableError('Database service is unavailable in production');
      }
      return null;
    }

    // 2. Dev fixture lookup (development / test only)
    const devUser = DEV_ACCOUNTS.find(
      (u) =>
        u.id === id ||
        (id === 'dev-student-uuid-001' && u.id === DEV_STUDENT_USER_ID) ||
        (id === 'dev-faculty-uuid-002' && u.id === DEV_FACULTY_USER_ID)
    );
    if (!devUser) return null;

    const { passwordHash: _, ...safeUser } = devUser;
    return safeUser;
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });
    } catch {
      // Ignore if DB offline
    }
  }

  toSafeUser(user: UserWithPassword): SafeUser {
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}

export const userRepository = new UserRepository();
