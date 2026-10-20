import { prisma } from '../lib/prisma.js';
import { NotFoundError, BadRequestError } from '../errors/AppError.js';
import type { UserRole, Prisma } from '@prisma/client';

export class AdminRepository {
  async listUsers(filters: {
    role?: UserRole;
    isActive?: boolean;
    search?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.UserWhereInput = {};
    if (filters.role) where.role = filters.role;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const skip = (filters.page - 1) * filters.limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          studentProfile: {
            select: {
              rollNumber: true,
              batch: { select: { program: { select: { name: true, code: true } } } },
            },
          },
          facultyProfile: {
            select: {
              employeeCode: true,
              designation: true,
              department: { select: { name: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page: filters.page,
      totalPages: Math.ceil(total / filters.limit),
    };
  }

  async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: {
            batch: { include: { program: { include: { department: true } } } },
            section: true,
          },
        },
        facultyProfile: {
          include: {
            department: true,
          },
        },
        sessions: {
          where: { expiresAt: { gt: new Date() } },
          select: { id: true, createdAt: true, expiresAt: true },
        },
        targetUserAudits: {
          include: {
            performedBy: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Omit sensitive passwordHash
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async updateUserRole(params: {
    targetUserId: string;
    newRole: UserRole;
    reason: string;
    performedById: string;
    ipAddress?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: params.targetUserId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (user.id === params.performedById) {
        throw new BadRequestError('Administrators cannot modify their own administrative role');
      }

      const previousRole = user.role;

      const updated = await tx.user.update({
        where: { id: params.targetUserId },
        data: { role: params.newRole },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
        },
      });

      const audit = await tx.userAuditLog.create({
        data: {
          targetUserId: params.targetUserId,
          performedById: params.performedById,
          action: 'ROLE_CHANGE',
          previousRole,
          newRole: params.newRole,
          details: { reason: params.reason },
          ipAddress: params.ipAddress || null,
        },
      });

      return { user: updated, audit };
    });
  }

  async updateUserStatus(params: {
    targetUserId: string;
    isActive: boolean;
    reason: string;
    performedById: string;
    ipAddress?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: params.targetUserId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (user.id === params.performedById && !params.isActive) {
        throw new BadRequestError('Administrators cannot suspend their own account');
      }

      const updated = await tx.user.update({
        where: { id: params.targetUserId },
        data: { isActive: params.isActive },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
        },
      });

      // If suspended, invalidate all active sessions immediately
      if (!params.isActive) {
        await tx.session.deleteMany({
          where: { userId: params.targetUserId },
        });
      }

      const audit = await tx.userAuditLog.create({
        data: {
          targetUserId: params.targetUserId,
          performedById: params.performedById,
          action: 'STATUS_CHANGE',
          previousRole: user.role,
          newRole: user.role,
          details: {
            previousActive: user.isActive,
            newActive: params.isActive,
            reason: params.reason,
            sessionsInvalidated: !params.isActive,
          },
          ipAddress: params.ipAddress || null,
        },
      });

      return { user: updated, audit };
    });
  }

  async listUserAuditLogs(filters: { targetUserId?: string; action?: string; limit: number }) {
    const where: Prisma.UserAuditLogWhereInput = {};
    if (filters.targetUserId) where.targetUserId = filters.targetUserId;
    if (filters.action) where.action = filters.action;

    return prisma.userAuditLog.findMany({
      where,
      include: {
        targetUser: { select: { id: true, fullName: true, email: true, role: true } },
        performedBy: { select: { id: true, fullName: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit,
    });
  }

  async getSystemHealth() {
    const [
      totalUsers,
      activeSessions,
      roleDistribution,
      applicationsCount,
      unresolvedTickets,
      departmentsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      prisma.admissionApplication.count(),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_ON_STUDENT'] } } }),
      prisma.department.count(),
    ]);

    return {
      status: 'OPERATIONAL',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        provider: 'PostgreSQL',
      },
      paymentGateway: {
        status: 'GATEWAY_UNCONFIGURED',
        notes: 'Online student fee payments strictly enforce configured gateway checks. Offline reconciliation is active.',
      },
      metrics: {
        totalUsers,
        activeSessions,
        unresolvedTickets,
        totalApplications: applicationsCount,
        departmentsCount,
        roleDistribution: roleDistribution.map((r) => ({ role: r.role, count: r._count.id })),
      },
    };
  }
}

export const adminRepository = new AdminRepository();
