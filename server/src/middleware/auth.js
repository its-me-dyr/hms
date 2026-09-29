/**
 * Authentication Middleware
 * 
 * Verifies JWT bearer tokens, checks token revocation/user status, and populates req.user.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const ApiError = require('../utils/ApiError');

/**
 * Protect routes - require valid JWT
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header for Bearer token
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      // Fallback to cookie if present
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new ApiError(401, 'Authentication required. Please log in.'));
    }

    // Verify token
    const secret = process.env.JWT_SECRET || 'fallback_jwt_secret_dev_mode_only_change_in_prod';
    const decoded = jwt.verify(token, secret);

    // Handle Super Admin token from environment
    if (decoded.id === 'super_admin_system') {
      req.user = {
        _id: 'super_admin_system',
        id: 'super_admin_system',
        email: decoded.email,
        roleName: 'SUPER_ADMIN',
        role: { name: 'SUPER_ADMIN', displayName: 'Super Administrator', permissions: ['*'] },
        isActive: true,
        status: 'active',
      };
      req.tokenPayload = decoded;
      return next();
    }

    // Fetch user and populate role permissions
    const user = await User.findById(decoded.id).populate('role');

    if (!user) {
      return next(new ApiError(401, 'The user belonging to this token no longer exists.'));
    }

    if (user.status === 'suspended') {
      return next(new ApiError(403, 'Your account has been deactivated or suspended. Contact administration.'));
    }

    if (user.status === 'rejected') {
      return next(new ApiError(403, 'Your account application was rejected.'));
    }

    if (!user.isActive || user.status === 'inactive') {
      return next(new ApiError(403, 'Your account is currently inactive. Please contact the hospital administrator.'));
    }

    // Attach user and decoded payload to request
    req.user = user;
    req.tokenPayload = decoded;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid authentication token.'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Authentication token has expired. Please log in again.'));
    }
    next(error);
  }
};

/**
 * Restrict routes to specific roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    const userRole = (
      req.user?.roleName ||
      (req.user?.role && req.user.role.name) ||
      req.tokenPayload?.role ||
      ''
    ).toLowerCase();

    const normalizedAllowed = roles.map((r) => r.toLowerCase());

    if (!normalizedAllowed.includes(userRole) && userRole !== 'super_admin') {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    next();
  };
};

/**
 * Optional Protect middleware - populates req.user if a valid token exists,
 * but does not reject requests if missing or expired (useful for logout/cleanup).
 */
const optionalProtect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) return next();

    const secret = process.env.JWT_SECRET || 'fallback_jwt_secret_dev_mode_only_change_in_prod';
    const decoded = jwt.verify(token, secret);

    if (decoded.id === 'super_admin_system') {
      req.user = {
        _id: 'super_admin_system',
        id: 'super_admin_system',
        email: decoded.email,
        roleName: 'SUPER_ADMIN',
        role: { name: 'SUPER_ADMIN', displayName: 'Super Administrator', permissions: ['*'] },
        isActive: true,
        status: 'active',
      };
      req.tokenPayload = decoded;
      return next();
    }

    const user = await User.findById(decoded.id).populate('role');
    if (user) {
      req.user = user;
      req.tokenPayload = decoded;
    }
    next();
  } catch (_err) {
    // Non-blocking for optional protect
    next();
  }
};

module.exports = {
  protect,
  optionalProtect,
  restrictTo,
};
