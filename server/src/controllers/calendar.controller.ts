import type { Request, Response, NextFunction } from 'express';
import { calendarService } from '../services/calendar.service.js';

export class CalendarController {
  /**
   * GET /api/calendar/events
   * Returns authenticated user's academic calendar events
   */
  async getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const { category, startDate, endDate } = req.query as {
        category?: string;
        startDate?: string;
        endDate?: string;
      };

      const data = await calendarService.getAcademicCalendar(userId, userRole, {
        category,
        startDate,
        endDate,
      });

      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const calendarController = new CalendarController();
