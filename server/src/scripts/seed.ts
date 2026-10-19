import { prisma } from '../lib/prisma.js';
import { passwordService } from '../services/password.service.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/env.js';

// Explicitly identifiable, isolated development UUID fixtures
export const DEV_DEPT_ID = 'd0000000-0000-4000-8000-000000000001';
export const DEV_PROGRAM_ID = 'e0000000-0000-4000-8000-000000000001';
export const DEV_BATCH_ID = 'f0000000-0000-4000-8000-000000000001';
export const DEV_SECTION_ID = 'f0000000-0000-4000-8000-000000000002';
export const DEV_COURSE_ID = 'c0000000-0000-4000-8000-000000000001';
export const DEV_OFFERING_ID = 'b0000000-0000-4000-8000-000000000001';

export const DEV_STUDENT_ID = 'a0000000-0000-4000-8000-000000000001';
export const DEV_FACULTY_ID = 'a0000000-0000-4000-8000-000000000002';
export const DEV_STUDENT_2_ID = 'a0000000-0000-4000-8000-000000000003';
export const DEV_STUDENT_3_ID = 'a0000000-0000-4000-8000-000000000004';
export const DEV_STUDENT_4_ID = 'a0000000-0000-4000-8000-000000000005';
export const DEV_STUDENT_5_ID = 'a0000000-0000-4000-8000-000000000006';

export const BASELINE_SESSION_1_ID = 'c0000000-0000-4000-8000-000000000001';
export const BASELINE_SESSION_2_ID = 'c0000000-0000-4000-8000-000000000002';

export async function seedDevelopmentDatabase(): Promise<void> {
  if (config.NODE_ENV === 'production') {
    throw new Error('FATAL: Development seeding cannot be executed in production environment!');
  }

  logger.info('[SEED] Starting development database seeding for Camu-Next...');

  // 1. Department
  const department = await prisma.department.upsert({
    where: { code: 'SOET' },
    create: {
      id: DEV_DEPT_ID,
      code: 'SOET',
      name: 'School of Engineering & Technology',
    },
    update: {
      name: 'School of Engineering & Technology',
    },
  });
  logger.info('[SEED] Upserted Department', { id: department.id, code: department.code });

  // 2. Program
  const program = await prisma.program.upsert({
    where: { code: 'BTECH_CSE' },
    create: {
      id: DEV_PROGRAM_ID,
      departmentId: department.id,
      code: 'BTECH_CSE',
      name: 'B.Tech in Computer Science & Engineering',
      durationSemesters: 8,
      degreeLevel: 'UNDERGRADUATE',
    },
    update: {
      name: 'B.Tech in Computer Science & Engineering',
    },
  });
  logger.info('[SEED] Upserted Program', { id: program.id, code: program.code });

  // 3. Batch
  const batch = await prisma.batch.upsert({
    where: {
      programId_startYear_endYear: {
        programId: program.id,
        startYear: 2024,
        endYear: 2028,
      },
    },
    create: {
      id: DEV_BATCH_ID,
      programId: program.id,
      startYear: 2024,
      endYear: 2028,
      batchName: 'B.Tech CSE 2024-28',
      currentSemester: 3,
      isActive: true,
    },
    update: {
      currentSemester: 3,
      isActive: true,
    },
  });
  logger.info('[SEED] Upserted Batch', { id: batch.id, name: batch.batchName });

  // 4. Section
  const section = await prisma.section.upsert({
    where: {
      batchId_name: {
        batchId: batch.id,
        name: 'Section A',
      },
    },
    create: {
      id: DEV_SECTION_ID,
      batchId: batch.id,
      name: 'Section A',
    },
    update: {},
  });
  logger.info('[SEED] Upserted Section', { id: section.id, name: section.name });

  // 5. Course
  const course = await prisma.course.upsert({
    where: { code: 'CS302' },
    create: {
      id: DEV_COURSE_ID,
      departmentId: department.id,
      code: 'CS302',
      title: 'Design & Analysis of Algorithms',
      credits: 4,
      lectureHours: 3,
      tutorialHours: 0,
      practicalHours: 2,
    },
    update: {
      title: 'Design & Analysis of Algorithms',
    },
  });
  logger.info('[SEED] Upserted Course', { id: course.id, code: course.code });

  // 6. Users & Credentials
  const passwordHash = await passwordService.hashPassword('Password@Dev123');

  // 6a. Faculty
  const faculty = await prisma.user.upsert({
    where: { email: 'faculty.dev@dgu.ac.in' },
    create: {
      id: DEV_FACULTY_ID,
      email: 'faculty.dev@dgu.ac.in',
      fullName: 'Dr. Rajesh Sharma (Dev Fixture)',
      role: 'FACULTY',
      passwordHash,
      isActive: true,
      phone: '+91 9876543211',
    },
    update: {
      fullName: 'Dr. Rajesh Sharma (Dev Fixture)',
      passwordHash,
      isActive: true,
    },
  });

  await prisma.facultyProfile.upsert({
    where: { userId: faculty.id },
    create: {
      userId: faculty.id,
      employeeCode: 'FAC-108',
      departmentId: department.id,
      designation: 'Head of Computer Science & AI',
      cabinLocation: 'Academic Block 3, Room 304',
      specialization: 'Distributed Systems & Algorithms',
    },
    update: {
      designation: 'Head of Computer Science & AI',
      departmentId: department.id,
    },
  });
  logger.info('[SEED] Upserted Faculty User & Profile', { id: faculty.id, email: faculty.email });

  // 6b. Course Offering
  const offering = await prisma.courseOffering.upsert({
    where: {
      courseId_sectionId_academicYear_semester: {
        courseId: course.id,
        sectionId: section.id,
        academicYear: '2026-27',
        semester: 3,
      },
    },
    create: {
      id: DEV_OFFERING_ID,
      courseId: course.id,
      sectionId: section.id,
      primaryFacultyId: faculty.id,
      academicYear: '2026-27',
      semester: 3,
      isActive: true,
    },
    update: {
      primaryFacultyId: faculty.id,
      isActive: true,
    },
  });
  logger.info('[SEED] Upserted Course Offering', { id: offering.id });

  // 6c. Students
  const studentsData = [
    {
      id: DEV_STUDENT_ID,
      email: 'student.dev@dgu.ac.in',
      fullName: 'Harendra Pratap Singh (Dev Fixture)',
      rollNumber: '0251BTCS097',
      registrationNo: 'DBS25UG25234',
      cgpa: 8.64,
    },
    {
      id: DEV_STUDENT_2_ID,
      email: 'aaditya.dev@dgu.ac.in',
      fullName: 'Aaditya Sharma',
      rollNumber: '0251BTCS001',
      registrationNo: 'DBS25UG25001',
      cgpa: 8.21,
    },
    {
      id: DEV_STUDENT_3_ID,
      email: 'amandeep.dev@dgu.ac.in',
      fullName: 'Aman Deep Singh',
      rollNumber: '0251BTCS014',
      registrationNo: 'DBS25UG25014',
      cgpa: 6.85,
    },
    {
      id: DEV_STUDENT_4_ID,
      email: 'isha.dev@dgu.ac.in',
      fullName: 'Isha Bahuguna',
      rollNumber: '0251BTCS051',
      registrationNo: 'DBS25UG25051',
      cgpa: 7.42,
    },
    {
      id: DEV_STUDENT_5_ID,
      email: 'naveen.dev@dgu.ac.in',
      fullName: 'Naveen Bhatt',
      rollNumber: '0251BTCS089',
      registrationNo: 'DBS25UG25089',
      cgpa: 6.94,
    },
  ];

  for (const s of studentsData) {
    const studentUser = await prisma.user.upsert({
      where: { email: s.email },
      create: {
        id: s.id,
        email: s.email,
        fullName: s.fullName,
        role: 'STUDENT',
        passwordHash,
        isActive: true,
      },
      update: {
        fullName: s.fullName,
        passwordHash,
        isActive: true,
      },
    });

    await prisma.studentProfile.upsert({
      where: { userId: studentUser.id },
      create: {
        userId: studentUser.id,
        rollNumber: s.rollNumber,
        registrationNo: s.registrationNo,
        batchId: batch.id,
        sectionId: section.id,
        currentSemester: 3,
        currentCgpa: s.cgpa,
      },
      update: {
        rollNumber: s.rollNumber,
        registrationNo: s.registrationNo,
        currentSemester: 3,
        currentCgpa: s.cgpa,
      },
    });

    // Enrollment
    await prisma.enrollment.upsert({
      where: {
        studentId_courseOfferingId: {
          studentId: studentUser.id,
          courseOfferingId: offering.id,
        },
      },
      create: {
        studentId: studentUser.id,
        courseOfferingId: offering.id,
      },
      update: {},
    });
  }
  logger.info('[SEED] Upserted 5 Enrolled Students in Course Offering');

  // 7. Baseline Attendance Sessions & Records
  // Session 1: 2026-10-10
  const session1 = await prisma.attendanceSession.upsert({
    where: { id: BASELINE_SESSION_1_ID },
    create: {
      id: BASELINE_SESSION_1_ID,
      courseOfferingId: offering.id,
      facultyId: faculty.id,
      sessionDate: new Date('2026-10-10T10:00:00Z'),
      startTime: '10:00 AM',
      topicTaught: 'Divide & Conquer: Master Theorem Proof',
      markedAt: new Date('2026-10-10T11:00:00Z'),
      isLocked: true,
    },
    update: {
      isLocked: true,
    },
  });

  const session1Records = [
    { studentId: DEV_STUDENT_ID, status: 'PRESENT' as const },
    { studentId: DEV_STUDENT_2_ID, status: 'PRESENT' as const },
    { studentId: DEV_STUDENT_3_ID, status: 'ABSENT' as const },
    { studentId: DEV_STUDENT_4_ID, status: 'ABSENT' as const },
    { studentId: DEV_STUDENT_5_ID, status: 'ABSENT' as const },
  ];

  for (const r of session1Records) {
    await prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId: session1.id,
          studentId: r.studentId,
        },
      },
      create: {
        sessionId: session1.id,
        studentId: r.studentId,
        status: r.status,
      },
      update: {
        status: r.status,
      },
    });
  }

  // Session 2: 2026-10-12
  const session2 = await prisma.attendanceSession.upsert({
    where: { id: BASELINE_SESSION_2_ID },
    create: {
      id: BASELINE_SESSION_2_ID,
      courseOfferingId: offering.id,
      facultyId: faculty.id,
      sessionDate: new Date('2026-10-12T10:00:00Z'),
      startTime: '10:00 AM',
      topicTaught: 'Greedy Algorithms: Huffman Coding',
      markedAt: new Date('2026-10-12T11:00:00Z'),
      isLocked: true,
    },
    update: {
      isLocked: true,
    },
  });

  const session2Records = [
    { studentId: DEV_STUDENT_ID, status: 'ON_DUTY' as const, remarks: 'Smart India Hackathon' },
    { studentId: DEV_STUDENT_2_ID, status: 'PRESENT' as const },
    { studentId: DEV_STUDENT_3_ID, status: 'ABSENT' as const },
    { studentId: DEV_STUDENT_4_ID, status: 'ABSENT' as const },
    { studentId: DEV_STUDENT_5_ID, status: 'ABSENT' as const },
  ];

  for (const r of session2Records) {
    await prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId: session2.id,
          studentId: r.studentId,
        },
      },
      create: {
        sessionId: session2.id,
        studentId: r.studentId,
        status: r.status,
        remarks: r.remarks ?? null,
      },
      update: {
        status: r.status,
        remarks: r.remarks ?? null,
      },
    });
  }

  logger.info('[SEED] Upserted 2 Baseline Attendance Sessions with 10 records');
  logger.info('[SEED] Development database seeding completed successfully!');
}

// Standalone execution
if (process.argv[1]?.endsWith('seed.ts')) {
  seedDevelopmentDatabase()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('[SEED] Detailed Error:', e);
      logger.error('[SEED] Failed to seed development database:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
