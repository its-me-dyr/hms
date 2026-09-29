/**
 * Role-based Route Component
 * 
 * Wraps routes that require specific roles or permissions.
 * Must be used inside a ProtectedRoute (user must be authenticated).
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

/**
 * @param {Object} props
 * @param {string[]} [props.roles] - Allowed role names
 * @param {string[]} [props.permissions] - Required permission strings
 * @param {React.ReactNode} props.children
 */
export default function RoleRoute({ roles, permissions, children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (roles && roles.length > 0) {
    const userRole = String(user.role?.name || user.roleName || user.role || '')
      .toLowerCase()
      .replace(/[-\s]/g, '_');
    const normalizedRoles = roles.map((r) =>
      String(r).toLowerCase().replace(/[-\s]/g, '_')
    );

    // super_admin bypasses specific role restrictions
    if (!normalizedRoles.includes(userRole) && userRole !== 'super_admin') {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check permission-based access
  if (permissions && permissions.length > 0) {
    const userPermissions = user.permissions || [];
    const hasAllPermissions = permissions.every((p) => userPermissions.includes(p));
    if (!hasAllPermissions) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}
