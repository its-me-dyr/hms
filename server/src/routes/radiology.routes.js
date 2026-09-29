/**
 * Radiology & Imaging Routes
 * 
 * Endpoints mounted under /api/v1/radiology.
 * Protected by JWT bearer authentication and role authorization.
 */

const express = require('express');
const router = express.Router();
const radiologyController = require('../controllers/radiology.controller');
const { protect, restrictTo } = require('../middleware/auth');

// Protect all radiology routes and authorize roles
router.use(protect);
router.use(restrictTo('radiology_staff', 'radiologist', 'radiology', 'super_admin', 'hospital_admin'));

// 1. Dashboard Metrics & Overview
router.get('/dashboard', radiologyController.getDashboardMetrics);

// 2. Imaging Requests
router.get('/requests', radiologyController.getImagingRequests);
router.get('/requests/:id', radiologyController.getImagingRequestById);
router.patch('/requests/:id/status', radiologyController.updateRequestStatus);

// 3. Scheduling
router.get('/schedules', radiologyController.getSchedules);
router.post('/schedules', radiologyController.createSchedule);
router.patch('/schedules/:id', radiologyController.updateSchedule);

// 4. Patient Preparation
router.get('/preparation', radiologyController.getPreparations);
router.patch('/preparation/:id', radiologyController.updatePreparation);

// 5. Imaging Queue
router.get('/queue', radiologyController.getQueue);
router.patch('/queue/:id/status', radiologyController.updateQueueStatus);

// 6. Study Processing
router.get('/studies', radiologyController.getStudies);
router.patch('/studies/:id/start', radiologyController.startStudy);
router.patch('/studies/:id/complete', radiologyController.completeStudy);

// 7. Report Entry
router.get('/reports/pending', radiologyController.getReportsPending);
router.post('/reports/:id/entry', radiologyController.submitReportEntry);

// 8. Report Verification
router.get('/reports/verification', radiologyController.getVerificationQueue);
router.patch('/reports/:id/verify', radiologyController.verifyReport);
router.patch('/reports/:id/return', radiologyController.returnReport);

// 9. Critical / Abnormal Findings
router.get('/critical-findings', radiologyController.getCriticalFindings);
router.patch('/critical-findings/:id/acknowledge', radiologyController.acknowledgeCritical);

// 10. Imaging Reports Archive
router.get('/reports', radiologyController.getImagingReports);

// 11. Patients
router.get('/patients', radiologyController.getPatients);
router.get('/patients/:id/history', radiologyController.getPatientImagingHistory);

// 12. Equipment
router.get('/equipment', radiologyController.getEquipment);
router.patch('/equipment/:id', radiologyController.updateEquipment);

// 13. Notifications
router.get('/notifications', radiologyController.getNotifications);
router.patch('/notifications/mark-all-read', radiologyController.markAllNotificationsRead);
router.put('/notifications/mark-all-read', radiologyController.markAllNotificationsRead);
router.patch('/notifications/:id/read', radiologyController.markNotificationRead);
router.put('/notifications/:id/read', radiologyController.markNotificationRead);

// 14. Profile & Security
router.put('/profile', radiologyController.updateProfile);
router.put('/change-password', radiologyController.changePassword);

module.exports = router;
