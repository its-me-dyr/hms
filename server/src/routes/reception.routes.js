/**
 * Reception & Front Desk Routes
 * 
 * Endpoints under /api/v1/reception.
 * Protected by JWT authentication and restricted to RECEPTIONIST, SUPER_ADMIN, and HOSPITAL_ADMIN.
 */

const express = require('express');
const router = express.Router();
const receptionController = require('../controllers/reception.controller');
const { protect, restrictTo } = require('../middleware/auth');

// Protect all routes and enforce role authorization
router.use(protect);
router.use(restrictTo('receptionist', 'super_admin', 'hospital_admin'));

// 1. Dashboard Overview
router.get('/dashboard', (req, res, next) => receptionController.getDashboardMetrics(req, res, next));

// 2. Patients Directory & Registration
router.get('/patients', (req, res, next) => receptionController.getPatients(req, res, next));
router.get('/patients/:id', (req, res, next) => receptionController.getPatientById(req, res, next));
router.post('/patients', (req, res, next) => receptionController.createPatient(req, res, next));

// 3. Clinical Master Data
router.get('/doctors', (req, res, next) => receptionController.getDoctors(req, res, next));
router.get('/departments', (req, res, next) => receptionController.getDepartments(req, res, next));

// 4. Appointments & Front Desk Scheduling
router.get('/appointments', (req, res, next) => receptionController.getAppointments(req, res, next));
router.post('/appointments', (req, res, next) => receptionController.bookAppointment(req, res, next));
router.patch('/appointments/:id/status', (req, res, next) => receptionController.updateAppointmentStatus(req, res, next));

// 5. OPD Live Queue & Tokens
router.get('/queue', (req, res, next) => receptionController.getQueueTokens(req, res, next));
router.post('/queue/token', (req, res, next) => receptionController.createOpdToken(req, res, next));
router.patch('/queue/:token/action', (req, res, next) => receptionController.updateQueueToken(req, res, next));

// 6. Front-Desk Inpatient Admission & Ward Beds
router.get('/beds', (req, res, next) => receptionController.getBedAvailability(req, res, next));
router.post('/admissions', (req, res, next) => receptionController.createAdmission(req, res, next));

// 7. Billing Coordination & Desk Payment Collection
router.get('/bills', (req, res, next) => receptionController.getBills(req, res, next));
router.post('/bills/:id/pay', (req, res, next) => receptionController.collectPayment(req, res, next));

// 8. Notifications
router.get('/notifications', (req, res, next) => receptionController.getNotifications(req, res, next));
router.patch('/notifications/mark-all-read', (req, res, next) => receptionController.markAllNotificationsRead(req, res, next));
router.put('/notifications/mark-all-read', (req, res, next) => receptionController.markAllNotificationsRead(req, res, next));
router.patch('/notifications/:id/read', (req, res, next) => receptionController.markNotificationRead(req, res, next));
router.put('/notifications/:id/read', (req, res, next) => receptionController.markNotificationRead(req, res, next));

// 9. Reception Staff Profile & Security
router.put('/profile', (req, res, next) => receptionController.updateProfile(req, res, next));
router.put('/change-password', (req, res, next) => receptionController.changePassword(req, res, next));

module.exports = router;
