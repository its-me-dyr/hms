/**
 * Reception API Service
 * 
 * Interacts with backend /api/v1/reception endpoints using the authenticated Axios client.
 */

import api from './api';

export const receptionService = {
  // 1. Dashboard Overview
  getDashboard: () => api.get('/reception/dashboard'),

  // 2. Patients
  getPatients: (params) => api.get('/reception/patients', { params }),
  getPatientById: (id) => api.get(`/reception/patients/${id}`),
  createPatient: (data) => api.post('/reception/patients', data),

  // 3. Clinical Master Data
  getDoctors: (params) => api.get('/reception/doctors', { params }),
  getDepartments: () => api.get('/reception/departments'),

  // 4. Appointments
  getAppointments: (params) => api.get('/reception/appointments', { params }),
  bookAppointment: (data) => api.post('/reception/appointments', data),
  updateAppointmentStatus: (id, data) => api.patch(`/reception/appointments/${id}/status`, data),

  // 5. Live Queue & Tokens
  getQueueTokens: (params) => api.get('/reception/queue', { params }),
  createOpdToken: (data) => api.post('/reception/queue/token', data),
  updateQueueAction: (token, action) => api.patch(`/reception/queue/${token}/action`, { action }),

  // 6. Bed Availability & Inpatient Admission
  getBedAvailability: (params) => api.get('/reception/beds', { params }),
  createAdmission: (data) => api.post('/reception/admissions', data),

  // 7. Billing Coordination
  getBills: (params) => api.get('/reception/bills', { params }),
  collectPayment: (id, data) => api.post(`/reception/bills/${id}/pay`, data),

  // 8. Notifications
  getNotifications: () => api.get('/reception/notifications'),
  markNotificationRead: (id) => api.patch(`/reception/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/reception/notifications/mark-all-read'),

  // 9. Profile & Password
  updateProfile: (data) => api.put('/reception/profile', data),
  changePassword: (data) => api.put('/reception/change-password', data),
};
