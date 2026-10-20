import type { Request, Response, NextFunction } from 'express';
import { attendanceService } from '../services/attendance.service.js';
import type { ApiResponse } from '../types/api.js';
import type {
  CreateAttendanceSessionInput,
  RecordAttendanceBatchInput,
  AttendanceSessionDTO,
  EnrolledStudentDTO,
  DefaulterStudentDTO,
  QrTokenResponseDTO,
  QrSessionStatusDTO,
  QrCheckInResultDTO,
  ActiveStudentSessionDTO,
} from '../types/attendance.js';
import type { OverallAttendanceSummary } from '../utils/attendanceCalculator.js';
import { DEV_COURSE_OFFERING_ID } from '../repositories/attendance.repository.js';

export class AttendanceController {
  /**
   * POST /api/attendance/sessions
   * Creates a new attendance lecture session (Faculty/Admin only)
   */
  async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: CreateAttendanceSessionInput = req.body;
      const user = req.user!;

      const session = await attendanceService.createSession(user, input);

      const response: ApiResponse<AttendanceSessionDTO> = {
        success: true,
        data: session,
        message: 'Attendance session successfully created.',
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/attendance/sessions/:id/records
   * Marks student attendance batch for a session (Faculty/Admin only)
   */
  async recordBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = String(req.params.id);
      const input: RecordAttendanceBatchInput = req.body;
      const user = req.user!;

      const result = await attendanceService.recordAttendanceBatch(user, sessionId, input);

      const response: ApiResponse<{ sessionId: string; recordsMarked: number; isLocked: boolean }> = {
        success: true,
        data: result,
        message: `Successfully recorded attendance for ${result.recordsMarked} student(s).`,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/attendance/my-summary
   * Returns authenticated student's personalized attendance summary
   */
  async getMySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const summary = await attendanceService.getStudentAttendanceSummary(user);

      const response: ApiResponse<OverallAttendanceSummary> = {
        success: true,
        data: summary,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/attendance/roster?offeringId=...
   * Returns enrolled student roster for an authorized course offering
   */
  async getRoster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const offeringId = (req.query.offeringId as string) || DEV_COURSE_OFFERING_ID;

      const roster = await attendanceService.getEnrolledStudents(user, offeringId);

      const response: ApiResponse<EnrolledStudentDTO[]> = {
        success: true,
        data: roster,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/attendance/defaulters?offeringId=...&threshold=...
   * Returns defaulter audit report for an authorized course offering
   */
  async getDefaulters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const offeringId = (req.query.offeringId as string) || DEV_COURSE_OFFERING_ID;
      const threshold = req.query.threshold ? parseFloat(req.query.threshold as string) : 75.0;

      const defaulters = await attendanceService.getDefaulters(user, offeringId, threshold);

      const response: ApiResponse<DefaulterStudentDTO[]> = {
        success: true,
        data: defaulters,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/attendance/sessions/:id/qr/generate
   * Generates or rotates cryptographically signed QR attendance token (Faculty/Admin only)
   */
  async generateQrToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = String(req.params.id);
      const user = req.user!;

      const qrData = await attendanceService.generateQrToken(user, sessionId);

      const response: ApiResponse<QrTokenResponseDTO> = {
        success: true,
        data: qrData,
        message: 'QR attendance token generated successfully.',
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/attendance/sessions/:id/qr/status
   * Retrieves live session attendance progress and check-in roster (Faculty/Admin only)
   */
  async getSessionLiveStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = String(req.params.id);
      const user = req.user!;

      const status = await attendanceService.getSessionLiveStatus(user, sessionId);

      const response: ApiResponse<QrSessionStatusDTO> = {
        success: true,
        data: status,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/attendance/sessions/:id/close
   * Closes and finalizes attendance session, marking absent students per institutional policy
   */
  async closeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = String(req.params.id);
      const user = req.user!;

      const result = await attendanceService.closeAttendanceSession(user, sessionId);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: `Attendance session closed. ${result.presentCount} present, ${result.absentCount} marked absent.`,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/attendance/qr/check-in
   * Student self check-in via scanned QR token
   */
  async checkIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { qrToken } = req.body;

      const result = await attendanceService.verifyAndCheckIn(user, qrToken);

      const response: ApiResponse<QrCheckInResultDTO> = {
        success: true,
        data: result,
        message: result.isAlreadyMarked
          ? 'Attendance was already marked for this class session.'
          : `Attendance successfully verified and marked for ${result.courseCode} - ${result.courseTitle}.`,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/attendance/active-sessions
   * Student: Retrieves open attendance sessions for courses student is enrolled in
   */
  async getActiveSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const sessions = await attendanceService.getActiveSessionsForStudent(user);

      const response: ApiResponse<ActiveStudentSessionDTO[]> = {
        success: true,
        data: sessions,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}

export const attendanceController = new AttendanceController();

