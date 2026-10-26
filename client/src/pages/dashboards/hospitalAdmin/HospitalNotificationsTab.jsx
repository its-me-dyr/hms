import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  Info,
  Calendar,
  CreditCard,
  Building2,
} from 'lucide-react';
import { hospitalAdminService } from '../../../services/hospitalAdmin.service';

/**
 * HospitalNotificationsTab
 * 
 * Focused, production-ready, read-only Notification Inbox for Hospital Admins.
 * 
 * Displays:
 * 1. Authoritative notification inbox from MongoDB Notification collection.
 * 2. Visual distinction between unread and read states.
 * 3. Individual "Mark as read" and batch "Mark all as read".
 * 4. Synchronization with the global DashboardLayout topbar notification bell.
 * 5. Clean empty, loading skeleton, and error/retry states.
 */
export default function HospitalNotificationsTab({ onNavigateTab }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState(null);

  const fetchNotifications = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await hospitalAdminService.getNotifications();
      // Handle both unwrapped { success, data: { notifications, unreadCount } } and raw Axios responses
      const payload = res?.data?.data || res?.data || res || {};
      const notifs = payload.notifications || (Array.isArray(payload) ? payload : []);
      const count = typeof payload.unreadCount === 'number'
        ? payload.unreadCount
        : notifs.filter((n) => !n.isRead).length;

      setNotifications(notifs);
      setUnreadCount(count);

      // Sync with DashboardLayout topbar bell
      window.dispatchEvent(
        new CustomEvent('hms:notification-update', { detail: { count } })
      );
    } catch (err) {
      console.error('Error fetching hospital admin notifications:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to load notifications.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark a single notification as read
  const handleMarkSingleRead = async (id) => {
    if (markingId === id) return;
    setMarkingId(id);

    try {
      const res = await hospitalAdminService.markNotificationRead(id);
      const payload = res?.data?.data || res?.data || res || {};
      const updatedList = notifications.map((n) =>
        n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      );
      const newCount = typeof payload.unreadCount === 'number'
        ? payload.unreadCount
        : Math.max(0, unreadCount - 1);

      setNotifications(updatedList);
      setUnreadCount(newCount);

      // Synchronize with topbar bell
      window.dispatchEvent(
        new CustomEvent('hms:notification-update', { detail: { count: newCount } })
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    } finally {
      setMarkingId(null);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);

    try {
      await hospitalAdminService.markAllNotificationsRead();
      const updatedList = notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt || new Date().toISOString(),
      }));

      setNotifications(updatedList);
      setUnreadCount(0);

      // Synchronize with topbar bell
      window.dispatchEvent(
        new CustomEvent('hms:notification-update', { detail: { count: 0 } })
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Format date helper
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Icon selector based on notification type
  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'security':
        return <ShieldAlert size={16} color="#ef4444" />;
      case 'appointment':
        return <Calendar size={16} color="#0891B2" />;
      case 'billing':
        return <CreditCard size={16} color="#10b981" />;
      case 'hospital':
      case 'admin':
        return <Building2 size={16} color="#8b5cf6" />;
      default:
        return <Info size={16} color="#0891B2" />;
    }
  };

  return (
    <div className="ha-notifications-tab">
      {/* ─── Page Header ────────────────────────────────────────── */}
      <div className="ha-page-header">
        <div className="ha-page-header__left">
          <h1 className="ha-page-title" id="notifications-title">Notifications</h1>
          <p className="ha-page-description">
            View important administrative and system notifications.
          </p>
        </div>
        <div className="ha-page-header__right" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <span
              className="ha-badge ha-badge--warning"
              style={{ fontWeight: 600, padding: '0.35rem 0.65rem' }}
            >
              {unreadCount} {unreadCount === 1 ? 'Unread' : 'Unread'}
            </span>
          )}

          {unreadCount > 0 && (
            <button
              type="button"
              className="ha-btn ha-btn--secondary ha-btn--sm"
              onClick={handleMarkAllRead}
              disabled={markingAll || loading || refreshing}
              aria-label="Mark all notifications as read"
              id="mark-all-read-btn"
            >
              <CheckCheck size={14} aria-hidden="true" />
              {markingAll ? 'Marking read...' : 'Mark all as read'}
            </button>
          )}

          <button
            type="button"
            className="ha-btn ha-btn--secondary ha-btn--sm"
            onClick={() => fetchNotifications(true)}
            disabled={loading || refreshing}
            aria-label="Refresh notification inbox"
            id="refresh-notifs-btn"
          >
            <RotateCcw
              size={14}
              className={refreshing ? 'ha-spin' : ''}
              aria-hidden="true"
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ─── Error State ────────────────────────────────────────── */}
      {error && (
        <div
          className="ha-panel"
          style={{
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.04)',
            marginBottom: '1.5rem',
          }}
          role="alert"
        >
          <div
            className="ha-panel__body"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={22} color="#ef4444" aria-hidden="true" />
              <div>
                <strong style={{ color: '#ef4444', fontSize: '0.9375rem', display: 'block' }}>
                  Unable to load notifications.
                </strong>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {error}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="ha-btn ha-btn--secondary ha-btn--sm"
              onClick={() => fetchNotifications(false)}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ─── Loading Skeleton ───────────────────────────────────── */}
      {loading && !refreshing && notifications.length === 0 && (
        <div className="ha-panel" style={{ opacity: 0.6 }}>
          <div className="ha-panel__header">
            <div style={{ height: '18px', width: '220px', background: 'var(--border-color)', borderRadius: '4px' }} />
          </div>
          <div className="ha-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: '70px',
                  background: 'var(--bg-body)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── Notification List Panel ────────────────────────────── */}
      {!loading && !error && (
        <div className="ha-panel">
          <div className="ha-panel__header">
            <h2 className="ha-panel__title" id="notif-inbox-heading">
              <Bell size={18} color="#0891B2" aria-hidden="true" />
              Administrative Inbox ({notifications.length})
            </h2>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </span>
          </div>

          <div>
            {notifications.length === 0 ? (
              /* ─── Empty State ──────────────────────────────────── */
              <div
                style={{
                  textAlign: 'center',
                  padding: '3.5rem 1.5rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(8, 145, 178, 0.08)',
                    color: '#0891B2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}
                >
                  <CheckCircle2 size={24} />
                </div>
                <h3
                  style={{
                    fontSize: '1.0625rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: '0 0 0.35rem 0',
                  }}
                >
                  You&apos;re all caught up
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  No new administrative or system notifications.
                </p>
              </div>
            ) : (
              /* ─── Notification Items ────────────────────────────── */
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.map((item) => {
                  const isUnread = !item.isRead;
                  const isProcessing = markingId === item._id;

                  return (
                    <div
                      key={item._id}
                      style={{
                        padding: '1.125rem 1.5rem',
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: isUnread
                          ? 'rgba(8, 145, 178, 0.03)'
                          : 'transparent',
                        borderLeft: isUnread
                          ? '4px solid #0891B2'
                          : '4px solid transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Left: Icon and Details */}
                      <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start', flex: 1 }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            backgroundColor: isUnread
                              ? 'rgba(8, 145, 178, 0.1)'
                              : 'var(--bg-body)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '0.125rem',
                            flexShrink: 0,
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          {getTypeIcon(item.type)}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              flexWrap: 'wrap',
                              marginBottom: '0.25rem',
                            }}
                          >
                            <strong
                              style={{
                                fontSize: '0.9375rem',
                                color: 'var(--text-primary)',
                                fontWeight: isUnread ? 700 : 500,
                              }}
                            >
                              {item.title}
                            </strong>

                            {isUnread && (
                              <span
                                className="ha-badge ha-badge--warning"
                                style={{ fontSize: '0.6875rem', padding: '0.15rem 0.45rem' }}
                              >
                                Unread
                              </span>
                            )}

                            {item.type && (
                              <span
                                className="ha-badge"
                                style={{
                                  fontSize: '0.6875rem',
                                  padding: '0.15rem 0.45rem',
                                  backgroundColor: 'rgba(100, 116, 139, 0.1)',
                                  color: 'var(--text-secondary)',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {item.type}
                              </span>
                            )}

                            {item.priority && item.priority !== 'medium' && (
                              <span
                                className={`ha-badge ${
                                  item.priority === 'urgent' || item.priority === 'high'
                                    ? 'ha-badge--danger'
                                    : 'ha-badge--info'
                                }`}
                                style={{ fontSize: '0.6875rem', padding: '0.15rem 0.45rem', textTransform: 'capitalize' }}
                              >
                                {item.priority}
                              </span>
                            )}
                          </div>

                          <p
                            style={{
                              margin: '0 0 0.5rem 0',
                              fontSize: '0.875rem',
                              color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
                              lineHeight: 1.45,
                              wordBreak: 'break-word',
                            }}
                          >
                            {item.message}
                          </p>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={12} />
                              {formatDateTime(item.createdAt)}
                            </span>

                            {item.link && (
                              <button
                                type="button"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#0891B2',
                                  padding: 0,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                }}
                                onClick={() => {
                                  if (typeof onNavigateTab === 'function') {
                                    // Parse potential tab query
                                    const match = item.link.match(/tab=([^&]+)/);
                                    if (match && match[1]) {
                                      onNavigateTab(match[1]);
                                    }
                                  }
                                }}
                              >
                                View related item
                                <ExternalLink size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isUnread ? (
                          <button
                            type="button"
                            className="ha-btn ha-btn--secondary ha-btn--sm"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                            onClick={() => handleMarkSingleRead(item._id)}
                            disabled={isProcessing}
                            aria-label={`Mark notification "${item.title}" as read`}
                          >
                            <CheckCheck size={13} aria-hidden="true" />
                            {isProcessing ? 'Updating...' : 'Mark as read'}
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.35rem 0.5rem',
                            }}
                          >
                            <CheckCircle2 size={13} color="#10b981" />
                            Read
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
