/**
 * Auth Context
 * 
 * Provides authentication state and methods throughout the app.
 * Stores user data, tokens, and login/logout functions.
 */

import { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.service';

const AuthContext = createContext(null);

function normalizeUserData(rawUser) {
  if (!rawUser) return null;
  let normalizedRole = 'patient';
  let roleDetails = rawUser.roleDetails || null;

  if (typeof rawUser.role === 'object' && rawUser.role !== null) {
    roleDetails = rawUser.role;
    normalizedRole = String(rawUser.role.name || rawUser.role.roleName || rawUser.roleName || 'patient').toLowerCase();
  } else if (typeof rawUser.role === 'string' && rawUser.role.trim()) {
    normalizedRole = rawUser.role.toLowerCase();
  } else if (rawUser.roleName) {
    normalizedRole = String(rawUser.roleName).toLowerCase();
  }

  const roleName = rawUser.roleName || (roleDetails?.name ? String(roleDetails.name).toUpperCase() : normalizedRole.toUpperCase());

  return {
    ...rawUser,
    role: normalizedRole,
    roleName,
    roleDetails,
  };
}

export function AuthProvider({ children }) {
  // Synchronously initialize from localStorage to prevent initial render flicker
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('hms_user');
      const token = localStorage.getItem('hms_access_token');
      if (storedUser && token) {
        const parsed = JSON.parse(storedUser);
        const normalized = normalizeUserData(parsed);
        // Self-heal localStorage if role was stored as an object
        if (typeof parsed?.role === 'object' && parsed?.role !== null) {
          localStorage.setItem('hms_user', JSON.stringify(normalized));
        }
        return normalized;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Validate session on application startup
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const token = localStorage.getItem('hms_access_token');
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const response = await authService.getCurrentUser();
        // authService.getCurrentUser returns unwrapped user payload
        const userData = response?.data || response;
        if (isMounted && userData) {
          const normalized = normalizeUserData(userData);
          setUser(normalized);
          localStorage.setItem('hms_user', JSON.stringify(normalized));
        }
      } catch {
        // Token expired or invalid — clear state
        if (isMounted) {
          localStorage.removeItem('hms_user');
          localStorage.removeItem('hms_access_token');
          localStorage.removeItem('hms_refresh_token');
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback((userData, accessToken, refreshToken) => {
    const normalized = normalizeUserData(userData);
    localStorage.setItem('hms_user', JSON.stringify(normalized));
    localStorage.setItem('hms_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('hms_refresh_token', refreshToken);
    }
    setUser(normalized);
  }, []);

  const logout = useCallback(() => {
    try {
      authService.logout();
    } catch {
      // Ignore API logout error if session already revoked
    } finally {
      localStorage.removeItem('hms_user');
      localStorage.removeItem('hms_access_token');
      localStorage.removeItem('hms_refresh_token');
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const merged = { ...prev, ...updates };
      const normalized = normalizeUserData(merged);
      localStorage.setItem('hms_user', JSON.stringify(normalized));
      return normalized;
    });
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
