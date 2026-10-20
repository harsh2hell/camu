import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import { markAllReadSchema } from '../types/notification.js';

export const notificationRouter: Router = Router();

// All notification endpoints require authenticated session
notificationRouter.use(requireAuth);

// GET /api/notifications - List current user's notifications
notificationRouter.get('/', (req, res, next) =>
  notificationController.listNotifications(req, res, next)
);

// GET /api/notifications/unread-count - Get unread count
notificationRouter.get('/unread-count', (req, res, next) =>
  notificationController.getUnreadCount(req, res, next)
);

// PATCH /api/notifications/:id/read - Mark one notification as read
notificationRouter.patch('/:id/read', (req, res, next) =>
  notificationController.markAsRead(req, res, next)
);

// POST /api/notifications/mark-all-read - Mark all notifications as read
notificationRouter.post(
  '/mark-all-read',
  validate({ body: markAllReadSchema }),
  (req, res, next) => notificationController.markAllAsRead(req, res, next)
);

// PATCH /api/notifications/mark-all-read - Mark all notifications as read (RESTful convention)
notificationRouter.patch(
  '/mark-all-read',
  validate({ body: markAllReadSchema }),
  (req, res, next) => notificationController.markAllAsRead(req, res, next)
);

// GET /api/notifications/:id/destination - View destination metadata
notificationRouter.get('/:id/destination', (req, res, next) =>
  notificationController.getDestination(req, res, next)
);

// DELETE /api/notifications/:id - Delete a notification
notificationRouter.delete('/:id', (req, res, next) =>
  notificationController.deleteNotification(req, res, next)
);
