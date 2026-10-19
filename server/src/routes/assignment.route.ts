import { Router } from 'express';
import { assignmentController } from '../controllers/assignment.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
  assignmentIdParamSchema,
  gradeParamSchema,
  fileUploadSchema,
} from '../types/assignment.js';

export const assignmentRouter: Router = Router();

// ==========================================
// Student-Facing Endpoints
// ==========================================

// List assignments for enrolled courses
assignmentRouter.get(
  '/student',
  requireAuth,
  requireRole('STUDENT'),
  (req, res, next) => assignmentController.getStudentAssignments(req, res, next)
);

// Submit solution (file and/or text)
assignmentRouter.post(
  '/:id/submit',
  requireAuth,
  requireRole('STUDENT'),
  validate({ params: assignmentIdParamSchema, body: submitAssignmentSchema }),
  (req, res, next) => assignmentController.submitAssignment(req, res, next)
);

// Retrieve student's own submission
assignmentRouter.get(
  '/:id/submission',
  requireAuth,
  requireRole('STUDENT'),
  validate({ params: assignmentIdParamSchema }),
  (req, res, next) => assignmentController.getStudentSubmission(req, res, next)
);

// Download student's own submission file securely
assignmentRouter.get(
  '/:id/submission/file',
  requireAuth,
  requireRole('STUDENT'),
  validate({ params: assignmentIdParamSchema }),
  (req, res, next) => assignmentController.downloadStudentSubmissionFile(req, res, next)
);

// ==========================================
// Faculty & LMS Management Endpoints
// ==========================================

// List assignments for faculty's assigned courses
assignmentRouter.get(
  '/faculty',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  (req, res, next) => assignmentController.getFacultyAssignments(req, res, next)
);

// Create and publish a new assignment
assignmentRouter.post(
  '/',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  validate({ body: createAssignmentSchema }),
  (req, res, next) => assignmentController.createAssignment(req, res, next)
);

// Update an assignment
assignmentRouter.put(
  '/:id',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  validate({ params: assignmentIdParamSchema, body: updateAssignmentSchema }),
  (req, res, next) => assignmentController.updateAssignment(req, res, next)
);

// View submissions for an assignment
assignmentRouter.get(
  '/:id/submissions',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  validate({ params: assignmentIdParamSchema }),
  (req, res, next) => assignmentController.getAssignmentSubmissions(req, res, next)
);

// Grade a student submission
assignmentRouter.post(
  '/:id/submissions/:submissionId/grade',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  validate({ params: gradeParamSchema, body: gradeSubmissionSchema }),
  (req, res, next) => assignmentController.gradeSubmission(req, res, next)
);

// Download a student's submission file as faculty
assignmentRouter.get(
  '/:id/submissions/:submissionId/file',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  validate({ params: gradeParamSchema }),
  (req, res, next) => assignmentController.downloadFacultySubmissionFile(req, res, next)
);

// ==========================================
// Universal / Shared Endpoints
// ==========================================

// Safe upload foundation for assignment briefs and student submissions
assignmentRouter.post(
  '/upload',
  requireAuth,
  validate({ body: fileUploadSchema }),
  (req, res, next) => assignmentController.uploadFile(req, res, next)
);

// Download assignment attachment / brief (accessible by enrolled students and course faculty)
assignmentRouter.get(
  '/:id/attachment',
  requireAuth,
  validate({ params: assignmentIdParamSchema }),
  (req, res, next) => assignmentController.downloadAssignmentAttachment(req, res, next)
);

// Retrieve assignment details
assignmentRouter.get(
  '/:id',
  requireAuth,
  validate({ params: assignmentIdParamSchema }),
  (req, res, next) => assignmentController.getAssignmentDetails(req, res, next)
);
