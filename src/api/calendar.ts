import { apiClient, type ApiResponse } from './client';
import type { CalendarEventDTO } from '../../server/src/types/calendar';

export const calendarApi = {
  /**
   * Retrieves academic calendar events for the authenticated user
   */
  async getEvents(params?: {
    category?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ events: CalendarEventDTO[]; totalEvents: number; activeCategory: string }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await apiClient.get<
      ApiResponse<{ events: CalendarEventDTO[]; totalEvents: number; activeCategory: string }>
    >(`/calendar/events${qs}`);

    if (!res.data) {
      throw new Error(res.message || 'Failed to retrieve academic calendar.');
    }
    return res.data;
  },
};
