import { apiClient, type ApiResponse } from './client';
import type {
  AttendanceSessionDTO,
  EnrolledStudentDTO,
  DefaulterStudentDTO,
  StudentAttendanceRecordItem,
  QrTokenResponseDTO,
  QrSessionStatusDTO,
  QrCheckInResultDTO,
  ActiveStudentSessionDTO,
} from '../../server/src/types/attendance';
import type { OverallAttendanceSummary } from '../../server/src/utils/attendanceCalculator';

export const attendanceApi = {
  /**
   * Retrieves authenticated student's personalized attendance summary
   */
  async getMySummary(): Promise<OverallAttendanceSummary> {
    const res = await apiClient.get<ApiResponse<OverallAttendanceSummary>>('/attendance/my-summary');
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to retrieve attendance summary.');
    }
    return res.data;
  },

  /**
   * Retrieves enrolled student roster for roll-call
   */
  async getRoster(offeringId?: string): Promise<EnrolledStudentDTO[]> {
    const query = offeringId ? `?offeringId=${encodeURIComponent(offeringId)}` : '';
    const res = await apiClient.get<ApiResponse<EnrolledStudentDTO[]>>(`/attendance/roster${query}`);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to retrieve course roster.');
    }
    return res.data;
  },

  /**
   * Creates an attendance lecture session (Faculty only)
   */
  async createSession(data: {
    courseOfferingId: string;
    startTime: string;
    topicTaught?: string;
    sessionDate?: string;
  }): Promise<AttendanceSessionDTO> {
    const res = await apiClient.post<ApiResponse<AttendanceSessionDTO>>('/attendance/sessions', data);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to initialize attendance session.');
    }
    return res.data;
  },

  /**
   * Records batch attendance for enrolled students in a session (Faculty only)
   */
  async recordBatch(
    sessionId: string,
    records: StudentAttendanceRecordItem[],
    lockSession = false
  ): Promise<{ sessionId: string; recordsMarked: number; isLocked: boolean }> {
    const res = await apiClient.post<ApiResponse<{ sessionId: string; recordsMarked: number; isLocked: boolean }>>(
      `/attendance/sessions/${encodeURIComponent(sessionId)}/records`,
      { records, lockSession }
    );
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to persist attendance records.');
    }
    return res.data;
  },

  /**
   * Retrieves attendance defaulter students (< 75%) for an authorized course (Faculty only)
   */
  async getDefaulters(offeringId?: string, threshold = 75.0): Promise<DefaulterStudentDTO[]> {
    const query = offeringId ? `?offeringId=${encodeURIComponent(offeringId)}&threshold=${threshold}` : `?threshold=${threshold}`;
    const res = await apiClient.get<ApiResponse<DefaulterStudentDTO[]>>(`/attendance/defaulters${query}`);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to retrieve defaulters list.');
    }
    return res.data;
  },

  /**
   * Generates or rotates cryptographically signed QR attendance token (Faculty only)
   */
  async generateQrToken(sessionId: string): Promise<QrTokenResponseDTO> {
    const res = await apiClient.post<ApiResponse<QrTokenResponseDTO>>(
      `/attendance/sessions/${encodeURIComponent(sessionId)}/qr/generate`
    );
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to generate QR attendance token.');
    }
    return res.data;
  },

  /**
   * Retrieves live session attendance progress and check-in roster (Faculty only)
   */
  async getQrStatus(sessionId: string): Promise<QrSessionStatusDTO> {
    const res = await apiClient.get<ApiResponse<QrSessionStatusDTO>>(
      `/attendance/sessions/${encodeURIComponent(sessionId)}/qr/status`
    );
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to retrieve live QR attendance status.');
    }
    return res.data;
  },

  /**
   * Closes and finalizes attendance session, marking absent students per policy (Faculty only)
   */
  async closeSession(sessionId: string): Promise<{
    sessionId: string;
    isLocked: boolean;
    totalEnrolled: number;
    presentCount: number;
    absentCount: number;
    odCount: number;
  }> {
    const res = await apiClient.post<ApiResponse<{
      sessionId: string;
      isLocked: boolean;
      totalEnrolled: number;
      presentCount: number;
      absentCount: number;
      odCount: number;
    }>>(`/attendance/sessions/${encodeURIComponent(sessionId)}/close`);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to finalize attendance session.');
    }
    return res.data;
  },

  /**
   * Retrieves currently active open attendance sessions for courses student is enrolled in (Student only)
   */
  async getActiveSessions(): Promise<ActiveStudentSessionDTO[]> {
    const res = await apiClient.get<ApiResponse<ActiveStudentSessionDTO[]>>('/attendance/active-sessions');
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to retrieve active class attendance sessions.');
    }
    return res.data;
  },

  /**
   * Checks in using scanned QR token (Student only)
   */
  async checkInWithQr(qrToken: string): Promise<QrCheckInResultDTO> {
    const res = await apiClient.post<ApiResponse<QrCheckInResultDTO>>('/attendance/qr/check-in', { qrToken });
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to verify QR check-in.');
    }
    return res.data;
  },
};

