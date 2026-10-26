/**
 * Doctor Clinical Workspace Routes
 * 
 * Endpoints mounted under /api/v1/doctor.
 * Protected by JWT bearer authentication and role authorization (doctor).
 */

const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const { protect, restrictTo } = require('../middleware/auth');

// Protect all doctor routes and authorize doctor role
router.use(protect);
router.use(restrictTo('doctor', 'super_admin'));

// 1. Clinical Dashboard Overview (KPIs, Queue, Tasks, Activity, Trends)
router.get('/dashboard', (req, res, next) => doctorController.getDashboardOverview(req, res, next));

// 2. Doctor Appointment Queue & Schedule
router.get('/queue', (req, res, next) => doctorController.getQueue(req, res, next));
router.get('/appointments', (req, res, next) => doctorController.getAppointments(req, res, next));
router.get('/appointments/:id', (req, res, next) => doctorController.getAppointmentById(req, res, next));
router.patch('/appointments/:id/status', (req, res, next) => doctorController.updateAppointmentStatus(req, res, next));
router.patch('/appointments/:id/cancel', (req, res, next) => doctorController.cancelAppointment(req, res, next));
router.patch('/appointments/:id/reschedule', (req, res, next) => doctorController.rescheduleAppointment(req, res, next));

// 3. Authorized Patient Directory & Clinical Details
router.get('/patients', (req, res, next) => doctorController.getPatients(req, res, next));
router.get('/patients/:id', (req, res, next) => doctorController.getPatientDetails(req, res, next));

// 4. Clinical Consultations
router.get('/consultations', (req, res, next) => doctorController.getConsultations(req, res, next));
router.get('/consultations/:id', (req, res, next) => doctorController.getConsultationById(req, res, next));
router.post('/consultations', (req, res, next) => doctorController.createConsultation(req, res, next));
router.put('/consultations/:id', (req, res, next) => doctorController.updateConsultation(req, res, next));

// 5. Notifications
router.get('/notifications', (req, res, next) => doctorController.getNotifications(req, res, next));
router.patch('/notifications/mark-all-read', (req, res, next) => doctorController.markAllNotificationsRead(req, res, next));
router.patch('/notifications/:id/read', (req, res, next) => doctorController.markNotificationRead(req, res, next));

// 6. Clinical Prescriptions & Medicines Catalog
router.get('/prescriptions', (req, res, next) => doctorController.getPrescriptions(req, res, next));
router.get('/prescriptions/:id', (req, res, next) => doctorController.getPrescriptionById(req, res, next));
router.post('/prescriptions', (req, res, next) => doctorController.createPrescription(req, res, next));
router.patch('/prescriptions/:id/status', (req, res, next) => doctorController.updatePrescriptionStatus(req, res, next));
router.get('/medicines', (req, res, next) => doctorController.getMedicinesCatalog(req, res, next));

module.exports = router;
