/**
 * Hospital Admin Routes
 * 
 * Endpoints for /api/v1/hospital-admin
 * Protected by protect and restrictTo('hospital_admin', 'super_admin').
 */

const express = require('express');
const router = express.Router();
const hospitalAdminController = require('../controllers/hospitalAdmin.controller');
const superadminController = require('../controllers/superadmin.controller');
const { protect, restrictTo } = require('../middleware/auth');

// All routes require authentication and hospital_admin or super_admin role
router.use(protect);
router.use(restrictTo('hospital_admin', 'super_admin'));

// 1. Dashboard Overview
router.get('/dashboard', hospitalAdminController.getDashboardOverview);

// 2. Hospital & Branch Settings
router.get('/settings', hospitalAdminController.getHospitalSettings);
router.put('/settings', hospitalAdminController.updateHospitalSettings);
router.get('/branches', hospitalAdminController.getBranches);
router.post('/branches', hospitalAdminController.saveBranch);
router.delete('/branches/:id', hospitalAdminController.deleteBranch);

// 3. Department Management
router.get('/departments', hospitalAdminController.getDepartments);
router.post('/departments', hospitalAdminController.createDepartment);
router.put('/departments/:id', hospitalAdminController.updateDepartment);
router.patch('/departments/:id/status', hospitalAdminController.toggleDepartmentStatus);

// 4. Service & Charge Configuration
router.get('/services', hospitalAdminController.getServicesAndCharges);
router.post('/services', hospitalAdminController.saveServiceCharge);
router.delete('/services/:id', hospitalAdminController.deleteServiceCharge);

// 5. Users & Staff Management (reusing battle-tested staff provisioning architecture)
router.get('/users', superadminController.getUsersAndStaff);
router.post('/users', superadminController.createStaffUser);
router.patch('/users/:id/status', superadminController.updateUserStatus);

// 6. Roles & Permissions (Read-only inspection for Hospital Admin)
router.get('/roles', hospitalAdminController.getRolesAndPermissions);

// 7. Operating Hours & Holidays
router.get('/operating-hours', hospitalAdminController.getOperatingHoursAndHolidays);
router.put('/operating-hours', hospitalAdminController.updateOperatingHours);
router.post('/holidays', hospitalAdminController.saveHoliday);
router.delete('/holidays/:id', hospitalAdminController.deleteHoliday);

// 8. Hospital Branding
router.get('/branding', hospitalAdminController.getBranding);
router.put('/branding', hospitalAdminController.updateBranding);

// 9. System Configuration
router.get('/system-config', hospitalAdminController.getSystemConfig);
router.put('/system-config', hospitalAdminController.updateSystemConfig);

// 10. Administrative Reports
router.get('/reports', hospitalAdminController.getAdministrativeReports);

// 11. Notifications
router.get('/notifications', hospitalAdminController.getNotifications);
router.patch('/notifications/read-all', hospitalAdminController.markAllNotificationsRead);
router.patch('/notifications/:id/read', hospitalAdminController.markNotificationRead);

// 12. Audit Logs
router.get('/audit-logs', hospitalAdminController.getAuditLogs);

// 13. My Profile
router.get('/profile', hospitalAdminController.getMyProfile);
router.put('/profile', hospitalAdminController.updateMyProfile);

module.exports = router;
