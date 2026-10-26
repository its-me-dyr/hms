/**
 * Reception Notifications Tab
 * 
 * Operational alerts, dispatch announcements, and front desk notifications:
 * - Filter alerts by Category (All, Appointments, Queue, Admissions, Billing, System)
 * - Real-time unread badges and single-click 'Mark All Read'
 * - Actionable buttons linked directly to relevant front-desk tabs
 */

import { useState, useEffect } from 'react';
import {
  Bell,
  Calendar,
  Ticket,
  Bed,
  CreditCard,
  Clock,
  RefreshCw,
  Check,
  AlertCircle,
} from 'lucide-react';
import { receptionService } from '../../../services/reception.service';

export default function NotificationsTab({ onNavigateTab }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const loadNotifications = () => {
    setLoading(true);
    setError('');
    receptionService.getNotifications()
      .then((res) => {
        const list = res.data?.notifications || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          const normalized = list.map((n) => ({
            ...n,
            read: n.isRead ?? n.read ?? false,
            isRead: n.isRead ?? n.read ?? false,
          }));
          setNotifications(normalized);
          const count = normalized.filter((n) => !n.read && !n.isRead).length;
          window.dispatchEvent(new CustomEvent('hms:notification-update', { detail: { count } }));
        } else {
          setNotifications([]);
          window.dispatchEvent(new CustomEvent('hms:notification-update', { detail: { count: 0 } }));
        }
      })
      .catch((err) => {
        console.error('Failed to load notifications:', err);
        setError('Failed to fetch notifications.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    receptionService.getNotifications()
      .then((res) => {
        if (!active) return;
        const list = res.data?.notifications || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          const normalized = list.map((n) => ({
            ...n,
            read: n.isRead ?? n.read ?? false,
            isRead: n.isRead ?? n.read ?? false,
          }));
          setNotifications(normalized);
          const count = normalized.filter((n) => !n.read && !n.isRead).length;
          window.dispatchEvent(new CustomEvent('hms:notification-update', { detail: { count } }));
        } else {
          setNotifications([]);
          window.dispatchEvent(new CustomEvent('hms:notification-update', { detail: { count: 0 } }));
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load notifications:', err);
        setError('Failed to fetch notifications.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const markAllAsRead = async () => {
    const updated = notifications.map((n) => ({ ...n, read: true, isRead: true }));
    setNotifications(updated);
    // Immediate badge update to 0
    window.dispatchEvent(new CustomEvent('hms:notification-update', { detail: { count: 0 } }));
    try {
      await receptionService.markAllNotificationsRead();
    } catch (err) {
      console.warn('Backend markAllNotificationsRead error:', err);
    }
  };

  const markSingleAsRead = async (id) => {
    const updated = notifications.map((n) =>
      n.id === id || n._id === id ? { ...n, read: true, isRead: true } : n
    );
    setNotifications(updated);
    const newCount = updated.filter((n) => !n.read && !n.isRead).length;
    // Immediate badge update to newCount
    window.dispatchEvent(new CustomEvent('hms:notification-update', { detail: { count: newCount } }));
    try {
      await receptionService.markNotificationRead(id);
    } catch (err) {
      console.warn('Backend markNotificationRead error:', err);
    }
  };

  const filteredNotifs = categoryFilter === 'all'
    ? notifications
    : notifications.filter((n) => (n.category || n.type || 'system').toLowerCase() === categoryFilter.toLowerCase());

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  const getCategoryIcon = (category) => {
    switch ((category || '').toLowerCase()) {
      case 'appointments':
        return <Calendar size={18} style={{ color: '#0891b2' }} />;
      case 'queue':
        return <Ticket size={18} style={{ color: '#f59e0b' }} />;
      case 'admission':
        return <Bed size={18} style={{ color: '#6366f1' }} />;
      case 'billing':
        return <CreditCard size={18} style={{ color: '#16a34a' }} />;
      default:
        return <Bell size={18} style={{ color: '#0284c7' }} />;
    }
  };

  return (
    <div className="rec-container">
      {/* Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="rec-header-badge">DISPATCH & ALERTS</div>
          <h1 className="rec-header-title">Front Desk Notifications</h1>
          <p className="rec-header-subtitle">
            Live operational feed of appointment bookings, queue surges, bed availability, and cashier alerts.
          </p>
        </div>
        <div className="rec-header-actions">
          <button
            type="button"
            className="rec-btn rec-btn--secondary"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <Check size={16} />
            <span>Mark All as Read</span>
          </button>
          <button
            type="button"
            className="rec-btn rec-btn--secondary"
            onClick={loadNotifications}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rec-alert rec-alert--error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="rec-card" style={{ marginBottom: '1.5rem', padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginRight: '0.25rem' }}>
              Category:
            </span>
            {[
              { id: 'all', label: 'All Alerts' },
              { id: 'queue', label: 'OPD Queue' },
              { id: 'appointments', label: 'Appointments' },
              { id: 'admission', label: 'Admissions & Beds' },
              { id: 'billing', label: 'Billing & Cashier' },
              { id: 'system', label: 'System Notices' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`rec-btn rec-btn--sm ${
                  categoryFilter === cat.id ? 'rec-btn--primary' : 'rec-btn--secondary'
                }`}
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Unread Alerts: <strong style={{ color: '#0891b2' }}>{unreadCount}</strong>
          </div>
        </div>
      </div>

      {/* Notifications List Card */}
      <div className="rec-card">
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={32} className="rec-spin" style={{ margin: '0 auto 1rem', color: '#0891b2' }} />
            <p>Loading notifications stream...</p>
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div className="rec-empty-state">
            <Bell size={48} className="rec-empty-state-icon" />
            <div className="rec-empty-state-title">No notifications</div>
            <div className="rec-empty-state-desc">
              You are all caught up! New operational dispatch alerts will appear here.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredNotifs.map((item, idx) => {
              const isUnread = !item.read && !item.isRead;

              return (
                <div
                  key={item.id || item._id || idx}
                  style={{
                    padding: '1.2rem 1.5rem',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: isUnread ? 'rgba(8, 145, 178, 0.04)' : '#ffffff',
                    borderLeft: isUnread ? '4px solid #0891b2' : '4px solid transparent',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    cursor: isUnread ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => {
                    if (isUnread) markSingleAsRead(item.id || item._id);
                  }}
                >
                  {/* Category icon container */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: isUnread ? 'rgba(8, 145, 178, 0.12)' : '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {getCategoryIcon(item.category)}
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span
                        style={{
                          fontWeight: isUnread ? 700 : 600,
                          color: 'var(--text-primary)',
                          fontSize: '0.98rem',
                        }}
                      >
                        {item.title}
                      </span>
                      {isUnread && (
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#0891b2',
                            display: 'inline-block',
                          }}
                        />
                      )}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      {item.message}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        fontSize: '0.78rem',
                        color: '#94a3b8',
                        marginTop: '0.5rem',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} />
                        {item.time || 'Recently'}
                      </span>
                      <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {item.category || 'General'}
                      </span>
                    </div>
                  </div>

                  {/* Optional Navigation Action */}
                  {item.actionTab && onNavigateTab && (
                    <button
                      type="button"
                      className="rec-btn rec-btn--secondary rec-btn--sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateTab(item.actionTab);
                      }}
                    >
                      <span>Open Tab</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
