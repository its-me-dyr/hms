/**
 * Laboratory Diagnostics Routes
 * 
 * Endpoints mounted under /api/v1/lab.
 * Protected by JWT bearer authentication and role authorization.
 */

const express = require('express');
const router = express.Router();
const labController = require('../controllers/lab.controller');
const { protect, restrictTo } = require('../middleware/auth');

// Protect all laboratory routes and authorize roles
router.use(protect);
router.use(restrictTo('lab_technician', 'lab_tech', 'super_admin', 'hospital_admin'));

// 1. Dashboard Metrics & Overview
router.get('/dashboard', labController.getDashboardMetrics);

// 2. Lab Requests
router.get('/requests', labController.getLabRequests);
router.get('/requests/:id', labController.getLabRequestById);
router.patch('/requests/:id/status', labController.updateRequestStatus);

// 3. Specimen & Sample Management
router.get('/samples', labController.getSamples);
router.post('/samples/collect', labController.collectSample);
router.patch('/samples/:id/reject', labController.rejectSample);

// 4. Test Catalog
router.get('/tests', labController.getTestCatalog);
router.post('/tests', labController.createTestCatalogItem);
router.put('/tests/:id', labController.updateTestCatalogItem);

// 5. Test Processing
router.get('/processing', labController.getProcessingQueue);
router.post('/processing/start', labController.startProcessing);
router.patch('/processing/:id/complete', labController.completeProcessing);

// 6. Results Entry
router.get('/results', labController.getResultsPending);
router.post('/results', labController.enterResults);

// 7. Verification Workstation
router.get('/verification', labController.getVerificationQueue);
router.patch('/results/:id/verify', labController.verifyResult);
router.patch('/results/:id/return', labController.returnResult);

// 8. Critical & Abnormal Results
router.get('/critical-results', labController.getCriticalResults);
router.patch('/critical-results/:id/acknowledge', labController.acknowledgeCritical);

// 9. Lab Reports Archive
router.get('/reports', labController.getLabReports);

// 10. Patients Laboratory Directory & History
router.get('/patients', labController.getPatients);
router.get('/patients/:id/history', labController.getPatientLabHistory);

// 11. Notifications
router.get('/notifications', labController.getNotifications);
router.patch('/notifications/mark-all-read', labController.markAllNotificationsRead);
router.put('/notifications/mark-all-read', labController.markAllNotificationsRead);
router.patch('/notifications/:id/read', labController.markNotificationRead);
router.put('/notifications/:id/read', labController.markNotificationRead);

// 12. Profile & Security
router.put('/profile', labController.updateProfile);
router.put('/change-password', labController.changePassword);

module.exports = router;
