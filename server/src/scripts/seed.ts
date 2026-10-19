import { prisma } from '../lib/prisma.js';
import { passwordService } from '../services/password.service.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/env.js';

// Explicitly identifiable, isolated development UUID fixtures
export const DEV_DEPT_ID = 'd0000000-0000-4000-8000-000000000001';
export const DEV_PROGRAM_ID = 'e0000000-0000-4000-8000-000000000001';
export const DEV_BATCH_ID = 'f0000000-0000-4000-8000-000000000001';
export const DEV_SECTION_ID = 'f0000000-0000-4000-8000-000000000002';

// Course Offerings
export const DEV_OFFERING_CS302_ID = 'b0000000-0000-4000-8000-000000000001';
export const DEV_OFFERING_CS304_ID = 'b0000000-0000-4000-8000-000000000002';
export const DEV_OFFERING_CS306_ID = 'b0000000-0000-4000-8000-000000000003';
export const DEV_OFFERING_CS308_ID = 'b0000000-0000-4000-8000-000000000004';
export const DEV_OFFERING_CS310_ID = 'b0000000-0000-4000-8000-000000000005';
export const DEV_OFFERING_CS312_ID = 'b0000000-0000-4000-8000-000000000006';
export const DEV_OFFERING_ENG301_ID = 'b0000000-0000-4000-8000-000000000007';

// Users
export const DEV_STUDENT_ID = 'a0000000-0000-4000-8000-000000000001';
export const DEV_FACULTY_ID = 'a0000000-0000-4000-8000-000000000002';
export const DEV_STUDENT_2_ID = 'a0000000-0000-4000-8000-000000000003';
export const DEV_STUDENT_3_ID = 'a0000000-0000-4000-8000-000000000004';
export const DEV_STUDENT_4_ID = 'a0000000-0000-4000-8000-000000000005';
export const DEV_STUDENT_5_ID = 'a0000000-0000-4000-8000-000000000006';

// Other Faculty IDs
export const FACULTY_ANANYA_ID = 'a0000000-0000-4000-8000-000000000010';
export const FACULTY_VIVEK_ID = 'a0000000-0000-4000-8000-000000000011';
export const FACULTY_MEENAKSHI_ID = 'a0000000-0000-4000-8000-000000000012';
export const FACULTY_KUNAL_ID = 'a0000000-0000-4000-8000-000000000013';
export const FACULTY_SUNITA_ID = 'a0000000-0000-4000-8000-000000000014';
export const FACULTY_RITU_ID = 'a0000000-0000-4000-8000-000000000015';

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

  // 5. Faculty & Users
  const passwordHash = await passwordService.hashPassword('Password@Dev123');

  const facultyData = [
    {
      id: DEV_FACULTY_ID,
      email: 'faculty.dev@dgu.ac.in',
      name: 'Dr. Rajesh Sharma (Dev Fixture)',
      code: 'FAC-108',
      designation: 'Head of Computer Science & AI',
      cabin: 'Academic Block 3, Room 304',
      spec: 'Distributed Systems & Algorithms',
    },
    {
      id: FACULTY_ANANYA_ID,
      email: 'ananya.dev@dgu.ac.in',
      name: 'Prof. Ananya Sen',
      code: 'FAC-109',
      designation: 'Associate Professor',
      cabin: 'Academic Block 3, Room 208',
      spec: 'Database Management Systems',
    },
    {
      id: FACULTY_VIVEK_ID,
      email: 'vivek.dev@dgu.ac.in',
      name: 'Dr. Vivek Bhatt',
      code: 'FAC-110',
      designation: 'Associate Professor',
      cabin: 'Academic Block 3, Room 212',
      spec: 'Computer Networks & Security',
    },
    {
      id: FACULTY_MEENAKSHI_ID,
      email: 'meenakshi.dev@dgu.ac.in',
      name: 'Prof. Meenakshi Joshi',
      code: 'FAC-111',
      designation: 'Assistant Professor',
      cabin: 'Academic Block 2, Room 105',
      spec: 'Operating Systems & Architecture',
    },
    {
      id: FACULTY_KUNAL_ID,
      email: 'kunal.dev@dgu.ac.in',
      name: 'Er. Kunal Rawat',
      code: 'FAC-112',
      designation: 'Assistant Professor',
      cabin: 'Academic Block 2, Room 114',
      spec: 'Cloud Computing & DevOps',
    },
    {
      id: FACULTY_SUNITA_ID,
      email: 'sunita.dev@dgu.ac.in',
      name: 'Dr. Sunita Negi',
      code: 'FAC-113',
      designation: 'Assistant Professor',
      cabin: 'Academic Block 1, Room 301',
      spec: 'Machine Learning Foundations',
    },
    {
      id: FACULTY_RITU_ID,
      email: 'ritu.dev@dgu.ac.in',
      name: 'Ms. Ritu Saxena',
      code: 'FAC-114',
      designation: 'Lecturer',
      cabin: 'Humanities Block, Room 102',
      spec: 'Corporate Communication',
    },
  ];

  for (const f of facultyData) {
    const user = await prisma.user.upsert({
      where: { email: f.email },
      create: {
        id: f.id,
        email: f.email,
        fullName: f.name,
        role: 'FACULTY',
        passwordHash,
        isActive: true,
      },
      update: {
        fullName: f.name,
        passwordHash,
        isActive: true,
      },
    });

    await prisma.facultyProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        employeeCode: f.code,
        departmentId: department.id,
        designation: f.designation,
        cabinLocation: f.cabin,
        specialization: f.spec,
      },
      update: {
        designation: f.designation,
        cabinLocation: f.cabin,
        specialization: f.spec,
      },
    });
  }

  // 6. Courses & Course Offerings
  const coursesData = [
    {
      code: 'CS302',
      title: 'Design & Analysis of Algorithms',
      credits: 4,
      lecture: 3,
      practical: 2,
      facultyId: DEV_FACULTY_ID,
      offeringId: DEV_OFFERING_CS302_ID,
    },
    {
      code: 'CS304',
      title: 'Database Management Systems',
      credits: 4,
      lecture: 3,
      practical: 2,
      facultyId: FACULTY_ANANYA_ID,
      offeringId: DEV_OFFERING_CS304_ID,
    },
    {
      code: 'CS306',
      title: 'Computer Networks',
      credits: 4,
      lecture: 3,
      practical: 2,
      facultyId: FACULTY_VIVEK_ID,
      offeringId: DEV_OFFERING_CS306_ID,
    },
    {
      code: 'CS308',
      title: 'Operating Systems & Architecture',
      credits: 4,
      lecture: 3,
      practical: 2,
      facultyId: FACULTY_MEENAKSHI_ID,
      offeringId: DEV_OFFERING_CS308_ID,
    },
    {
      code: 'CS310',
      title: 'Cloud Computing & DevOps',
      credits: 3,
      lecture: 3,
      practical: 0,
      facultyId: FACULTY_KUNAL_ID,
      offeringId: DEV_OFFERING_CS310_ID,
    },
    {
      code: 'CS312',
      title: 'Machine Learning Foundations',
      credits: 4,
      lecture: 3,
      practical: 2,
      facultyId: FACULTY_SUNITA_ID,
      offeringId: DEV_OFFERING_CS312_ID,
    },
    {
      code: 'ENG301',
      title: 'Corporate Communication & Soft Skills',
      credits: 2,
      lecture: 2,
      practical: 0,
      facultyId: FACULTY_RITU_ID,
      offeringId: DEV_OFFERING_ENG301_ID,
    },
  ];

  for (const c of coursesData) {
    const course = await prisma.course.upsert({
      where: { code: c.code },
      create: {
        departmentId: department.id,
        code: c.code,
        title: c.title,
        credits: c.credits,
        lectureHours: c.lecture,
        practicalHours: c.practical,
      },
      update: {
        title: c.title,
        credits: c.credits,
        lectureHours: c.lecture,
        practicalHours: c.practical,
      },
    });

    await prisma.courseOffering.upsert({
      where: {
        courseId_sectionId_academicYear_semester: {
          courseId: course.id,
          sectionId: section.id,
          academicYear: '2026-27',
          semester: 3,
        },
      },
      create: {
        id: c.offeringId,
        courseId: course.id,
        sectionId: section.id,
        primaryFacultyId: c.facultyId,
        academicYear: '2026-27',
        semester: 3,
        isActive: true,
      },
      update: {
        primaryFacultyId: c.facultyId,
        isActive: true,
      },
    });
  }

  // 7. Students & Enrollments across all offerings
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

    // Enroll each student in each course offering
    for (const c of coursesData) {
      await prisma.enrollment.upsert({
        where: {
          studentId_courseOfferingId: {
            studentId: studentUser.id,
            courseOfferingId: c.offeringId,
          },
        },
        create: {
          studentId: studentUser.id,
          courseOfferingId: c.offeringId,
        },
        update: {},
      });
    }
  }

  // 8. Timetable Slots (Weekly schedule from Monday to Saturday)
  const slotsData = [
    // Monday
    {
      id: 'f0000001-0000-4000-8000-000000000001',
      offeringId: DEV_OFFERING_CS302_ID,
      day: 'MONDAY' as const,
      startTime: '09:00 AM',
      endTime: '09:55 AM',
      room: 'LT-204 (Block 1)',
      isLab: false,
      note: null,
    },
    {
      id: 'f0000001-0000-4000-8000-000000000002',
      offeringId: DEV_OFFERING_CS304_ID,
      day: 'MONDAY' as const,
      startTime: '10:00 AM',
      endTime: '10:55 AM',
      room: 'LT-201 (Block 1)',
      isLab: false,
      note: null,
    },
    {
      id: 'f0000001-0000-4000-8000-000000000003',
      offeringId: DEV_OFFERING_CS302_ID,
      day: 'MONDAY' as const,
      startTime: '11:15 AM',
      endTime: '01:05 PM',
      room: 'Computing Lab 3 (Block 2)',
      isLab: true,
      note: 'Carry your Dynamic Programming assignment sheets',
    },
    {
      id: 'f0000001-0000-4000-8000-000000000004',
      offeringId: DEV_OFFERING_CS306_ID,
      day: 'MONDAY' as const,
      startTime: '02:00 PM',
      endTime: '02:55 PM',
      room: 'LT-305 (Block 1)',
      isLab: false,
      note: null,
    },
    {
      id: 'f0000001-0000-4000-8000-000000000005',
      offeringId: DEV_OFFERING_CS310_ID,
      day: 'MONDAY' as const,
      startTime: '03:00 PM',
      endTime: '03:55 PM',
      room: 'Seminar Hall B',
      isLab: false,
      note: null,
    },

    // Tuesday
    {
      id: 'f0000001-0000-4000-8000-000000000006',
      offeringId: DEV_OFFERING_CS308_ID,
      day: 'TUESDAY' as const,
      startTime: '09:00 AM',
      endTime: '09:55 AM',
      room: 'LT-102 (Block 2)',
      isLab: false,
      note: null,
    },
    {
      id: 'f0000001-0000-4000-8000-000000000007',
      offeringId: DEV_OFFERING_CS306_ID,
      day: 'TUESDAY' as const,
      startTime: '10:00 AM',
      endTime: '11:55 AM',
      room: 'Cisco Networking Lab (Block 3)',
      isLab: true,
      note: 'Packet Tracer simulation files will be checked at 10:15 AM',
    },
    {
      id: 'f0000001-0000-4000-8000-000000000008',
      offeringId: DEV_OFFERING_CS312_ID,
      day: 'TUESDAY' as const,
      startTime: '01:30 PM',
      endTime: '02:25 PM',
      room: 'LT-201 (Block 1)',
      isLab: false,
      note: null,
    },
    {
      id: 'f0000001-0000-4000-8000-000000000009',
      offeringId: DEV_OFFERING_CS304_ID,
      day: 'TUESDAY' as const,
      startTime: '02:30 PM',
      endTime: '03:25 PM',
      room: 'LT-204 (Block 1)',
      isLab: false,
      note: null,
    },

    // Wednesday
    {
      id: 'f0000001-0000-4000-8000-000000000010',
      offeringId: DEV_OFFERING_CS302_ID,
      day: 'WEDNESDAY' as const,
      startTime: '09:00 AM',
      endTime: '09:55 AM',
      room: 'LT-204 (Block 1)',
      isLab: false,
      note: null,
    },
    {
      id: 'f0000001-0000-4000-8000-000000000011',
      offeringId: DEV_OFFERING_CS310_ID,
      day: 'WEDNESDAY' as const,
      startTime: '10:00 AM',
      endTime: '10:55 AM',
      room: 'Seminar Hall B',
      isLab: false,
      note: null,
    },
    {
      id: 'f0000001-0000-4000-8000-000000000012',
      offeringId: DEV_OFFERING_CS304_ID,
      day: 'WEDNESDAY' as const,
      startTime: '11:15 AM',
      endTime: '01:05 PM',
      room: 'Computing Lab 2 (Block 2)',
      isLab: true,
      note: 'Submit Normalization 3NF query scripts before leaving',
    },
    {
      id: 'f0000001-0000-4000-8000-000000000013',
      offeringId: DEV_OFFERING_ENG301_ID,
      day: 'WEDNESDAY' as const,
      startTime: '02:00 PM',
      endTime: '03:00 PM',
      room: 'Conference Room 1',
      isLab: false,
      note: null,
    },

    // Thursday
    {
      id: 'f0000001-0000-4000-8000-000000000014',
      offeringId: DEV_OFFERING_CS308_ID,
      day: 'THURSDAY' as const,
      startTime: '09:00 AM',
      endTime: '09:55 AM',
      room: 'LT-102 (Block 2)',
      isLab: false,
      note: null,
    },
    {
      id: 'f0000001-0000-4000-8000-000000000015',
      offeringId: DEV_OFFERING_CS302_ID,
      day: 'THURSDAY' as const,
      startTime: '10:00 AM',
      endTime: '10:55 AM',
      room: 'LT-204 (Block 1)',
      isLab: false,
      note: null,
    },
    {
      id: 'f0000001-0000-4000-8000-000000000016',
      offeringId: DEV_OFFERING_CS312_ID,
      day: 'THURSDAY' as const,
      startTime: '11:15 AM',
      endTime: '12:10 PM',
      room: 'LT-201 (Block 1)',
      isLab: false,
      note: null,
    },
    {
      id: 'f0000001-0000-4000-8000-000000000017',
      offeringId: DEV_OFFERING_CS310_ID,
      day: 'THURSDAY' as const,
      startTime: '01:30 PM',
      endTime: '03:25 PM',
      room: 'Cloud Virtualization Lab (Block 2)',
      isLab: true,
      note: 'AWS Learner Lab vouchers will be distributed',
    },

    // Friday
    {
      id: 'f0000001-0000-4000-8000-000000000018',
      offeringId: DEV_OFFERING_CS306_ID,
      day: 'FRIDAY' as const,
      startTime: '09:00 AM',
      endTime: '09:55 AM',
      room: 'LT-305 (Block 1)',
      isLab: false,
      note: null,
    },
    {
      id: 'f0000001-0000-4000-8000-000000000019',
      offeringId: DEV_OFFERING_CS304_ID,
      day: 'FRIDAY' as const,
      startTime: '10:00 AM',
      endTime: '10:55 AM',
      room: 'LT-201 (Block 1)',
      isLab: false,
      note: null,
    },
    {
      id: 'f0000001-0000-4000-8000-000000000020',
      offeringId: DEV_OFFERING_CS308_ID,
      day: 'FRIDAY' as const,
      startTime: '11:15 AM',
      endTime: '01:05 PM',
      room: 'Systems Programming Lab (Block 2)',
      isLab: true,
      note: 'Kernel compile scripts evaluation',
    },
    {
      id: 'f0000001-0000-4000-8000-000000000021',
      offeringId: DEV_OFFERING_ENG301_ID,
      day: 'FRIDAY' as const,
      startTime: '02:00 PM',
      endTime: '03:30 PM',
      room: 'Auditorium',
      isLab: false,
      note: null,
    },

    // Saturday
    {
      id: 'f0000001-0000-4000-8000-000000000022',
      offeringId: DEV_OFFERING_CS312_ID,
      day: 'SATURDAY' as const,
      startTime: '09:30 AM',
      endTime: '12:30 PM',
      room: 'AI Innovation Center (Block 3)',
      isLab: true,
      note: 'Optional enrichment module on Graph DP & Tree Traversal',
    },
  ];

  for (const slot of slotsData) {
    await prisma.timetableSlot.upsert({
      where: { id: slot.id },
      create: {
        id: slot.id,
        courseOfferingId: slot.offeringId,
        dayName: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        roomNumber: slot.room,
        isLab: slot.isLab,
        note: slot.note,
      },
      update: {
        startTime: slot.startTime,
        endTime: slot.endTime,
        roomNumber: slot.room,
        isLab: slot.isLab,
        note: slot.note,
      },
    });
  }
  logger.info(`[SEED] Upserted ${slotsData.length} Timetable Slots`);

  // 9. Academic Calendar Events (Notices with event_date)
  const noticesData = [
    {
      id: 'd0000001-0000-4000-8000-000000000001',
      title: 'Continuous Assessment 1 (CA-1)',
      content: 'All undergraduate examinations begin on 22nd June 2026 across departmental halls.',
      category: 'EXAM',
      eventDate: new Date('2026-06-22T09:30:00Z'),
      isPinned: true,
      postedById: DEV_FACULTY_ID,
    },
    {
      id: 'd0000001-0000-4000-8000-000000000002',
      title: 'Annual University Research Conclave',
      content: 'Faculty and student paper presentations in the Himalayan Academic Amphitheatre.',
      category: 'EVENT',
      eventDate: new Date('2026-08-15T10:00:00Z'),
      isPinned: false,
      postedById: DEV_FACULTY_ID,
    },
    {
      id: 'd0000001-0000-4000-8000-000000000003',
      title: 'Mid-Semester Examinations (Odd Sem 2026-27)',
      content: 'Datesheet for B.Tech, MBA, and BBA Mid-Terms released by Office of the Controller of Examinations. Hall tickets will be issued only to students with >= 75% attendance.',
      category: 'EXAM',
      eventDate: new Date('2026-10-22T09:00:00Z'),
      isPinned: true,
      postedById: DEV_FACULTY_ID,
    },
    {
      id: 'd0000001-0000-4000-8000-000000000004',
      title: 'Deepawali & Autumn Semester Recess',
      content: 'University campus remains closed for academic festivities and institutional break.',
      category: 'HOLIDAY',
      eventDate: new Date('2026-11-01T00:00:00Z'),
      isPinned: false,
      postedById: DEV_FACULTY_ID,
    },
  ];

  for (const n of noticesData) {
    await prisma.notice.upsert({
      where: { id: n.id },
      create: {
        id: n.id,
        title: n.title,
        content: n.content,
        category: n.category,
        eventDate: n.eventDate,
        isPinned: n.isPinned,
        postedById: n.postedById,
      },
      update: {
        title: n.title,
        content: n.content,
        category: n.category,
        eventDate: n.eventDate,
        isPinned: n.isPinned,
      },
    });
  }
  logger.info(`[SEED] Upserted ${noticesData.length} Academic Calendar Notices`);

  // 10. Academic Assignments (Deadlines)
  const assignmentsData = [
    {
      id: 'a5900001-0000-4000-8000-000000000001',
      offeringId: DEV_OFFERING_CS302_ID,
      title: 'Problem Set 4: Bellman-Ford & Dijkstra Graph Implementations',
      description: 'Implement single-source shortest path algorithms in C++ with adjacency list representation.',
      dueDate: new Date('2026-10-22T23:59:00Z'),
      totalMarks: 25,
    },
    {
      id: 'a5900001-0000-4000-8000-000000000002',
      offeringId: DEV_OFFERING_CS304_ID,
      title: 'Mini Project: University ER Modeling & Normalization (3NF/BCNF)',
      description: 'Submit normalized relational schema design and SQL DDL scripts with foreign keys.',
      dueDate: new Date('2026-10-26T17:00:00Z'),
      totalMarks: 50,
    },
  ];

  for (const a of assignmentsData) {
    await prisma.assignment.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        courseOfferingId: a.offeringId,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        totalMarks: a.totalMarks,
      },
      update: {
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        totalMarks: a.totalMarks,
      },
    });
  }
  logger.info(`[SEED] Upserted ${assignmentsData.length} Academic Assignments`);

  // 11. Baseline Attendance Sessions & Records for CS302
  const session1 = await prisma.attendanceSession.upsert({
    where: { id: BASELINE_SESSION_1_ID },
    create: {
      id: BASELINE_SESSION_1_ID,
      courseOfferingId: DEV_OFFERING_CS302_ID,
      facultyId: DEV_FACULTY_ID,
      sessionDate: new Date('2026-10-10T10:00:00Z'),
      startTime: '10:00 AM',
      topicTaught: 'Divide & Conquer: Master Theorem Proof',
      markedAt: new Date('2026-10-10T11:00:00Z'),
      isLocked: true,
      slotId: 'f0000001-0000-4000-8000-000000000001',
    },
    update: {
      isLocked: true,
      slotId: 'f0000001-0000-4000-8000-000000000001',
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

  const session2 = await prisma.attendanceSession.upsert({
    where: { id: BASELINE_SESSION_2_ID },
    create: {
      id: BASELINE_SESSION_2_ID,
      courseOfferingId: DEV_OFFERING_CS302_ID,
      facultyId: DEV_FACULTY_ID,
      sessionDate: new Date('2026-10-12T10:00:00Z'),
      startTime: '10:00 AM',
      topicTaught: 'Greedy Algorithms: Huffman Coding',
      markedAt: new Date('2026-10-12T11:00:00Z'),
      isLocked: true,
      slotId: 'f0000001-0000-4000-8000-000000000003',
    },
    update: {
      isLocked: true,
      slotId: 'f0000001-0000-4000-8000-000000000003',
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
