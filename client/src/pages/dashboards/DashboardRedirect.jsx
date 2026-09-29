/**
 * Dashboard Redirect Component
 * 
 * Inspects authenticated user's role and redirects to the appropriate role-based dashboard.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { getDashboardPathForRole } from './roleNavigation';

export default function DashboardRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="route-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Resolving your portal workspace...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const destination = getDashboardPathForRole(user.role);
  return <Navigate to={destination} replace />;
}
