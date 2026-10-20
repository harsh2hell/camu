import type { Request, Response, NextFunction } from 'express';
import { admissionsService } from '../services/admissions.service.js';
import { UnauthorizedError } from '../errors/AppError.js';

export class AdmissionsController {
  async getApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await admissionsService.getApplications(req.query as any);
      res.status(200).json({
        status: 'success',
        count: result.applications.length,
        data: result.applications,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async getApplicationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const application = await admissionsService.getApplicationById(String(req.params.id));
      res.status(200).json({
        status: 'success',
        data: application,
      });
    } catch (err) {
      next(err);
    }
  }

  async createApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const application = await admissionsService.createApplication(req.body, req.user, req.ip);
      res.status(201).json({
        status: 'success',
        message: 'Applicant file successfully created.',
        data: application,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const application = await admissionsService.updateApplication(
        String(req.params.id),
        req.body,
        req.user,
        req.ip
      );
      res.status(200).json({
        status: 'success',
        message: 'Applicant record updated.',
        data: application,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const application = await admissionsService.updateStatus(
        String(req.params.id),
        req.body,
        req.user,
        req.ip
      );
      res.status(200).json({
        status: 'success',
        message: `Applicant status changed to ${req.body.status}.`,
        data: application,
      });
    } catch (err) {
      next(err);
    }
  }

  async addReviewNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const note = req.body.note || req.body.reviewNotes;
      const application = await admissionsService.addReviewNote(
        String(req.params.id),
        note,
        req.user,
        req.ip
      );
      res.status(200).json({
        status: 'success',
        message: 'Review note added.',
        data: application,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const logs = await admissionsService.getAuditLogs(String(req.params.id));
      res.status(200).json({
        status: 'success',
        count: logs.length,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }

  async enrollApplicant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await admissionsService.enrollApplicant(
        String(req.params.id),
        req.body,
        req.user,
        req.ip
      );
      res.status(200).json({
        status: 'success',
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const admissionsController = new AdmissionsController();
