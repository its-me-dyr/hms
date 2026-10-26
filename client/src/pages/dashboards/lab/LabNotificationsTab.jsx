/**
 * Laboratory Notifications Center Tab
 * 
 * Real-time notification center:
 * - Unread synchronization with topbar and sidebar badges
 * - Category classification: Lab Requests, Critical Alerts, Processing, Reports
 * - Mark one read, mark all read
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  RefreshCw,
  AlertTriangle,
  FlaskConical,
  CheckCircle2,
  X,
} from 'lucide-react';
import { labService } from '../../../services/lab.service';

export default function LabNotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchNotifications = useCallback(() => {
    setLoading(true);
    labService.getNotifications()
      .then((res) => {
        const list = res.data || [];
        setNotifications(list);
        const unread = list.filter((n) => !n.isRead).length;
        window.dispatchEvent(new CustomEvent('hms:notification-update', { detail: { count: unread } }));
      })
      .catch((err) => {
        console.error('Failed to load lab notifications:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkOneRead = async (id) => {
    try {
      await labService.markNotificationRead(id);
      const updated = notifications.map((n) =>
        n._id === id ? { ...n, isRead: true } : n
      );
      setNotifications(updated);
      const unread = updated.filter((n) => !n.isRead).length;
      window.dispatchEvent(new CustomEvent('hms:notification-update', { detail: { count: unread } }));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await labService.markAllNotificationsRead();
      const updated = notifications.map((n) => ({ ...n, isRead: true }));
      setNotifications(updated);
      window.dispatchEvent(new CustomEvent('hms:notification-update', { detail: { count: 0 } }));
      setFeedback({ type: 'success', message: 'All laboratory notifications marked as read.' });
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const displayed = filterUnread
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="lab-header-badge">
            <Bell size={13} />
            <span>ALERTS & SYSTEM DISPATCHES</span>
          </div>
          <h1 className="lab-header-title">Laboratory Notifications</h1>
          <p className="lab-header-subtitle">
            Stay informed on STAT orders, urgent specimen collections, and clinical sign-offs.
          </p>
        </div>
        <div className="lab-header-actions">
          <button
            type="button"
            className="lab-btn lab-btn--secondary"
            onClick={fetchNotifications}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'lab-spin' : ''} />
            <span>Refresh</span>
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              className="lab-btn lab-btn--primary"
              onClick={handleMarkAllRead}
            >
              <CheckCheck size={16} />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`lab-alert lab-alert--${feedback.type}`} style={{ marginBottom: '1rem' }}>
          <CheckCircle2 size={18} />
          <span>{feedback.message}</span>
          <button
            type="button"
            className="lab-alert-close"
            onClick={() => setFeedback(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="lab-filter-card">
        <div className="lab-pill-filters">
          <button
            type="button"
            className={`lab-filter-pill ${!filterUnread ? 'lab-filter-pill--active' : ''}`}
            onClick={() => setFilterUnread(false)}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            type="button"
            className={`lab-filter-pill ${filterUnread ? 'lab-filter-pill--active' : ''}`}
            onClick={() => setFilterUnread(true)}
          >
            Unread Only ({unreadCount})
          </button>
        </div>
      </div>

      {/* ── Notifications List ── */}
      <div className="lab-card">
        <div className="lab-card__body lab-card__body--flush">
          {loading ? (
            <div className="lab-loading-block">
              <div className="lab-spinner" />
              <span>Syncing notification stream...</span>
            </div>
          ) : displayed.length === 0 ? (
            <div className="lab-empty-state">
              <Bell size={40} className="lab-empty-icon" />
              <p className="lab-empty-title">
                {filterUnread ? 'No Unread Alerts' : 'No Notifications'}
              </p>
              <p className="lab-empty-desc">
                {filterUnread
                  ? 'You have reviewed all active laboratory notifications.'
                  : 'Your laboratory notification inbox is currently clear.'}
              </p>
            </div>
          ) : (
            <div className="lab-notif-list">
              {displayed.map((n) => {
                const isStat = n.title?.includes('CRITICAL') || n.title?.includes('STAT');
                return (
                  <div
                    key={n._id}
                    className={`lab-notif-item ${!n.isRead ? 'lab-notif-item--unread' : ''} ${isStat ? 'lab-notif-item--stat' : ''}`}
                  >
                    <div className="lab-notif-item__icon-box">
                      {isStat ? (
                        <AlertTriangle size={18} className="lab-color-red" />
                      ) : (
                        <FlaskConical size={18} className="lab-color-cyan" />
                      )}
                    </div>

                    <div className="lab-notif-item__body">
                      <div className="lab-notif-item__title">
                        <span>{n.title}</span>
                        {!n.isRead && <span className="lab-unread-dot" />}
                      </div>
                      <p className="lab-notif-item__message">{n.message}</p>
                      <span className="lab-notif-item__time">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="lab-notif-item__action">
                      {!n.isRead && (
                        <button
                          type="button"
                          className="lab-btn lab-btn--xs lab-btn--secondary"
                          onClick={() => handleMarkOneRead(n._id)}
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
