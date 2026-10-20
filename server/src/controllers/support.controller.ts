import type { Request, Response, NextFunction } from 'express';
import { supportService } from '../services/support.service.js';
import { UnauthorizedError } from '../errors/AppError.js';
import type { UserRole } from '@prisma/client';
import type { TicketCategory, TicketStatus } from '../types/support.js';

export class SupportController {
  /**
   * POST /api/support/tickets
   * Create a new support ticket (Student only)
   */
  async createTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const ipAddress = req.ip || req.socket.remoteAddress;
      const ticket = await supportService.createTicket(
        { id: req.user.id, role: req.user.role as UserRole },
        req.body,
        ipAddress
      );

      res.status(201).json({
        success: true,
        status: 'success',
        message: `Ticket ${ticket.ticketNumber} submitted successfully.`,
        data: ticket,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/support/my-tickets
   * View authenticated student's own tickets with pagination
   */
  async getMyTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const status = req.query.status as TicketStatus | undefined;
      const category = req.query.category as TicketCategory | undefined;
      const search = req.query.search as string | undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

      const result = await supportService.getMyTickets(
        { id: req.user.id, role: req.user.role as UserRole },
        { status, category, search, limit, offset }
      );

      res.status(200).json({
        success: true,
        status: 'success',
        count: result.tickets.length,
        total: result.total,
        data: result.tickets,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/support/tickets/:ticketId
   * Get ticket details, conversation thread, and audit history
   */
  async getTicketDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const ticketId = String(req.params.ticketId);
      const detail = await supportService.getTicketDetail(
        { id: req.user.id, role: req.user.role as UserRole },
        ticketId
      );

      res.status(200).json({
        success: true,
        status: 'success',
        data: detail,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/support/tickets/:ticketId/messages
   * Add a reply or internal note to a ticket
   */
  async addMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const ticketId = String(req.params.ticketId);
      const ipAddress = req.ip || req.socket.remoteAddress;

      const message = await supportService.addMessage(
        { id: req.user.id, role: req.user.role as UserRole },
        ticketId,
        req.body,
        ipAddress
      );

      res.status(201).json({
        success: true,
        status: 'success',
        message: message.isInternal ? 'Internal staff note recorded.' : 'Reply sent successfully.',
        data: message,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/support/tickets/:ticketId/status
   * Update ticket status through validated state transitions
   */
  async updateTicketStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const ticketId = String(req.params.ticketId);
      const ipAddress = req.ip || req.socket.remoteAddress;

      const ticket = await supportService.updateTicketStatus(
        { id: req.user.id, role: req.user.role as UserRole },
        ticketId,
        req.body,
        ipAddress
      );

      res.status(200).json({
        success: true,
        status: 'success',
        message: `Ticket status transitioned to ${ticket.status}.`,
        data: ticket,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/support/tickets/:ticketId/reopen
   * Reopen a resolved ticket with mandatory reason
   */
  async reopenTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const ticketId = String(req.params.ticketId);
      const ipAddress = req.ip || req.socket.remoteAddress;

      const ticket = await supportService.reopenTicket(
        { id: req.user.id, role: req.user.role as UserRole },
        ticketId,
        req.body,
        ipAddress
      );

      res.status(200).json({
        success: true,
        status: 'success',
        message: `Ticket ${ticket.ticketNumber} reopened successfully.`,
        data: ticket,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/support/tickets/:ticketId/assign
   * Assign or reassign ticket to staff member
   */
  async assignTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const ticketId = String(req.params.ticketId);
      const ipAddress = req.ip || req.socket.remoteAddress;

      const ticket = await supportService.assignTicket(
        { id: req.user.id, role: req.user.role as UserRole },
        ticketId,
        req.body,
        ipAddress
      );

      res.status(200).json({
        success: true,
        status: 'success',
        message: ticket.assignedStaff
          ? `Ticket assigned to ${ticket.assignedStaff.fullName}.`
          : 'Ticket unassigned.',
        data: ticket,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/support/queue
   * Staff support queue with filtering and RBAC scoping
   */
  async getStaffQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const status = req.query.status as TicketStatus | undefined;
      const category = req.query.category as TicketCategory | undefined;
      const departmentId = req.query.departmentId as string | undefined;
      const assignedToMe = req.query.assignedToMe === 'true';
      const search = req.query.search as string | undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

      const result = await supportService.getStaffQueue(
        { id: req.user.id, role: req.user.role as UserRole },
        { status, category, departmentId, assignedToMe, search, limit, offset }
      );

      res.status(200).json({
        success: true,
        status: 'success',
        count: result.tickets.length,
        total: result.total,
        data: result.tickets,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/support/summary
   * Staff queue counts by status
   */
  async getQueueSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const summary = await supportService.getQueueSummary({
        id: req.user.id,
        role: req.user.role as UserRole,
      });

      res.status(200).json({
        success: true,
        status: 'success',
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/support/tickets/:ticketId/audit-trail
   * View immutable audit trail for a ticket
   */
  async getTicketAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const ticketId = String(req.params.ticketId);
      const logs = await supportService.getTicketAuditLogs(
        { id: req.user.id, role: req.user.role as UserRole },
        ticketId
      );

      res.status(200).json({
        success: true,
        status: 'success',
        count: logs.length,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const supportController = new SupportController();
