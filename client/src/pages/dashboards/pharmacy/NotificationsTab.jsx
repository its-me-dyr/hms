
/**
 * Pharmacy Notifications & Alerts Tab
 * 
 * Real-time operational dispatch stream:
 * - Categories (Prescriptions, Inventory, Low Stock, Expiry, Purchase, Billing, System)
 * - Single-click "Mark All as Read" & individual item status toggle
 * - Dispatches 'hms:notification-update' for instantaneous sidebar badge synchronization
 */

import { useState, useEffect } from 'react';
import {
  Bell,
  Pill,
  Package,
  AlertTriangle,
  Clock,
  ShoppingCart,
  CreditCard,
  RefreshCw,
  Check,
  AlertCircle,
} from 'lucide-react';
import { pharmacyService } from '../../../services/pharmacy.service';

export default function NotificationsTab({ onNavigateTab }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const loadNotifications = () => {
    setLoading(true);
    setError('');
    pharmacyService.getNotifications()
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
        console.error('Failed to load pharmacy notifications:', err);
        setError('Failed to fetch notifications.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAllAsRead = async () => {
    const updated = notifications.map((n) => ({ ...n, read: true, isRead: true }));
    setNotifications(updated);
    // Immediate badge update to 0
    window.dispatchEvent(new CustomEvent('hms:notification-update', { detail: { count: 0 } }));
    try {
      await pharmacyService.markAllNotificationsRead();
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
    // Immediate badge update
    window.dispatchEvent(new CustomEvent('hms:notification-update', { detail: { count: newCount } }));
    try {
      await pharmacyService.markNotificationRead(id);
    } catch (err) {
      console.warn('Backend markNotificationRead error:', err);
    }
  };

  const filteredNotifs = categoryFilter === 'all'
    ? notifications
    : notifications.filter((n) => (n.category || n.type || 'system').toLowerCase() === categoryFilter.toLowerCase());

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  const getCategoryIcon = (cat) => {
    switch ((cat || '').toLowerCase()) {
      case 'prescriptions':
      case 'prescription':
        return <Pill size={18} style={{ color: '#0891b2' }} />;
      case 'low-stock':
      case 'low stock':
        return <AlertTriangle size={18} style={{ color: '#ef4444' }} />;
      case 'expiry':
        return <Clock size={18} style={{ color: '#f59e0b' }} />;
      case 'purchase':
        return <ShoppingCart size={18} style={{ color: '#6366f1' }} />;
      case 'billing':
        return <CreditCard size={18} style={{ color: '#10b981' }} />;
      case 'inventory':
        return <Package size={18} style={{ color: '#0284c7' }} />;
      default:
        return <Bell size={18} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  return (
    <div className="pharm-container">
      {/* ── Page Header ── */}
      <div className="pharm-header">
        <div className="pharm-header-left">
          <div className="pharm-header-badge">DISPATCH & OPERATIONAL ALERTS</div>
          <h1 className="pharm-header-title">Pharmacy Notifications</h1>
          <p className="pharm-header-subtitle">
            Live operational feed of clinical prescription arrivals, low stock alerts, batch expiries, and purchase receipts.
          </p>
        </div>
        <div className="pharm-header-actions">
          <button
            type="button"
            className="pharm-btn pharm-btn--secondary"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <Check size={16} />
            <span>Mark All as Read</span>
          </button>
          <button
            type="button"
            className="pharm-btn pharm-btn--secondary"
            onClick={loadNotifications}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Error Alert ── */}
      {error && (
        <div style={{ padding: '0.85rem 1rem', background: '#fee2e2', borderRadius: '8px', color: '#b91c1c', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Filter Tabs ── */}
      <div className="pharm-card" style={{ marginBottom: '1.5rem', padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.25rem' }}>
              Category:
            </span>
            {[
              { id: 'all', label: 'All Alerts' },
              { id: 'low-stock', label: 'Low Stock' },
              { id: 'expiry', label: 'Expiry Alerts' },
              { id: 'prescriptions', label: 'Prescriptions' },
              { id: 'purchase', label: 'Purchase Orders' },
              { id: 'system', label: 'System Notices' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`pharm-btn pharm-btn--sm ${
                  categoryFilter === cat.id ? 'pharm-btn--primary' : 'pharm-btn--secondary'
                }`}
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Unread Alerts: <strong style={{ color: '#0891b2' }}>{unreadCount}</strong>
          </div>
        </div>
      </div>

      {/* ── Notifications List Card ── */}
      <div className="pharm-card">
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={32} className="rec-spin" style={{ margin: '0 auto 1rem', color: '#0891b2' }} />
            <p>Loading notification feed...</p>
          </div>
        ) : filteredNotifs.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <Bell size={48} style={{ color: 'var(--border-color)', margin: '0 auto 1rem' }} />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>No notifications</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              You are all caught up! New operational alerts will appear here in real time.
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
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: isUnread ? 'var(--color-primary-light)' : 'var(--bg-card)',
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
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: isUnread ? 'rgba(8, 145, 178, 0.12)' : 'var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getCategoryIcon(item.category || item.type)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span className="pharm-badge pharm-badge--info" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>
                        {item.type || 'Alert'}
                      </span>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.title}
                      </h4>
                      {isUnread && (
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#0891b2', display: 'inline-block' }} />
                      )}
                    </div>
                    <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {item.message}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.time || 'Recently'}
                    </span>
                  </div>

                  {isUnread && (
                    <button
                      type="button"
                      className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                      style={{ fontSize: '0.75rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        markSingleAsRead(item.id || item._id);
                      }}
                    >
                      <Check size={14} />
                      <span>Mark Read</span>
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
