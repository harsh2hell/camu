import { apiClient } from './client';

export type NoticeStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED' | 'CANCELLED';
export type NoticePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type NoticeCategory =
  | 'ACADEMIC'
  | 'EXAM'
  | 'EVENT'
  | 'HOLIDAY'
  | 'PLACEMENT'
  | 'ADMINISTRATIVE'
  | 'GENERAL';

export interface NoticeAuditLogDTO {
  id: string;
  noticeId: string;
  action: string;
  previousStatus?: string | null;
  newStatus: string;
  performedBy: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  reason?: string | null;
  details?: any;
  ipAddress?: string | null;
  createdAt: string;
}

export interface NoticeDTO {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: NoticePriority;
  status: NoticeStatus;
  targetRole?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  programId?: string | null;
  programName?: string | null;
  batchId?: string | null;
  batchName?: string | null;
  targetSemester?: number | null;
  isPinned: boolean;
  attachmentUrl?: string | null;
  attachmentFileKey?: string | null;
  hasAttachment: boolean;
  postedById: string;
  authorName: string;
  authorRole: string;
  eventDate?: string | null;
  publishAt?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
  archivedAt?: string | null;
  cancelledAt?: string | null;
  isAcknowledged?: boolean;
  acknowledgedCount?: number;
  auditLogs?: NoticeAuditLogDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface NoticeListResponse {
  status: string;
  count: number;
  unreadCount?: number;
  data: NoticeDTO[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface SingleNoticeResponse {
  status: string;
  data: NoticeDTO;
  message?: string;
}

export interface CreateNoticeInput {
  title: string;
  content: string;
  category?: string;
  priority?: NoticePriority;
  targetRole?: string | null;
  departmentId?: string | null;
  programId?: string | null;
  batchId?: string | null;
  targetSemester?: number | null;
  isPinned?: boolean;
  eventDate?: string | null;
  publishAt?: string | null;
  expiresAt?: string | null;
  publishNow?: boolean;
  fileData?: string;
  fileName?: string;
  attachmentFileKey?: string;
}

export interface UpdateNoticeInput {
  title?: string;
  content?: string;
  category?: string;
  priority?: NoticePriority;
  targetRole?: string | null;
  departmentId?: string | null;
  programId?: string | null;
  batchId?: string | null;
  targetSemester?: number | null;
  isPinned?: boolean;
  eventDate?: string | null;
  publishAt?: string | null;
  expiresAt?: string | null;
  fileData?: string;
  fileName?: string;
  attachmentFileKey?: string;
}

export interface AudiencePreviewDTO {
  targetRole?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  programId?: string | null;
  programName?: string | null;
  batchId?: string | null;
  batchName?: string | null;
  targetSemester?: number | null;
  estimatedRecipientCount: number;
  audienceDescription: string;
}

export async function getRecipientNotices(params?: {
  category?: string;
  priority?: NoticePriority;
  search?: string;
  pinnedOnly?: boolean;
  page?: number;
  limit?: number;
}): Promise<NoticeListResponse> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.priority) query.set('priority', params.priority);
  if (params?.search) query.set('search', params.search);
  if (params?.pinnedOnly !== undefined) query.set('pinnedOnly', String(params.pinnedOnly));
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<NoticeListResponse>(`/notices${qs}`);
}

export async function getManagementNotices(params?: {
  status?: NoticeStatus;
  category?: string;
  priority?: NoticePriority;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<NoticeListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);
  if (params?.priority) query.set('priority', params.priority);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<NoticeListResponse>(`/notices/manage${qs}`);
}

export async function createNotice(input: CreateNoticeInput): Promise<SingleNoticeResponse> {
  return apiClient.post<SingleNoticeResponse>('/notices', input);
}

export async function getNoticeDetails(noticeId: string): Promise<SingleNoticeResponse> {
  return apiClient.get<SingleNoticeResponse>(`/notices/${noticeId}`);
}

export async function updateNotice(noticeId: string, input: UpdateNoticeInput): Promise<SingleNoticeResponse> {
  return apiClient.put<SingleNoticeResponse>(`/notices/${noticeId}`, input);
}

export async function publishNotice(
  noticeId: string,
  input: { publishNow?: boolean; publishAt?: string | null; expiresAt?: string | null }
): Promise<SingleNoticeResponse> {
  return apiClient.post<SingleNoticeResponse>(`/notices/${noticeId}/publish`, input);
}

export async function archiveNotice(noticeId: string, reason?: string): Promise<SingleNoticeResponse> {
  return apiClient.post<SingleNoticeResponse>(`/notices/${noticeId}/archive`, { reason });
}

export async function cancelNotice(noticeId: string, reason: string): Promise<SingleNoticeResponse> {
  return apiClient.post<SingleNoticeResponse>(`/notices/${noticeId}/cancel`, { reason });
}

export async function getAudiencePreview(criteria: {
  targetRole?: string | null;
  departmentId?: string | null;
  programId?: string | null;
  batchId?: string | null;
  targetSemester?: number | null;
}): Promise<{ status: string; data: AudiencePreviewDTO }> {
  const query = new URLSearchParams();
  if (criteria.targetRole) query.set('targetRole', criteria.targetRole);
  if (criteria.departmentId) query.set('departmentId', criteria.departmentId);
  if (criteria.programId) query.set('programId', criteria.programId);
  if (criteria.batchId) query.set('batchId', criteria.batchId);
  if (criteria.targetSemester) query.set('targetSemester', String(criteria.targetSemester));

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get(`/notices/audience-preview${qs}`);
}

export async function getNoticeAuditTrail(noticeId: string): Promise<{
  status: string;
  count: number;
  data: NoticeAuditLogDTO[];
}> {
  return apiClient.get(`/notices/${noticeId}/audit-trail`);
}

export function getNoticeAttachmentUrl(noticeId: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  return `${baseUrl}/notices/${noticeId}/attachment`;
}
