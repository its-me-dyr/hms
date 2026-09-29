/**
 * Appearance Settings Section
 * 
 * Select between Light, Dark, and System Default themes.
 * Immediate, application-wide reactive preview with visual theme mockups.
 */

import { Sun, Moon, Laptop, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../../context/useTheme';

export default function AppearanceSettings() {
  const { theme, effectiveTheme, setTheme } = useTheme();

  const themes = [
    {
      id: 'light',
      title: 'Light Theme',
      description: 'Clean, high-clarity day mode with medical teal accents and crisp white surfaces.',
      icon: Sun,
      previewBg: '#f8fafc',
      previewCard: '#ffffff',
      previewSidebar: '#ffffff',
      previewText: '#0f172a',
      previewBorder: '#e2e8f0',
      badgeColor: '#0891b2',
    },
    {
      id: 'dark',
      title: 'Dark Theme',
      description: 'High-contrast, low-glare cockpit optimized for night shifts and low-light environments.',
      icon: Moon,
      previewBg: '#0f172a',
      previewCard: '#1e293b',
      previewSidebar: '#111827',
      previewText: '#f8fafc',
      previewBorder: '#334155',
      badgeColor: '#22d3ee',
    },
    {
      id: 'system',
      title: 'System Default',
      description: 'Automatically synchronizes with your device operating system display preferences.',
      icon: Laptop,
      previewBg: effectiveTheme === 'dark' ? '#0f172a' : '#f8fafc',
      previewCard: effectiveTheme === 'dark' ? '#1e293b' : '#ffffff',
      previewSidebar: effectiveTheme === 'dark' ? '#111827' : '#ffffff',
      previewText: effectiveTheme === 'dark' ? '#f8fafc' : '#0f172a',
      previewBorder: effectiveTheme === 'dark' ? '#334155' : '#e2e8f0',
      badgeColor: '#0891b2',
    },
  ];

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <h2 className="settings-section__title">Display & Appearance</h2>
        <p className="settings-section__subtitle">
          Customize the visual interface of the Hospital Management System. Your theme preference applies across all portals, sidebars, tables, and dialogs.
        </p>
      </div>

      {/* Currently Active Theme Banner */}
      <div className="settings-alert settings-alert--info" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '0.85rem' }}>
            Current active appearance: <strong>{theme === 'system' ? `System Default (${effectiveTheme.toUpperCase()} active)` : `${theme.toUpperCase()} MODE`}</strong>
          </span>
        </div>
      </div>

      {/* Theme Cards Grid */}
      <div className="settings-theme-grid">
        {themes.map((t) => {
          const Icon = t.icon;
          const isSelected = theme === t.id;

          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => setTheme(t.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setTheme(t.id);
                }
              }}
              className={`settings-theme-card ${isSelected ? 'settings-theme-card--selected' : ''}`}
              aria-pressed={isSelected}
            >
              {/* Miniature UI Mockup */}
              <div
                className="settings-theme-preview"
                style={{
                  background: t.previewBg,
                  border: `1px solid ${t.previewBorder}`,
                }}
              >
                {/* Mockup Sidebar */}
                <div
                  className="settings-theme-preview__sidebar"
                  style={{
                    background: t.previewSidebar,
                    borderRight: `1px solid ${t.previewBorder}`,
                  }}
                >
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '3px',
                      background: t.badgeColor,
                      marginBottom: '8px',
                    }}
                  />
                  <div style={{ width: '80%', height: '4px', background: t.previewBorder, borderRadius: '2px', marginBottom: '4px' }} />
                  <div style={{ width: '60%', height: '4px', background: t.previewBorder, borderRadius: '2px', marginBottom: '4px' }} />
                  <div style={{ width: '70%', height: '4px', background: t.previewBorder, borderRadius: '2px' }} />
                </div>

                {/* Mockup Content */}
                <div className="settings-theme-preview__body">
                  {/* Top header line */}
                  <div
                    style={{
                      height: '12px',
                      background: t.previewCard,
                      borderBottom: `1px solid ${t.previewBorder}`,
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 4px',
                    }}
                  >
                    <div style={{ width: '20px', height: '3px', background: t.badgeColor, borderRadius: '2px' }} />
                  </div>
                  {/* Mock card */}
                  <div
                    style={{
                      background: t.previewCard,
                      border: `1px solid ${t.previewBorder}`,
                      borderRadius: '4px',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ width: '50%', height: '5px', background: t.badgeColor, borderRadius: '2px' }} />
                    <div style={{ width: '90%', height: '4px', background: t.previewBorder, borderRadius: '2px' }} />
                    <div style={{ width: '70%', height: '4px', background: t.previewBorder, borderRadius: '2px' }} />
                  </div>
                </div>
              </div>

              {/* Theme Details */}
              <div className="settings-theme-card__content">
                <div className="settings-theme-card__header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon size={18} style={{ color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)' }} />
                    <span className="settings-theme-card__title">{t.title}</span>
                  </div>
                  {isSelected && (
                    <CheckCircle2 size={18} style={{ color: 'var(--color-primary)' }} />
                  )}
                </div>
                <p className="settings-theme-card__desc">{t.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
