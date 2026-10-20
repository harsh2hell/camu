import { adminRepository } from '../repositories/admin.repository.js';
import type { UserRole } from '@prisma/client';

export class AdminService {
  async listUsers(filters: {
    role?: UserRole;
    isActive?: boolean;
    search?: string;
    page: number;
    limit: number;
  }) {
    return adminRepository.listUsers(filters);
  }

  async getUserDetails(userId: string) {
    return adminRepository.getUserDetails(userId);
  }

  async updateUserRole(params: {
    targetUserId: string;
    newRole: UserRole;
    reason: string;
    performedById: string;
    ipAddress?: string;
  }) {
    return adminRepository.updateUserRole(params);
  }

  async updateUserStatus(params: {
    targetUserId: string;
    isActive: boolean;
    reason: string;
    performedById: string;
    ipAddress?: string;
  }) {
    return adminRepository.updateUserStatus(params);
  }

  async listUserAuditLogs(filters: { targetUserId?: string; action?: string; limit: number }) {
    return adminRepository.listUserAuditLogs(filters);
  }

  async getSystemHealth() {
    return adminRepository.getSystemHealth();
  }
}

export const adminService = new AdminService();
