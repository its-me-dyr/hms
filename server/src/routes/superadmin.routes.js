/**
 * Super Admin Routes
 * 
 * Defines privileged endpoints for /api/v1/super-admin
 * Protected by protect and restrictTo('super_admin') middleware.
 */

const express = require('express');
const router = express.Router();
const superadminController = require('../controllers/superadmin.controller');
const { protect, restrictTo } = require('../middleware/auth');

// Require authentication on all endpoints
router.use(protect);

// 1. Dashboard Overview (Super Admin only)
router.get('/dashboard', restrictTo('super_admin'), superadminController.getDashboardOverview);

// 2. Staff Verification Requests Lifecycle (Super Admin only)
router.get('/verifications', restrictTo('super_admin'), superadminController.getVerificationRequests);
router.get('/verifications/:id', restrictTo('super_admin'), superadminController.getVerificationDetails);
router.patch('/verifications/:id/status', restrictTo('super_admin'), superadminController.updateVerificationStatus);

// Aliases for /verification-requests
router.get('/verification-requests', restrictTo('super_admin'), superadminController.getVerificationRequests);
router.get('/verification-requests/:id', restrictTo('super_admin'), superadminController.getVerificationDetails);
router.patch('/verification-requests/:id/status', restrictTo('super_admin'), superadminController.updateVerificationStatus);

// 3. User & Staff Management (Super Admin & Hospital Admin)
router.get('/users', restrictTo('super_admin', 'hospital_admin'), superadminController.getUsersAndStaff);
router.post('/users', restrictTo('super_admin', 'hospital_admin'), superadminController.createStaffUser);
router.post('/users/:id/resend-credentials', restrictTo('super_admin', 'hospital_admin'), superadminController.resendStaffCredentials);
router.patch('/users/:id/status', restrictTo('super_admin', 'hospital_admin'), superadminController.updateUserStatus);

// 4. Roles & RBAC Matrix
router.get('/roles', restrictTo('super_admin', 'hospital_admin'), superadminController.getRolesAndPermissions);
router.post('/roles', restrictTo('super_admin'), superadminController.updateRolePermissions);

// 5. Departments
router.get('/departments', restrictTo('super_admin', 'hospital_admin'), superadminController.getDepartments);
router.post('/departments', restrictTo('super_admin', 'hospital_admin'), superadminController.createDepartment);
router.put('/departments/:id', restrictTo('super_admin', 'hospital_admin'), superadminController.updateDepartment);
router.patch('/departments/:id/status', restrictTo('super_admin', 'hospital_admin'), superadminController.toggleDepartmentStatus);

// 6. Audit Logs (Super Admin only)
router.get('/audit-logs', restrictTo('super_admin'), superadminController.getAuditLogs);

// 7. Hospital Management (Super Admin only)
router.get('/hospitals', restrictTo('super_admin'), superadminController.getHospitals);
router.post('/hospitals', restrictTo('super_admin'), superadminController.createHospitalWithAdmin);
router.get('/hospitals/:id', restrictTo('super_admin'), superadminController.getHospitalById);
router.put('/hospitals/:id', restrictTo('super_admin'), superadminController.updateHospital);
router.patch('/hospitals/:id/status', restrictTo('super_admin'), superadminController.toggleHospitalStatus);

// 8. Hospital Admin Management (Super Admin only)
router.get('/hospital-admins', restrictTo('super_admin'), superadminController.getHospitalAdmins);
router.get('/hospital-admins/:id', restrictTo('super_admin'), superadminController.getHospitalAdminById);
router.patch('/hospital-admins/:id/status', restrictTo('super_admin'), superadminController.toggleHospitalAdminStatus);

// 9. Super Admin Settings & Account Preferences (Super Admin only)
router.get('/settings', restrictTo('super_admin'), superadminController.getSuperAdminSettings);
router.patch('/settings', restrictTo('super_admin'), superadminController.updateSuperAdminSettings);
router.put('/settings', restrictTo('super_admin'), superadminController.updateSuperAdminSettings);
router.post('/settings/change-password', restrictTo('super_admin'), superadminController.changeSuperAdminPassword);

// Legacy Hospital Settings aliases for backward compatibility
router.get('/hospital-settings', restrictTo('super_admin'), superadminController.getHospitalSettings);
router.put('/hospital-settings', restrictTo('super_admin'), superadminController.updateHospitalSettings);

// 10. Reports & Analytics (Super Admin only)
router.get('/reports', restrictTo('super_admin'), superadminController.getReportsAndAnalytics);

// 11. Notifications (Super Admin only)
router.get('/notifications/unread-count', restrictTo('super_admin'), superadminController.getUnreadNotificationCount);
router.get('/notifications', restrictTo('super_admin'), superadminController.getNotifications);
router.patch('/notifications/read-all', restrictTo('super_admin'), superadminController.markAllNotificationsRead);
router.patch('/notifications/:id/read', restrictTo('super_admin'), superadminController.markNotificationRead);
router.delete('/notifications/:id', restrictTo('super_admin'), superadminController.deleteNotification);

// 12. Super Admin Profile & Account Security (Super Admin only)
router.get('/profile', restrictTo('super_admin'), superadminController.getSuperAdminProfile);
router.put('/profile', restrictTo('super_admin'), superadminController.updateSuperAdminProfile);
router.patch('/profile', restrictTo('super_admin'), superadminController.updateSuperAdminProfile);
router.put('/profile/password', restrictTo('super_admin'), superadminController.changeSuperAdminProfilePassword);
router.post('/profile/password', restrictTo('super_admin'), superadminController.changeSuperAdminProfilePassword);

module.exports = router;
