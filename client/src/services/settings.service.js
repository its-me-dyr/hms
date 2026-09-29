/**
 * Settings & Preferences API Service
 * 
 * Centralized API service for user settings, theme preferences,
 * password change, and institutional configuration.
 */

import api from './api';
import { superadminService } from './superadmin.service';

export const settingsService = {
  // 1. User Preferences (Theme, Notifications, Language, Formats)
  getPreferences: () => api.get('/auth/preferences'),
  updatePreferences: (data) => api.put('/auth/preferences', data),

  // 2. Account Security & Password
  changePassword: (data) => api.put('/auth/change-password', data),

  // 3. Admin-Only Hospital Settings
  getHospitalSettings: () => superadminService.getHospitalSettings(),
  updateHospitalSettings: (data) => superadminService.updateHospitalSettings(data),
};

export default settingsService;
