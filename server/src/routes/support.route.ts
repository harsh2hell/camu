import { Router } from 'express';
import { supportController } from '../controllers/support.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import {
  createTicketSchema,
  addMessageSchema,
  updateTicketStatusSchema,
  assignTicketSchema,
  reopenTicketSchema,
} from '../types/support.js';

export const supportRouter: Router = Router();

// ==========================================
// Student Ticket Operations
// ==========================================

// Create a new support ticket (Student only)
supportRouter.post(
  '/tickets',
  requireAuth,
  requireRole('STUDENT'),
  validate({ body: createTicketSchema }),
  (req, res, next) => supportController.createTicket(req, res, next)
);

// View current student's own tickets
supportRouter.get(
  '/my-tickets',
  requireAuth,
  requireRole('STUDENT'),
  (req, res, next) => supportController.getMyTickets(req, res, next)
);

// ==========================================
// Shared Ticket & Conversation Operations
// ==========================================

// Get ticket details with conversation thread & audit history
supportRouter.get(
  '/tickets/:ticketId',
  requireAuth,
  (req, res, next) => supportController.getTicketDetail(req, res, next)
);

// Add a reply or internal note to a ticket
supportRouter.post(
  '/tickets/:ticketId/messages',
  requireAuth,
  validate({ body: addMessageSchema }),
  (req, res, next) => supportController.addMessage(req, res, next)
);

// Reopen a resolved ticket with mandatory reason
supportRouter.post(
  '/tickets/:ticketId/reopen',
  requireAuth,
  validate({ body: reopenTicketSchema }),
  (req, res, next) => supportController.reopenTicket(req, res, next)
);

// View immutable audit trail for a ticket
supportRouter.get(
  '/tickets/:ticketId/audit-trail',
  requireAuth,
  (req, res, next) => supportController.getTicketAuditLogs(req, res, next)
);

// ==========================================
// Staff Helpdesk Queue & Management Operations
// ==========================================

// Staff queue summary counts
supportRouter.get(
  ['/summary', '/queue/summary'],
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN', 'EXAM_CONTROLLER', 'IT_SUPPORT', 'SUPER_ADMIN'),
  (req, res, next) => supportController.getQueueSummary(req, res, next)
);

// Staff support queue with filtering and RBAC scoping
supportRouter.get(
  '/queue',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN', 'EXAM_CONTROLLER', 'IT_SUPPORT', 'SUPER_ADMIN'),
  (req, res, next) => supportController.getStaffQueue(req, res, next)
);

// Update ticket status through validated state transitions
supportRouter.patch(
  '/tickets/:ticketId/status',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN', 'EXAM_CONTROLLER', 'IT_SUPPORT', 'SUPER_ADMIN'),
  validate({ body: updateTicketStatusSchema }),
  (req, res, next) => supportController.updateTicketStatus(req, res, next)
);

// Assign or reassign ticket (accepts both PATCH and POST)
supportRouter.all(
  '/tickets/:ticketId/assign',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN', 'EXAM_CONTROLLER', 'IT_SUPPORT', 'SUPER_ADMIN'),
  validate({ body: assignTicketSchema }),
  (req, res, next) => {
    if (req.method === 'PATCH' || req.method === 'POST') {
      return supportController.assignTicket(req, res, next);
    }
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
);
