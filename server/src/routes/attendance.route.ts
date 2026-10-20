import { Router } from 'express';
import { attendanceController } from '../controllers/attendance.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import {
  createAttendanceSessionSchema,
  recordAttendanceBatchSchema,
  qrCheckInSchema,
} from '../types/attendance.js';

export const attendanceRouter: Router = Router();

// 1. Student: Retrieve authenticated student's personalized attendance summary
attendanceRouter.get(
  '/my-summary',
  requireAuth,
  (req, res, next) => attendanceController.getMySummary(req, res, next)
);

// 2. Faculty / Admin: Retrieve enrolled student roster for roll call
attendanceRouter.get(
  '/roster',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  (req, res, next) => attendanceController.getRoster(req, res, next)
);

// 3. Faculty / Admin: Create an attendance session
attendanceRouter.post(
  '/sessions',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  validate({ body: createAttendanceSessionSchema }),
  (req, res, next) => attendanceController.createSession(req, res, next)
);

// 4. Faculty / Admin: Record attendance records for enrolled students in a session
attendanceRouter.post(
  '/sessions/:id/records',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  validate({ body: recordAttendanceBatchSchema }),
  (req, res, next) => attendanceController.recordBatch(req, res, next)
);

// 5. Faculty / Admin: Retrieve attendance defaulters report (< 75%)
attendanceRouter.get(
  '/defaulters',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  (req, res, next) => attendanceController.getDefaulters(req, res, next)
);

// 6. Faculty / Admin: Generate or rotate cryptographically signed QR token
attendanceRouter.post(
  '/sessions/:id/qr/generate',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  (req, res, next) => attendanceController.generateQrToken(req, res, next)
);

// 7. Faculty / Admin: Retrieve live session attendance progress and check-in roster
attendanceRouter.get(
  '/sessions/:id/qr/status',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  (req, res, next) => attendanceController.getSessionLiveStatus(req, res, next)
);

// 8. Faculty / Admin: Close and finalize attendance session
attendanceRouter.post(
  '/sessions/:id/close',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  (req, res, next) => attendanceController.closeSession(req, res, next)
);

// 9. Student: Retrieve currently active open attendance sessions for enrolled courses
attendanceRouter.get(
  '/active-sessions',
  requireAuth,
  requireRole('STUDENT'),
  (req, res, next) => attendanceController.getActiveSessions(req, res, next)
);

// 10. Student: Check in via scanned QR token
attendanceRouter.post(
  '/qr/check-in',
  requireAuth,
  requireRole('STUDENT'),
  validate({ body: qrCheckInSchema }),
  (req, res, next) => attendanceController.checkIn(req, res, next)
);

