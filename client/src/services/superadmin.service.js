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

  // 7. Hospital Settings
  getHospitalSettings: () => api.get('/super-admin/settings'),
  updateHospitalSettings: (data) => api.put('/super-admin/settings', data),

  // 8. Reports & Analytics
  getReportsAndAnalytics: () => api.get('/super-admin/reports'),
};
