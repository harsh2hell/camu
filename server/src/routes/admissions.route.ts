import { Router } from 'express';
import { admissionsController } from '../controllers/admissions.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import {
  createApplicationSchema,
  updateApplicationSchema,
  updateStatusSchema,
  addReviewNoteSchema,
  enrollApplicantSchema,
  queryApplicationsSchema,
} from '../types/admissions.js';

export const admissionsRouter: Router = Router();

// 1. Query & List Applications
admissionsRouter.get(
  '/applications',
  requireAuth,
  requireRole('ADMISSIONS_OFFICER', 'REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ query: queryApplicationsSchema }),
  (req, res, next) => admissionsController.getApplications(req, res, next)
);

// 2. Create Application
admissionsRouter.post(
  '/applications',
  requireAuth,
  requireRole('ADMISSIONS_OFFICER', 'REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ body: createApplicationSchema }),
  (req, res, next) => admissionsController.createApplication(req, res, next)
);

// 3. Get Application Details
admissionsRouter.get(
  '/applications/:id',
  requireAuth,
  requireRole('ADMISSIONS_OFFICER', 'REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  (req, res, next) => admissionsController.getApplicationById(req, res, next)
);

// 4. Update Application
admissionsRouter.patch(
  '/applications/:id',
  requireAuth,
  requireRole('ADMISSIONS_OFFICER', 'REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ body: updateApplicationSchema }),
  (req, res, next) => admissionsController.updateApplication(req, res, next)
);

// 5. Add Review Note
admissionsRouter.post(
  '/applications/:id/notes',
  requireAuth,
  requireRole('ADMISSIONS_OFFICER', 'REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ body: addReviewNoteSchema }),
  (req, res, next) => admissionsController.addReviewNote(req, res, next)
);

// 6. Update Status & Decisions (supports both PATCH and POST)
admissionsRouter.patch(
  '/applications/:id/status',
  requireAuth,
  requireRole('ADMISSIONS_OFFICER', 'REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ body: updateStatusSchema }),
  (req, res, next) => admissionsController.updateStatus(req, res, next)
);
admissionsRouter.post(
  '/applications/:id/status',
  requireAuth,
  requireRole('ADMISSIONS_OFFICER', 'REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ body: updateStatusSchema }),
  (req, res, next) => admissionsController.updateStatus(req, res, next)
);

// 7. Get Audit Logs
admissionsRouter.get(
  '/applications/:id/audit-logs',
  requireAuth,
  requireRole('ADMISSIONS_OFFICER', 'REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  (req, res, next) => admissionsController.getAuditLogs(req, res, next)
);

// 8. Convert to Enrolled University Student
admissionsRouter.post(
  '/applications/:id/enroll',
  requireAuth,
  requireRole('ADMISSIONS_OFFICER', 'REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ body: enrollApplicantSchema }),
  (req, res, next) => admissionsController.enrollApplicant(req, res, next)
);
