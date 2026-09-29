/**
 * Auth Routes
 * 
 * Defines routing endpoints for /api/v1/auth
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect, optionalProtect, restrictTo } = require('../middleware/auth');
const {
  loginValidation,
  patientRegisterValidation,
  requestOtpValidation,
  verifyOtpValidation,
  resendOtpValidation,
  refreshTokenValidation,
} = require('../validations/auth.validation');

const { uploadDocument } = require('../middleware/upload.middleware');

// Disabled Public Registration routes (Strictly returns HTTP 403)
router.post('/register/request-otp', authController.requestOtp);
router.post('/register/verify-otp', authController.verifyOtp);
router.post('/register/resend-otp', authController.resendOtp);
router.post('/register', authController.register);

// Authentication & Session routes
router.post('/login', loginValidation, authController.login);
router.post('/refresh-token', refreshTokenValidation, authController.refreshToken);

// Document upload & secure file access routes
router.post('/upload-document', uploadDocument.single('file'), authController.uploadDocument);
router.get('/documents/:filename', authController.getDocumentFile);

// Staff Application Resubmission
router.post('/resubmit-application', authController.resubmitApplication);

// Authentication session routes
router.post('/logout', optionalProtect, authController.logout);
router.get('/me', protect, authController.getMe);
router.put('/change-password', protect, authController.changePassword);
router.get('/preferences', protect, authController.getPreferences);
router.put('/preferences', protect, authController.updatePreferences);

// Privileged routes (Super Admin & Hospital Admin only)
router.get('/pending-staff', protect, restrictTo('super_admin', 'hospital_admin'), authController.getPendingStaff);
router.patch('/staff/:id/status', protect, restrictTo('super_admin', 'hospital_admin'), authController.updateStaffStatus);

module.exports = router;
