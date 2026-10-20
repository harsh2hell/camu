import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import {
  listUsersQuerySchema,
  userIdParamSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  adminAuditLogsQuerySchema,
} from '../types/admin.js';

export const adminRouter: Router = Router();

// Platform health & integration diagnostics (accessible to SUPER_ADMIN & IT_SUPPORT)
adminRouter.get(
  '/system/health',
  requireAuth,
  requireRole('SUPER_ADMIN', 'IT_SUPPORT'),
  (req, res, next) => adminController.getSystemHealth(req, res, next)
);

// User account administration (SUPER_ADMIN only)
adminRouter.get(
  '/users',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate({ query: listUsersQuerySchema }),
  (req, res, next) => adminController.listUsers(req, res, next)
);

adminRouter.get(
  '/users/:id',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate({ params: userIdParamSchema }),
  (req, res, next) => adminController.getUserDetails(req, res, next)
);

// Update user role with mandatory audit logging
adminRouter.patch(
  '/users/:id/role',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate({ params: userIdParamSchema, body: updateUserRoleSchema }),
  (req, res, next) => adminController.updateUserRole(req, res, next)
);

// Suspend or reactivate user account with mandatory session termination
adminRouter.patch(
  '/users/:id/status',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate({ params: userIdParamSchema, body: updateUserStatusSchema }),
  (req, res, next) => adminController.updateUserStatus(req, res, next)
);

// Centralized user audit logs
adminRouter.get(
  '/audit-logs',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate({ query: adminAuditLogsQuerySchema }),
  (req, res, next) => adminController.listAuditLogs(req, res, next)
);
