/**
 * Pharmacy & Medication Management Routes
 * 
 * Endpoints mounted under /api/v1/pharmacy.
 * Protected by JWT authentication and restricted to PHARMACIST, SUPER_ADMIN, and HOSPITAL_ADMIN.
 */

const express = require('express');
const router = express.Router();
const pharmacyController = require('../controllers/pharmacy.controller');
const { protect, restrictTo } = require('../middleware/auth');

// Protect all routes and enforce role authorization
router.use(protect);
router.use(restrictTo('pharmacist', 'super_admin', 'hospital_admin'));

// 1. Dashboard Overview
router.get('/dashboard', (req, res, next) => pharmacyController.getDashboardMetrics(req, res, next));

// 2. Prescriptions
router.get('/prescriptions', (req, res, next) => pharmacyController.getPrescriptions(req, res, next));

// 3. Dispensing
router.post('/dispense', (req, res, next) => pharmacyController.dispensePrescription(req, res, next));
router.get('/dispensations', (req, res, next) => pharmacyController.getDashboardMetrics(req, res, next));

// 4. Medicines Catalog
router.get('/medicines', (req, res, next) => pharmacyController.getMedicines(req, res, next));
router.post('/medicines', (req, res, next) => pharmacyController.addMedicine(req, res, next));

// 5. Inventory & Stock Adjustments
router.get('/inventory', (req, res, next) => pharmacyController.getInventory(req, res, next));
router.post('/inventory/adjust', (req, res, next) => pharmacyController.adjustStock(req, res, next));
router.post('/stock/adjust', (req, res, next) => pharmacyController.adjustStock(req, res, next));
router.get('/stock-adjustments', (req, res, next) => pharmacyController.getInventory(req, res, next));

// 6. Batches & Expiry
router.get('/batches', (req, res, next) => pharmacyController.getBatches(req, res, next));

// 7. Purchase Orders & Procurement
router.get('/purchase-orders', (req, res, next) => pharmacyController.getPurchaseOrders(req, res, next));
router.post('/purchase-orders', (req, res, next) => pharmacyController.createPurchaseOrder(req, res, next));

// 8. Suppliers Directory
router.get('/suppliers', (req, res, next) => pharmacyController.getSuppliers(req, res, next));
router.post('/suppliers', (req, res, next) => pharmacyController.addSupplier(req, res, next));

// 9. Sales & Billing Coordination
router.get('/bills', (req, res, next) => pharmacyController.getBills(req, res, next));
router.post('/bills/:id/pay', (req, res, next) => pharmacyController.collectPayment(req, res, next));

// 10. Returns
router.get('/returns', (req, res, next) => pharmacyController.getReturns(req, res, next));
router.post('/returns/patient', (req, res, next) => pharmacyController.createPatientReturn(req, res, next));

// 11. Low Stock
router.get('/low-stock', (req, res, next) => pharmacyController.getInventory(req, res, next));

// 12. Analytical Reports
router.get('/reports', (req, res, next) => pharmacyController.getReports(req, res, next));

// 13. Notifications
router.get('/notifications', (req, res, next) => pharmacyController.getNotifications(req, res, next));
router.patch('/notifications/mark-all-read', (req, res, next) => pharmacyController.markAllNotificationsRead(req, res, next));
router.put('/notifications/mark-all-read', (req, res, next) => pharmacyController.markAllNotificationsRead(req, res, next));
router.patch('/notifications/:id/read', (req, res, next) => pharmacyController.markNotificationRead(req, res, next));
router.put('/notifications/:id/read', (req, res, next) => pharmacyController.markNotificationRead(req, res, next));

// 14. Profile & Security
router.put('/profile', (req, res, next) => pharmacyController.updateProfile(req, res, next));
router.put('/change-password', (req, res, next) => pharmacyController.changePassword(req, res, next));

module.exports = router;
