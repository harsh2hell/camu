import React, { useState, useEffect } from 'react';
import { 
  adminApi, 
  type SystemHealth, 
  type AdminUserItem 
} from '../api/admin';
import { 
  ShieldCheck, 
  Users, 
  Activity, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Search,
  Filter,
  UserX,
  UserCheck,
  Edit2,
  FileText
} from 'lucide-react';

export const SuperAdminWorkspaceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'health' | 'audits'>('users');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Role Modal State
  const [selectedUserForRole, setSelectedUserForRole] = useState<AdminUserItem | null>(null);
  const [newRole, setNewRole] = useState<string>('STUDENT');
  const [roleReason, setRoleReason] = useState<string>('');

  // Status Change Modal State
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<AdminUserItem | null>(null);
  const [statusReason, setStatusReason] = useState<string>('');

  const fetchHealth = async () => {
    try {
      const res = await adminApi.getSystemHealth();
      setHealth(res.data);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch platform health' });
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listUsers({ search, role: roleFilter || undefined });
      setUsers(res.data || []);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch user list' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await adminApi.getAuditLogs();
      setAuditLogs(res.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchUsers();
    fetchAuditLogs();
  }, [roleFilter]);

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForRole) return;
    if (!roleReason || roleReason.trim().length < 5) {
      setStatusMessage({ type: 'error', text: 'Mandatory justification reason (min 5 chars) required' });
      return;
    }
    try {
      await adminApi.updateUserRole(selectedUserForRole.id, newRole, roleReason);
      setStatusMessage({ type: 'success', text: `Role for ${selectedUserForRole.fullName} updated to ${newRole}` });
      setSelectedUserForRole(null);
      setRoleReason('');
      fetchUsers();
      fetchAuditLogs();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update role' });
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForStatus) return;
    if (!statusReason || statusReason.trim().length < 5) {
      setStatusMessage({ type: 'error', text: 'Mandatory justification reason (min 5 chars) required' });
      return;
    }
    const targetStatus = !selectedUserForStatus.isActive;
    try {
      await adminApi.updateUserStatus(selectedUserForStatus.id, targetStatus, statusReason);
      setStatusMessage({ 
        type: 'success', 
        text: `Account for ${selectedUserForStatus.fullName} ${targetStatus ? 'reactivated' : 'suspended and sessions revoked'}` 
      });
      setSelectedUserForStatus(null);
      setStatusReason('');
      fetchUsers();
      fetchAuditLogs();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to modify account status' });
    }
  };

  return (
    <div className="workspace-container">
      {/* Header */}
      <div className="workspace-header">
        <div>
          <h1 className="workspace-title">Super-Administrator Central Governance Portal</h1>
          <p className="workspace-subtitle">Institutional RBAC, User Administration &amp; Platform Health Diagnostics</p>
        </div>
        <div className="workspace-actions">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={() => { fetchHealth(); fetchUsers(); fetchAuditLogs(); }} 
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`alert-banner ${statusMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="alert-close">&times;</button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="nav-subtabs">
        <button 
          className={`subtab-btn ${activeTab === 'users' ? 'subtab-active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          <span>User Accounts &amp; RBAC ({users.length})</span>
        </button>
        <button 
          className={`subtab-btn ${activeTab === 'health' ? 'subtab-active' : ''}`}
          onClick={() => setActiveTab('health')}
        >
          <Activity size={16} />
          <span>Platform Health &amp; Integrations</span>
        </button>
        <button 
          className={`subtab-btn ${activeTab === 'audits' ? 'subtab-active' : ''}`}
          onClick={() => setActiveTab('audits')}
        >
          <FileText size={16} />
          <span>Security Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* Health & Diagnostics View */}
      {activeTab === 'health' && health && (
        <div className="health-container">
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon-wrapper bg-emerald-100 text-emerald-700">
                <ShieldCheck size={22} />
              </div>
              <div>
                <span className="kpi-label">Core Database</span>
                <span className="kpi-val text-emerald-700">PostgreSQL Live</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-wrapper bg-amber-100 text-amber-700">
                <AlertCircle size={22} />
              </div>
              <div>
                <span className="kpi-label">Payment Gateway</span>
                <span className="kpi-val text-amber-700">UNCONFIGURED</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-wrapper bg-blue-100 text-blue-700">
                <Users size={22} />
              </div>
              <div>
                <span className="kpi-label">Total Users</span>
                <span className="kpi-val">{health.metrics.totalUsers}</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-wrapper bg-purple-100 text-purple-700">
                <Lock size={22} />
              </div>
              <div>
                <span className="kpi-label">Active Sessions</span>
                <span className="kpi-val">{health.metrics.activeSessions}</span>
              </div>
            </div>
          </div>

          <div className="health-details-card">
            <h2>Payment Gateway Enforcement Notice</h2>
            <p className="notice-text">
              {health.paymentGateway.notes}
            </p>
            <div className="role-distribution-card">
              <h3>Institutional Role Distribution</h3>
              <div className="distribution-badges">
                {health.metrics.roleDistribution.map((rd) => (
                  <div key={rd.role} className="dist-item">
                    <span className="dist-role">{rd.role}</span>
                    <span className="dist-count">{rd.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users & RBAC View */}
      {activeTab === 'users' && (
        <div>
          <div className="filter-card">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search user by name or institutional email..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <button type="button" className="btn-secondary" onClick={fetchUsers}>Search</button>

            <div className="status-filter-wrapper">
              <Filter size={16} />
              <select 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">All Roles</option>
                <option value="STUDENT">STUDENT</option>
                <option value="FACULTY">FACULTY</option>
                <option value="HOD">HOD</option>
                <option value="DEAN">DEAN</option>
                <option value="REGISTRAR_ADMIN">REGISTRAR ADMIN</option>
                <option value="ADMISSIONS_OFFICER">ADMISSIONS OFFICER</option>
                <option value="FINANCE_OFFICER">FINANCE OFFICER</option>
                <option value="IT_SUPPORT">IT SUPPORT</option>
                <option value="SUPER_ADMIN">SUPER ADMIN</option>
              </select>
            </div>
          </div>

          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Institutional Email</th>
                  <th>Assigned Role</th>
                  <th>Identifier / Code</th>
                  <th>Account Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-bold text-slate-900">{u.fullName}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge role-${u.role.toLowerCase()}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="font-mono text-xs">
                      {u.studentProfile?.rollNumber || u.facultyProfile?.employeeCode || 'STAFF'}
                    </td>
                    <td>
                      <span className={`status-pill ${u.isActive ? 'status-active' : 'status-inactive'}`}>
                        {u.isActive ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons-cell">
                        <button 
                          className="btn-cell btn-cell-edit"
                          title="Modify Role"
                          onClick={() => {
                            setSelectedUserForRole(u);
                            setNewRole(u.role);
                          }}
                        >
                          <Edit2 size={14} />
                          <span>Role</span>
                        </button>
                        <button 
                          className={`btn-cell ${u.isActive ? 'btn-cell-suspend' : 'btn-cell-activate'}`}
                          title={u.isActive ? 'Suspend Account' : 'Reactivate Account'}
                          onClick={() => setSelectedUserForStatus(u)}
                        >
                          {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                          <span>{u.isActive ? 'Suspend' : 'Activate'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audits View */}
      {activeTab === 'audits' && (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Target User</th>
                <th>Previous Role</th>
                <th>New Role</th>
                <th>Authorized Actor</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-500">
                    No privileged administrative mutations recorded.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-bold text-slate-800">{log.action}</td>
                    <td>{log.targetUser?.fullName} ({log.targetUser?.email})</td>
                    <td>{log.previousRole || 'N/A'}</td>
                    <td><span className="font-bold text-burgundy">{log.newRole || 'N/A'}</span></td>
                    <td>{log.performedBy?.fullName} ({log.performedBy?.role})</td>
                    <td className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modify Role Modal */}
      {selectedUserForRole && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Modify User Role &bull; {selectedUserForRole.fullName}</h2>
              <button onClick={() => setSelectedUserForRole(null)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleUpdateRole} className="modal-form">
              <div className="form-group">
                <label>Current Assigned Role</label>
                <input type="text" disabled value={selectedUserForRole.role} />
              </div>

              <div className="form-group">
                <label>Target Role Assignment</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  <option value="STUDENT">STUDENT</option>
                  <option value="FACULTY">FACULTY</option>
                  <option value="HOD">HOD</option>
                  <option value="DEAN">DEAN</option>
                  <option value="REGISTRAR_ADMIN">REGISTRAR_ADMIN</option>
                  <option value="ADMISSIONS_OFFICER">ADMISSIONS_OFFICER</option>
                  <option value="FINANCE_OFFICER">FINANCE_OFFICER</option>
                  <option value="IT_SUPPORT">IT_SUPPORT</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>

              <div className="form-group">
                <label>Administrative Reason (Mandatory &bull; min 5 chars)</label>
                <textarea 
                  required 
                  rows={3}
                  placeholder="e.g. Authorized appointment by University Vice Chancellor"
                  value={roleReason}
                  onChange={(e) => setRoleReason(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setSelectedUserForRole(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Commit Role Change</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend / Activate Modal */}
      {selectedUserForStatus && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedUserForStatus.isActive ? 'Suspend Account' : 'Reactivate Account'}</h2>
              <button onClick={() => setSelectedUserForStatus(null)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleUpdateStatus} className="modal-form">
              <p className="notice-text">
                {selectedUserForStatus.isActive 
                  ? `Suspending ${selectedUserForStatus.fullName} (${selectedUserForStatus.email}) will immediately terminate all active authenticated sessions and block access across all university portals.`
                  : `Reactivating ${selectedUserForStatus.fullName} will restore authorized login capability.`}
              </p>

              <div className="form-group">
                <label>Administrative Reason (Mandatory &bull; min 5 chars)</label>
                <textarea 
                  required 
                  rows={3}
                  placeholder="e.g. Disciplinary suspension pending academic review"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setSelectedUserForStatus(null)}>Cancel</button>
                <button 
                  type="submit" 
                  className={`btn-primary ${selectedUserForStatus.isActive ? 'bg-red-700' : ''}`}
                >
                  {selectedUserForStatus.isActive ? 'Confirm Account Suspension' : 'Confirm Reactivation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .workspace-container {
          padding: 24px;
          max-width: 1380px;
          margin: 0 auto;
        }
        .workspace-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 16px;
        }
        .workspace-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .workspace-subtitle {
          font-size: 0.88rem;
          color: #64748b;
          margin: 4px 0 0 0;
        }
        .workspace-actions {
          display: flex;
          gap: 12px;
        }
        .btn-primary {
          background: #562b63;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-secondary {
          background: #fff;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .kpi-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .kpi-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kpi-label {
          display: block;
          font-size: 0.78rem;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .kpi-val {
          font-size: 1.4rem;
          font-weight: 700;
          color: #1e293b;
        }
        .nav-subtabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 2px solid #e2e8f0;
        }
        .subtab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
        }
        .subtab-active {
          color: #562b63;
          border-bottom-color: #562b63;
        }
        .filter-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .search-input-wrapper {
          position: relative;
          flex: 1;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .search-input {
          width: 100%;
          padding: 8px 12px 8px 38px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.88rem;
        }
        .status-filter-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
        }
        .filter-select {
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.88rem;
          background: #fff;
        }
        .table-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
        }
        .data-table th {
          background: #f8fafc;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
        }
        .data-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .role-badge {
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 0.72rem;
          font-weight: 700;
          background: #ede9fe;
          color: #6d28d9;
        }
        .status-pill {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.72rem;
          font-weight: 600;
        }
        .status-active { background: #dcfce7; color: #15803d; }
        .status-inactive { background: #fee2e2; color: #b91c1c; }
        .action-buttons-cell {
          display: flex;
          gap: 8px;
        }
        .btn-cell {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid #cbd5e1;
          background: #fff;
        }
        .btn-cell-edit:hover { background: #f8fafc; border-color: #562b63; color: #562b63; }
        .btn-cell-suspend { color: #b91c1c; border-color: #fecaca; }
        .btn-cell-suspend:hover { background: #fee2e2; }
        .btn-cell-activate { color: #15803d; border-color: #bbf7d0; }
        .btn-cell-activate:hover { background: #dcfce7; }
        .health-details-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 24px;
        }
        .health-details-card h2 {
          font-size: 1.15rem;
          margin: 0 0 8px 0;
          color: #1e293b;
        }
        .notice-text {
          font-size: 0.88rem;
          color: #64748b;
          line-height: 1.5;
          margin-bottom: 20px;
        }
        .distribution-badges {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .dist-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 8px 14px;
          border-radius: 6px;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .dist-role { font-weight: 600; font-size: 0.82rem; color: #334155; }
        .dist-count { background: #562b63; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #fff;
          border-radius: 10px;
          width: 520px;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .modal-header h2 { font-size: 1.2rem; margin: 0; }
        .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
        .modal-form { display: flex; flex-direction: column; gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.82rem; font-weight: 600; color: #475569; }
        .form-group input, .form-group select, .form-group textarea {
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.88rem;
        }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
        .alert-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 0.9rem;
        }
        .alert-success { background: #dcfce7; color: #166534; }
        .alert-error { background: #fee2e2; color: #991b1b; }
        .alert-close { margin-left: auto; background: none; border: none; font-size: 1.2rem; cursor: pointer; }
        .bg-red-700 { background: #b91c1c; }
        .bg-red-700:hover { background: #991b1b; }
        .font-mono { font-family: monospace; }
        .font-bold { font-weight: 700; }
        .text-burgundy { color: #562b63; }
      `}</style>
    </div>
  );
};
