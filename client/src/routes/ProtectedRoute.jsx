/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication.
 * Redirects to login if user is not authenticated.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="route-loading">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the attempted URL so we can redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user has a temporary password, force them to change it before accessing normal pages
  if (user?.mustChangePassword) {
    if (location.pathname !== '/force-change-password') {
      return <Navigate to="/force-change-password" replace />;
    }
    return children;
  }

  // If user does not require a password change, do not let them linger on /force-change-password
  if (location.pathname === '/force-change-password') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
