/**
 * Client Auth Service
 * 
 * Interacts with backend /api/v1/auth endpoints.
 */

import api from './api';

export const authService = {
  /**
   * Upload single verification document before registration / application
   */
  async uploadDocument(file, documentName = '', documentType = 'other') {
    const formData = new FormData();
    formData.append('file', file);
    if (documentName) formData.append('documentName', documentName);
    if (documentType) formData.append('documentType', documentType);

    const response = await api.post('/auth/upload-document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response?.data || response;
  },

  /**
   * Resubmit rejected staff verification application
   */
  async resubmitApplication(payload) {
    const response = await api.post('/auth/resubmit-application', payload);
    return response?.data || response;
  },

  /**
   * Login with email and password
   */
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const payload = response?.data || response;

    if (payload && payload.accessToken) {
      localStorage.setItem('hms_access_token', payload.accessToken);
      if (payload.refreshToken) {
        localStorage.setItem('hms_refresh_token', payload.refreshToken);
      }
      if (payload.user) {
        localStorage.setItem('hms_user', JSON.stringify(payload.user));
      }
    }
    return payload;
  },

  /**
   * Refresh access token
   */
  async refreshToken() {
    const refreshToken = localStorage.getItem('hms_refresh_token');
    if (!refreshToken) throw new Error('No refresh token available');

    const response = await api.post('/auth/refresh-token', { refreshToken });
    const payload = response?.data || response;

    if (payload && payload.accessToken) {
      localStorage.setItem('hms_access_token', payload.accessToken);
    }
    return payload;
  },

  /**
   * Get current authenticated user profile
   */
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    const payload = response?.data || response;

    if (payload) {
      localStorage.setItem('hms_user', JSON.stringify(payload));
    }
    return payload;
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      const refreshToken = localStorage.getItem('hms_refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore API logout error if session expired
    } finally {
      localStorage.removeItem('hms_access_token');
      localStorage.removeItem('hms_refresh_token');
      localStorage.removeItem('hms_user');
    }
  },

  /**
   * Hospital Admin / Super Admin: Get staff accounts pending approval
   */
  async getPendingStaff() {
    const response = await api.get('/auth/pending-staff');
    return response?.data || response;
  },

  /**
   * Hospital Admin / Super Admin: Update staff approval status
   */
  async updateStaffStatus(id, status) {
    const response = await api.patch(`/auth/staff/${id}/status`, { status });
    return response?.data || response;
  },

  /**
   * Get stored user from localStorage
   */
  getStoredUser() {
    const userStr = localStorage.getItem('hms_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  /**
   * Check if token exists
   */
  isAuthenticated() {
    return !!localStorage.getItem('hms_access_token');
  },

  /**
   * Change password for authenticated user (used for forced password change or profile update)
   */
  async changePassword(currentPassword, newPassword) {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    const payload = response?.data || response;
    if (payload?.accessToken) {
      localStorage.setItem('hms_access_token', payload.accessToken);
    }
    if (payload?.refreshToken) {
      localStorage.setItem('hms_refresh_token', payload.refreshToken);
    }
    if (payload?.user) {
      localStorage.setItem('hms_user', JSON.stringify(payload.user));
    }
    return payload;
  },
};

export default authService;
