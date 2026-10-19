import { Router } from 'express';
import { timetableController } from '../controllers/timetable.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import {
  studentTimetableQuerySchema,
  facultyTimetableQuerySchema,
  slotParamsSchema,
} from '../types/timetable.js';

export const timetableRouter: Router = Router();

// 1. Student Timetable (enrolled courses only)
timetableRouter.get(
  '/student',
  requireAuth,
  requireRole('STUDENT'),
  validate({ query: studentTimetableQuerySchema }),
  (req, res, next) => timetableController.getStudentSchedule(req, res, next)
);

// 2. Faculty Timetable (assigned courses only)
timetableRouter.get(
  '/faculty',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  validate({ query: facultyTimetableQuerySchema }),
  (req, res, next) => timetableController.getFacultySchedule(req, res, next)
);

// 3. Slot details lookup
timetableRouter.get(
  '/slots/:id',
  requireAuth,
  validate({ params: slotParamsSchema }),
  (req, res, next) => timetableController.getSlotById(req, res, next)
);
