import type { Request, Response, NextFunction } from 'express';
import { departmentService } from '../services/department.service.js';
import { UnauthorizedError } from '../errors/AppError.js';

export class DepartmentController {
  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const departmentId = String(req.params.departmentId);
      const data = await departmentService.getOverview(req.user, departmentId);
      res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  }

  async getFaculty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const departmentId = String(req.params.departmentId);
      const data = await departmentService.getFaculty(req.user, departmentId);
      res.status(200).json({ status: 'success', count: data.length, data });
    } catch (err) {
      next(err);
    }
  }

  async getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const departmentId = String(req.params.departmentId);
      const data = await departmentService.getStudents(req.user, departmentId);
      res.status(200).json({ status: 'success', count: data.length, data });
    } catch (err) {
      next(err);
    }
  }

  async getCourseAllocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const departmentId = String(req.params.departmentId);
      const data = await departmentService.getCourseAllocations(req.user, departmentId);
      res.status(200).json({ status: 'success', count: data.length, data });
    } catch (err) {
      next(err);
    }
  }

  async getAttendanceComplianceReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const departmentId = String(req.params.departmentId);
      const threshold = req.query.threshold ? Number(req.query.threshold) : 75;
      const data = await departmentService.getAttendanceComplianceReport(req.user, departmentId, threshold);
      res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  }
}

export const departmentController = new DepartmentController();
