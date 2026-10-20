import { apiClient } from './client';

export type LeaveCategory = 'LEAVE' | 'ON_DUTY';

export type LeaveStatus =
  | 'PENDING'
  | 'RECOMMENDED_BY_MENTOR'
  | 'APPROVED_BY_HOD'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'NEEDS_CORRECTION';

export interface LeaveAuditLogDTO {
  id: string;
  applicationId: string;
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

export interface LeaveApplicationDTO {
  id: string;
  studentId: string;
  studentName: string;
  studentRollNumber: string;
  studentEmail?: string;
  departmentName?: string;
  category: LeaveCategory;
  leaveType: string;
  title: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  supportingDocUrl?: string | null;
  supportingFileKey?: string | null;
  hasSupportingDocument: boolean;
  status: LeaveStatus;
  assignedApproverId?: string | null;
  assignedApproverName?: string | null;
  approvedBy?: string | null;
  approverName?: string | null;
  decisionReason?: string | null;
  decidedAt?: string | null;
  withdrawnAt?: string | null;
  withdrawalReason?: string | null;
  mentorRemarks?: string | null;
  hodRemarks?: string | null;
  auditLogs?: LeaveAuditLogDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface LeaveListResponse {
  status: string;
  count: number;
  data: LeaveApplicationDTO[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface SingleLeaveResponse {
  status: string;
  data: LeaveApplicationDTO;
  message?: string;
}

export interface CreateLeaveInput {
  category: LeaveCategory;
  leaveType: string;
  title: string;
  startDate: string;
  endDate: string;
  reason: string;
  fileData?: string;
  fileName?: string;
  supportingDocKey?: string;
}

export interface ResubmitLeaveInput {
  title?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  fileData?: string;
  fileName?: string;
  supportingDocKey?: string;
}

export interface DecideLeaveInput {
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION';
  reason?: string;
}

export async function createLeaveApplication(input: CreateLeaveInput): Promise<SingleLeaveResponse> {
  return apiClient.post<SingleLeaveResponse>('/leave-od/applications', input);
}

export async function getStudentApplications(params?: {
  status?: LeaveStatus;
  category?: LeaveCategory;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<LeaveListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<LeaveListResponse>(`/leave-od/applications${qs}`);
}

export async function getApplicationDetails(applicationId: string): Promise<SingleLeaveResponse> {
  return apiClient.get<SingleLeaveResponse>(`/leave-od/applications/${applicationId}`);
}

export async function withdrawApplication(
  applicationId: string,
  reason?: string
): Promise<SingleLeaveResponse> {
  return apiClient.post<SingleLeaveResponse>(`/leave-od/applications/${applicationId}/withdraw`, {
    reason: reason || undefined,
  });
}

export async function resubmitApplication(
  applicationId: string,
  input: ResubmitLeaveInput
): Promise<SingleLeaveResponse> {
  return apiClient.patch<SingleLeaveResponse>(`/leave-od/applications/${applicationId}/resubmit`, input);
}

export async function getPendingApprovals(params?: {
  category?: LeaveCategory;
  startDate?: string;
  endDate?: string;
  studentId?: string;
  page?: number;
  limit?: number;
}): Promise<LeaveListResponse> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.studentId) query.set('studentId', params.studentId);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<LeaveListResponse>(`/leave-od/approvals/pending${qs}`);
}

export async function getApproverHistory(params?: {
  status?: LeaveStatus;
  category?: LeaveCategory;
  page?: number;
  limit?: number;
}): Promise<LeaveListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<LeaveListResponse>(`/leave-od/approvals/history${qs}`);
}

export async function decideApplication(
  applicationId: string,
  input: DecideLeaveInput
): Promise<SingleLeaveResponse> {
  return apiClient.post<SingleLeaveResponse>(`/leave-od/approvals/${applicationId}/decide`, input);
}

export async function getApplicationAuditTrail(applicationId: string): Promise<{
  status: string;
  count: number;
  data: LeaveAuditLogDTO[];
}> {
  return apiClient.get(`/leave-od/applications/${applicationId}/audit-trail`);
}

export function getDocumentDownloadUrl(applicationId: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || '/api';
  return `${baseUrl}/leave-od/applications/${applicationId}/document`;
}
