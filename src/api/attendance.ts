import { apiClient, type ApiResponse } from './client';
import type {
  AttendanceSessionDTO,
  EnrolledStudentDTO,
  DefaulterStudentDTO,
  StudentAttendanceRecordItem,
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
};
