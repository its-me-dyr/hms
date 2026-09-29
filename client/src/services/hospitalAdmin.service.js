/**
 * Hospital Admin API Service
 * 
 * Interacts with backend /api/v1/hospital-admin endpoints using authenticated Axios client.
 */

import api from './api';

export const hospitalAdminService = {
  // 1. Dashboard Overview
  getDashboardOverview: () => api.get('/hospital-admin/dashboard'),

  // 2. Hospital & Branch Settings
  getHospitalSettings: () => api.get('/hospital-admin/settings'),
  updateHospitalSettings: (data) => api.put('/hospital-admin/settings', data),
  getBranches: () => api.get('/hospital-admin/branches'),
  saveBranch: (data) => api.post('/hospital-admin/branches', data),
  deleteBranch: (id) => api.delete(`/hospital-admin/branches/${id}`),

  // 3. Departments
  getDepartments: () => api.get('/hospital-admin/departments'),
  createDepartment: (data) => api.post('/hospital-admin/departments', data),
  updateDepartment: (id, data) => api.put(`/hospital-admin/departments/${id}`, data),
  toggleDepartmentStatus: (id) => api.patch(`/hospital-admin/departments/${id}/status`),

  // 4. Services & Charges
  getServicesAndCharges: () => api.get('/hospital-admin/services'),
  saveServiceCharge: (data) => api.post('/hospital-admin/services', data),
  deleteServiceCharge: (id) => api.delete(`/hospital-admin/services/${id}`),

  // 5. Users & Staff Management
  getUsersAndStaff: (params) => api.get('/hospital-admin/users', { params }),
  createStaffUser: (data) => api.post('/hospital-admin/users', data),
  updateUserStatus: (id, data) => api.patch(`/hospital-admin/users/${id}/status`, data),

  // 6. Roles & Permissions (Read-only inspection)
  getRolesAndPermissions: () => api.get('/hospital-admin/roles'),

  // 7. Operating Hours & Holidays
  getOperatingHoursAndHolidays: () => api.get('/hospital-admin/operating-hours'),
  updateOperatingHours: (data) => api.put('/hospital-admin/operating-hours', data),
  saveHoliday: (data) => api.post('/hospital-admin/holidays', data),
  deleteHoliday: (id) => api.delete(`/hospital-admin/holidays/${id}`),

  // 8. Hospital Branding
  getBranding: () => api.get('/hospital-admin/branding'),
  updateBranding: (data) => api.put('/hospital-admin/branding', data),

  // 9. System Configuration
  getSystemConfig: () => api.get('/hospital-admin/system-config'),
  updateSystemConfig: (data) => api.put('/hospital-admin/system-config', data),

  // 10. Administrative Reports
  getAdministrativeReports: () => api.get('/hospital-admin/reports'),

  // 11. Notifications
  getNotifications: () => api.get('/hospital-admin/notifications'),
  markNotificationRead: (id) => api.patch(`/hospital-admin/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/hospital-admin/notifications/read-all'),

  // 12. Audit Logs
  getAuditLogs: (params) => api.get('/hospital-admin/audit-logs', { params }),

  // 13. My Profile
  getMyProfile: () => api.get('/hospital-admin/profile'),
  updateMyProfile: (data) => api.put('/hospital-admin/profile', data),
};
