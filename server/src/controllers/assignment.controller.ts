import type { Request, Response, NextFunction } from 'express';
import { assignmentService } from '../services/assignment.service.js';
import { UnauthorizedError } from '../errors/AppError.js';
import { FileStorage } from '../lib/fileStorage.js';

export class AssignmentController {
  /**
   * GET /api/assignments/student
   */
  async getStudentAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const assignments = await assignmentService.getStudentAssignments(req.user.id);
      res.status(200).json({
        status: 'success',
        count: assignments.length,
        data: assignments,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/assignments/:id
   */
  async getAssignmentDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const assignmentId = String(req.params.id);
      const assignment = await assignmentService.getAssignmentDetails(
        assignmentId,
        req.user.id,
        req.user.role
      );
      res.status(200).json({
        status: 'success',
        data: assignment,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/assignments/:id/submit
   */
  async submitAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const assignmentId = String(req.params.id);
      const result = await assignmentService.submitAssignment(
        assignmentId,
        req.user.id,
        req.body
      );
      res.status(200).json({
        status: 'success',
        message: result.message,
        isLate: result.isLate,
        data: result.submission,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/assignments/:id/submission
   */
  async getStudentSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const assignmentId = String(req.params.id);
      const submission = await assignmentService.getStudentSubmission(
        assignmentId,
        req.user.id
      );
      res.status(200).json({
        status: 'success',
        data: submission,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/assignments/faculty
   */
  async getFacultyAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const offeringId = req.query.courseOfferingId as string | undefined;
      const assignments = await assignmentService.getFacultyAssignments(req.user.id, offeringId);
      res.status(200).json({
        status: 'success',
        count: assignments.length,
        data: assignments,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/assignments
   */
  async createAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const assignment = await assignmentService.createAssignment(
        req.user.id,
        req.body,
        req.user.role
      );
      res.status(201).json({
        status: 'success',
        message: 'Assignment successfully created and published.',
        data: assignment,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/assignments/:id
   */
  async updateAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const assignmentId = String(req.params.id);
      const assignment = await assignmentService.updateAssignment(
        assignmentId,
        req.user.id,
        req.body,
        req.user.role
      );
      res.status(200).json({
        status: 'success',
        message: 'Assignment successfully updated.',
        data: assignment,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/assignments/:id/submissions
   */
  async getAssignmentSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const assignmentId = String(req.params.id);
      const submissions = await assignmentService.getAssignmentSubmissions(
        assignmentId,
        req.user.id,
        req.user.role
      );
      res.status(200).json({
        status: 'success',
        count: submissions.length,
        data: submissions,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/assignments/:id/submissions/:submissionId/grade
   */
  async gradeSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const assignmentId = String(req.params.id);
      const submissionId = String(req.params.submissionId);
      const graded = await assignmentService.gradeSubmission(
        assignmentId,
        submissionId,
        req.user.id,
        req.body,
        req.user.role
      );
      res.status(200).json({
        status: 'success',
        message: 'Submission successfully evaluated and graded.',
        data: graded,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/assignments/upload
   */
  async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const uploadResult = await assignmentService.saveUploadedFile(
        req.body.fileName,
        req.body.fileData,
        req.user.id
      );
      res.status(200).json({
        status: 'success',
        message: 'File successfully uploaded and stored.',
        data: uploadResult,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/assignments/:id/submission/file
   * Secure download: student retrieving their own submission file
   */
  async downloadStudentSubmissionFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const assignmentId = String(req.params.id);
      const fileInfo = await assignmentService.getStudentSubmissionFile(assignmentId, req.user.id);

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.sendFile(fileInfo.filePath);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/assignments/:id/submissions/:submissionId/file
   * Secure download: faculty reviewing student submission file
   */
  async downloadFacultySubmissionFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const assignmentId = String(req.params.id);
      const submissionId = String(req.params.submissionId);
      const fileInfo = await assignmentService.getFacultySubmissionFile(
        assignmentId,
        submissionId,
        req.user.id,
        req.user.role
      );

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.sendFile(fileInfo.filePath);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/assignments/:id/attachment
   * Secure download: assignment brief/handout for enrolled students and instructors
   */
  async downloadAssignmentAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const assignmentId = String(req.params.id);
      const fileInfo = await assignmentService.getAssignmentAttachmentFile(
        assignmentId,
        req.user.id,
        req.user.role
      );

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.sendFile(fileInfo.filePath);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/assignments/cleanup
   * Registrar Admin: trigger conservative file lifecycle & orphan cleanup
   */
  async cleanupOrphanFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const gracePeriodHours = req.body?.gracePeriodHours !== undefined ? Number(req.body.gracePeriodHours) : undefined;
      const dryRun = req.body?.dryRun !== undefined ? Boolean(req.body.dryRun) : undefined;

      const result = await FileStorage.cleanupOrphanFiles({
        gracePeriodHours,
        dryRun,
      });

      res.status(200).json({
        status: 'success',
        message: 'File lifecycle cleanup completed successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const assignmentController = new AssignmentController();
