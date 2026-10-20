import type { Request, Response, NextFunction } from 'express';
import { leaveService } from '../services/leave.service.js';
import { UnauthorizedError } from '../errors/AppError.js';
import type { UserRole } from '@prisma/client';

export class LeaveController {
  /**
   * POST /api/leave-od/applications
   * Student submits a new Leave or OD application
   */
  async createApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const ipAddress = req.ip || req.socket.remoteAddress;
      const application = await leaveService.createApplication(
        req.user.id,
        req.user.role as UserRole,
        req.body,
        ipAddress
      );
      res.status(201).json({
        status: 'success',
        message: `${application.category === 'ON_DUTY' ? 'On-Duty' : 'Leave'} application submitted successfully.`,
        data: application,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/leave-od/applications
   * Student lists their own leave/OD applications
   */
  async getStudentApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await leaveService.getStudentApplications(
        req.user.id,
        req.user.role as UserRole,
        req.query as any
      );
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

  /**
   * GET /api/leave-od/applications/:id
   * View details of an application (authorized student or approver)
   */
  async getApplicationDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const applicationId = String(req.params.id);
      const application = await leaveService.getApplicationDetails(
        { id: req.user.id, role: req.user.role as UserRole },
        applicationId
      );
      res.status(200).json({
        status: 'success',
        data: application,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/leave-od/applications/:id/withdraw
   * Student withdraws their own application while permitted
   */
  async withdrawApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const applicationId = String(req.params.id);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const updated = await leaveService.withdrawApplication(
        req.user.id,
        applicationId,
        req.body,
        ipAddress
      );
      res.status(200).json({
        status: 'success',
        message: 'Application has been successfully withdrawn.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/leave-od/applications/:id/resubmit
   * Student resubmits an application returned for correction
   */
  async resubmitApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const applicationId = String(req.params.id);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const updated = await leaveService.resubmitApplication(
        req.user.id,
        applicationId,
        req.body,
        ipAddress
      );
      res.status(200).json({
        status: 'success',
        message: 'Application resubmitted successfully for review.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/leave-od/approvals/pending
   * Approver lists pending applications assigned to them or within scope
   */
  async getPendingApprovals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await leaveService.listApproverPending(
        { id: req.user.id, role: req.user.role as UserRole },
        req.query as any
      );
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

  /**
   * GET /api/leave-od/approvals/history
   * Approver lists previously decided applications
   */
  async getApproverHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await leaveService.listApproverHistory(
        { id: req.user.id, role: req.user.role as UserRole },
        req.query as any
      );
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

  /**
   * POST /api/leave-od/approvals/:id/decide
   * Approver makes a decision (APPROVE, REJECT, REQUEST_CORRECTION)
   */
  async decideApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const applicationId = String(req.params.id);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const decided = await leaveService.decideApplication(
        { id: req.user.id, role: req.user.role as UserRole },
        applicationId,
        req.body,
        ipAddress
      );
      res.status(200).json({
        status: 'success',
        message: `Application successfully marked as ${decided.status}.`,
        data: decided,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/leave-od/applications/:id/document
   * Secure private download of supporting document
   */
  async downloadSupportingDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const applicationId = String(req.params.id);
      const doc = await leaveService.getSupportingDocument(
        { id: req.user.id, role: req.user.role as UserRole },
        applicationId
      );

      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.sendFile(doc.filePath);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/leave-od/applications/:id/audit-trail
   * View immutable audit trail for an application
   */
  async getApplicationAuditTrail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const applicationId = String(req.params.id);
      const application = await leaveService.getApplicationDetails(
        { id: req.user.id, role: req.user.role as UserRole },
        applicationId
      );
      res.status(200).json({
        status: 'success',
        count: application.auditLogs?.length || 0,
        data: application.auditLogs || [],
      });
    } catch (err) {
      next(err);
    }
  }
}

export const leaveController = new LeaveController();
