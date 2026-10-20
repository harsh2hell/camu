import { Router } from 'express';
import { academicController } from '../controllers/academic.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import {
  createCourseSchema,
  createOfferingSchema,
  enrollStudentCourseSchema,
  correctAttendanceSchema,
  correctEnrollmentStatusSchema,
  academicLogsQuerySchema,
} from '../types/academic.js';

export const academicRouter: Router = Router();

// Academic programs & departments catalog
academicRouter.get(
  '/departments',
  requireAuth,
  requireRole('REGISTRAR_ADMIN', 'SUPER_ADMIN', 'FACULTY', 'HOD', 'DEAN'),
  (req, res, next) => academicController.getDepartments(req, res, next)
);

academicRouter.get(
  '/programs',
  requireAuth,
  requireRole('REGISTRAR_ADMIN', 'SUPER_ADMIN', 'FACULTY', 'HOD', 'DEAN'),
  (req, res, next) => academicController.getPrograms(req, res, next)
);

// Course catalog
academicRouter.get(
  '/courses',
  requireAuth,
  requireRole('REGISTRAR_ADMIN', 'SUPER_ADMIN', 'FACULTY', 'HOD', 'DEAN'),
  (req, res, next) => academicController.getCourses(req, res, next)
);

academicRouter.post(
  '/courses',
  requireAuth,
  requireRole('REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ body: createCourseSchema }),
  (req, res, next) => academicController.createCourse(req, res, next)
);

// Course offerings / allocation
academicRouter.get(
  '/offerings',
  requireAuth,
  requireRole('REGISTRAR_ADMIN', 'SUPER_ADMIN', 'FACULTY', 'HOD', 'DEAN'),
  (req, res, next) => academicController.getOfferings(req, res, next)
);

academicRouter.post(
  '/offerings',
  requireAuth,
  requireRole('REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ body: createOfferingSchema }),
  (req, res, next) => academicController.createOffering(req, res, next)
);

// Student Course Registration
academicRouter.post(
  '/enrollments',
  requireAuth,
  requireRole('REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ body: enrollStudentCourseSchema }),
  (req, res, next) => academicController.enrollStudent(req, res, next)
);

academicRouter.delete(
  '/enrollments/:id',
  requireAuth,
  requireRole('REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  (req, res, next) => academicController.dropEnrollment(req, res, next)
);

// Authorized Academic Corrections with mandatory audit logging
academicRouter.post(
  '/corrections/attendance',
  requireAuth,
  requireRole('REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ body: correctAttendanceSchema }),
  (req, res, next) => academicController.correctAttendance(req, res, next)
);

academicRouter.post(
  '/corrections/enrollment-status',
  requireAuth,
  requireRole('REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ body: correctEnrollmentStatusSchema }),
  (req, res, next) => academicController.correctEnrollmentStatus(req, res, next)
);

academicRouter.get(
  '/corrections/logs',
  requireAuth,
  requireRole('REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ query: academicLogsQuerySchema }),
  (req, res, next) => academicController.getCorrectionLogs(req, res, next)
);
