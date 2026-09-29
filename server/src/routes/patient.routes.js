/**
 * Patient Routes
 * 
 * Endpoints under /api/v1/patient.
 * Strictly protected by JWT authentication and role authorization (patient).
 */

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const patientController = require('../controllers/patientController');

// All patient endpoints require authentication and 'patient' role
router.use(protect);
router.use(restrictTo('patient'));

// Dashboard Overview Summary
router.get('/dashboard-summary', patientController.getDashboardSummary);
router.get('/dashboard', patientController.getDashboardSummary);

// Profile
router.get('/profile', patientController.getProfile);
router.put('/profile', patientController.updateProfile);

// Doctors Directory & Availability
router.get('/doctors', patientController.getDoctors);

// Appointments
router.get('/appointments', patientController.getAppointments);
router.post('/appointments', patientController.bookAppointment);
router.get('/appointments/:id', patientController.getAppointmentById);
router.put('/appointments/:id/cancel', patientController.cancelAppointment);

// Clinical: Medical Records
router.get('/medical-records', patientController.getMedicalRecords);
router.get('/medical-records/:id', patientController.getMedicalRecordById);

// Clinical: Prescriptions
router.get('/prescriptions', patientController.getPrescriptions);
router.get('/prescriptions/:id', patientController.getPrescriptionById);

// Diagnostics: Lab Reports
router.get('/lab-reports', patientController.getLabReports);
router.get('/lab-reports/:id', patientController.getLabReportById);

// Diagnostics: Radiology & Imaging Reports
router.get('/radiology-reports', patientController.getRadiologyReports);
router.get('/radiology-reports/:id', patientController.getRadiologyReportById);

// Finance: Invoices & Payment
router.get('/bills', patientController.getBills);
router.get('/bills/:id', patientController.getBillById);
router.post('/bills/:id/pay', patientController.payBill);

// Notifications
router.get('/notifications', patientController.getNotifications);
router.put('/notifications/mark-all-read', patientController.markAllNotificationsRead);
router.put('/notifications/:id/read', patientController.markNotificationRead);

module.exports = router;
