import fs from 'node:fs';
import path from 'node:path';
import { assignmentRepository } from '../repositories/assignment.repository.js';
import { 
  BadRequestError, 
  ForbiddenError, 
  NotFoundError 
} from '../errors/AppError.js';
import { logger } from '../lib/logger.js';
import { FileStorage } from '../lib/fileStorage.js';
import { prisma } from '../lib/prisma.js';
import { notificationService } from './notification.service.js';
import type { 
  createAssignmentSchema, 
  updateAssignmentSchema, 
  submitAssignmentSchema, 
  gradeSubmissionSchema 
} from '../types/assignment.js';
import type { z } from 'zod';
import type { UserRole } from '@prisma/client';

export class AssignmentService {
  /**
   * Get all published assignments for a student
   */
  async getStudentAssignments(studentId: string) {
    return assignmentRepository.getStudentAssignments(studentId);
  }

  /**
   * Get assignment details with role-based enrollment validation
   */
  async getAssignmentDetails(assignmentId: string, userId: string, role: UserRole) {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    if (role === 'STUDENT') {
      if (!assignment.isPublished) {
        throw new NotFoundError('Assignment not found');
      }

      const isEnrolled = await assignmentRepository.isStudentEnrolled(assignmentId, userId);
      if (!isEnrolled) {
        throw new ForbiddenError('You are not enrolled in the course offering for this assignment');
      }

      const submission = await assignmentRepository.getStudentSubmission(assignmentId, userId);
      return {
        ...assignment,
        attachmentUrl: assignment.attachmentUrl
          ? (assignment.attachmentUrl.startsWith('http') ? assignment.attachmentUrl : `/api/assignments/${assignment.id}/attachment`)
          : null,
        mySubmission: submission
          ? {
              ...submission,
              submissionFileUrl: submission.submissionFileUrl
                ? (submission.submissionFileUrl.startsWith('http') ? submission.submissionFileUrl : `/api/assignments/${assignment.id}/submission/file`)
                : null,
            }
          : null,
      };
    }

    // Faculty check
    const isAssigned = await assignmentRepository.isFacultyAssigned(assignmentId, userId);
    if (!isAssigned && role !== 'REGISTRAR_ADMIN') {
      throw new ForbiddenError('You are not authorized to view assignments for this course offering');
    }

    return {
      ...assignment,
      attachmentUrl: assignment.attachmentUrl
        ? (assignment.attachmentUrl.startsWith('http') ? assignment.attachmentUrl : `/api/assignments/${assignment.id}/attachment`)
        : null,
    };
  }

  /**
   * Submit an assignment for a student with file validation, ownership enforcement, and deadline checks
   */
  async submitAssignment(
    assignmentId: string, 
    studentId: string, 
    payload: z.infer<typeof submitAssignmentSchema>
  ) {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment || !assignment.isPublished) {
      throw new NotFoundError('Assignment not found or is currently unpublished');
    }

    const isEnrolled = await assignmentRepository.isStudentEnrolled(assignmentId, studentId);
    if (!isEnrolled) {
      throw new ForbiddenError('You are not enrolled in the course offering for this assignment');
    }

    // Check existing submission
    const existingSubmission = await assignmentRepository.getStudentSubmission(assignmentId, studentId);
    if (existingSubmission && existingSubmission.status === 'GRADED') {
      throw new BadRequestError('Assignment has already been graded. Resubmission is not permitted.');
    }

    let fileKeyToStore: string | null = null;
    let directUploadCreated: string | null = null;

    try {
      // 1. Direct file upload payload
      if (payload.fileData && payload.fileName) {
        const pureBase64 = payload.fileData.includes('base64,')
          ? payload.fileData.split('base64,')[1]
          : payload.fileData;

        const buffer = Buffer.from(pureBase64, 'base64');
        const { ext, sanitizedName } = FileStorage.validateFileBuffer(buffer, payload.fileName);

        const metadata = await FileStorage.saveSecureFile(
          buffer,
          ext,
          sanitizedName,
          studentId,
          FileStorage.getMimeType(sanitizedName)
        );
        fileKeyToStore = metadata.fileKey;
        directUploadCreated = metadata.fileKey;
      } else if (payload.submissionFileUrl && payload.submissionFileUrl.trim().length > 0) {
        // 2. Pre-uploaded file reference
        const rawUrl = payload.submissionFileUrl.trim();
        // If it refers to a local file key or /uploads/ or /api/assignments/
        const fileKey = path.basename(rawUrl);
        // Verify ownership: must belong to the submitting student
        await FileStorage.verifyUploadOwnership(fileKey, studentId);
        fileKeyToStore = fileKey;
      } else if (existingSubmission?.submissionFileUrl) {
        // Retain existing file if only updating text
        fileKeyToStore = existingSubmission.submissionFileUrl;
      }

      const now = new Date();
      const isLate = now.getTime() > new Date(assignment.dueDate).getTime();
      const status = isLate ? 'SUBMITTED_LATE' : 'SUBMITTED_ON_TIME';

      const submission = await assignmentRepository.upsertSubmission({
        assignmentId,
        studentId,
        submissionFileUrl: fileKeyToStore,
        submissionText: payload.submissionText?.trim() || null,
        status,
        submittedAt: now,
      });

      logger.info(`Assignment submission recorded: assignment=${assignmentId}, student=${studentId}, status=${status}`);

      return {
        submission: {
          ...submission,
          submissionFileUrl: submission.submissionFileUrl
            ? `/api/assignments/${assignmentId}/submission/file`
            : null,
        },
        isLate,
        message: isLate 
          ? 'Assignment submitted successfully (marked as Late).' 
          : 'Assignment submitted successfully on time.',
      };
    } catch (err) {
      // Cleanup direct file if DB operation failed
      if (directUploadCreated) {
        await FileStorage.deleteSecureFile(directUploadCreated);
      }
      throw err;
    }
  }

  /**
   * Retrieve a student's own submission
   */
  async getStudentSubmission(assignmentId: string, studentId: string) {
    const isEnrolled = await assignmentRepository.isStudentEnrolled(assignmentId, studentId);
    if (!isEnrolled) {
      throw new ForbiddenError('You are not enrolled in the course offering for this assignment');
    }

    const submission = await assignmentRepository.getStudentSubmission(assignmentId, studentId);
    if (!submission) {
      throw new NotFoundError('No submission found for this assignment');
    }

    return {
      ...submission,
      submissionFileUrl: submission.submissionFileUrl
        ? (submission.submissionFileUrl.startsWith('http') ? submission.submissionFileUrl : `/api/assignments/${assignmentId}/submission/file`)
        : null,
    };
  }

  /**
   * Faculty: List course assignments
   */
  async getFacultyAssignments(facultyId: string, courseOfferingId?: string) {
    return assignmentRepository.getFacultyAssignments(facultyId, courseOfferingId);
  }

  /**
   * Faculty: Create a new assignment with ownership checks
   */
  async createAssignment(
    facultyId: string, 
    payload: z.infer<typeof createAssignmentSchema>,
    role: UserRole
  ) {
    if (role !== 'REGISTRAR_ADMIN') {
      const isAssigned = await assignmentRepository.isFacultyForOffering(payload.courseOfferingId, facultyId);
      if (!isAssigned) {
        throw new ForbiddenError('You are not the designated faculty instructor for this course offering');
      }
    }

    let attachmentKey: string | undefined = undefined;

    // Handle direct attachment upload
    if (payload.attachmentData && payload.attachmentFileName) {
      const pureBase64 = payload.attachmentData.includes('base64,')
        ? payload.attachmentData.split('base64,')[1]
        : payload.attachmentData;
      const buffer = Buffer.from(pureBase64, 'base64');
      const { ext, sanitizedName } = FileStorage.validateFileBuffer(buffer, payload.attachmentFileName);
      const metadata = await FileStorage.saveSecureFile(buffer, ext, sanitizedName, facultyId);
      attachmentKey = metadata.fileKey;
    } else if (payload.attachmentUrl && payload.attachmentUrl.trim().length > 0) {
      const url = payload.attachmentUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const fileKey = path.basename(url);
        await FileStorage.verifyUploadOwnership(fileKey, facultyId);
        attachmentKey = fileKey;
      } else {
        attachmentKey = url;
      }
    }

    const assignment = await assignmentRepository.createAssignment({
      courseOfferingId: payload.courseOfferingId,
      title: payload.title.trim(),
      description: payload.description?.trim(),
      attachmentUrl: attachmentKey,
      dueDate: new Date(payload.dueDate),
      totalMarks: payload.totalMarks,
      isPublished: payload.isPublished,
    });

    logger.info(`New assignment created: id=${assignment.id}, offering=${payload.courseOfferingId}, published=${payload.isPublished}`);

    // Notification Integration: If published, notify enrolled students
    if (assignment.isPublished) {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseOfferingId: payload.courseOfferingId },
        select: { studentId: true },
      });
      const studentIds = enrollments.map((e) => e.studentId);
      if (studentIds.length > 0) {
        await notificationService.sendBatchNotifications(studentIds, {
          type: 'ASSIGNMENT',
          title: `New Assignment: ${assignment.title}`,
          message: `A new course assignment has been published. Due: ${new Date(assignment.dueDate).toLocaleDateString()}. Total Marks: ${assignment.totalMarks}.`,
          priority: 'MEDIUM',
          resourceType: 'ASSIGNMENT',
          resourceId: assignment.id,
          actionUrl: '/student-dashboard?tab=assignments',
          idempotencyKey: `ASSIGNMENT_PUB:${assignment.id}`,
        });
      }
    }

    return assignment;
  }

  /**
   * Faculty: Update assignment with concurrency-safe score boundary enforcement
   */
  async updateAssignment(
    assignmentId: string,
    facultyId: string,
    payload: z.infer<typeof updateAssignmentSchema>,
    role: UserRole
  ) {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    if (role !== 'REGISTRAR_ADMIN') {
      const isAssigned = await assignmentRepository.isFacultyAssigned(assignmentId, facultyId);
      if (!isAssigned) {
        throw new ForbiddenError('You are not authorized to modify assignments for this course offering');
      }
    }

    let attachmentKey = payload.attachmentUrl?.trim();
    if (attachmentKey && !attachmentKey.startsWith('http://') && !attachmentKey.startsWith('https://')) {
      const fileKey = path.basename(attachmentKey);
      await FileStorage.verifyUploadOwnership(fileKey, facultyId);
      attachmentKey = fileKey;
    }

    return assignmentRepository.updateAssignmentAtomic(assignmentId, {
      title: payload.title?.trim(),
      description: payload.description?.trim(),
      attachmentUrl: attachmentKey,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
      totalMarks: payload.totalMarks,
      isPublished: payload.isPublished,
    });
  }

  /**
   * Faculty: View submissions for an assignment
   */
  async getAssignmentSubmissions(assignmentId: string, facultyId: string, role: UserRole) {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    if (role !== 'REGISTRAR_ADMIN') {
      const isAssigned = await assignmentRepository.isFacultyAssigned(assignmentId, facultyId);
      if (!isAssigned) {
        throw new ForbiddenError('You are not authorized to view submissions for this course offering');
      }
    }

    return assignmentRepository.getAssignmentSubmissions(assignmentId);
  }

  /**
   * Faculty: Grade submission with concurrency-safe row-level locking
   */
  async gradeSubmission(
    assignmentId: string,
    submissionId: string,
    facultyId: string,
    payload: z.infer<typeof gradeSubmissionSchema>,
    role: UserRole
  ) {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    if (role !== 'REGISTRAR_ADMIN') {
      const isAssigned = await assignmentRepository.isFacultyAssigned(assignmentId, facultyId);
      if (!isAssigned) {
        throw new ForbiddenError('You are not authorized to grade submissions for this course offering');
      }
    }

    const gradedSubmission = await assignmentRepository.gradeSubmissionAtomic({
      assignmentId,
      submissionId,
      score: payload.score,
      feedback: payload.feedback?.trim(),
      facultyId,
    });

    logger.info(`Submission graded: submissionId=${submissionId}, score=${payload.score}, faculty=${facultyId}`);

    // Notification Integration: Notify student about graded assignment
    await notificationService.sendNotification({
      recipientId: gradedSubmission.studentId,
      type: 'ASSIGNMENT',
      title: `Assignment Graded: ${assignment.title}`,
      message: `Your submission for "${assignment.title}" has been graded: ${payload.score}/${assignment.totalMarks}.${payload.feedback ? ' Feedback: ' + payload.feedback : ''}`,
      priority: 'MEDIUM',
      resourceType: 'ASSIGNMENT',
      resourceId: assignment.id,
      actionUrl: '/student-dashboard?tab=assignments',
      idempotencyKey: `ASSIGNMENT_GRADED:${submissionId}:${payload.score}`,
    });

    return gradedSubmission;
  }

  /**
   * Save uploaded file with content validation and ownership recording
   */
  async saveUploadedFile(fileName: string, base64Data: string, userId: string) {
    const pureBase64 = base64Data.includes('base64,') 
      ? base64Data.split('base64,')[1] 
      : base64Data;

    const buffer = Buffer.from(pureBase64, 'base64');
    const { ext, sanitizedName } = FileStorage.validateFileBuffer(buffer, fileName);

    const metadata = await FileStorage.saveSecureFile(
      buffer,
      ext,
      sanitizedName,
      userId,
      FileStorage.getMimeType(sanitizedName)
    );

    return {
      fileUrl: `/uploads/${metadata.fileKey}`,
      fileKey: metadata.fileKey,
      originalName: metadata.originalName,
      sizeBytes: metadata.sizeBytes,
    };
  }

  /**
   * Secure download: Student retrieving their own submission file
   */
  async getStudentSubmissionFile(assignmentId: string, studentId: string) {
    const isEnrolled = await assignmentRepository.isStudentEnrolled(assignmentId, studentId);
    if (!isEnrolled) {
      throw new ForbiddenError('You are not enrolled in the course offering for this assignment');
    }

    const submission = await assignmentRepository.getStudentSubmission(assignmentId, studentId);
    if (!submission || !submission.submissionFileUrl) {
      throw new NotFoundError('No submission file found for this assignment');
    }

    const filePath = FileStorage.getSafeFilePath(submission.submissionFileUrl);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Submission file not found on server storage');
    }

    return {
      filePath,
      fileName: `submission_${path.basename(filePath)}`,
      mimeType: FileStorage.getMimeType(filePath),
    };
  }

  /**
   * Secure download: Faculty reviewing student submission file
   */
  async getFacultySubmissionFile(assignmentId: string, submissionId: string, facultyId: string, role: UserRole) {
    if (role !== 'REGISTRAR_ADMIN') {
      const isAssigned = await assignmentRepository.isFacultyAssigned(assignmentId, facultyId);
      if (!isAssigned) {
        throw new ForbiddenError('You are not authorized to access submissions for this course offering');
      }
    }

    const submission = await assignmentRepository.getSubmissionById(submissionId);
    if (!submission || submission.assignmentId !== assignmentId || !submission.submissionFileUrl) {
      throw new NotFoundError('Submission file not found');
    }

    const filePath = FileStorage.getSafeFilePath(submission.submissionFileUrl);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Submission file not found on server storage');
    }

    const studentRoll = submission.student.email.split('@')[0];
    return {
      filePath,
      fileName: `${studentRoll}_${path.basename(filePath)}`,
      mimeType: FileStorage.getMimeType(filePath),
    };
  }

  /**
   * Secure download: Assignment question brief / handout
   */
  async getAssignmentAttachmentFile(assignmentId: string, userId: string, role: UserRole) {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment || !assignment.attachmentUrl) {
      throw new NotFoundError('Assignment brief attachment not found');
    }

    if (role === 'STUDENT') {
      if (!assignment.isPublished) {
        throw new NotFoundError('Assignment not found');
      }
      const isEnrolled = await assignmentRepository.isStudentEnrolled(assignmentId, userId);
      if (!isEnrolled) {
        throw new ForbiddenError('You are not enrolled in the course offering for this assignment');
      }
    } else if (role !== 'REGISTRAR_ADMIN') {
      const isAssigned = await assignmentRepository.isFacultyAssigned(assignmentId, userId);
      if (!isAssigned) {
        throw new ForbiddenError('You are not authorized to access materials for this course offering');
      }
    }

    const filePath = FileStorage.getSafeFilePath(assignment.attachmentUrl);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Attachment file not found on server storage');
    }

    return {
      filePath,
      fileName: `brief_${path.basename(filePath)}`,
      mimeType: FileStorage.getMimeType(filePath),
    };
  }
}

export const assignmentService = new AssignmentService();
