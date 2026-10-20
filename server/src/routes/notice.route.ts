import { Router } from 'express';
import { noticeController } from '../controllers/notice.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import {
  createNoticeSchema,
  updateNoticeSchema,
  publishNoticeSchema,
  archiveNoticeSchema,
  cancelNoticeSchema,
  noticeIdParamSchema,
  noticeQuerySchema,
} from '../types/notice.js';

export const noticeRouter: Router = Router();

// ==========================================
// Recipient Endpoints
// ==========================================

// Active Notices Feed (Audience-Scoped for Students & Faculty)
noticeRouter.get(
  '/',
  requireAuth,
  validate({ query: noticeQuerySchema }),
  (req, res, next) => noticeController.getRecipientFeed(req, res, next)
);

// Management Feed for Staff (Drafts, Scheduled, Published, Archived)
noticeRouter.get(
  '/manage',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN', 'EXAM_CONTROLLER'),
  validate({ query: noticeQuerySchema }),
  (req, res, next) => noticeController.getManagementFeed(req, res, next)
);

// Audience Preview Endpoints (Support GET and POST with alias)
noticeRouter.get(
  ['/audience-preview', '/preview-audience'],
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN', 'EXAM_CONTROLLER'),
  (req, res, next) => noticeController.getAudiencePreview(req, res, next)
);

noticeRouter.post(
  ['/audience-preview', '/preview-audience'],
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN', 'EXAM_CONTROLLER'),
  (req, res, next) => noticeController.getAudiencePreview(req, res, next)
);

// Process Due Scheduled Notices (Triggerable by Cron or Admin)
noticeRouter.post(
  '/process-scheduled',
  requireAuth,
  requireRole('REGISTRAR_ADMIN', 'DEAN'),
  (req, res, next) => noticeController.processScheduled(req, res, next)
);

// Create Notice (Draft, Scheduled, or Published)
noticeRouter.post(
  '/',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN', 'EXAM_CONTROLLER'),
  validate({ body: createNoticeSchema }),
  (req, res, next) => noticeController.createNotice(req, res, next)
);

// Single Notice Detail
noticeRouter.get(
  '/:id',
  requireAuth,
  validate({ params: noticeIdParamSchema }),
  (req, res, next) => noticeController.getNoticeDetails(req, res, next)
);

// Edit Notice
noticeRouter.put(
  '/:id',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN', 'EXAM_CONTROLLER'),
  validate({ params: noticeIdParamSchema, body: updateNoticeSchema }),
  (req, res, next) => noticeController.updateNotice(req, res, next)
);

// Publish or Schedule Notice
noticeRouter.post(
  '/:id/publish',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN', 'EXAM_CONTROLLER'),
  validate({ params: noticeIdParamSchema, body: publishNoticeSchema }),
  (req, res, next) => noticeController.publishNotice(req, res, next)
);

// Archive Notice
noticeRouter.post(
  '/:id/archive',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN', 'EXAM_CONTROLLER'),
  validate({ params: noticeIdParamSchema, body: archiveNoticeSchema }),
  (req, res, next) => noticeController.archiveNotice(req, res, next)
);

// Cancel Notice
noticeRouter.post(
  '/:id/cancel',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN', 'EXAM_CONTROLLER'),
  validate({ params: noticeIdParamSchema, body: cancelNoticeSchema }),
  (req, res, next) => noticeController.cancelNotice(req, res, next)
);

// Secure Private Attachment Download
noticeRouter.get(
  '/:id/attachment',
  requireAuth,
  validate({ params: noticeIdParamSchema }),
  (req, res, next) => noticeController.downloadAttachment(req, res, next)
);

// Immutable Notice Audit Trail
noticeRouter.get(
  '/:id/audit-trail',
  requireAuth,
  validate({ params: noticeIdParamSchema }),
  (req, res, next) => noticeController.getNoticeAuditTrail(req, res, next)
);
