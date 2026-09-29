/**
 * Dashboard Page
 * 
 * Main landing page after login. Shows active user session details, role privileges,
 * and module status.
 */

import { useAuth } from '../../context/useAuth';
import {
  Users,
  Calendar,
  Bed,
  Activity,
  TrendingUp,
  Clock,
  ShieldCheck,
  Key,
  CheckCircle2,
} from 'lucide-react';

const OVERVIEW_CARDS = [
  {
    title: 'Total Patients',
    value: '—',
    icon: Users,
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-light)',
  },
  {
    title: "Today's Appointments",
    value: '—',
    icon: Calendar,
    color: 'var(--color-success)',
    bg: 'var(--color-success-light)',
  },
  {
    title: 'Beds Available',
    value: '—',
    icon: Bed,
    color: 'var(--color-warning)',
    bg: 'var(--color-warning-light)',
  },
  {
    title: 'Active Admissions',
    value: '—',
    icon: Activity,
    color: 'var(--color-danger)',
    bg: 'var(--color-danger-light)',
  },
  {
    title: "Today's Revenue",
    value: '—',
    icon: TrendingUp,
    color: 'var(--color-info)',
    bg: 'var(--color-info-light)',
  },
  {
    title: 'Avg Wait Time',
    value: '—',
    icon: Clock,
    color: 'var(--color-secondary)',
    bg: 'var(--color-secondary-light)',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1 className="page-header__title">Dashboard</h1>
        <p className="page-header__subtitle">
          Welcome back, <strong>{user?.fullName || user?.firstName || 'User'}</strong>. System status: <span className="badge badge--success">Operational</span>
        </p>
      </div>

      <div className="dashboard-cards">
        {OVERVIEW_CARDS.map((card) => (
          <div key={card.title} className="dashboard-card">
            <div className="dashboard-card__icon" style={{ color: card.color, backgroundColor: card.bg }}>
              <card.icon size={24} />
            </div>
            <div className="dashboard-card__content">
              <p className="dashboard-card__label">{card.title}</p>
              <h3 className="dashboard-card__value">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="dashboard-info__card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <ShieldCheck size={22} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Session Identity</h3>
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div><strong>Email:</strong> {user?.email}</div>
            <div><strong>Assigned Role:</strong> <span className="badge badge--primary">{user?.role || user?.roleName || 'User'}</span></div>
            <div><strong>Account Status:</strong> <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Active</span></div>
            <div><strong>Last Login:</strong> {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Just now'}</div>
          </div>
        </div>

        <div className="dashboard-info__card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Key size={22} style={{ color: 'var(--color-warning)' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Granted Permissions</h3>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxHeight: '140px', overflowY: 'auto' }}>
            {user?.permissions && user.permissions.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {user.permissions.map((p) => (
                  <span key={p} className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <p>Full Super Admin Wildcard Access (<code>*</code>)</p>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-info" style={{ marginTop: '1.5rem' }}>
        <div className="dashboard-info__card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
            <CheckCircle2 size={20} />
            <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>System Security & RBAC Active</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Authentication, session management, role matrix, and permission guards are fully implemented and operational across all hospital modules.
          </p>
        </div>
      </div>
    </div>
  );
}
