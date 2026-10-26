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
  refreshTokenValidation,
} = require('../validations/auth.validation');

const { uploadDocument } = require('../middleware/upload.middleware');

// Authentication & Session routes
const rejectPublicRegistration = (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Public registration is disabled. Staff must be provisioned by administrators, and patients must be registered by Reception.',
  });
};
router.post('/register', rejectPublicRegistration);
router.post('/register/request-otp', rejectPublicRegistration);
router.post('/register/verify-otp', rejectPublicRegistration);
router.post('/register/resend-otp', rejectPublicRegistration);

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
