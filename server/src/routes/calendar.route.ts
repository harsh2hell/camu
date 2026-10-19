import { Router } from 'express';
import { calendarController } from '../controllers/calendar.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import { calendarQuerySchema } from '../types/calendar.js';

export const calendarRouter: Router = Router();

// 1. Authenticated Academic Calendar Events
calendarRouter.get(
  '/events',
  requireAuth,
  validate({ query: calendarQuerySchema }),
  (req, res, next) => calendarController.getEvents(req, res, next)
);
