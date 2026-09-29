/**
 * Reusable Role Dashboard Shell Component
 * 
 * Provides consistent layout, sub-navigation tabs, role overview cards,
 * and clean "No data available yet" empty-states for future modules.
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { ROLE_NAVIGATION, normalizeRoleKey } from './roleNavigation';
import {
  ShieldCheck,
  Key,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export default function BaseRoleDashboard({ roleKey, customCards = [], quickActions = [], customTabContent = {} }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabFromUrl = searchParams.get('tab') || 'dashboard';

  const normalizedKey = normalizeRoleKey(roleKey || user?.role);
  const roleConfig = ROLE_NAVIGATION[normalizedKey] || ROLE_NAVIGATION.patient;

  const [activeTab, setActiveTabState] = useState(currentTabFromUrl);

  const setActiveTab = (tabId) => {
    setActiveTabState(tabId);
    setSearchParams({ tab: tabId });
  };

  const activeItem = roleConfig.items.find((i) => i.id === activeTab) || roleConfig.items[0];

  return (
    <div className="role-dashboard">
      {/* Header Banner */}
      <div className="role-dashboard__header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <span className="badge" style={{ background: roleConfig.badgeColor, color: '#ffffff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {user?.role || normalizedKey}
              </span>
              <span className="badge badge--success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle2 size={12} /> Active Session
              </span>
            </div>
            <h1 className="page-header__title" style={{ margin: 0 }}>{roleConfig.portalName}</h1>
            <p className="page-header__subtitle" style={{ margin: '0.25rem 0 0 0' }}>
              Welcome, <strong>{user?.fullName || user?.firstName || 'User'}</strong> • {user?.email}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{
              background: 'var(--bg-card)',
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Calendar size={15} style={{ color: 'var(--color-primary)' }} />
              <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Module Tabs */}
        <div className="role-dashboard__tabs" style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          marginTop: '1.25rem',
          paddingBottom: '0.25rem',
          borderBottom: '1px solid var(--border-color)',
        }}>
          {roleConfig.items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '6px 6px 0 0',
                  border: 'none',
                  borderBottom: isActive ? `2px solid ${roleConfig.badgeColor}` : '2px solid transparent',
                  background: isActive ? 'var(--color-primary-light)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 150ms ease',
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div style={{ marginTop: '1.5rem' }}>
        {activeTab === 'dashboard' ? (
          <div>
            {/* Overview Cards (Real data empty state) */}
            <div className="dashboard-cards">
              {customCards.length > 0 ? (
                customCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.title} className="dashboard-card">
                      <div className="dashboard-card__icon" style={{ color: card.color || 'var(--color-primary)', backgroundColor: card.bg || 'rgba(8, 145, 178, 0.1)' }}>
                        <Icon size={22} />
                      </div>
                      <div className="dashboard-card__content">
                        <p className="dashboard-card__label">{card.title}</p>
                        <h3 className="dashboard-card__value" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                          {card.value || 'No data available yet'}
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {card.subtext || 'Awaiting initial hospital entries'}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="dashboard-card__content">
                    <p className="dashboard-card__label">Active Workspace</p>
                    <h3 className="dashboard-card__value" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                      No hospital data available yet
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Operational records will populate as clinical modules are activated.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions & Workspace Info */}
            {quickActions.length > 0 && (
              <div style={{ marginTop: '1.5rem', background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Common Quick Actions</h4>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {quickActions.map((qa) => (
                    <button
                      key={qa.label}
                      onClick={() => setActiveTab(qa.targetTab || 'dashboard')}
                      className="btn btn--outline"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                    >
                      {qa.icon && <qa.icon size={15} />}
                      <span>{qa.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Session Security & Identity Grid */}
            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
              <div className="dashboard-info__card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <ShieldCheck size={20} style={{ color: 'var(--color-primary)' }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Identity & Access Verification</h3>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div><strong>Full Name:</strong> {user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`}</div>
                  <div><strong>Email:</strong> {user?.email}</div>
                  <div><strong>Assigned System Role:</strong> <span className="badge badge--primary">{user?.role || 'patient'}</span></div>
                  <div><strong>Account Status:</strong> <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Active & Verified</span></div>
                  <div><strong>Backend Storage:</strong> MongoDB Document Store</div>
                </div>
              </div>

              <div className="dashboard-info__card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Key size={20} style={{ color: '#d97706' }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Role-Based Permissions</h3>
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  {user?.permissions && user.permissions.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: '130px', overflowY: 'auto' }}>
                      {user.permissions.map((p) => (
                        <span key={p} className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0 }}>
                      Role permissions strictly enforced via JWT and MongoDB RBAC middleware.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : customTabContent[activeTab] ? (
          customTabContent[activeTab]({ activeTab, setActiveTab })
        ) : (
          /* Empty state for modules implemented later */
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}>
              <activeItem.icon size={32} />
            </div>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{activeItem.label}</h2>
            <p style={{ maxWidth: '480px', margin: '0 auto 1.5rem auto', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No data available yet. The <strong>{activeItem.label}</strong> module will be integrated with full database schemas and clinical workflows in subsequent development phases.
            </p>
            <div style={{ display: 'inline-flex', gap: '0.75rem' }}>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="btn btn--primary btn--sm"
              >
                Return to Overview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
