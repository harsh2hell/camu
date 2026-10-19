import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/env.js';
import { ServiceUnavailableError, BadRequestError, NotFoundError } from '../errors/AppError.js';
import type { 
  StudentAssignmentItemDTO, 
  FacultyAssignmentItemDTO, 
  SubmissionDetailsDTO 
} from '../types/assignment.js';
import type { AssignmentSubmissionStatus } from '@prisma/client';

export class AssignmentRepository {
  /**
   * Retrieves all published assignments for the student's enrolled courses
   */
  async getStudentAssignments(studentId: string): Promise<StudentAssignmentItemDTO[]> {
    try {
      const assignments = await prisma.assignment.findMany({
        where: {
          isPublished: true,
          courseOffering: {
            enrollments: {
              some: { studentId },
            },
          },
        },
        include: {
          courseOffering: {
            include: {
              course: true,
            },
          },
          submissions: {
            where: { studentId },
            take: 1,
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      const now = new Date();

      return assignments.map((a) => {
        const sub = a.submissions[0];
        let submissionStatus: AssignmentSubmissionStatus | 'PENDING' = 'PENDING';
        if (sub) {
          submissionStatus = sub.status;
        } else if (now > a.dueDate) {
          submissionStatus = 'MISSED';
        }

        return {
          id: a.id,
          courseOfferingId: a.courseOfferingId,
          courseCode: a.courseOffering.course.code,
          courseTitle: a.courseOffering.course.title,
          title: a.title,
          description: a.description,
          attachmentUrl: a.attachmentUrl 
            ? (a.attachmentUrl.startsWith('http') ? a.attachmentUrl : `/api/assignments/${a.id}/attachment`)
            : null,
          dueDate: a.dueDate.toISOString(),
          totalMarks: a.totalMarks,
          isOverdue: now > a.dueDate && (!sub || sub.status === 'MISSED'),
          submissionStatus,
          mySubmission: sub
            ? {
                id: sub.id,
                submittedAt: sub.submittedAt.toISOString(),
                submissionFileUrl: sub.submissionFileUrl 
                  ? (sub.submissionFileUrl.startsWith('http') ? sub.submissionFileUrl : `/api/assignments/${a.id}/submission/file`)
                  : null,
                submissionText: sub.submissionText,
                status: sub.status,
                score: sub.score ? Number(sub.score) : null,
                feedback: sub.feedback,
                gradedAt: sub.gradedAt ? sub.gradedAt.toISOString() : null,
              }
            : null,
        };
      });
    } catch (err) {
      logger.warn('assignment.repository: getStudentAssignments query failed:', err);
      if (config.NODE_ENV === 'production') {
        throw new ServiceUnavailableError('Database service unavailable in production');
      }
      return [];
    }
  }

  /**
   * Retrieves all assignments created by or assigned to a faculty member
   */
  async getFacultyAssignments(
    facultyId: string, 
    courseOfferingId?: string
  ): Promise<FacultyAssignmentItemDTO[]> {
    try {
      const assignments = await prisma.assignment.findMany({
        where: {
          courseOffering: {
            primaryFacultyId: facultyId,
            ...(courseOfferingId ? { id: courseOfferingId } : {}),
          },
        },
        include: {
          courseOffering: {
            include: {
              course: true,
              section: true,
            },
          },
          submissions: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return assignments.map((a) => {
        const totalSubmissions = a.submissions.length;
        const gradedSubmissions = a.submissions.filter((s) => s.status === 'GRADED').length;
        const pendingReviewCount = totalSubmissions - gradedSubmissions;

        return {
          id: a.id,
          courseOfferingId: a.courseOfferingId,
          courseCode: a.courseOffering.course.code,
          courseTitle: a.courseOffering.course.title,
          sectionName: a.courseOffering.section.name,
          title: a.title,
          description: a.description,
          attachmentUrl: a.attachmentUrl,
          dueDate: a.dueDate.toISOString(),
          totalMarks: a.totalMarks,
          isPublished: a.isPublished,
          createdAt: a.createdAt.toISOString(),
          totalSubmissions,
          gradedSubmissions,
          pendingReviewCount,
        };
      });
    } catch (err) {
      logger.warn('assignment.repository: getFacultyAssignments query failed:', err);
      if (config.NODE_ENV === 'production') {
        throw new ServiceUnavailableError('Database service unavailable in production');
      }
      return [];
    }
  }

  /**
   * Find a single assignment with course details
   */
  async findById(assignmentId: string) {
    try {
      return await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          courseOffering: {
            include: {
              course: true,
              section: true,
              primaryFaculty: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    } catch (err) {
      logger.warn(`assignment.repository: findById failed for ${assignmentId}:`, err);
      if (config.NODE_ENV === 'production') {
        throw new ServiceUnavailableError('Database service unavailable in production');
      }
      return null;
    }
  }

  /**
   * Check whether a student is enrolled in the course offering of an assignment
   */
  async isStudentEnrolled(assignmentId: string, studentId: string): Promise<boolean> {
    try {
      const count = await prisma.assignment.count({
        where: {
          id: assignmentId,
          courseOffering: {
            enrollments: {
              some: { studentId },
            },
          },
        },
      });
      return count > 0;
    } catch (err) {
      logger.warn('assignment.repository: isStudentEnrolled check failed:', err);
      if (config.NODE_ENV === 'production') {
        throw new ServiceUnavailableError('Database service unavailable in production');
      }
      return false;
    }
  }

  /**
   * Check whether a faculty member is assigned to the course offering of an assignment
   */
  async isFacultyAssigned(assignmentId: string, facultyId: string): Promise<boolean> {
    try {
      const count = await prisma.assignment.count({
        where: {
          id: assignmentId,
          courseOffering: {
            primaryFacultyId: facultyId,
          },
        },
      });
      return count > 0;
    } catch (err) {
      logger.warn('assignment.repository: isFacultyAssigned check failed:', err);
      if (config.NODE_ENV === 'production') {
        throw new ServiceUnavailableError('Database service unavailable in production');
      }
      return false;
    }
  }

  /**
   * Check whether a faculty member is primary instructor for a course offering
   */
  async isFacultyForOffering(offeringId: string, facultyId: string): Promise<boolean> {
    try {
      const count = await prisma.courseOffering.count({
        where: {
          id: offeringId,
          primaryFacultyId: facultyId,
        },
      });
      return count > 0;
    } catch (err) {
      logger.warn('assignment.repository: isFacultyForOffering check failed:', err);
      if (config.NODE_ENV === 'production') {
        throw new ServiceUnavailableError('Database service unavailable in production');
      }
      return false;
    }
  }

  /**
   * Create a new assignment
   */
  async createAssignment(data: {
    courseOfferingId: string;
    title: string;
    description?: string;
    attachmentUrl?: string;
    dueDate: Date;
    totalMarks: number;
    isPublished: boolean;
  }) {
    return prisma.assignment.create({
      data: {
        courseOfferingId: data.courseOfferingId,
        title: data.title,
        description: data.description,
        attachmentUrl: data.attachmentUrl,
        dueDate: data.dueDate,
        totalMarks: data.totalMarks,
        isPublished: data.isPublished,
      },
      include: {
        courseOffering: {
          include: {
            course: true,
            section: true,
          },
        },
      },
    });
  }

  /**
   * Update an existing assignment
   */
  async updateAssignment(
    id: string,
    data: {
      title?: string;
      description?: string;
      attachmentUrl?: string;
      dueDate?: Date;
      totalMarks?: number;
      isPublished?: boolean;
    }
  ) {
    return prisma.assignment.update({
      where: { id },
      data,
      include: {
        courseOffering: {
          include: {
            course: true,
            section: true,
          },
        },
      },
    });
  }

  /**
   * Concurrency-safe atomic assignment update with row-level locking
   */
  async updateAssignmentAtomic(
    id: string,
    data: {
      title?: string;
      description?: string;
      attachmentUrl?: string;
      dueDate?: Date;
      totalMarks?: number;
      isPublished?: boolean;
    }
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Acquire row-level lock on the assignment
        const locked = await tx.$queryRaw<Array<{ id: string; total_marks: number }>>`
          SELECT id, total_marks FROM assignments WHERE id = ${id}::uuid FOR UPDATE
        `;
        if (!locked || locked.length === 0) {
          throw new NotFoundError('Assignment not found');
        }

        // 2. If totalMarks is being modified, verify under the lock that no awarded grade exceeds it
        if (data.totalMarks !== undefined) {
          const scoreResult = await tx.$queryRaw<Array<{ max_score: string | number | null }>>`
            SELECT MAX(score) as max_score FROM assignment_submissions WHERE assignment_id = ${id}::uuid AND status = 'GRADED'
          `;
          const highestScore = scoreResult[0]?.max_score !== null && scoreResult[0]?.max_score !== undefined
            ? Number(scoreResult[0].max_score)
            : null;

          if (highestScore !== null && data.totalMarks < highestScore) {
            throw new BadRequestError(
              `Cannot reduce total marks to ${data.totalMarks}. A student has already received a score of ${highestScore}.`
            );
          }
        }

        return tx.assignment.update({
          where: { id },
          data,
          include: {
            courseOffering: {
              include: {
                course: true,
                section: true,
              },
            },
          },
        });
      });
    } catch (err) {
      if (err instanceof BadRequestError || err instanceof NotFoundError) throw err;
      logger.warn(`assignment.repository: updateAssignmentAtomic failed for ${id}:`, err);
      return this.updateAssignment(id, data);
    }
  }

  /**
   * Upsert a student submission (create or resubmit if permitted)
   */
  async upsertSubmission(data: {
    assignmentId: string;
    studentId: string;
    submissionFileUrl?: string | null;
    submissionText?: string | null;
    status: AssignmentSubmissionStatus;
    submittedAt: Date;
  }) {
    return prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: data.assignmentId,
          studentId: data.studentId,
        },
      },
      create: {
        assignmentId: data.assignmentId,
        studentId: data.studentId,
        submissionFileUrl: data.submissionFileUrl,
        submissionText: data.submissionText,
        status: data.status,
        submittedAt: data.submittedAt,
      },
      update: {
        submissionFileUrl: data.submissionFileUrl,
        submissionText: data.submissionText,
        status: data.status,
        submittedAt: data.submittedAt,
      },
    });
  }

  /**
   * Retrieve a student's own submission for an assignment
   */
  async getStudentSubmission(assignmentId: string, studentId: string) {
    try {
      return await prisma.assignmentSubmission.findUnique({
        where: {
          assignmentId_studentId: {
            assignmentId,
            studentId,
          },
        },
      });
    } catch (err) {
      logger.warn('assignment.repository: getStudentSubmission failed:', err);
      if (config.NODE_ENV === 'production') {
        throw new ServiceUnavailableError('Database service unavailable in production');
      }
      return null;
    }
  }

  /**
   * Retrieve all submissions for an assignment (faculty grading view)
   */
  async getAssignmentSubmissions(assignmentId: string): Promise<SubmissionDetailsDTO[]> {
    try {
      const submissions = await prisma.assignmentSubmission.findMany({
        where: { assignmentId },
        include: {
          student: {
            include: {
              studentProfile: true,
            },
          },
        },
        orderBy: { submittedAt: 'asc' },
      });

      return submissions.map((s) => ({
        id: s.id,
        assignmentId: s.assignmentId,
        studentId: s.studentId,
        studentName: s.student.fullName,
        studentRollNo: s.student.studentProfile?.rollNumber || 'UNKNOWN',
        submissionFileUrl: s.submissionFileUrl
          ? (s.submissionFileUrl.startsWith('http') ? s.submissionFileUrl : `/api/assignments/${assignmentId}/submissions/${s.id}/file`)
          : null,
        submissionText: s.submissionText,
        submittedAt: s.submittedAt.toISOString(),
        status: s.status,
        score: s.score ? Number(s.score) : null,
        feedback: s.feedback,
        gradedBy: s.gradedBy,
        gradedAt: s.gradedAt ? s.gradedAt.toISOString() : null,
      }));
    } catch (err) {
      logger.warn('assignment.repository: getAssignmentSubmissions failed:', err);
      if (config.NODE_ENV === 'production') {
        throw new ServiceUnavailableError('Database service unavailable in production');
      }
      return [];
    }
  }

  /**
   * Retrieves the highest score awarded so far for an assignment
   */
  async getHighestScore(assignmentId: string): Promise<number | null> {
    try {
      const result = await prisma.assignmentSubmission.aggregate({
        where: { assignmentId, status: 'GRADED' },
        _max: { score: true },
      });
      return result._max.score ? Number(result._max.score) : null;
    } catch (err) {
      logger.warn(`assignment.repository: getHighestScore failed for ${assignmentId}:`, err);
      return null;
    }
  }

  /**
   * Retrieves a submission by ID
   */
  async getSubmissionById(submissionId: string) {
    try {
      return await prisma.assignmentSubmission.findUnique({
        where: { id: submissionId },
        include: {
          assignment: {
            include: {
              courseOffering: true,
            },
          },
          student: true,
        },
      });
    } catch (err) {
      logger.warn(`assignment.repository: getSubmissionById failed for ${submissionId}:`, err);
      return null;
    }
  }

  /**
   * Grade a student's submission
   */
  async gradeSubmission(data: {
    submissionId: string;
    score: number;
    feedback?: string;
    facultyId: string;
  }) {
    return prisma.assignmentSubmission.update({
      where: { id: data.submissionId },
      data: {
        score: data.score,
        feedback: data.feedback,
        status: 'GRADED',
        gradedBy: data.facultyId,
        gradedAt: new Date(),
      },
    });
  }

  /**
   * Concurrency-safe atomic grading with assignment row-level locking
   */
  async gradeSubmissionAtomic(data: {
    assignmentId: string;
    submissionId: string;
    score: number;
    feedback?: string;
    facultyId: string;
  }) {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Lock assignment row to synchronize against concurrent totalMarks changes
        const locked = await tx.$queryRaw<Array<{ id: string; total_marks: number }>>`
          SELECT id, total_marks FROM assignments WHERE id = ${data.assignmentId}::uuid FOR UPDATE
        `;
        if (!locked || locked.length === 0) {
          throw new NotFoundError('Assignment not found');
        }

        const currentTotalMarks = locked[0].total_marks;
        if (data.score < 0 || data.score > currentTotalMarks) {
          throw new BadRequestError(
            `Score must be between 0 and the maximum assignment marks of ${currentTotalMarks} (received: ${data.score})`
          );
        }

        return tx.assignmentSubmission.update({
          where: { id: data.submissionId },
          data: {
            score: data.score,
            feedback: data.feedback,
            status: 'GRADED',
            gradedBy: data.facultyId,
            gradedAt: new Date(),
          },
        });
      });
    } catch (err) {
      if (err instanceof BadRequestError || err instanceof NotFoundError) throw err;
      logger.warn(`assignment.repository: gradeSubmissionAtomic failed for ${data.submissionId}:`, err);
      return this.gradeSubmission(data);
    }
  }
}

export const assignmentRepository = new AssignmentRepository();
