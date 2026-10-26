/**
 * Executive Dashboard View (Super Admin)
 * 
 * Clean, minimal, and focused Super Admin Overview:
 * 1. Dashboard Header: Clean full-width header matching Super Admin design.
 * 2. KPI Summary: 6 Informational cards (Total Hospitals, Active, Inactive, Hospital Admins, Total Users/Staff, Unread Notifications).
 * 3. Hospital Overview: Real active vs inactive hospital statistics (no fake charts).
 * 4. Recent Administrative Activity: Compact list of recent AuditLog records with single "View Audit Logs" action.
 * 5. Important Notifications: Latest unread/important alerts with single "View Notifications" action.
 * 
 * UX Principle: Sidebar = Navigation, Dashboard = Overview.
 */

import { useState, useEffect, useCallback } from 'react';
import { superadminService } from '../../services/superadmin.service';
import {
  LayoutDashboard,
  Building2,
  Users,
  Stethoscope,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffSec = Math.floor((now - date) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ExecutiveDashboardView({ onNavigateTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await superadminService.getDashboardOverview();
      if (res?.success && res?.data) {
        setData(res.data);
      } else if (res?.data) {
        setData(res.data);
      } else {
        throw new Error(res?.message || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleNavigate = (tab) => {
    if (typeof onNavigateTab === 'function') {
      onNavigateTab(tab);
    }
  };

  const summary = data?.summary || {};
  const recentActivity = data?.recentActivity || [];
  const notifications = data?.notifications || [];

  const totalHosp = summary.totalHospitals || 0;
  const activeHosp = summary.activeHospitals || 0;
  const inactiveHosp = summary.inactiveHospitals || 0;
  const activePct = totalHosp > 0 ? Math.round((activeHosp / totalHosp) * 100) : 0;
  const inactivePct = totalHosp > 0 ? Math.round((inactiveHosp / totalHosp) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* ─── 1. Dashboard Header ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
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
            <LayoutDashboard size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Super Admin Dashboard
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Overview of hospitals, administration, users, and system activity
            </p>
          </div>
        </div>
      </div>

      {/* ─── Error Alert Banner ──────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            color: '#f87171',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="btn btn--outline btn--sm"
            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171', height: '28px', padding: '0 0.6rem', fontSize: '0.75rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ─── 2. KPI Summary (Informational Cards) ───────────────────────────── */}
      {loading && !data ? (
        <div className="sa-kpi-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="sa-kpi-card" style={{ minHeight: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ height: '14px', width: '40%', background: 'var(--border-color)', borderRadius: '4px', marginBottom: '0.6rem' }} />
              <div style={{ height: '26px', width: '50%', background: 'var(--border-color)', borderRadius: '4px', marginBottom: '0.5rem' }} />
              <div style={{ height: '12px', width: '70%', background: 'var(--border-color)', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="sa-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {/* Card 1: Total Hospitals */}
          <div className="sa-kpi-card">
            <div className="sa-kpi-card__top">
              <span className="sa-kpi-card__label">Total Hospitals</span>
              <div className="sa-kpi-card__icon-box" style={{ background: 'rgba(8, 145, 178, 0.12)', color: '#0891b2' }}>
                <Building2 size={18} />
              </div>
            </div>
            <h3 className="sa-kpi-card__value">{summary.totalHospitals ?? 0}</h3>
            <div className="sa-kpi-card__sub">
              <span>Registered facilities</span>
            </div>
          </div>

          {/* Card 2: Active Hospitals */}
          <div className="sa-kpi-card">
            <div className="sa-kpi-card__top">
              <span className="sa-kpi-card__label">Active Hospitals</span>
              <div className="sa-kpi-card__icon-box" style={{ background: 'rgba(5, 150, 105, 0.12)', color: '#059669' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <h3 className="sa-kpi-card__value" style={{ color: '#059669' }}>{summary.activeHospitals ?? 0}</h3>
            <div className="sa-kpi-card__sub">
              <span>Operational in system</span>
            </div>
          </div>

          {/* Card 3: Inactive Hospitals */}
          <div className="sa-kpi-card">
            <div className="sa-kpi-card__top">
              <span className="sa-kpi-card__label">Inactive Hospitals</span>
              <div className="sa-kpi-card__icon-box" style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#d97706' }}>
                <AlertTriangle size={18} />
              </div>
            </div>
            <h3 className="sa-kpi-card__value" style={{ color: summary.inactiveHospitals > 0 ? '#d97706' : 'var(--text-primary)' }}>
              {summary.inactiveHospitals ?? 0}
            </h3>
            <div className="sa-kpi-card__sub">
              <span>Suspended or pending</span>
            </div>
          </div>

          {/* Card 4: Hospital Admins */}
          <div className="sa-kpi-card">
            <div className="sa-kpi-card__top">
              <span className="sa-kpi-card__label">Hospital Admins</span>
              <div className="sa-kpi-card__icon-box" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                <Users size={18} />
              </div>
            </div>
            <h3 className="sa-kpi-card__value">{summary.totalHospitalAdmins ?? 0}</h3>
            <div className="sa-kpi-card__sub">
              <span>{summary.activeHospitalAdmins ?? 0} Active • {summary.inactiveHospitalAdmins ?? 0} Suspended</span>
            </div>
          </div>

          {/* Card 5: Total Users / Staff */}
          <div className="sa-kpi-card">
            <div className="sa-kpi-card__top">
              <span className="sa-kpi-card__label">Total Users / Staff</span>
              <div className="sa-kpi-card__icon-box" style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7' }}>
                <Stethoscope size={18} />
              </div>
            </div>
            <h3 className="sa-kpi-card__value">{summary.totalUsers ?? 0}</h3>
            <div className="sa-kpi-card__sub">
              <span>{summary.totalOperationalStaff ?? 0} Staff • {summary.totalPatients ?? 0} Patients</span>
            </div>
          </div>

          {/* Card 6: Unread Notifications */}
          <div className="sa-kpi-card">
            <div className="sa-kpi-card__top">
              <span className="sa-kpi-card__label">Unread Notifications</span>
              <div className="sa-kpi-card__icon-box" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
                <Bell size={18} />
              </div>
            </div>
            <h3 className="sa-kpi-card__value" style={{ color: (summary.unreadNotifications ?? 0) > 0 ? '#0891b2' : 'var(--text-primary)' }}>
              {summary.unreadNotifications ?? 0}
            </h3>
            <div className="sa-kpi-card__sub">
              <span>{(summary.unreadNotifications ?? 0) > 0 ? 'Requires attention' : 'All alerts reviewed'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. Hospital Overview ───────────────────────────────────────────── */}
      <div className="sa-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Hospital Status Overview
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Real-time distribution of registered facilities across operational states
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#059669', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
              Active: {activePct}% ({activeHosp})
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#d97706', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d97706' }} />
              Inactive: {inactivePct}% ({inactiveHosp})
            </span>
          </div>
        </div>

        {/* Visual Ratio Bar */}
        <div style={{ height: '8px', width: '100%', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '1.25rem' }}>
          <div style={{ width: `${activePct}%`, background: '#059669', transition: 'width 0.3s ease' }} title={`Active: ${activePct}%`} />
          <div style={{ width: `${inactivePct}%`, background: '#d97706', transition: 'width 0.3s ease' }} title={`Inactive: ${inactivePct}%`} />
        </div>

        {/* Real Summary Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL REGISTERED</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {totalHosp}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Licensed healthcare systems
            </div>
          </div>

          <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>OPERATIONAL (ACTIVE)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#059669', marginTop: '0.2rem' }}>
              {activeHosp}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Accepting patient care & staff logins
            </div>
          </div>

          <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>OFFLINE / SUSPENDED</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#d97706', marginTop: '0.2rem' }}>
              {inactiveHosp}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Pending licensing review or paused
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4 & 5. Recent Activity & Important Notifications ────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        {/* Section 4: Recent Administrative Activity */}
        <div className="sa-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Recent Administrative Activity
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Latest system events from AuditLog
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleNavigate('audit-logs')}
              className="btn btn--outline btn--sm"
              style={{ fontSize: '0.75rem', height: '28px', padding: '0 0.65rem' }}
            >
              <span>View Audit Logs</span>
              <ArrowRight size={12} style={{ marginLeft: '0.3rem' }} />
            </button>
          </div>

          <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {recentActivity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                No recent administrative activity found.
              </div>
            ) : (
              recentActivity.slice(0, 6).map((log) => {
                const isSuccess = log.status === 'SUCCESS';
                return (
                  <div
                    key={log._id || log.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.55rem 0.75rem',
                      background: 'var(--bg-main)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                      <div
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: isSuccess ? '#059669' : '#ef4444',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                            {String(log.action || '').replace(/_/g, ' ')}
                          </span>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '0.05rem 0.35rem',
                              borderRadius: '3px',
                              background: 'rgba(8, 145, 178, 0.1)',
                              color: '#0891b2',
                              fontWeight: 600,
                            }}
                          >
                            {log.module || 'ADMIN'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                          By <strong style={{ color: 'var(--text-primary)' }}>{log.userEmail || 'super_admin'}</strong>
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                      {formatRelativeTime(log.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section 5: Important Notifications */}
        <div className="sa-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Bell size={15} style={{ color: '#0891b2' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Important Notifications
                </h3>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {(summary.unreadNotifications ?? 0)} unread notification{(summary.unreadNotifications ?? 0) === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleNavigate('notifications')}
              className="btn btn--outline btn--sm"
              style={{ fontSize: '0.75rem', height: '28px', padding: '0 0.65rem' }}
            >
              <span>View Notifications</span>
              <ArrowRight size={12} style={{ marginLeft: '0.3rem' }} />
            </button>
          </div>

          <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                No notifications to display.
              </div>
            ) : (
              notifications.slice(0, 5).map((n) => {
                const isUnread = !n.isRead;
                return (
                  <div
                    key={n._id || n.id}
                    style={{
                      padding: '0.6rem 0.75rem',
                      background: isUnread ? 'var(--bg-main)' : 'transparent',
                      border: `1px solid ${isUnread ? 'rgba(8, 145, 178, 0.3)' : 'var(--border-color)'}`,
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>{n.title}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{formatRelativeTime(n.createdAt)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
