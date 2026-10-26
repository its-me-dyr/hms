/**
 * Super Admin API Service
 * 
 * Interacts with backend /api/v1/super-admin endpoints using authenticated Axios client.
 */

import api from './api';

export const superadminService = {
  // 1. Dashboard Overview
  getDashboardOverview: () => api.get('/super-admin/dashboard'),

  // 2. Staff Verification Requests Lifecycle
  getVerificationRequests: (params) => api.get('/super-admin/verifications', { params }),
  getVerificationDetails: (id) => api.get(`/super-admin/verifications/${id}`),
  updateVerificationStatus: (id, data) => api.patch(`/super-admin/verifications/${id}/status`, data),

  // 3. User & Staff Management
  getUsersAndStaff: (params) => api.get('/super-admin/users', { params }),
  createStaffUser: (data) => api.post('/super-admin/users', data),
  updateUserStatus: (id, data) => api.patch(`/super-admin/users/${id}/status`, data),

  // 4. Roles & RBAC Matrix
  getRolesAndPermissions: () => api.get('/super-admin/roles'),
  updateRolePermissions: (data) => api.post('/super-admin/roles', data),

  // 5. Departments
  getDepartments: () => api.get('/super-admin/departments'),
  createDepartment: (data) => api.post('/super-admin/departments', data),
  updateDepartment: (id, data) => api.put(`/super-admin/departments/${id}`, data),
  toggleDepartmentStatus: (id) => api.patch(`/super-admin/departments/${id}/status`),

  // 6. Audit Logs
  getAuditLogs: (params) => api.get('/super-admin/audit-logs', { params }),

  // 7. Hospital Management
  getHospitals: (params) => api.get('/super-admin/hospitals', { params }),
  getHospitalById: (id) => api.get(`/super-admin/hospitals/${id}`),
  createHospitalWithAdmin: (data) => api.post('/super-admin/hospitals', data),
  updateHospital: (id, data) => api.put(`/super-admin/hospitals/${id}`, data),
  toggleHospitalStatus: (id, data) => api.patch(`/super-admin/hospitals/${id}/status`, data),

  // 8. Hospital Admin Management
  getHospitalAdmins: (params) => api.get('/super-admin/hospital-admins', { params }),
  getHospitalAdminById: (id) => api.get(`/super-admin/hospital-admins/${id}`),
  toggleHospitalAdminStatus: (id, data) => api.patch(`/super-admin/hospital-admins/${id}/status`, data),

  // 9. Super Admin Settings
  getSettings: () => api.get('/super-admin/settings'),
  updateSettings: (data) => api.patch('/super-admin/settings', data),
  changePassword: (data) => api.post('/super-admin/settings/change-password', data),
  getHospitalSettings: () => api.get('/super-admin/hospital-settings'),
  updateHospitalSettings: (data) => api.put('/super-admin/hospital-settings', data),

  // 10. Reports & Analytics
  getReportsAndAnalytics: (params) => api.get('/super-admin/reports', { params }),

  // 11. Notifications
  getNotifications: (params) => api.get('/super-admin/notifications', { params }),
  getUnreadNotificationCount: () => api.get('/super-admin/notifications/unread-count'),
  markNotificationRead: (id) => api.patch(`/super-admin/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/super-admin/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/super-admin/notifications/${id}`),

  // 12. Super Admin Profile & Password Security
  getProfile: () => api.get('/super-admin/profile'),
  updateProfile: (data) => api.put('/super-admin/profile', data),
  changeProfilePassword: (data) => api.put('/super-admin/profile/password', data),
};
