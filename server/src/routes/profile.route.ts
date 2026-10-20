import { Router } from 'express';
import { profileController } from '../controllers/profile.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import { updateProfileSchema } from '../types/profile.js';

export const profileRouter: Router = Router();

// ==========================================
// Student Profile & Contact Self-Service
// ==========================================

// Get authenticated user's own profile
profileRouter.get('/me', requireAuth, (req, res, next) =>
  profileController.getMyProfile(req, res, next)
);

// Update permitted profile attributes (phone, emergency contact, blood group, address)
profileRouter.patch(
  '/me',
  requireAuth,
  requireRole('STUDENT'),
  validate({ body: updateProfileSchema }),
  (req, res, next) => profileController.updateMyProfile(req, res, next)
);

// ==========================================
// Authoritative Academic Records
// ==========================================

// Get own authoritative academic records & enrolled courses
profileRouter.get('/academic-records', requireAuth, (req, res, next) =>
  profileController.getMyAcademicRecords(req, res, next)
);

// Scoped academic records lookup by staff/mentor (supports both route patterns)
profileRouter.get('/academic-records/:studentId', requireAuth, (req, res, next) =>
  profileController.getStudentAcademicRecords(req, res, next)
);
profileRouter.get('/students/:studentId/academic-records', requireAuth, (req, res, next) =>
  profileController.getStudentAcademicRecords(req, res, next)
);

// ==========================================
// Faculty Mentorship & Scoped Staff Access
// ==========================================

// Faculty viewing assigned mentees
profileRouter.get(
  '/mentees',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN', 'EXAM_CONTROLLER'),
  (req, res, next) => profileController.getFacultyMentees(req, res, next)
);

// Scoped access to a student profile (subject to anti-IDOR checks)
profileRouter.get('/students/:studentId', requireAuth, (req, res, next) =>
  profileController.getStudentProfile(req, res, next)
);

// Audit history for student profile changes
profileRouter.get('/audit-trail', requireAuth, (req, res, next) =>
  profileController.getProfileAuditTrail(req, res, next)
);

profileRouter.get('/audit-trail/:studentId', requireAuth, (req, res, next) =>
  profileController.getProfileAuditTrail(req, res, next)
);
