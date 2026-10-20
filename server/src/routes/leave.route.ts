import { Router } from 'express';
import { leaveController } from '../controllers/leave.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import {
  createLeaveApplicationSchema,
  withdrawApplicationSchema,
  resubmitApplicationSchema,
  decideApplicationSchema,
  applicationIdParamSchema,
  queryApplicationsSchema,
} from '../types/leave.js';

export const leaveRouter: Router = Router();

// ==========================================
// Student Application Endpoints
// ==========================================

// Create new Leave or OD application
leaveRouter.post(
  '/applications',
  requireAuth,
  requireRole('STUDENT'),
  validate({ body: createLeaveApplicationSchema }),
  (req, res, next) => leaveController.createApplication(req, res, next)
);

// List student's own applications
leaveRouter.get(
  '/applications',
  requireAuth,
  requireRole('STUDENT'),
  validate({ query: queryApplicationsSchema }),
  (req, res, next) => leaveController.getStudentApplications(req, res, next)
);

// View single application details (Student, Faculty approver, HOD, Admin)
leaveRouter.get(
  '/applications/:id',
  requireAuth,
  validate({ params: applicationIdParamSchema }),
  (req, res, next) => leaveController.getApplicationDetails(req, res, next)
);

// Student withdraws their pending application
leaveRouter.post(
  '/applications/:id/withdraw',
  requireAuth,
  requireRole('STUDENT'),
  validate({ params: applicationIdParamSchema, body: withdrawApplicationSchema }),
  (req, res, next) => leaveController.withdrawApplication(req, res, next)
);

// Student resubmits an application in NEEDS_CORRECTION
leaveRouter.patch(
  '/applications/:id/resubmit',
  requireAuth,
  requireRole('STUDENT'),
  validate({ params: applicationIdParamSchema, body: resubmitApplicationSchema }),
  (req, res, next) => leaveController.resubmitApplication(req, res, next)
);

// Secure private document download (enforces ownership and approver scope)
leaveRouter.get(
  '/applications/:id/document',
  requireAuth,
  validate({ params: applicationIdParamSchema }),
  (req, res, next) => leaveController.downloadSupportingDocument(req, res, next)
);

// View application audit trail
leaveRouter.get(
  '/applications/:id/audit-trail',
  requireAuth,
  validate({ params: applicationIdParamSchema }),
  (req, res, next) => leaveController.getApplicationAuditTrail(req, res, next)
);

// ==========================================
// Faculty / Approver Endpoints
// ==========================================

// List pending applications awaiting review
leaveRouter.get(
  '/approvals/pending',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  validate({ query: queryApplicationsSchema }),
  (req, res, next) => leaveController.getPendingApprovals(req, res, next)
);

// List decision history
leaveRouter.get(
  '/approvals/history',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  validate({ query: queryApplicationsSchema }),
  (req, res, next) => leaveController.getApproverHistory(req, res, next)
);

// Approver decides an application (APPROVE, REJECT, REQUEST_CORRECTION)
leaveRouter.post(
  '/approvals/:id/decide',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  validate({ params: applicationIdParamSchema, body: decideApplicationSchema }),
  (req, res, next) => leaveController.decideApplication(req, res, next)
);
