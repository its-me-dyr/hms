/**
 * Patient API Service
 * 
 * Interacts with backend /api/v1/patient endpoints using the authenticated Axios client.
 */

import api from './api';

export const patientService = {
  // 1. Dashboard Overview
  getDashboardSummary: () => api.get('/patient/dashboard-summary'),

  // 2. Profile
  getProfile: () => api.get('/patient/profile'),
  updateProfile: (data) => api.put('/patient/profile', data),

  // 3. Doctors & Availability
  getDoctors: (params) => api.get('/patient/doctors', { params }),

  // 4. Appointments
  getAppointments: (params) => api.get('/patient/appointments', { params }),
  bookAppointment: (data) => api.post('/patient/appointments', data),
  getAppointmentById: (id) => api.get(`/patient/appointments/${id}`),
  cancelAppointment: (id, cancellationReason) =>
    api.put(`/patient/appointments/${id}/cancel`, { cancellationReason }),

  // 5. Medical Records
  getMedicalRecords: () => api.get('/patient/medical-records'),
  getMedicalRecordById: (id) => api.get(`/patient/medical-records/${id}`),

  // 6. Prescriptions
  getPrescriptions: () => api.get('/patient/prescriptions'),
  getPrescriptionById: (id) => api.get(`/patient/prescriptions/${id}`),

  // 7. Lab Reports
  getLabReports: () => api.get('/patient/lab-reports'),
  getLabReportById: (id) => api.get(`/patient/lab-reports/${id}`),

  // 8. Radiology Reports
  getRadiologyReports: () => api.get('/patient/radiology-reports'),
  getRadiologyReportById: (id) => api.get(`/patient/radiology-reports/${id}`),

  // 9. Bills & Invoices
  getBills: () => api.get('/patient/bills'),
  getBillById: (id) => api.get(`/patient/bills/${id}`),
  payBill: (id, paymentData) => api.post(`/patient/bills/${id}/pay`, paymentData),

  // 10. Notifications
  getNotifications: () => api.get('/patient/notifications'),
  markNotificationRead: (id) => api.put(`/patient/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/patient/notifications/mark-all-read'),
};
