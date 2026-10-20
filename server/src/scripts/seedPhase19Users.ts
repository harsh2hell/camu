import { prisma } from '../lib/prisma.js';
import { passwordService } from '../services/password.service.js';

export const P19_ADMISSIONS_ID = 'a0000000-0000-4000-8000-000000000051';
export const P19_FINANCE_ID = 'a0000000-0000-4000-8000-000000000052';
export const P19_IT_ID = 'a0000000-0000-4000-8000-000000000053';
export const P19_HOD_ID = 'a0000000-0000-4000-8000-000000000054';
export const P19_SUPERADMIN_ID = 'a0000000-0000-4000-8000-000000000055';

export const SOET_DEPT_ID = 'd0000000-0000-4000-8000-000000000001';

export async function seedPhase19Users() {
  const hash = await passwordService.hashPassword('Password@Dev123');

  // Ensure SOET Department exists
  await prisma.department.upsert({
    where: { id: SOET_DEPT_ID },
    update: {},
    create: {
      id: SOET_DEPT_ID,
      name: 'School of Engineering & Technology',
      code: 'SOET',
    },
  });

  // 1. Admissions Officer
  await prisma.user.upsert({
    where: { id: P19_ADMISSIONS_ID },
    update: { role: 'ADMISSIONS_OFFICER', isActive: true },
    create: {
      id: P19_ADMISSIONS_ID,
      email: 'admissions.dev@dgu.ac.in',
      fullName: 'Admissions Office (Dev Fixture)',
      passwordHash: hash,
      role: 'ADMISSIONS_OFFICER',
      isActive: true,
    },
  });

  // 2. Finance Officer
  await prisma.user.upsert({
    where: { id: P19_FINANCE_ID },
    update: { role: 'FINANCE_OFFICER', isActive: true },
    create: {
      id: P19_FINANCE_ID,
      email: 'finance.dev@dgu.ac.in',
      fullName: 'Finance & Accounts Office (Dev Fixture)',
      passwordHash: hash,
      role: 'FINANCE_OFFICER',
      isActive: true,
    },
  });

  // 3. IT Support
  await prisma.user.upsert({
    where: { id: P19_IT_ID },
    update: { role: 'IT_SUPPORT', isActive: true },
    create: {
      id: P19_IT_ID,
      email: 'it.dev@dgu.ac.in',
      fullName: 'IT & Support Center (Dev Fixture)',
      passwordHash: hash,
      role: 'IT_SUPPORT',
      isActive: true,
    },
  });

  // 4. HOD
  await prisma.user.upsert({
    where: { id: P19_HOD_ID },
    update: { role: 'HOD', isActive: true },
    create: {
      id: P19_HOD_ID,
      email: 'hod.dev@dgu.ac.in',
      fullName: 'Prof. Alok Gupta (HOD CSE Dev)',
      passwordHash: hash,
      role: 'HOD',
      isActive: true,
    },
  });

  // Ensure HOD Faculty Profile
  await prisma.facultyProfile.upsert({
    where: { userId: P19_HOD_ID },
    update: { departmentId: SOET_DEPT_ID, designation: 'Head of Computer Science & Engineering' },
    create: {
      userId: P19_HOD_ID,
      employeeCode: 'FAC-HOD-01',
      departmentId: SOET_DEPT_ID,
      designation: 'Head of Computer Science & Engineering',
    },
  });

  // 5. Super Admin
  await prisma.user.upsert({
    where: { id: P19_SUPERADMIN_ID },
    update: { role: 'SUPER_ADMIN', isActive: true },
    create: {
      id: P19_SUPERADMIN_ID,
      email: 'superadmin.dev@dgu.ac.in',
      fullName: 'University Super Administrator',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('Phase 19 users and profiles seeded successfully into PostgreSQL!');
}

seedPhase19Users()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
