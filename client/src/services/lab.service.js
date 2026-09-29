/**
 * Laboratory Diagnostics API Service
 * 
 * Centralized API client for the HMS Laboratory Diagnostics portal.
 * Connects to backend /api/v1/lab endpoints with JWT bearer authentication.
 */

import api from './api';

export const labService = {
  // 1. Dashboard Overview & Real KPIs
  getDashboard: () => api.get('/lab/dashboard'),

  // 2. Lab Requests
  getRequests: (params) => api.get('/lab/requests', { params }),
  getRequestById: (id) => api.get(`/lab/requests/${id}`),
  updateRequestStatus: (id, data) => api.patch(`/lab/requests/${id}/status`, data),

  // 3. Specimen & Sample Management
  getSamples: (params) => api.get('/lab/samples', { params }),
  collectSample: (data) => api.post('/lab/samples/collect', data),
  rejectSample: (id, data) => api.patch(`/lab/samples/${id}/reject`, data),

  // 4. Test Catalog
  getTests: (params) => api.get('/lab/tests', { params }),
  createTest: (data) => api.post('/lab/tests', data),
  updateTest: (id, data) => api.put(`/lab/tests/${id}`, data),

  // 5. Test Processing
  getProcessingQueue: () => api.get('/lab/processing'),
  startProcessing: (data) => api.post('/lab/processing/start', data),
  completeProcessing: (id, data) => api.patch(`/lab/processing/${id}/complete`, data),

  // 6. Results Entry
  getResultsPending: () => api.get('/lab/results'),
  enterResults: (data) => api.post('/lab/results', data),

  // 7. Result Verification Workstation
  getVerificationQueue: () => api.get('/lab/verification'),
  verifyResult: (id, data) => api.patch(`/lab/results/${id}/verify`, data),
  returnResult: (id, data) => api.patch(`/lab/results/${id}/return`, data),

  // 8. Critical & Abnormal Results
  getCriticalResults: () => api.get('/lab/critical-results'),
  acknowledgeCritical: (id, data) => api.patch(`/lab/critical-results/${id}/acknowledge`, data),

  // 9. Diagnostic Reports Archive
  getReports: (params) => api.get('/lab/reports', { params }),

  // 10. Patients Laboratory Directory & History
  getPatients: (params) => api.get('/lab/patients', { params }),
  getPatientHistory: (id) => api.get(`/lab/patients/${id}/history`),

  // 11. Notifications
  getNotifications: () => api.get('/lab/notifications'),
  markNotificationRead: (id) => api.patch(`/lab/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/lab/notifications/mark-all-read'),

  // 12. Profile & Security
  updateProfile: (data) => api.put('/lab/profile', data),
  changePassword: (data) => api.put('/lab/change-password', data),
};
