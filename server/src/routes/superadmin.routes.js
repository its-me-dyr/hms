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

// 7. Hospital Settings (Super Admin only)
router.get('/settings', restrictTo('super_admin'), superadminController.getHospitalSettings);
router.put('/settings', restrictTo('super_admin'), superadminController.updateHospitalSettings);

// 8. Reports & Analytics (Super Admin only)
router.get('/reports', restrictTo('super_admin'), superadminController.getReportsAndAnalytics);

module.exports = router;
