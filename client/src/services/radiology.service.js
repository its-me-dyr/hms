/**
 * Radiology & Imaging API Service
 * 
 * Centralized API client for the HMS Radiology & Imaging portal.
 * Connects to backend /api/v1/radiology endpoints with JWT bearer authentication.
 */

import api from './api';

export const radiologyService = {
  // 1. Dashboard Overview & Real KPIs
  getDashboard: () => api.get('/radiology/dashboard'),

  // 2. Imaging Requests
  getRequests: (params) => api.get('/radiology/requests', { params }),
  getRequestById: (id) => api.get(`/radiology/requests/${id}`),
  updateRequestStatus: (id, data) => api.patch(`/radiology/requests/${id}/status`, data),

  // 3. Scheduling & Calendar
  getSchedules: (params) => api.get('/radiology/schedules', { params }),
  createSchedule: (data) => api.post('/radiology/schedules', data),
  updateSchedule: (id, data) => api.patch(`/radiology/schedules/${id}`, data),

  // 4. Patient Preparation & Checklist
  getPreparations: (params) => api.get('/radiology/preparation', { params }),
  updatePreparation: (id, data) => api.patch(`/radiology/preparation/${id}`, data),

  // 5. Imaging Queue & Modality Assignment
  getQueue: (params) => api.get('/radiology/queue', { params }),
  updateQueueStatus: (id, data) => api.patch(`/radiology/queue/${id}/status`, data),

  // 6. Study Processing & Acquisition
  getStudies: (params) => api.get('/radiology/studies', { params }),
  startStudy: (id, data) => api.patch(`/radiology/studies/${id}/start`, data),
  completeStudy: (id, data) => api.patch(`/radiology/studies/${id}/complete`, data),

  // 7. Report Entry & Interpretation
  getReportsPending: (params) => api.get('/radiology/reports/pending', { params }),
  submitReportEntry: (id, data) => api.post(`/radiology/reports/${id}/entry`, data),

  // 8. Report Verification Workstation
  getVerificationQueue: (params) => api.get('/radiology/reports/verification', { params }),
  verifyReport: (id, data) => api.patch(`/radiology/reports/${id}/verify`, data),
  returnReport: (id, data) => api.patch(`/radiology/reports/${id}/return`, data),

  // 9. Critical & Abnormal Findings
  getCriticalFindings: (params) => api.get('/radiology/critical-findings', { params }),
  acknowledgeCritical: (id, data) => api.patch(`/radiology/critical-findings/${id}/acknowledge`, data),

  // 10. Diagnostic Reports Archive
  getReports: (params) => api.get('/radiology/reports', { params }),

  // 11. Patients Radiology Directory & History
  getPatients: (params) => api.get('/radiology/patients', { params }),
  getPatientHistory: (id) => api.get(`/radiology/patients/${id}/history`),

  // 12. Equipment Status & Maintenance
  getEquipment: (params) => api.get('/radiology/equipment', { params }),
  updateEquipment: (id, data) => api.patch(`/radiology/equipment/${id}`, data),

  // 13. Notifications
  getNotifications: () => api.get('/radiology/notifications'),
  markNotificationRead: (id) => api.patch(`/radiology/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/radiology/notifications/mark-all-read'),

  // 14. Profile & Security
  updateProfile: (data) => api.put('/radiology/profile', data),
  changePassword: (data) => api.put('/radiology/change-password', data),
};
