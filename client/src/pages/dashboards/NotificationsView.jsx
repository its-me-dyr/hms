/**
 * Super Admin Notifications View
 * 
 * Production-ready in-app notification center for Super Administrator:
 * 1. Live notification feed directly backed by MongoDB Notification collection.
 * 2. Unread vs Read tracking with individual and batch "Mark all as read".
 * 3. Server-side filtering by status (All / Unread / Read), type, priority, and search.
 * 4. Server-side pagination with configurable page sizes (10, 20, 50).
 * 5. Event inspection modal displaying full details and navigation actions.
 * 6. Delete / dismiss capability.
 * 7. Real-time synchronization with topbar notification bell.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { superadminService } from '../../services/superadmin.service';
import CompactPageHeader from './CompactPageHeader';
import {
  Bell,
  CheckCircle2,
  CheckCheck,
  RefreshCw,
  Search,
  X,

  Trash2,
  ExternalLink,
  ShieldCheck,
  Building2,
  Users,
  AlertTriangle,

  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
} from 'lucide-react';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffSec = Math.floor((now - date) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NotificationsView() {
  const navigate = useNavigate();

  // ─── Query State ───────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // ─── Data State ────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total: 0, unread: 0, read: 0 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // ─── Modal State ───────────────────────────────────────────────────────────
  const [activeModalNotif, setActiveModalNotif] = useState(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Flash message auto-dismiss
  useEffect(() => {
    if (!actionSuccess) return;
    const timer = setTimeout(() => setActionSuccess(null), 4000);
    return () => clearTimeout(timer);
  }, [actionSuccess]);

  // ─── Fetch Notifications ───────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
        status: statusFilter,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        search: debouncedSearch.trim() || undefined,
      };

      const res = await superadminService.getNotifications(params);
      const data = res?.data || {};

      setNotifications(data.notifications || []);
      if (data.stats) {
        setStats(data.stats);
      } else if (typeof data.unreadCount === 'number') {
        setStats((prev) => ({
          ...prev,
          unread: data.unreadCount,
          total: data.pagination?.total ?? prev.total,
        }));
      }

      if (data.pagination) {
        setPagination(data.pagination);
      }

      // Synchronize global notification counter in header
      if (typeof data.unreadCount === 'number') {
        window.dispatchEvent(
          new CustomEvent('hms:notification-update', { detail: { count: data.unreadCount } })
        );
      }
    } catch (err) {
      console.error('Failed to fetch Super Admin notifications:', err);
      setError(err.message || 'Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, statusFilter, typeFilter, priorityFilter, debouncedSearch]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const handleMarkAsRead = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      await superadminService.markNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId || n.id === notifId ? { ...n, isRead: true, readAt: new Date() } : n))
      );
      setStats((prev) => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
        read: prev.read + 1,
      }));
      window.dispatchEvent(
        new CustomEvent('hms:notification-update', { detail: { count: Math.max(0, stats.unread - 1) } })
      );
      if (activeModalNotif && (activeModalNotif._id === notifId || activeModalNotif.id === notifId)) {
        setActiveModalNotif((prev) => (prev ? { ...prev, isRead: true, readAt: new Date() } : null));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setRefreshing(true);
      await superadminService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date() })));
      setStats((prev) => ({
        ...prev,
        unread: 0,
        read: prev.total,
      }));
      window.dispatchEvent(
        new CustomEvent('hms:notification-update', { detail: { count: 0 } })
      );
      setActionSuccess('All notifications marked as read.');
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      setError(err.message || 'Failed to mark all notifications as read.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      await superadminService.deleteNotification(notifId);
      setNotifications((prev) => prev.filter((n) => (n._id || n.id) !== notifId));
      setStats((prev) => {
        const deleted = notifications.find((n) => (n._id || n.id) === notifId);
        const wasUnread = deleted && !deleted.isRead;
        return {
          total: Math.max(0, prev.total - 1),
          unread: wasUnread ? Math.max(0, prev.unread - 1) : prev.unread,
          read: !wasUnread ? Math.max(0, prev.read - 1) : prev.read,
        };
      });
      if (activeModalNotif && (activeModalNotif._id === notifId || activeModalNotif.id === notifId)) {
        setActiveModalNotif(null);
      }
      setActionSuccess('Notification removed.');
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleCardClick = (n) => {
    if (!n.isRead) {
      handleMarkAsRead(n._id || n.id);
    }
    setActiveModalNotif(n);
  };

  const handleNavigateToTarget = (link, e) => {
    if (e) e.stopPropagation();
    if (!link) return;
    setActiveModalNotif(null);
    navigate(link);
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setPriorityFilter('all');
    setSearch('');
    setPage(1);
  };

  // ─── Helpers: Type & Priority Styling ──────────────────────────────────────
  const getTypeMeta = (type) => {
    const t = String(type || 'system').toLowerCase();
    if (t === 'hospital') {
      return {
        icon: Building2,
        label: 'Hospital Event',
        color: '#0284c7',
        bg: 'rgba(2, 132, 199, 0.12)',
        border: 'rgba(2, 132, 199, 0.3)',
      };
    }
    if (t === 'security') {
      return {
        icon: ShieldCheck,
        label: 'Security & RBAC',
        color: '#d97706',
        bg: 'rgba(217, 119, 6, 0.12)',
        border: 'rgba(217, 119, 6, 0.3)',
      };
    }
    if (t === 'admin') {
      return {
        icon: Users,
        label: 'Admin Account',
        color: '#8b5cf6',
        bg: 'rgba(139, 92, 246, 0.12)',
        border: 'rgba(139, 92, 246, 0.3)',
      };
    }
    if (t === 'billing') {
      return {
        icon: Layers,
        label: 'Billing & Finance',
        color: '#059669',
        bg: 'rgba(5, 150, 105, 0.12)',
        border: 'rgba(5, 150, 105, 0.3)',
      };
    }
    return {
      icon: Bell,
      label: 'System Notification',
      color: '#0891b2',
      bg: 'rgba(8, 145, 178, 0.12)',
      border: 'rgba(8, 145, 178, 0.3)',
    };
  };

  const getPriorityBadge = (priority) => {
    const p = String(priority || 'medium').toLowerCase();
    if (p === 'urgent') {
      return { label: 'URGENT', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.14)' };
    }
    if (p === 'high') {
      return { label: 'HIGH', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.14)' };
    }
    if (p === 'low') {
      return { label: 'LOW', color: '#64748b', bg: 'rgba(100, 116, 139, 0.14)' };
    }
    return { label: 'MEDIUM', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.14)' };
  };

  const isFiltered = statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all' || debouncedSearch.trim() !== '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* ─── Top Header & Primary Controls ──────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <CompactPageHeader
          breadcrumb="Super Admin"
          module="Notifications"
          title="Notifications"
          subtitle="View and manage your administrative notifications."
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {stats.unread > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn btn--outline btn--sm"
              disabled={refreshing}
              style={{
                height: '38px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                borderColor: 'rgba(5, 150, 105, 0.4)',
                color: '#059669',
              }}
            >
              <CheckCheck size={16} />
              <span>Mark All as Read ({stats.unread})</span>
            </button>
          )}

          <button
            onClick={handleRefresh}
            className="btn btn--outline btn--sm"
            disabled={refreshing || loading}
            style={{ height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <RefreshCw size={15} className={refreshing ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── Flash Toast Feedback ────────────────────────────────────────────── */}
      {actionSuccess && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(5, 150, 105, 0.15)',
            border: '1px solid rgba(5, 150, 105, 0.35)',
            borderRadius: '8px',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ─── Summary Cards ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          className="sa-card"
          style={{
            padding: '1.15rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            border: statusFilter === 'all' ? '1px solid #0891b2' : '1px solid var(--border-color)',
          }}
          onClick={() => { setStatusFilter('all'); setPage(1); }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(8, 145, 178, 0.12)',
              color: '#0891b2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Notifications
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
              {stats.total.toLocaleString()}
            </div>
          </div>
        </div>

        <div
          className="sa-card"
          style={{
            padding: '1.15rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            border: statusFilter === 'unread' ? '1px solid #0284c7' : '1px solid var(--border-color)',
          }}
          onClick={() => { setStatusFilter('unread'); setPage(1); }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(2, 132, 199, 0.12)',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Unread Alerts
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: stats.unread > 0 ? '#0284c7' : 'var(--text-primary)', marginTop: '0.15rem' }}>
              {stats.unread.toLocaleString()}
            </div>
          </div>
        </div>

        <div
          className="sa-card"
          style={{
            padding: '1.15rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            border: statusFilter === 'read' ? '1px solid #059669' : '1px solid var(--border-color)',
          }}
          onClick={() => { setStatusFilter('read'); setPage(1); }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(5, 150, 105, 0.12)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Read Archive
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
              {stats.read.toLocaleString()}
            </div>
          </div>
        </div>

        <div
          className="sa-card"
          style={{
            padding: '1.15rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            border: priorityFilter === 'high' ? '1px solid #d97706' : '1px solid var(--border-color)',
          }}
          onClick={() => { setPriorityFilter(priorityFilter === 'high' ? 'all' : 'high'); setPage(1); }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(217, 119, 6, 0.12)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Priority / Security
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#d97706', marginTop: '0.15rem' }}>
              {notifications.filter((n) => n.priority === 'high' || n.priority === 'urgent' || n.type === 'security').length} active
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search & Multi-Filter Toolbar ───────────────────────────────────── */}
      <div
        className="sa-card"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Status Tabs: All / Unread / Read */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--bg-main)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => { setStatusFilter('all'); setPage(1); }}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                background: statusFilter === 'all' ? 'var(--bg-surface)' : 'transparent',
                color: statusFilter === 'all' ? '#0891b2' : 'var(--text-secondary)',
                boxShadow: statusFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
              }}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('unread'); setPage(1); }}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                background: statusFilter === 'unread' ? 'var(--bg-surface)' : 'transparent',
                color: statusFilter === 'unread' ? '#0284c7' : 'var(--text-secondary)',
                boxShadow: statusFilter === 'unread' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
              }}
            >
              Unread ({stats.unread})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('read'); setPage(1); }}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                background: statusFilter === 'read' ? 'var(--bg-surface)' : 'transparent',
                color: statusFilter === 'read' ? '#059669' : 'var(--text-secondary)',
                boxShadow: statusFilter === 'read' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
              }}
            >
              Read ({stats.read})
            </button>
          </div>

          {/* Reset Filters button */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
                padding: '0.35rem 0.6rem',
              }}
            >
              <RotateCcw size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Keyword Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search notifications by title, message, or module..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 2.2rem 0.55rem 2.2rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-main)',
                color: 'var(--text-primary)',
                fontSize: '0.84rem',
                outline: 'none',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
              cursor: 'pointer',
              minWidth: '150px',
            }}
          >
            <option value="all">All Types</option>
            <option value="system">System Alerts</option>
            <option value="hospital">Hospital Management</option>
            <option value="security">Security & RBAC</option>
            <option value="admin">Administrator Accounts</option>
            <option value="billing">Billing Alerts</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
              cursor: 'pointer',
              minWidth: '140px',
            }}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* ─── Notification Feed List ─────────────────────────────────────────── */}
      <div className="sa-card" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div className="spin-animation" style={{ display: 'inline-block', marginBottom: '0.75rem' }}>
              <RefreshCw size={24} style={{ color: '#0891b2' }} />
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading notifications...</div>
          </div>
        ) : error ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <AlertTriangle size={32} style={{ color: '#ef4444', margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Failed to load notifications
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              {error}
            </div>
            <button onClick={handleRefresh} className="btn btn--outline btn--sm" style={{ margin: '0 auto' }}>
              Try Again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="sa-empty-state" style={{ padding: '4rem 1.5rem' }}>
            <div className="sa-empty-state__icon">
              <Bell size={32} style={{ color: '#0891b2' }} />
            </div>
            <h4 className="sa-empty-state__title" style={{ fontSize: '1.1rem', marginTop: '0.5rem' }}>
              {statusFilter === 'unread' ? "You're All Caught Up" : 'No Notifications Found'}
            </h4>
            <p className="sa-empty-state__sub" style={{ maxWidth: '420px', margin: '0.5rem auto 1rem' }}>
              {statusFilter === 'unread'
                ? 'There are no unread administrative notifications requiring your immediate attention.'
                : isFiltered
                ? 'No notifications matched your active filter criteria. Try adjusting your search or filters.'
                : 'Real-time alerts for hospital provisioning, administrator accounts, and security events will appear here.'}
            </p>
            {isFiltered && (
              <button onClick={handleResetFilters} className="btn btn--outline btn--sm" style={{ margin: '0 auto' }}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.map((n) => {
              const notifId = n._id || n.id;
              const isUnread = !n.isRead && !n.read;
              const typeMeta = getTypeMeta(n.type);
              const priorityMeta = getPriorityBadge(n.priority);
              const Icon = typeMeta.icon;

              return (
                <div
                  key={notifId}
                  onClick={() => handleCardClick(n)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1.1rem 1.25rem',
                    background: isUnread ? 'var(--bg-main)' : 'transparent',
                    border: `1px solid ${isUnread ? 'rgba(8, 145, 178, 0.35)' : 'var(--border-color)'}`,
                    borderLeft: isUnread ? '4px solid #0891b2' : '1px solid var(--border-color)',
                    borderRadius: '10px',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0891b2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isUnread ? 'rgba(8, 145, 178, 0.35)' : 'var(--border-color)';
                    if (isUnread) e.currentTarget.style.borderLeft = '4px solid #0891b2';
                  }}
                >
                  {/* Icon Avatar */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: typeMeta.bg,
                      color: typeMeta.color,
                      border: `1px solid ${typeMeta.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <Icon size={19} />
                  </div>

                  {/* Body Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {n.title}
                        </span>
                        {isUnread && (
                          <span
                            style={{
                              display: 'inline-block',
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: '#0891b2',
                            }}
                            title="Unread notification"
                          />
                        )}
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: priorityMeta.bg,
                            color: priorityMeta.color,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {priorityMeta.label}
                        </span>
                        {n.module && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              background: 'var(--bg-surface)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            {n.module}
                          </span>
                        )}
                        {n.hospital?.hospitalName && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              background: 'rgba(2, 132, 199, 0.08)',
                              color: '#0284c7',
                            }}
                          >
                            {n.hospital.hospitalName}
                          </span>
                        )}
                      </div>

                      <span
                        style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}
                        title={n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                      >
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 0.65rem 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      {n.message}
                    </p>

                    {/* Interactive Action Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {isUnread && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkAsRead(notifId, e)}
                            className="btn btn--outline btn--sm"
                            style={{
                              fontSize: '0.74rem',
                              padding: '0.2rem 0.6rem',
                              height: '26px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <CheckCheck size={12} />
                            <span>Mark as read</span>
                          </button>
                        )}

                        {n.link && (
                          <button
                            type="button"
                            onClick={(e) => handleNavigateToTarget(n.link, e)}
                            className="btn btn--outline btn--sm"
                            style={{
                              fontSize: '0.74rem',
                              padding: '0.2rem 0.6rem',
                              height: '26px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              color: '#0891b2',
                              borderColor: 'rgba(8, 145, 178, 0.4)',
                            }}
                          >
                            <ExternalLink size={12} />
                            <span>Open Target</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setActiveModalNotif(n); }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: '0.74rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.4rem',
                          }}
                        >
                          <Eye size={12} />
                          <span>View Details</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(notifId, e)}
                        title="Dismiss notification"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.72rem',
                          opacity: 0.75,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.opacity = '0.75';
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Pagination Footer ──────────────────────────────────────────────── */}
        {!loading && pagination.total > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              padding: '0.85rem 0.75rem 0.35rem 0.75rem',
              borderTop: '1px solid var(--border-color)',
              marginTop: '0.5rem',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{pagination.total}</strong> notifications
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                }}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{ height: '30px', padding: '0 0.5rem', borderRadius: '6px' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0 0.35rem' }}>
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  style={{ height: '30px', padding: '0 0.5rem', borderRadius: '6px' }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Notification Details Modal ─────────────────────────────────────── */}
      {activeModalNotif && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setActiveModalNotif(null)}
        >
          <div
            className="sa-card"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
              position: 'relative',
              borderRadius: '12px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: getTypeMeta(activeModalNotif.type).bg,
                    color: getTypeMeta(activeModalNotif.type).color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {(() => {
                    const Icon = getTypeMeta(activeModalNotif.type).icon;
                    return <Icon size={19} />;
                  })()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                    {activeModalNotif.title}
                  </h3>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    {getTypeMeta(activeModalNotif.type).label} • {formatRelativeTime(activeModalNotif.createdAt)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalNotif(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.35rem',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
              <div
                style={{
                  padding: '0.9rem 1rem',
                  background: 'var(--bg-main)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  lineHeight: 1.5,
                }}
              >
                {activeModalNotif.message}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Notification ID
                  </span>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {activeModalNotif._id || activeModalNotif.id}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Status
                  </span>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: activeModalNotif.isRead ? '#059669' : '#0284c7', marginTop: '0.15rem' }}>
                    {activeModalNotif.isRead ? 'Read' : 'Unread'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Priority
                  </span>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: getPriorityBadge(activeModalNotif.priority).color, marginTop: '0.15rem' }}>
                    {getPriorityBadge(activeModalNotif.priority).label}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Module
                  </span>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {activeModalNotif.module || 'System Platform'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Created Timestamp
                  </span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {activeModalNotif.createdAt ? new Date(activeModalNotif.createdAt).toLocaleString() : 'N/A'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Read Timestamp
                  </span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {activeModalNotif.readAt ? new Date(activeModalNotif.readAt).toLocaleString() : 'Unread'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={(e) => handleDelete(activeModalNotif._id || activeModalNotif.id, e)}
                className="btn btn--outline btn--sm"
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {!activeModalNotif.isRead && (
                  <button
                    type="button"
                    onClick={(e) => handleMarkAsRead(activeModalNotif._id || activeModalNotif.id, e)}
                    className="btn btn--outline btn--sm"
                  >
                    <CheckCheck size={14} />
                    <span>Mark as Read</span>
                  </button>
                )}

                {activeModalNotif.link && (
                  <button
                    type="button"
                    onClick={(e) => handleNavigateToTarget(activeModalNotif.link, e)}
                    className="btn btn--primary btn--sm"
                    style={{ background: '#0891b2', borderColor: '#0891b2', color: '#fff' }}
                  >
                    <ExternalLink size={14} />
                    <span>Open Linked Page</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveModalNotif(null)}
                  className="btn btn--outline btn--sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
