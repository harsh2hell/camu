import { apiClient, type ApiResponse } from './client';
import type {
  TimetableSlotDTO,
  DailyScheduleDTO,
  WeeklyScheduleDTO,
} from '../../server/src/types/timetable';

export const timetableApi = {
  /**
   * Retrieves student's timetable schedule (daily or weekly)
   */
  async getStudentSchedule(params?: {
    day?: string;
    academicYear?: string;
    semester?: number;
  }): Promise<DailyScheduleDTO | WeeklyScheduleDTO> {
    const searchParams = new URLSearchParams();
    if (params?.day) searchParams.append('day', params.day);
    if (params?.academicYear) searchParams.append('academicYear', params.academicYear);
    if (params?.semester) searchParams.append('semester', params.semester.toString());

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await apiClient.get<ApiResponse<DailyScheduleDTO | WeeklyScheduleDTO>>(
      `/timetable/student${qs}`
    );
    if (!res.data) {
      throw new Error(res.message || 'Failed to retrieve student timetable.');
    }
    return res.data;
  },

  /**
   * Retrieves faculty member's timetable schedule (daily or weekly)
   */
  async getFacultySchedule(params?: {
    day?: string;
    academicYear?: string;
    semester?: number;
  }): Promise<DailyScheduleDTO | WeeklyScheduleDTO> {
    const searchParams = new URLSearchParams();
    if (params?.day) searchParams.append('day', params.day);
    if (params?.academicYear) searchParams.append('academicYear', params.academicYear);
    if (params?.semester) searchParams.append('semester', params.semester.toString());

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await apiClient.get<ApiResponse<DailyScheduleDTO | WeeklyScheduleDTO>>(
      `/timetable/faculty${qs}`
    );
    if (!res.data) {
      throw new Error(res.message || 'Failed to retrieve faculty timetable.');
    }
    return res.data;
  },

  /**
   * Retrieves slot details by ID
   */
  async getSlotDetails(slotId: string): Promise<TimetableSlotDTO> {
    const res = await apiClient.get<ApiResponse<{ slot: TimetableSlotDTO }>>(
      `/timetable/slots/${encodeURIComponent(slotId)}`
    );
    if (!res.data?.slot) {
      throw new Error(res.message || 'Failed to retrieve slot details.');
    }
    return res.data.slot;
  },
};
