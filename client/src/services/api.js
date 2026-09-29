/**
 * API Service Layer
 * 
 * Centralized Axios instance with:
 * - Base URL configuration
 * - JWT token attachment via interceptors
 * - Automatic token refresh handling
 * - Consistent error response formatting
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ─────────────────────────────────────────
// Attach JWT token to every request if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hms_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ────────────────────────────────────────
// Handle common response patterns and errors
api.interceptors.response.use(
  (response) => response.data, // Unwrap — callers get { success, message, data } directly
  (error) => {
    const { response } = error;

    if (response) {
      // Server responded with an error status
      const errorData = response.data || {};

      // Handle 401 — token expired or invalid
      if (response.status === 401) {
        localStorage.removeItem('hms_access_token');
        localStorage.removeItem('hms_refresh_token');
        localStorage.removeItem('hms_user');

        // Only redirect if we're not already on the login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      return Promise.reject({
        status: response.status,
        message: errorData.message || 'An error occurred',
        errors: errorData.errors || [],
      });
    }

    // Network error or timeout
    return Promise.reject({
      status: 0,
      message: error.message || 'Network error. Please check your connection.',
      errors: [],
    });
  }
);

export default api;
