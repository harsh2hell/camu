import { apiClient, type ApiResponse } from './client';

export interface SystemHealth {
  status: string;
  timestamp: string;
  database: {
    connected: boolean;
    provider: string;
  };
  paymentGateway: {
    status: string;
    notes: string;
  };
  metrics: {
    totalUsers: number;
    activeSessions: number;
    unresolvedTickets: number;
    totalApplications: number;
    departmentsCount: number;
    roleDistribution: Array<{ role: string; count: number }>;
  };
}

export interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  studentProfile?: {
    rollNumber: string;
    batch?: { program?: { name: string; code: string } };
  };
  facultyProfile?: {
    employeeCode: string;
    designation: string;
    department?: { name: string; code: string };
  };
}

export const adminApi = {
  async getSystemHealth() {
    return apiClient.get<ApiResponse<SystemHealth>>('/admin/system/health');
  },

  async listUsers(params?: { role?: string; isActive?: boolean; search?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return apiClient.get<ApiResponse<AdminUserItem[]> & { total: number; page: number; totalPages: number }>(
      `/admin/users?${query.toString()}`
    );
  },

  async getUserDetails(id: string) {
    return apiClient.get<ApiResponse<any>>(`/admin/users/${id}`);
  },

  async updateUserRole(id: string, role: string, reason: string) {
    return apiClient.patch<ApiResponse<any>>(`/admin/users/${id}/role`, { role, reason });
  },

  async updateUserStatus(id: string, isActive: boolean, reason: string) {
    return apiClient.patch<ApiResponse<any>>(`/admin/users/${id}/status`, { isActive, reason });
  },

  async getAuditLogs(params?: { targetUserId?: string; action?: string }) {
    const query = new URLSearchParams();
    if (params?.targetUserId) query.set('targetUserId', params.targetUserId);
    if (params?.action) query.set('action', params.action);
    return apiClient.get<ApiResponse<any[]>>(`/admin/audit-logs?${query.toString()}`);
  },
};
