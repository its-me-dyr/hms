/**
 * Auth Context
 * 
 * Provides authentication state and methods throughout the app.
 * Stores user data, tokens, and login/logout functions.
 */

import { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Synchronously initialize from localStorage to prevent initial render flicker
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('hms_user');
      const token = localStorage.getItem('hms_access_token');
      return storedUser && token ? JSON.parse(storedUser) : null;
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
          setUser(userData);
          localStorage.setItem('hms_user', JSON.stringify(userData));
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
    localStorage.setItem('hms_user', JSON.stringify(userData));
    localStorage.setItem('hms_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('hms_refresh_token', refreshToken);
    }
    setUser(userData);
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
      const updated = { ...prev, ...updates };
      localStorage.setItem('hms_user', JSON.stringify(updated));
      return updated;
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
