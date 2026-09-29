/**
 * Database Seeder Script
 * 
 * Populates initial default roles, permissions, and demo users (Super Admin, Doctor, Receptionist).
 * Usage: node src/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('./models/Role');
const Permission = require('./models/Permission');
const User = require('./models/User');
const logger = require('./utils/logger');

// System Permissions catalog
const systemPermissions = [
  // Patients
  { name: 'patients:read', displayName: 'View Patients', module: 'patients', description: 'View patient records and search patient registry' },
  { name: 'patients:create', displayName: 'Register Patient', module: 'patients', description: 'Register new patients' },
  { name: 'patients:update', displayName: 'Edit Patient', module: 'patients', description: 'Update patient information' },
  { name: 'patients:delete', displayName: 'Delete Patient', module: 'patients', description: 'Soft delete or purge patient records' },
  
  // Appointments & OPD
  { name: 'appointments:read', displayName: 'View Appointments', module: 'appointments', description: 'View appointment calendar and list' },
  { name: 'appointments:create', displayName: 'Book Appointment', module: 'appointments', description: 'Schedule new appointments' },
  { name: 'appointments:update', displayName: 'Update Appointment', module: 'appointments', description: 'Reschedule or edit appointments' },
  { name: 'appointments:cancel', displayName: 'Cancel Appointment', module: 'appointments', description: 'Cancel existing appointments' },
  { name: 'consultations:write', displayName: 'Conduct Consultation', module: 'opd', description: 'Create and update consultation notes' },

  // Clinical & EMR
  { name: 'prescriptions:read', displayName: 'View Prescriptions', module: 'pharmacy', description: 'View patient prescriptions' },
  { name: 'prescriptions:write', displayName: 'Write Prescription', module: 'opd', description: 'Create and sign medical prescriptions' },
  { name: 'vitals:write', displayName: 'Record Vitals', module: 'nursing', description: 'Record patient vitals and nursing notes' },

  // Pharmacy & Inventory
  { name: 'pharmacy:read', displayName: 'View Pharmacy', module: 'pharmacy', description: 'View medicine catalog and stock' },
  { name: 'pharmacy:dispense', displayName: 'Dispense Medicine', module: 'pharmacy', description: 'Fulfill prescriptions and dispense drugs' },

  // Laboratory & Radiology
  { name: 'laboratory:read', displayName: 'View Lab Orders', module: 'laboratory', description: 'View laboratory orders and reports' },
  { name: 'laboratory:write', displayName: 'Enter Lab Results', module: 'laboratory', description: 'Upload and verify laboratory test results' },

  // Billing & Finance
  { name: 'billing:read', displayName: 'View Invoices', module: 'billing', description: 'View patient invoices and payment status' },
  { name: 'billing:create', displayName: 'Create Invoice', module: 'billing', description: 'Generate bills and accept payments' },

  // Admin & System
  { name: 'admin:users', displayName: 'Manage Users', module: 'admin', description: 'Create, update, and manage system users' },
  { name: 'admin:roles', displayName: 'Manage Roles', module: 'admin', description: 'Configure roles and permission matrices' },
  { name: 'admin:settings', displayName: 'System Settings', module: 'admin', description: 'Modify global hospital parameters' },
];

// System Roles definition
const systemRoles = [
  {
    name: 'SUPER_ADMIN',
    displayName: 'Super Administrator',
    description: 'Full system control with un-restricted access across all modules.',
    permissions: ['*'],
    isSystemRole: true,
  },
  {
    name: 'HOSPITAL_ADMIN',
    displayName: 'Hospital Administrator',
    description: 'Manages hospital operations, staff users, departments, and settings.',
    permissions: [
      'patients:read', 'patients:create', 'patients:update',
      'appointments:read', 'appointments:create', 'appointments:update', 'appointments:cancel',
      'billing:read', 'billing:create',
      'pharmacy:read', 'laboratory:read',
      'admin:users', 'admin:roles', 'admin:settings',
    ],
    isSystemRole: true,
  },
  {
    name: 'DOCTOR',
    displayName: 'Medical Doctor',
    description: 'Attending physician conducting OPD consultations, writing prescriptions, and requesting diagnostics.',
    permissions: [
      'patients:read',
      'appointments:read',
      'consultations:write',
      'prescriptions:read',
      'prescriptions:write',
      'laboratory:read',
      'vitals:write',
    ],
    isSystemRole: true,
  },
  {
    name: 'NURSE',
    displayName: 'Staff Nurse',
    description: 'Provides direct patient care, updates vitals, and administers medications.',
    permissions: [
      'patients:read',
      'appointments:read',
      'prescriptions:read',
      'vitals:write',
    ],
    isSystemRole: true,
  },
  {
    name: 'RECEPTIONIST',
    displayName: 'Front Desk Receptionist',
    description: 'Registers patients, schedules appointments, and manages queues.',
    permissions: [
      'patients:read',
      'patients:create',
      'patients:update',
      'appointments:read',
      'appointments:create',
      'appointments:update',
      'appointments:cancel',
      'billing:read',
    ],
    isSystemRole: true,
  },
  {
    name: 'PHARMACIST',
    displayName: 'Pharmacist',
    description: 'Manages drug inventory and dispenses prescribed medications.',
    permissions: [
      'patients:read',
      'prescriptions:read',
      'pharmacy:read',
      'pharmacy:dispense',
    ],
    isSystemRole: true,
  },
  {
    name: 'LAB_TECH',
    displayName: 'Laboratory Technician',
    description: 'Processes lab specimens and enters test results.',
    permissions: [
      'patients:read',
      'laboratory:read',
      'laboratory:write',
    ],
    isSystemRole: true,
  },
  {
    name: 'RADIOLOGY_STAFF',
    displayName: 'Radiology / Imaging Staff',
    description: 'Performs medical imaging, diagnostic scans, and prepares radiology reports.',
    permissions: [
      'patients:read',
      'radiology:read',
      'radiology:write',
      'pacs:access',
    ],
    isSystemRole: true,
  },
  {
    name: 'BILLING_STAFF',
    displayName: 'Billing & Cashier Staff',
    description: 'Generates hospital invoices, collects payments, and processes refunds.',
    permissions: [
      'patients:read',
      'billing:read',
      'billing:create',
    ],
    isSystemRole: true,
  },
  {
    name: 'PATIENT',
    displayName: 'Patient Portal Account',
    description: 'Patient portal user accessing own health records and appointments.',
    permissions: [
      'patients:read',
      'appointments:read',
      'appointments:create',
    ],
    isSystemRole: true,
  },
];

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hms';
    logger.info(`Connecting to database for seeding: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    // 1. Seed Permissions
    logger.info('Seeding system permissions...');
    for (const perm of systemPermissions) {
      await Permission.findOneAndUpdate(
        { name: perm.name },
        { ...perm, isSystem: true },
        { upsert: true, returnDocument: 'after' }
      );
    }
    logger.info(`Successfully seeded ${systemPermissions.length} permissions.`);

    // 2. Seed Roles
    logger.info('Seeding system roles...');
    const roleDocs = {};
    for (const roleData of systemRoles) {
      const role = await Role.findOneAndUpdate(
        { name: roleData.name },
        roleData,
        { upsert: true, returnDocument: 'after' }
      );
      roleDocs[roleData.name] = role;
    }
    logger.info(`Successfully seeded ${systemRoles.length} roles.`);

    // 3. Seed Default Users
    logger.info('Seeding default system users...');
    
    // Super Admin User
    const superAdminExists = await User.findOne({ email: 'admin@hms.com' });
    if (!superAdminExists) {
      const adminUser = new User({
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@hms.com',
        password: 'AdminPassword123!',
        phone: '+18005550100',
        role: roleDocs['SUPER_ADMIN']._id,
        roleName: 'SUPER_ADMIN',
        isEmailVerified: true,
      });
      await adminUser.save();
      logger.info('Created default Super Admin user: admin@hms.com / AdminPassword123!');
    } else {
      logger.info('Super Admin user already exists.');
    }

    // Demo Doctor User
    const doctorExists = await User.findOne({ email: 'doctor@hms.com' });
    if (!doctorExists) {
      const docUser = new User({
        firstName: 'Sarah',
        lastName: 'Jenkins',
        email: 'doctor@hms.com',
        password: 'DoctorPassword123!',
        phone: '+18005550101',
        role: roleDocs['DOCTOR']._id,
        roleName: 'DOCTOR',
        isEmailVerified: true,
      });
      await docUser.save();
      logger.info('Created demo Doctor user: doctor@hms.com / DoctorPassword123!');
    }

    // Demo Receptionist User
    const receptionExists = await User.findOne({ email: 'reception@hms.com' });
    if (!receptionExists) {
      const recepUser = new User({
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'reception@hms.com',
        password: 'ReceptionPassword123!',
        phone: '+18005550102',
        role: roleDocs['RECEPTIONIST']._id,
        roleName: 'RECEPTIONIST',
        isEmailVerified: true,
      });
      await recepUser.save();
      logger.info('Created demo Receptionist user: reception@hms.com / ReceptionPassword123!');
    }

    // Demo Hospital Admin User
    const hospitalAdminExists = await User.findOne({ email: 'hospitaladmin@hms.com' });
    if (!hospitalAdminExists) {
      const haUser = new User({
        firstName: 'Elena',
        lastName: 'Rostova',
        email: 'hospitaladmin@hms.com',
        password: 'HospitalAdmin123!',
        phone: '+18005550109',
        role: roleDocs['HOSPITAL_ADMIN']._id,
        roleName: 'HOSPITAL_ADMIN',
        isEmailVerified: true,
      });
      await haUser.save();
      logger.info('Created demo Hospital Admin user: hospitaladmin@hms.com / HospitalAdmin123!');
    } else {
      logger.info('Hospital Admin user already exists.');
    }

    logger.info('Database seeding completed successfully! 🎉');
    process.exit(0);

  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
