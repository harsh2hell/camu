import { Router } from 'express';
import { departmentController } from '../controllers/department.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import { departmentIdParamSchema, complianceQuerySchema } from '../types/department.js';

export const departmentRouter: Router = Router();

// Department overview
departmentRouter.get(
  '/:departmentId/overview',
  requireAuth,
  requireRole('HOD', 'DEAN', 'REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ params: departmentIdParamSchema }),
  (req, res, next) => departmentController.getOverview(req, res, next)
);

// Department faculty
departmentRouter.get(
  '/:departmentId/faculty',
  requireAuth,
  requireRole('HOD', 'DEAN', 'REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ params: departmentIdParamSchema }),
  (req, res, next) => departmentController.getFaculty(req, res, next)
);

// Department students
departmentRouter.get(
  '/:departmentId/students',
  requireAuth,
  requireRole('HOD', 'DEAN', 'REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ params: departmentIdParamSchema }),
  (req, res, next) => departmentController.getStudents(req, res, next)
);

// Course allocations & timetable summary
departmentRouter.get(
  '/:departmentId/course-allocations',
  requireAuth,
  requireRole('HOD', 'DEAN', 'REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ params: departmentIdParamSchema }),
  (req, res, next) => departmentController.getCourseAllocations(req, res, next)
);

// Attendance compliance & defaulter report
departmentRouter.get(
  '/:departmentId/attendance-compliance',
  requireAuth,
  requireRole('HOD', 'DEAN', 'REGISTRAR_ADMIN', 'SUPER_ADMIN'),
  validate({ params: departmentIdParamSchema, query: complianceQuerySchema }),
  (req, res, next) => departmentController.getAttendanceComplianceReport(req, res, next)
);
