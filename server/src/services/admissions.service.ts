import { admissionsRepository } from '../repositories/admissions.repository.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../errors/AppError.js';
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
  UpdateStatusInput,
  EnrollApplicantInput,
  QueryApplicationsInput,
  AdmissionApplicationDTO,
} from '../types/admissions.js';
import type { SafeUser } from '../types/auth.js';

export class AdmissionsService {
  private repo = admissionsRepository;

  async getApplications(query: QueryApplicationsInput) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [applications, totalCount] = await Promise.all([
      this.repo.findApplications({
        search: query.search,
        programId: query.programId,
        status: query.status as any,
        academicYear: query.academicYear,
        skip,
        take: limit,
      }),
      this.repo.countApplications({
        search: query.search,
        programId: query.programId,
        status: query.status as any,
        academicYear: query.academicYear,
      }),
    ]);

    const formatted: AdmissionApplicationDTO[] = applications.map((app) => this.mapApplicationToDTO(app));

    return {
      applications: formatted,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getApplicationById(id: string): Promise<AdmissionApplicationDTO> {
    const app = await this.repo.findApplicationById(id);
    if (!app) {
      throw new NotFoundError(`Admission application '${id}' not found.`);
    }

    return this.mapApplicationToDTO(app);
  }

  async getAuditLogs(id: string) {
    const existing = await this.repo.findApplicationById(id);
    if (!existing) {
      throw new NotFoundError(`Admission application '${id}' not found.`);
    }
    return this.repo.getAuditLogsByApplicationId(id);
  }

  async createApplication(input: CreateApplicationInput, actor?: SafeUser, ipAddress?: string): Promise<AdmissionApplicationDTO> {
    const year = new Date().getFullYear();
    const seq = await this.repo.getNextApplicationSequence();
    const applicationNumber = `DGU-${year}-${String(seq).padStart(4, '0')}`;

    const fullName = (input.fullName || input.applicantName || 'Applicant').trim();
    const email = (input.email || input.applicantEmail || '').trim().toLowerCase();
    const phone = (input.phone || input.applicantPhone || '').trim();
    const dob = input.dateOfBirth ? new Date(input.dateOfBirth) : new Date('2005-01-01');

    const previousEducation = {
      ...(input.previousEducation || {}),
      ...(input.highSchoolPercentage !== undefined ? { highSchoolPercentage: input.highSchoolPercentage } : {}),
      ...(input.intermediatePercentage !== undefined ? { intermediatePercentage: input.intermediatePercentage } : {}),
    };

    let documentsChecklist = input.documentsChecklist;
    if (!documentsChecklist && input.documents) {
      documentsChecklist = input.documents.map((d: any) => ({
        documentType: d.name || 'Application Document',
        isVerified: false,
        fileUrl: d.url,
      }));
    }
    if (!documentsChecklist || documentsChecklist.length === 0) {
      documentsChecklist = [
        { documentType: '10th Standard Marksheet', isVerified: false },
        { documentType: '12th Standard / Diploma Marksheet', isVerified: false },
        { documentType: 'Government Identity Proof', isVerified: false },
        { documentType: 'Entrance Exam Scorecard', isVerified: false },
      ];
    }

    const created = await this.repo.createApplication({
      applicationNumber,
      fullName,
      email,
      phone,
      dateOfBirth: dob,
      gender: input.gender,
      program: { connect: { id: input.programId } },
      academicYear: input.academicYear,
      status: 'SUBMITTED',
      entranceExamScore: input.entranceExamScore,
      previousEducation,
      documentsChecklist,
      reviewNotes: input.reviewNotes,
    });

    if (actor) {
      await this.repo.addAuditLog({
        applicationId: created.id,
        action: 'APPLICATION_CREATED',
        newStatus: 'SUBMITTED',
        performedById: actor.id,
        reason: 'New applicant file initialized.',
        ipAddress,
      });
    }

    return this.getApplicationById(created.id);
  }

  async updateApplication(id: string, input: UpdateApplicationInput, actor: SafeUser, ipAddress?: string): Promise<AdmissionApplicationDTO> {
    const existing = await this.repo.findApplicationById(id);
    if (!existing) {
      throw new NotFoundError(`Admission application '${id}' not found.`);
    }

    if (existing.status === 'ENROLLED') {
      throw new BadRequestError('Cannot modify details of an applicant who is already enrolled as a student.');
    }

    const data: any = {};
    if (input.fullName || input.applicantName) data.fullName = input.fullName || input.applicantName;
    if (input.phone || input.applicantPhone) data.phone = input.phone || input.applicantPhone;
    if (input.entranceExamScore !== undefined) data.entranceExamScore = input.entranceExamScore;
    if (input.previousEducation) data.previousEducation = input.previousEducation;
    if (input.documentsChecklist) data.documentsChecklist = input.documentsChecklist;
    if (input.reviewNotes !== undefined) data.reviewNotes = input.reviewNotes;

    await this.repo.updateApplication(id, data);

    await this.repo.addAuditLog({
      applicationId: id,
      action: 'APPLICATION_UPDATED',
      previousStatus: existing.status,
      newStatus: existing.status,
      performedById: actor.id,
      reason: 'Application profile / document checklist updated.',
      details: data,
      ipAddress,
    });

    return this.getApplicationById(id);
  }

  async addReviewNote(id: string, note: string, actor: SafeUser, ipAddress?: string): Promise<AdmissionApplicationDTO> {
    const existing = await this.repo.findApplicationById(id);
    if (!existing) {
      throw new NotFoundError(`Admission application '${id}' not found.`);
    }

    const timestamp = new Date().toISOString();
    const updatedReviewNotes = existing.reviewNotes
      ? `${existing.reviewNotes}\n[${timestamp} - ${actor.fullName}]: ${note}`
      : `[${timestamp} - ${actor.fullName}]: ${note}`;

    await this.repo.updateApplication(id, { reviewNotes: updatedReviewNotes });

    await this.repo.addAuditLog({
      applicationId: id,
      action: 'NOTE_ADDED',
      previousStatus: existing.status,
      newStatus: existing.status,
      performedById: actor.id,
      reason: 'Review note appended to application file.',
      details: { note },
      ipAddress,
    });

    return this.getApplicationById(id);
  }

  async updateStatus(id: string, input: UpdateStatusInput, actor: SafeUser, ipAddress?: string): Promise<AdmissionApplicationDTO> {
    const existing = await this.repo.findApplicationById(id);
    if (!existing) {
      throw new NotFoundError(`Admission application '${id}' not found.`);
    }

    if (existing.status === 'ENROLLED') {
      throw new BadRequestError('Enrolled student applications cannot be reverted via admissions status transitions.');
    }

    const updateData: any = {
      status: input.status,
      decisionReason: input.reason || null,
      decidedById: actor.id,
      decidedAt: new Date(),
    };

    if (input.offerLetterUrl) {
      updateData.offerLetterUrl = input.offerLetterUrl;
    }

    await this.repo.updateApplication(id, updateData);

    await this.repo.addAuditLog({
      applicationId: id,
      action: 'STATUS_CHANGE',
      previousStatus: existing.status,
      newStatus: input.status,
      performedById: actor.id,
      reason: input.reason,
      ipAddress,
    });

    return this.getApplicationById(id);
  }

  async enrollApplicant(id: string, input: EnrollApplicantInput, actor: SafeUser, ipAddress?: string) {
    const existing = await this.repo.findApplicationById(id);
    if (!existing) {
      throw new NotFoundError(`Admission application '${id}' not found.`);
    }

    if (existing.status === 'ENROLLED') {
      return {
        isAlreadyEnrolled: true,
        message: 'Applicant is already enrolled in the university.',
        studentProfile: existing.enrolledStudentProfile,
        studentUser: existing.enrolledStudentProfile?.user,
        invoice: null,
        studentProfileId: existing.enrolledStudentProfileId,
        rollNumber: existing.enrolledStudentProfile?.rollNumber,
      };
    }

    if (
      existing.status !== 'ADMITTED' &&
      existing.status !== 'OFFER_EXTENDED' &&
      existing.status !== 'OFFER_MADE' &&
      existing.status !== 'OFFER_ACCEPTED'
    ) {
      throw new BadRequestError(
        `Cannot enroll applicant in status '${existing.status}'. Applicant must have an accepted offer or admitted status.`
      );
    }

    const result = await this.repo.enrollApplicantTransaction({
      applicationId: id,
      batchId: input.batchId,
      sectionId: input.sectionId,
      notes: input.notes,
      actorUserId: actor.id,
      ipAddress,
    });

    return {
      isAlreadyEnrolled: result.isAlreadyEnrolled,
      message: result.isAlreadyEnrolled
        ? 'Applicant is already enrolled in the university.'
        : 'Applicant successfully enrolled as DGU university student.',
      studentProfile: result.studentProfile,
      studentUser: result.studentUser,
      invoice: result.invoice,
      studentProfileId: result.studentProfile.id,
      studentUserId: result.studentUser?.id,
      rollNumber: result.studentProfile.rollNumber,
      registrationNo: result.studentProfile.registrationNo,
      invoiceNumber: result.invoice?.invoiceNumber,
    };
  }

  private mapApplicationToDTO(app: any): AdmissionApplicationDTO {
    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      fullName: app.fullName,
      applicantName: app.fullName,
      email: app.email,
      applicantEmail: app.email,
      phone: app.phone,
      applicantPhone: app.phone,
      dateOfBirth: app.dateOfBirth instanceof Date ? app.dateOfBirth.toISOString().split('T')[0] : String(app.dateOfBirth),
      gender: app.gender,
      programId: app.programId,
      program: {
        id: app.program.id,
        code: app.program.code,
        name: app.program.name,
        department: {
          id: app.program.department.id,
          code: app.program.department.code,
          name: app.program.department.name,
        },
      },
      academicYear: app.academicYear,
      status: app.status,
      entranceExamScore: app.entranceExamScore ? Number(app.entranceExamScore) : null,
      highSchoolPercentage: app.previousEducation?.highSchoolPercentage ?? null,
      intermediatePercentage: app.previousEducation?.intermediatePercentage ?? null,
      previousEducation: app.previousEducation,
      documentsChecklist: app.documentsChecklist,
      documents: app.documentsChecklist,
      reviewNotes: app.reviewNotes,
      decisionReason: app.decisionReason,
      decidedBy: app.decidedBy
        ? {
            id: app.decidedBy.id,
            fullName: app.decidedBy.fullName,
            email: app.decidedBy.email,
          }
        : null,
      decidedAt: app.decidedAt ? app.decidedAt.toISOString() : null,
      offerLetterUrl: app.offerLetterUrl,
      enrolledStudentProfileId: app.enrolledStudentProfileId,
      enrolledStudent: app.enrolledStudentProfile
        ? {
            id: app.enrolledStudentProfile.id,
            rollNumber: app.enrolledStudentProfile.rollNumber,
            registrationNo: app.enrolledStudentProfile.registrationNo,
            user: {
              id: app.enrolledStudentProfile.user.id,
              email: app.enrolledStudentProfile.user.email,
              fullName: app.enrolledStudentProfile.user.fullName,
            },
          }
        : null,
      enrolledAt: app.enrolledAt ? app.enrolledAt.toISOString() : null,
      createdAt: app.createdAt instanceof Date ? app.createdAt.toISOString() : String(app.createdAt),
      updatedAt: app.updatedAt instanceof Date ? app.updatedAt.toISOString() : String(app.updatedAt),
    };
  }
}

export const admissionsService = new AdmissionsService();
