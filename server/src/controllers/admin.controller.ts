import type { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service.js';
import { UnauthorizedError } from '../errors/AppError.js';

export class AdminController {
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        role: req.query.role as any,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      };
      const result = await adminService.listUsers(filters);
      res.status(200).json({ status: 'success', ...result });
    } catch (err) {
      next(err);
    }
  }

  async getUserDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = String(req.params.id);
      const user = await adminService.getUserDetails(userId);
      res.status(200).json({ status: 'success', data: user });
    } catch (err) {
      next(err);
    }
  }

  async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const targetUserId = String(req.params.id);
      const { role, reason } = req.body;
      const result = await adminService.updateUserRole({
        targetUserId,
        newRole: role,
        reason,
        performedById: req.user.id,
        ipAddress: req.ip,
      });
      res.status(200).json({ status: 'success', message: 'User role updated and audited', data: result });
    } catch (err) {
      next(err);
    }
  }

  async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const targetUserId = String(req.params.id);
      const { isActive, reason } = req.body;
      const result = await adminService.updateUserStatus({
        targetUserId,
        isActive,
        reason,
        performedById: req.user.id,
        ipAddress: req.ip,
      });
      res.status(200).json({
        status: 'success',
        message: isActive ? 'Account reactivated successfully' : 'Account suspended and active sessions revoked',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        targetUserId: req.query.targetUserId as string | undefined,
        action: req.query.action as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      };
      const logs = await adminService.listUserAuditLogs(filters);
      res.status(200).json({ status: 'success', count: logs.length, data: logs });
    } catch (err) {
      next(err);
    }
  }

  async getSystemHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await adminService.getSystemHealth();
      res.status(200).json({ status: 'success', data: health });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
