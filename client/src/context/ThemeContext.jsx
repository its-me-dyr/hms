/**
 * Theme Context & Provider
 * 
 * Provides global theme state ('light' | 'dark' | 'system') across the entire HMS application.
 * - Persists choice to localStorage ('hms_theme')
 * - Immediately calculates and updates document data-theme attribute
 * - Responds dynamically to operating system color-scheme changes when in 'system' mode
 * - Syncs with authenticated user preferences when available
 */

import { createContext, useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/settings.service';

const ThemeContext = createContext(null);

const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

export function ThemeProvider({ children }) {
  // Read initial theme preference from localStorage or default to 'system'
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem('hms_theme');
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
      return 'system';
    } catch {
      return 'system';
    }
  });

  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  // Calculate effective active theme ('light' or 'dark')
  const effectiveTheme = theme === 'system' ? systemTheme : theme;

  const applyThemeToDOM = (activeTheme) => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', activeTheme);
    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Apply effective theme to DOM whenever it changes
  useEffect(() => {
    applyThemeToDOM(effectiveTheme);
  }, [effectiveTheme]);

  // Listen to OS theme changes when in 'system' mode
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemChange);
      return () => mediaQuery.removeListener(handleSystemChange);
    }
  }, []);

  // Update theme function
  const setTheme = useCallback((newTheme) => {
    if (!['light', 'dark', 'system'].includes(newTheme)) return;

    const active = newTheme === 'system' ? getSystemTheme() : newTheme;
    applyThemeToDOM(active);

    setThemeState(newTheme);
    try {
      localStorage.setItem('hms_theme', newTheme);
    } catch (err) {
      console.warn('Could not save theme to localStorage:', err);
    }

    // Persist to backend preferences if logged in
    const token = localStorage.getItem('hms_access_token');
    if (token) {
      settingsService.updatePreferences({ theme: newTheme }).catch(() => {
        // Silently ignore background sync errors
      });
    }
  }, []);

  const value = {
    theme,
    effectiveTheme,
    isDark: effectiveTheme === 'dark',
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeContext;
