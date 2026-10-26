/**
 * Central API Router Aggregator
 * 
 * Mounts all module routes under /api/v1
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const patientRoutes = require('./patient.routes');
const superadminRoutes = require('./superadmin.routes');
const receptionRoutes = require('./reception.routes');
const pharmacyRoutes = require('./pharmacy.routes');
const labRoutes = require('./lab.routes');
const radiologyRoutes = require('./radiology.routes');
const hospitalAdminRoutes = require('./hospitalAdmin.routes');
const doctorRoutes = require('./doctor.routes');

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hospital Management System API is operational',
    data: {
      status: 'UP',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

// Mount Module Routes
router.use('/auth', authRoutes);
router.use('/patient', patientRoutes);
router.use('/doctor', doctorRoutes);
router.use('/super-admin', superadminRoutes);
router.use('/superadmin', superadminRoutes);
router.use('/hospital-admin', hospitalAdminRoutes);
router.use('/reception', receptionRoutes);
router.use('/pharmacy', pharmacyRoutes);
router.use('/lab', labRoutes);
router.use('/radiology', radiologyRoutes);

module.exports = router;


