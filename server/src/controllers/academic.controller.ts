import type { Request, Response, NextFunction } from 'express';
import { academicService } from '../services/academic.service.js';
import { UnauthorizedError } from '../errors/AppError.js';

export class AcademicController {
  async getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const departments = await academicService.getDepartments();
      res.status(200).json({ status: 'success', data: departments });
    } catch (err) {
      next(err);
    }
  }

  async getPrograms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const programs = await academicService.getPrograms();
      res.status(200).json({ status: 'success', data: programs });
    } catch (err) {
      next(err);
    }
  }

  async getCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        departmentId: req.query.departmentId as string | undefined,
        search: req.query.search as string | undefined,
      };
      const courses = await academicService.getCourses(filters);
      res.status(200).json({ status: 'success', count: courses.length, data: courses });
    } catch (err) {
      next(err);
    }
  }

  async createCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const course = await academicService.createCourse(req.body);
      res.status(201).json({ status: 'success', message: 'Course created successfully', data: course });
    } catch (err) {
      next(err);
    }
  }

  async getOfferings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        academicYear: req.query.academicYear as string | undefined,
        semester: req.query.semester ? Number(req.query.semester) : undefined,
        departmentId: req.query.departmentId as string | undefined,
      };
      const offerings = await academicService.getOfferings(filters);
      res.status(200).json({ status: 'success', count: offerings.length, data: offerings });
    } catch (err) {
      next(err);
    }
  }

  async createOffering(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const offering = await academicService.createOffering(req.body);
      res.status(201).json({ status: 'success', message: 'Course offering allocated successfully', data: offering });
    } catch (err) {
      next(err);
    }
  }

  async enrollStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, courseOfferingId } = req.body;
      const enrollment = await academicService.enrollStudent(studentId, courseOfferingId);
      res.status(201).json({ status: 'success', message: 'Student registered for course offering', data: enrollment });
    } catch (err) {
      next(err);
    }
  }

  async dropEnrollment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const enrollmentId = String(req.params.id);
      await academicService.dropEnrollment(enrollmentId);
      res.status(200).json({ status: 'success', message: 'Enrollment dropped successfully' });
    } catch (err) {
      next(err);
    }
  }

  async correctAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const { attendanceRecordId, newStatus, reason, approvalRef } = req.body;
      const result = await academicService.correctAttendanceRecord({
        attendanceRecordId,
        newStatus,
        reason,
        approvalRef,
        performedById: req.user.id,
        ipAddress: req.ip,
      });
      res.status(200).json({ status: 'success', message: 'Attendance record corrected and audited', data: result });
    } catch (err) {
      next(err);
    }
  }

  async correctEnrollmentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const { studentId, status, reason, approvalRef } = req.body;
      const result = await academicService.correctStudentEnrollmentStatus({
        studentId,
        status,
        reason,
        approvalRef,
        performedById: req.user.id,
        ipAddress: req.ip,
      });
      res.status(200).json({ status: 'success', message: 'Enrollment status updated and audited', data: result });
    } catch (err) {
      next(err);
    }
  }

  async getCorrectionLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        studentId: req.query.studentId as string | undefined,
        targetEntity: req.query.targetEntity as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      };
      const logs = await academicService.getCorrectionLogs(filters);
      res.status(200).json({ status: 'success', count: logs.length, data: logs });
    } catch (err) {
      next(err);
    }
  }
}

export const academicController = new AcademicController();
