/**
 * Role-Based & Permission-Based Access Control (RBAC) Middleware
 * 
 * Enforces fine-grained permission checks ("patients:read", "billing:create")
 * and high-level role restrictions ("SUPER_ADMIN", "DOCTOR").
 */

const ApiError = require('../utils/ApiError');

/**
 * Restrict access to users possessing specific role names (e.g. ['SUPER_ADMIN', 'DOCTOR'])
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    const userRole = String(req.user.roleName || (req.user.role && req.user.role.name) || '').toLowerCase();
    const normalizedRoles = roles.map((r) => String(r).toLowerCase());

    if (!normalizedRoles.includes(userRole) && userRole !== 'super_admin') {
      return next(
        new ApiError(
          403,
          `Access denied. Requires one of the following roles: ${roles.join(', ')}`
        )
      );
    }

    next();
  };
};

/**
 * Restrict access to users possessing required granular permissions (e.g. 'patients:read')
 */
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    const userRole = req.user.role;
    const userRoleName = req.user.roleName || (userRole && userRole.name);

    // SUPER_ADMIN bypasses all permission checks
    if (userRoleName === 'SUPER_ADMIN') {
      return next();
    }

    // Extract user permissions array from populated role or JWT payload
    const userPermissions =
      (userRole && userRole.permissions) ||
      (req.tokenPayload && req.tokenPayload.permissions) ||
      [];

    // If role has wildcard permission '*'
    if (userPermissions.includes('*')) {
      return next();
    }

    // Check if user has ALL required permissions
    const hasAllPermissions = permissions.every((perm) =>
      userPermissions.includes(perm.toLowerCase())
    );

    if (!hasAllPermissions) {
      return next(
        new ApiError(
          403,
          `Forbidden: Insufficient permissions. Required: ${permissions.join(', ')}`
        )
      );
    }

    next();
  };
};

module.exports = {
  requireRole,
  requirePermission,
};
