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
          <div className="patient-page-header__breadcrumb">
            <span className="patient-page-header__breadcrumb-root">{breadcrumb}</span>
            <span className="patient-page-header__breadcrumb-sep">/</span>
            <span className="patient-page-header__breadcrumb-current">{module}</span>
          </div>
        )}
        <h1 className="patient-page-header__title">{title}</h1>
        {subtitle && <p className="patient-page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div className="patient-page-header__actions">
          {actions}
        </div>
      )}
    </div>
  );
}
