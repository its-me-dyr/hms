/**
 * Doctor Clinical Workspace API Service
 * 
 * Centralized API client for the HMS Doctor Clinical Workspace.
 * Connects to backend /api/v1/doctor endpoints with JWT bearer authentication.
 */

import api from './api';

export const doctorService = {
  // 1. Dashboard Overview & Real KPIs
  getDashboard: () => api.get('/doctor/dashboard'),

  // 2. Doctor Patient Queue & Schedule
  getQueue: (params) => api.get('/doctor/queue', { params }),
  getAppointments: (params) => api.get('/doctor/appointments', { params }),
  getAppointmentById: (id) => api.get(`/doctor/appointments/${id}`),
  updateAppointmentStatus: (id, data) => api.patch(`/doctor/appointments/${id}/status`, data),
  cancelAppointment: (id, data) => api.patch(`/doctor/appointments/${id}/cancel`, data),
  rescheduleAppointment: (id, data) => api.patch(`/doctor/appointments/${id}/reschedule`, data),

  // 3. Authorized Patient Directory & Clinical Summary
  getPatients: (params) => api.get('/doctor/patients', { params }),
  getPatientDetails: (id) => api.get(`/doctor/patients/${id}`),

  // 4. Clinical Consultations
  getConsultations: (params) => api.get('/doctor/consultations', { params }),
  getConsultationById: (id) => api.get(`/doctor/consultations/${id}`),
  createConsultation: (data) => api.post('/doctor/consultations', data),
  updateConsultation: (id, data) => api.put(`/doctor/consultations/${id}`, data),

  // 5. Prescriptions Workspace
  getPrescriptions: (params) => api.get('/doctor/prescriptions', { params }),
  getPrescriptionById: (id) => api.get(`/doctor/prescriptions/${id}`),
  createPrescription: (data) => api.post('/doctor/prescriptions', data),
  updatePrescriptionStatus: (id, data) => api.patch(`/doctor/prescriptions/${id}/status`, data),
  getMedicines: (params) => api.get('/doctor/medicines', { params }),

  // 6. Notifications
  getNotifications: () => api.get('/doctor/notifications'),
  markNotificationRead: (id) => api.patch(`/doctor/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/doctor/notifications/mark-all-read'),
};
