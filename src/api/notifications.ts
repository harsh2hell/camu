import { apiClient } from './client';

export type NotificationType =
  | 'NOTICE'
  | 'ASSIGNMENT'
  | 'LEAVE_OD'
  | 'FINANCE'
  | 'SUPPORT_TICKET'
  | 'ACADEMIC'
  | 'SYSTEM';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface NotificationDTO {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  readAt: string | null;
  resourceType: string | null;
  resourceId: string | null;
  actionUrl: string | null;
  metadata: Record<string, any>;
  idempotencyKey: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  status: string;
  data: {
    notifications: NotificationDTO[];
    total: number;
    unreadCount: number;
  };
}

export interface UnreadCountResponse {
  status: string;
  data: {
    unreadCount: number;
  };
}

export interface SingleNotificationResponse {
  status: string;
  data: NotificationDTO;
}

export interface DestinationResponse {
  status: string;
  data: {
    actionUrl: string | null;
    resourceType: string | null;
    resourceId: string | null;
  };
}

export async function getNotifications(params?: {
  isRead?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}): Promise<NotificationListResponse> {
  const query = new URLSearchParams();
  if (params?.isRead !== undefined) query.set('isRead', String(params.isRead));
  if (params?.type) query.set('type', params.type);
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.offset !== undefined) query.set('offset', String(params.offset));

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<NotificationListResponse>(`/notifications${qs}`);
}

export async function getUnreadNotificationCount(): Promise<UnreadCountResponse> {
  return apiClient.get<UnreadCountResponse>('/notifications/unread-count');
}

export async function markNotificationAsRead(id: string): Promise<SingleNotificationResponse> {
  return apiClient.patch<SingleNotificationResponse>(`/notifications/${id}/read`, {});
}

export async function markAllNotificationsAsRead(type?: NotificationType): Promise<{
  status: string;
  message: string;
  data: { updatedCount: number };
}> {
  return apiClient.patch('/notifications/mark-all-read', { type });
}

export async function deleteNotification(id: string): Promise<{
  status: string;
  message: string;
}> {
  return apiClient.delete(`/notifications/${id}`);
}

export async function getNotificationDestination(id: string): Promise<DestinationResponse> {
  return apiClient.get<DestinationResponse>(`/notifications/${id}/destination`);
}
