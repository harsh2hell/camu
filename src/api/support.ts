// Frontend API Client for Student Support & Helpdesk Module (Phase 10)

export type TicketCategory =
  | 'ACADEMIC'
  | 'EXAMINATION'
  | 'FINANCE'
  | 'HOSTEL'
  | 'FACILITY'
  | 'GENERAL'
  | 'ATTENDANCE'
  | 'IT_PORTAL'
  | 'FEES_FINANCE'
  | 'EXAMINATIONS'
  | 'HOSTEL_CAMPUS'
  | 'GENERAL_INQUIRY';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_STUDENT'
  | 'RESOLVED'
  | 'CLOSED';

export interface TicketUserDTO {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface TicketMessageDTO {
  id: string;
  ticketId: string;
  sender: TicketUserDTO;
  message: string;
  isInternal: boolean;
  attachmentFileKey: string | null;
  attachmentName: string | null;
  createdAt: string;
}

export interface TicketAuditLogDTO {
  id: string;
  ticketId: string;
  performedBy: TicketUserDTO;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  previousAssignee: TicketUserDTO | null;
  newAssignee: TicketUserDTO | null;
  reason: string | null;
  details: Record<string, any>;
  ipAddress: string | null;
  createdAt: string;
}

export interface SupportTicketDTO {
  id: string;
  ticketNumber: string;
  studentId: string;
  student: {
    id: string;
    fullName: string;
    email: string;
    rollNumber?: string;
    programName?: string;
    departmentName?: string;
    semester?: number;
  };
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  department: {
    id: string;
    code: string;
    name: string;
  } | null;
  assignedStaffId: string | null;
  assignedStaff: TicketUserDTO | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  resolvedBy: TicketUserDTO | null;
  closedAt: string | null;
  closedBy: TicketUserDTO | null;
  reopenedAt: string | null;
  reopenedBy: TicketUserDTO | null;
  reopenReason: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetailDTO extends SupportTicketDTO {
  messages: TicketMessageDTO[];
  auditLogs: TicketAuditLogDTO[];
}

export interface TicketQueueSummaryDTO {
  totalOpen: number;
  totalInProgress: number;
  totalWaitingForStudent: number;
  totalResolved: number;
  totalClosed: number;
  totalAssignedToMe: number;
  recentCount: number;
}

export interface CreateTicketPayload {
  category: TicketCategory;
  priority?: TicketPriority;
  subject: string;
  description: string;
  departmentId?: string | null;
  attachmentFileKey?: string | null;
  attachmentName?: string | null;
}

export interface AddMessagePayload {
  message: string;
  isInternal?: boolean;
  attachmentFileKey?: string | null;
  attachmentName?: string | null;
}

export interface UpdateStatusPayload {
  status: TicketStatus;
  reason?: string;
  resolutionNotes?: string;
}

export interface ReopenTicketPayload {
  reason: string;
}

export interface AssignTicketPayload {
  assignedStaffId: string | null;
  reason?: string;
}

export async function createTicket(payload: CreateTicketPayload): Promise<SupportTicketDTO> {
  const res = await fetch('/api/support/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || json.message || 'Failed to create support ticket');
  }
  return json.data;
}

export async function getMyTickets(params?: {
  status?: TicketStatus;
  category?: TicketCategory;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ tickets: SupportTicketDTO[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));

  const res = await fetch(`/api/support/my-tickets?${query.toString()}`, {
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to fetch support tickets');
  }
  return { tickets: json.data || [], total: json.total || 0 };
}

export async function getTicketDetail(ticketId: string): Promise<TicketDetailDTO> {
  const res = await fetch(`/api/support/tickets/${ticketId}`, {
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to fetch ticket details');
  }
  return json.data;
}

export async function addTicketMessage(
  ticketId: string,
  payload: AddMessagePayload
): Promise<TicketMessageDTO> {
  const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || json.message || 'Failed to send message');
  }
  return json.data;
}

export async function updateTicketStatus(
  ticketId: string,
  payload: UpdateStatusPayload
): Promise<SupportTicketDTO> {
  const res = await fetch(`/api/support/tickets/${ticketId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || json.message || 'Failed to update ticket status');
  }
  return json.data;
}

export async function reopenTicket(
  ticketId: string,
  payload: ReopenTicketPayload
): Promise<SupportTicketDTO> {
  const res = await fetch(`/api/support/tickets/${ticketId}/reopen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || json.message || 'Failed to reopen ticket');
  }
  return json.data;
}

export async function assignTicket(
  ticketId: string,
  payload: AssignTicketPayload
): Promise<SupportTicketDTO> {
  const res = await fetch(`/api/support/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || json.message || 'Failed to assign ticket');
  }
  return json.data;
}

export async function getStaffQueue(params?: {
  status?: TicketStatus;
  category?: TicketCategory;
  departmentId?: string;
  assignedToMe?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ tickets: SupportTicketDTO[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);
  if (params?.departmentId) query.set('departmentId', params.departmentId);
  if (params?.assignedToMe) query.set('assignedToMe', 'true');
  if (params?.search) query.set('search', params.search);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));

  const res = await fetch(`/api/support/queue?${query.toString()}`, {
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to fetch staff queue');
  }
  return { tickets: json.data || [], total: json.total || 0 };
}

export async function getQueueSummary(): Promise<TicketQueueSummaryDTO> {
  const res = await fetch('/api/support/summary', {
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to fetch queue statistics');
  }
  return json.data;
}

export async function getTicketAuditTrail(ticketId: string): Promise<TicketAuditLogDTO[]> {
  const res = await fetch(`/api/support/tickets/${ticketId}/audit-trail`, {
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to fetch ticket audit history');
  }
  return json.data || [];
}
