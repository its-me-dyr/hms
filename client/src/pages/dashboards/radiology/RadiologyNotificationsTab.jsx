/**
 * Radiology Notifications Tab
 * 
 * In-portal alerts and communication feed for radiology staff:
 * - Urgent order arrivals, STAT alerts, and equipment QA notices
 * - Mark as read & Mark all as read with global header sync
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  RefreshCw,
  AlertTriangle,
  Info,
  AlertCircle,
} from 'lucide-react';
import { radiologyService } from '../../../services/radiology.service';

export default function RadiologyNotificationsTab({ _onNavigateTab }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(() => {
    setLoading(true);
    setError('');
    radiologyService.getNotifications()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
        const normalized = list.map((n) => ({
          ...n,
          id: n.id || n._id,
          read: n.isRead ?? n.read ?? false,
          isRead: n.isRead ?? n.read ?? false,
        }));
        setNotifications(normalized);
      })
      .catch((err) => {
        console.error('Failed to load notifications:', err);
        setError('Failed to fetch notifications.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await radiologyService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n))
      );
      window.dispatchEvent(new CustomEvent('hms:notification-update', { detail: { action: 'read-single' } }));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await radiologyService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
      window.dispatchEvent(new CustomEvent('hms:notification-update', { detail: { count: 0 } }));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="radiology-header-badge">
            <Bell size={13} />
            <span>COMMUNICATION & ALERTS</span>
          </div>
          <h1 className="lab-header-title">Radiology Notifications</h1>
          <p className="lab-header-subtitle">
            STAT clinical notifications, physician read-back acknowledgments, and department alerts.
          </p>
        </div>
        <div className="lab-header-actions">
          {unreadCount > 0 && (
            <button className="lab-btn lab-btn-secondary" onClick={handleMarkAllRead}>
              <CheckCheck size={15} />
              <span>Mark All Read</span>
            </button>
          )}
          <button className="lab-btn lab-btn-secondary" onClick={fetchNotifications} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="lab-alert-banner lab-alert-banner-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="lab-btn lab-btn-sm lab-btn-secondary" onClick={fetchNotifications} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Notifications List ── */}
      <div className="lab-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
            <p>Loading notification feed...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <Bell size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No notifications to display.</p>
            <p style={{ fontSize: '0.85rem' }}>You're all caught up with radiology alerts.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map((item) => {
              const isUnread = !item.read && !item.isRead;
              const isCritical = (item.type || item.category || '').toLowerCase().includes('critical') || (item.title || '').toLowerCase().includes('stat');
              return (
                <div
                  key={item.id}
                  style={{
                    padding: '1.25rem',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    background: isUnread ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                    borderLeft: isUnread ? '3px solid #6366f1' : '3px solid transparent',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isCritical ? '#fee2e2' : '#e0e7ff',
                      color: isCritical ? '#ef4444' : '#4338ca',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isCritical ? <AlertTriangle size={18} /> : <Info size={18} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {item.title || 'Radiology Notification'}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recently'}
                      </span>
                    </div>

                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {item.message || item.content || item.description}
                    </p>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.6rem', alignItems: 'center' }}>
                      {isUnread && (
                        <button
                          className="lab-btn lab-btn-sm lab-btn-ghost"
                          onClick={() => handleMarkAsRead(item.id)}
                          style={{ fontSize: '0.75rem' }}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
