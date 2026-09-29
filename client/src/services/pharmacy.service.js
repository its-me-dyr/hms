/**
 * Pharmacy API Service
 * 
 * Centralized API client for all Pharmacy Management modules.
 * Connects to backend /api/v1/pharmacy endpoints with JWT authorization.
 */

import api from './api';

export const pharmacyService = {
  // 1. Dashboard Overview & KPIs
  getDashboard: () => api.get('/pharmacy/dashboard'),

  // 2. Prescriptions
  getPrescriptions: (params) => api.get('/pharmacy/prescriptions', { params }),

  // 3. Dispensing
  dispense: (data) => api.post('/pharmacy/dispense', data),
  getDispensations: (params) => api.get('/pharmacy/dispensations', { params }),

  // 4. Medicines Catalog
  getMedicines: (params) => api.get('/pharmacy/medicines', { params }),
  addMedicine: (data) => api.post('/pharmacy/medicines', data),

  // 5. Inventory & Stock Adjustments
  getInventory: (params) => api.get('/pharmacy/inventory', { params }),
  adjustStock: (data) => api.post('/pharmacy/inventory/adjust', data),

  // 6. Batches & Expiry
  getBatches: (params) => api.get('/pharmacy/batches', { params }),

  // 7. Purchase Orders & Procurement
  getPurchaseOrders: (params) => api.get('/pharmacy/purchase-orders', { params }),
  createPurchaseOrder: (data) => api.post('/pharmacy/purchase-orders', data),

  // 8. Suppliers Directory
  getSuppliers: (params) => api.get('/pharmacy/suppliers', { params }),
  addSupplier: (data) => api.post('/pharmacy/suppliers', data),

  // 9. Sales & Billing Coordination
  getBills: (params) => api.get('/pharmacy/bills', { params }),
  collectPayment: (id, data) => api.post(`/pharmacy/bills/${id}/pay`, data),

  // 10. Returns Processing
  getReturns: (params) => api.get('/pharmacy/returns', { params }),
  createPatientReturn: (data) => api.post('/pharmacy/returns/patient', data),

  // 11. Reports & Analytics
  getReports: (params) => api.get('/pharmacy/reports', { params }),

  // 12. Notifications
  getNotifications: () => api.get('/pharmacy/notifications'),
  markNotificationRead: (id) => api.patch(`/pharmacy/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/pharmacy/notifications/mark-all-read'),

  // 13. Profile & Security
  updateProfile: (data) => api.put('/pharmacy/profile', data),
  changePassword: (data) => api.put('/pharmacy/change-password', data),
};
