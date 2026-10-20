import { prisma } from '../lib/prisma.js';
import type { Prisma, AdmissionApplicationStatus } from '@prisma/client';
import { passwordService } from '../services/password.service.js';

export class AdmissionsRepository {
  async findApplications(params: {
    search?: string;
    programId?: string;
    status?: AdmissionApplicationStatus;
    academicYear?: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.AdmissionApplicationWhereInput = {};

    if (params.programId) {
      where.programId = params.programId;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.academicYear) {
      where.academicYear = params.academicYear;
    }

    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { applicationNumber: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return prisma.admissionApplication.findMany({
      where,
      include: {
        program: {
          include: {
            department: true,
          },
        },
        decidedBy: {
          select: { id: true, fullName: true, email: true },
        },
        enrolledStudentProfile: {
          include: {
            user: {
              select: { id: true, email: true, fullName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    });
  }

  async countApplications(params: {
    search?: string;
    programId?: string;
    status?: AdmissionApplicationStatus;
    academicYear?: string;
  }): Promise<number> {
    const where: Prisma.AdmissionApplicationWhereInput = {};

    if (params.programId) where.programId = params.programId;
    if (params.status) where.status = params.status;
    if (params.academicYear) where.academicYear = params.academicYear;
    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { applicationNumber: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return prisma.admissionApplication.count({ where });
  }

  async findApplicationById(id: string) {
    return prisma.admissionApplication.findUnique({
      where: { id },
      include: {
        program: {
          include: {
            department: true,
          },
        },
        decidedBy: {
          select: { id: true, fullName: true, email: true },
        },
        enrolledStudentProfile: {
          include: {
            user: {
              select: { id: true, email: true, fullName: true },
            },
          },
        },
        auditLogs: {
          include: {
            performedBy: {
              select: { id: true, fullName: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findApplicationByNumber(applicationNumber: string) {
    return prisma.admissionApplication.findUnique({
      where: { applicationNumber },
    });
  }

  async getNextApplicationSequence(): Promise<number> {
    const count = await prisma.admissionApplication.count();
    return count + 1;
  }

  async createApplication(data: Prisma.AdmissionApplicationCreateInput) {
    return prisma.admissionApplication.create({
      data,
      include: {
        program: {
          include: {
            department: true,
          },
        },
      },
    });
  }

  async updateApplication(id: string, data: Prisma.AdmissionApplicationUpdateInput) {
    return prisma.admissionApplication.update({
      where: { id },
      data,
      include: {
        program: {
          include: {
            department: true,
          },
        },
        decidedBy: {
          select: { id: true, fullName: true, email: true },
        },
        enrolledStudentProfile: {
          include: {
            user: {
              select: { id: true, email: true, fullName: true },
            },
          },
        },
      },
    });
  }

  async addAuditLog(data: {
    applicationId: string;
    action: string;
    previousStatus?: string | null;
    newStatus: string;
    performedById: string;
    reason?: string | null;
    details?: any;
    ipAddress?: string | null;
  }) {
    return prisma.admissionAuditLog.create({
      data: {
        applicationId: data.applicationId,
        action: data.action,
        previousStatus: data.previousStatus,
        newStatus: data.newStatus,
        performedById: data.performedById,
        reason: data.reason,
        details: data.details,
        ipAddress: data.ipAddress,
      },
    });
  }

  async getAuditLogsByApplicationId(applicationId: string) {
    return prisma.admissionAuditLog.findMany({
      where: { applicationId },
      include: {
        performedBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Atomic, idempotent applicant-to-student enrollment conversion
   */
  async enrollApplicantTransaction(params: {
    applicationId: string;
    batchId?: string;
    sectionId?: string;
    notes?: string;
    actorUserId: string;
    ipAddress?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch application with lock
      const app = await tx.admissionApplication.findUnique({
        where: { id: params.applicationId },
        include: {
          program: {
            include: {
              department: true,
              batches: {
                include: {
                  sections: true,
                },
                orderBy: { startYear: 'desc' },
                take: 1,
              },
            },
          },
          enrolledStudentProfile: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!app) {
        throw new Error(`Application '${params.applicationId}' not found.`);
      }

      // Idempotency: If already enrolled, return existing profile
      if (app.status === 'ENROLLED' && app.enrolledStudentProfile) {
        return {
          isAlreadyEnrolled: true,
          studentProfile: app.enrolledStudentProfile,
          studentUser: app.enrolledStudentProfile.user,
          invoice: null,
          application: app,
        };
      }

      // 2. Resolve batch and section
      let batchId = params.batchId;
      let sectionId = params.sectionId;

      if (!batchId) {
        const latestBatch = app.program.batches[0];
        if (!latestBatch) {
          throw new Error(`No active academic batch found for program '${app.program.name}'.`);
        }
        batchId = latestBatch.id;

        if (!sectionId && latestBatch.sections && latestBatch.sections.length > 0) {
          sectionId = latestBatch.sections[0].id;
        }
      }

      if (!sectionId) {
        // Fallback: query any section in batch or create section
        const existingSection = await tx.section.findFirst({
          where: { batchId },
        });
        if (existingSection) {
          sectionId = existingSection.id;
        } else {
          const newSection = await tx.section.create({
            data: {
              batchId,
              name: 'Section A',
              maxCapacity: 60,
            },
          });
          sectionId = newSection.id;
        }
      }

      // 3. Generate canonical Roll Number & Registration Number
      const yearPrefix = app.academicYear ? app.academicYear.slice(2, 4) : new Date().getFullYear().toString().slice(-2);
      const studentCount = await tx.studentProfile.count();
      const sequenceNum = String(studentCount + 1).padStart(3, '0');
      const rollNumber = `${yearPrefix}${app.program.code.slice(0, 4)}${sequenceNum}`;
      const registrationNo = `DGU-${new Date().getFullYear()}-${String(studentCount + 1).padStart(4, '0')}`;

      // 4. Create or find User
      let studentUser = await tx.user.findUnique({
        where: { email: app.email.toLowerCase() },
      });

      if (!studentUser) {
        const defaultPasswordHash = await passwordService.hashPassword('Password@Dev123');
        studentUser = await tx.user.create({
          data: {
            email: app.email.toLowerCase(),
            fullName: app.fullName,
            phone: app.phone,
            role: 'STUDENT',
            passwordHash: defaultPasswordHash,
            isActive: true,
          },
        });
      }

      // 5. Create StudentProfile
      const studentProfile = await tx.studentProfile.create({
        data: {
          userId: studentUser.id,
          rollNumber,
          registrationNo,
          batchId,
          sectionId,
          currentSemester: 1,
          currentCgpa: 0.0,
        },
      });

      // 6. Create Initial Semester Tuition Fee Invoice
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(studentCount + 1).padStart(4, '0')}`;
      const dueDate = new Date(Date.now() + 30 * 86400000); // 30 days
      const invoice = await tx.feeInvoice.create({
        data: {
          studentId: studentUser.id,
          invoiceNumber,
          academicTerm: 'Semester 1',
          academicYear: app.academicYear,
          semester: 1,
          category: 'TUITION',
          description: `Semester 1 Academic Tuition & Registration Fees for ${app.program.name}`,
          dueDate,
          issueDate: new Date(),
          subtotalAmount: 75000,
          totalAmount: 75000,
          concessionAmount: 0,
          paidAmount: 0,
          status: 'ISSUED',
          createdById: params.actorUserId,
          items: {
            create: [
              { description: 'Tuition Fee - Semester 1', amount: 60000 },
              { description: 'Academic Library & Lab Fee', amount: 10000 },
              { description: 'University Enrollment & ID Card Charge', amount: 5000 },
            ],
          },
        },
      });

      // 7. Update Application status to ENROLLED
      const updatedApp = await tx.admissionApplication.update({
        where: { id: app.id },
        data: {
          status: 'ENROLLED',
          enrolledStudentProfileId: studentProfile.id,
          enrolledAt: new Date(),
          decisionReason: params.notes || 'Enrolled into academic program upon document verification.',
          decidedById: params.actorUserId,
          decidedAt: new Date(),
        },
      });

      // 8. Record AdmissionAuditLog
      await tx.admissionAuditLog.create({
        data: {
          applicationId: app.id,
          action: 'ENROLLMENT_CONVERTED',
          previousStatus: app.status,
          newStatus: 'ENROLLED',
          performedById: params.actorUserId,
          reason: params.notes || 'Successfully converted applicant to enrolled student.',
          details: {
            rollNumber,
            registrationNo,
            studentUserId: studentUser.id,
            studentProfileId: studentProfile.id,
            invoiceNumber: invoice.invoiceNumber,
          },
          ipAddress: params.ipAddress,
        },
      });

      return {
        isAlreadyEnrolled: false,
        studentProfile,
        studentUser,
        invoice,
        application: updatedApp,
      };
    });
  }
}

export const admissionsRepository = new AdmissionsRepository();
