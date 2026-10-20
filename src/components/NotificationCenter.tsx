import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  FileText,
  BookOpen,
  Calendar,
  Receipt,
  LifeBuoy,
  Info,
  X,
  Clock,
} from 'lucide-react';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  type NotificationDTO,
  type NotificationType,
} from '../api/notifications';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string, resourceId?: string | null) => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | NotificationType>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const isReadParam = activeFilter === 'UNREAD' ? false : undefined;
      const typeParam =
        activeFilter !== 'ALL' && activeFilter !== 'UNREAD'
          ? (activeFilter as NotificationType)
          : undefined;

      const [listRes, countRes] = await Promise.all([
        getNotifications({
          isRead: isReadParam,
          type: typeParam,
          limit: 50,
          offset: 0,
        }),
        getUnreadNotificationCount(),
      ]);

      setNotifications(listRes.data.notifications);
      setUnreadCount(countRes.data.unreadCount);
      if (onUnreadCountChange) {
        onUnreadCountChange(countRes.data.unreadCount);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, onUnreadCountChange]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setActionLoadingId(id);
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        if (onUnreadCountChange) onUnreadCountChange(next);
        return next;
      });
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAllRead(true);
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
      if (onUnreadCountChange) onUnreadCountChange(0);
    } catch (err: any) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setActionLoadingId(id);
      await deleteNotification(id);
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.isRead) {
        setUnreadCount((prev) => {
          const next = Math.max(0, prev - 1);
          if (onUnreadCountChange) onUnreadCountChange(next);
          return next;
        });
      }
    } catch (err: any) {
      console.error('Failed to delete notification:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNotificationClick = async (notif: NotificationDTO) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif.id);
    }

    if (onNavigate) {
      if (notif.actionUrl) {
        // Parse destination tab from actionUrl (e.g. /student-dashboard?tab=notices)
        const match = notif.actionUrl.match(/tab=([^&]+)/);
        if (match && match[1]) {
          onNavigate(match[1], notif.resourceId);
          onClose();
          return;
        }
      }

      // Fallback by resourceType or type
      switch (notif.type) {
        case 'NOTICE':
          onNavigate('notices', notif.resourceId);
          break;
        case 'ASSIGNMENT':
          onNavigate('lms', notif.resourceId);
          break;
        case 'LEAVE_OD':
          onNavigate('leaves', notif.resourceId);
          break;
        case 'FINANCE':
          onNavigate('fees', notif.resourceId);
          break;
        case 'SUPPORT_TICKET':
          onNavigate('support', notif.resourceId);
          break;
        case 'ACADEMIC':
          onNavigate('timetable', notif.resourceId);
          break;
        default:
          break;
      }
      onClose();
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'NOTICE':
        return <FileText size={16} className="text-amber-500" />;
      case 'ASSIGNMENT':
        return <BookOpen size={16} className="text-blue-500" />;
      case 'LEAVE_OD':
        return <Calendar size={16} className="text-emerald-500" />;
      case 'FINANCE':
        return <Receipt size={16} className="text-purple-500" />;
      case 'SUPPORT_TICKET':
        return <LifeBuoy size={16} className="text-cyan-500" />;
      default:
        return <Info size={16} className="text-slate-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <span className="dbs-notif-pill pill-urgent">URGENT</span>;
      case 'HIGH':
        return <span className="dbs-notif-pill pill-high">HIGH</span>;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dbs-notif-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Notifications Center">
      <div className="dbs-notif-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dbs-notif-header">
          <div className="dbs-notif-title-row">
            <div className="dbs-notif-title-left">
              <div className="dbs-notif-bell-icon">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="dbs-notif-title">Communications &amp; Alerts</h3>
                <span className="dbs-notif-subtitle">
                  {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                </span>
              </div>
            </div>

            <div className="dbs-notif-header-actions">
              <button
                type="button"
                className="dbs-notif-icon-btn"
                title="Refresh notifications"
                onClick={fetchNotifications}
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  className="dbs-notif-text-btn"
                  onClick={handleMarkAllRead}
                  disabled={markingAllRead}
                >
                  <CheckCheck size={14} />
                  <span>Mark all read</span>
                </button>
              )}

              <button
                type="button"
                className="dbs-notif-close-btn"
                onClick={onClose}
                aria-label="Close notifications panel"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="dbs-notif-filters">
            {(['ALL', 'UNREAD', 'NOTICE', 'ASSIGNMENT', 'LEAVE_OD', 'FINANCE', 'SUPPORT_TICKET'] as const).map((filter) => {
              const label =
                filter === 'ALL'
                  ? 'All'
                  : filter === 'UNREAD'
                  ? `Unread (${unreadCount})`
                  : filter === 'LEAVE_OD'
                  ? 'Leave/OD'
                  : filter === 'SUPPORT_TICKET'
                  ? 'Support'
                  : filter.charAt(0) + filter.slice(1).toLowerCase();

              return (
                <button
                  key={filter}
                  type="button"
                  className={`dbs-notif-filter-btn ${activeFilter === filter ? 'active' : ''}`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="dbs-notif-body">
          {loading && notifications.length === 0 ? (
            <div className="dbs-notif-loading-state">
              <RefreshCw size={28} className="animate-spin text-blue-600 mb-3" />
              <p>Fetching notifications from Camu secure servers...</p>
            </div>
          ) : error ? (
            <div className="dbs-notif-error-state">
              <AlertCircle size={28} className="text-red-500 mb-2" />
              <p className="font-semibold text-red-600">{error}</p>
              <button
                type="button"
                className="dbs-notif-retry-btn"
                onClick={fetchNotifications}
              >
                Try Again
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="dbs-notif-empty-state">
              <div className="dbs-notif-empty-circle">
                <Bell size={32} className="text-slate-400" />
              </div>
              <h4>No notifications right now</h4>
              <p>
                {activeFilter === 'UNREAD'
                  ? 'You have read all pending messages and academic alerts.'
                  : 'New notices, assignment releases, fee receipts, and ticket updates will appear here.'}
              </p>
            </div>
          ) : (
            <div className="dbs-notif-list">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`dbs-notif-card ${!notif.isRead ? 'unread' : 'read'}`}
                  onClick={() => handleNotificationClick(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleNotificationClick(notif);
                    }
                  }}
                >
                  <div className="dbs-notif-card-header">
                    <div className="dbs-notif-card-icon-title">
                      <div className="dbs-notif-type-icon-wrapper">
                        {getTypeIcon(notif.type)}
                      </div>
                      <div className="dbs-notif-card-title-group">
                        <span className="dbs-notif-card-title">{notif.title}</span>
                        <div className="dbs-notif-meta-row">
                          <span className="dbs-notif-time-badge">
                            <Clock size={12} className="inline mr-1" />
                            {formatTimestamp(notif.createdAt)}
                          </span>
                          <span className="dbs-notif-type-tag">{notif.type.replace('_', ' ')}</span>
                          {getPriorityBadge(notif.priority)}
                        </div>
                      </div>
                    </div>

                    <div className="dbs-notif-card-actions" onClick={(e) => e.stopPropagation()}>
                      {!notif.isRead && (
                        <button
                          type="button"
                          className="dbs-notif-action-btn read"
                          title="Mark as read"
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          disabled={actionLoadingId === notif.id}
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="dbs-notif-action-btn delete"
                        title="Dismiss notification"
                        onClick={(e) => handleDelete(notif.id, e)}
                        disabled={actionLoadingId === notif.id}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="dbs-notif-card-message">{notif.message}</p>

                  <div className="dbs-notif-card-footer">
                    <span className="dbs-notif-view-link">
                      View details <ExternalLink size={12} className="inline ml-1" />
                    </span>
                    {!notif.isRead && <span className="dbs-unread-indicator" title="Unread" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
