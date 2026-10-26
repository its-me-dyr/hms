/**
 * CompactPageHeader
 * 
 * Reusable clean and compact page header for patient portal modules.
 * Renders module breadcrumb tag, page title, contextual subtitle, and optional actions.
 */
export default function CompactPageHeader({
  module,
  title,
  subtitle,
  actions = null,
  breadcrumb = 'Patient Portal',
}) {
  return (
    <div className="patient-page-header">
      <div className="patient-page-header__main">
        {module && (
          <div className="patient-page-header__breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem', fontSize: '0.75rem' }}>
            <span className="patient-page-header__breadcrumb-root" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{breadcrumb}</span>
            <span className="patient-page-header__breadcrumb-sep" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>/</span>
            <span className="patient-page-header__breadcrumb-current" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{module}</span>
          </div>
        )}
        <h1 className="patient-page-header__title" style={{ color: 'var(--text-primary)', margin: '0 0 0.35rem 0', fontWeight: 700, fontSize: '1.45rem', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="patient-page-header__subtitle" style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="patient-page-header__actions">
          {actions}
        </div>
      )}
    </div>
  );
}
