import type { Request, Response, NextFunction } from 'express';
import { timetableService } from '../services/timetable.service.js';
import type { DayOfWeek } from '@prisma/client';

export class TimetableController {
  /**
   * GET /api/timetable/student
   * Returns schedule for authenticated student's enrolled courses
   */
  async getStudentSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentUserId = req.user!.id;
      const { day, academicYear, semester } = req.query as {
        day?: DayOfWeek;
        academicYear?: string;
        semester?: number;
      };

      const data = await timetableService.getStudentTimetable(studentUserId, {
        day,
        academicYear,
        semester,
      });

      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/timetable/faculty
   * Returns schedule for authenticated faculty's assigned courses
   */
  async getFacultySchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const facultyUserId = req.user!.id;
      const { day, academicYear, semester } = req.query as {
        day?: DayOfWeek;
        academicYear?: string;
        semester?: number;
      };

      const data = await timetableService.getFacultyTimetable(facultyUserId, {
        day,
        academicYear,
        semester,
      });

      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/timetable/slots/:id
   * Retrieves single timetable slot details
   */
  async getSlotById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slotId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const slot = await timetableService.getSlotDetails(slotId);

      res.status(200).json({
        status: 'success',
        data: {
          slot,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const timetableController = new TimetableController();
