import type { Request, Response, NextFunction } from 'express';
import { profileService } from '../services/profile.service.js';
import { UnauthorizedError } from '../errors/AppError.js';
import type { UserRole } from '@prisma/client';

export class ProfileController {
  /**
   * GET /api/profile/me
   * Get authenticated student's profile
   */
  async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const profile = await profileService.getMyProfile({
        id: req.user.id,
        role: req.user.role as UserRole,
      });

      res.status(200).json({
        success: true,
        status: 'success',
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/profile/me
   * Update student permitted profile fields (phone, emergency contact, blood group, guardian, address)
   */
  async updateMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const ipAddress = req.ip || req.socket.remoteAddress;
      const updated = await profileService.updateMyProfile(
        { id: req.user.id, role: req.user.role as UserRole },
        req.body,
        ipAddress
      );

      res.status(200).json({
        success: true,
        status: 'success',
        message: 'Student profile updated successfully with durable audit record.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/profile/students/:studentId
   * Staff/authorized access to a student profile
   */
  async getStudentProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const studentId = String(req.params.studentId);
      const profile = await profileService.getStudentProfile(
        { id: req.user.id, role: req.user.role as UserRole },
        studentId
      );

      res.status(200).json({
        success: true,
        status: 'success',
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/profile/mentees
   * Faculty mentor viewing assigned mentees
   */
  async getFacultyMentees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const mentees = await profileService.getFacultyMentees({
        id: req.user.id,
        role: req.user.role as UserRole,
      });

      res.status(200).json({
        success: true,
        status: 'success',
        count: mentees.length,
        data: mentees,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/profile/academic-records
   * Get student's own academic records (enrolled courses, credits, grades, GPA)
   */
  async getMyAcademicRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const records = await profileService.getMyAcademicRecords({
        id: req.user.id,
        role: req.user.role as UserRole,
      });

      res.status(200).json({
        success: true,
        status: 'success',
        data: records,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/profile/academic-records/:studentId
   * Staff/mentor viewing student's academic records
   */
  async getStudentAcademicRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const studentId = String(req.params.studentId);
      const records = await profileService.getStudentAcademicRecords(
        { id: req.user.id, role: req.user.role as UserRole },
        studentId
      );

      res.status(200).json({
        success: true,
        status: 'success',
        data: records,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/profile/audit-trail/:studentId?
   * View profile audit trail
   */
  async getProfileAuditTrail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const targetId = req.params.studentId ? String(req.params.studentId) : req.user.id;
      const logs = await profileService.getProfileAuditTrail(
        { id: req.user.id, role: req.user.role as UserRole },
        targetId
      );

      res.status(200).json({
        success: true,
        status: 'success',
        count: logs.length,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const profileController = new ProfileController();
