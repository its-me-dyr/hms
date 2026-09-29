/**
 * Database Backup & User Inventory Tool
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const User = require('./models/User');
const Role = require('./models/Role');
const Department = require('./models/Department');
const Appointment = require('./models/Appointment');
const Bill = require('./models/Bill');
const MedicalRecord = require('./models/MedicalRecord');
const Prescription = require('./models/Prescription');
const LabReport = require('./models/LabReport');
const RadiologyReport = require('./models/RadiologyReport');
const AuditLog = require('./models/AuditLog');
const HospitalSetting = require('./models/HospitalSetting');
const Notification = require('./models/Notification');

async function backupAndInventory() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hms');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups', `hms-backup-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const collections = [
    { name: 'users', model: User },
    { name: 'roles', model: Role },
    { name: 'departments', model: Department },
    { name: 'appointments', model: Appointment },
    { name: 'bills', model: Bill },
    { name: 'medicalrecords', model: MedicalRecord },
    { name: 'prescriptions', model: Prescription },
    { name: 'labreports', model: LabReport },
    { name: 'radiologyreports', model: RadiologyReport },
    { name: 'auditlogs', model: AuditLog },
    { name: 'hospitalsettings', model: HospitalSetting },
    { name: 'notifications', model: Notification },
  ];

  console.log(`Starting database backup to: ${backupDir}`);
  for (const c of collections) {
    const docs = await c.model.find().lean();
    fs.writeFileSync(path.join(backupDir, `${c.name}.json`), JSON.stringify(docs, null, 2));
    console.log(`Backed up ${docs.length} documents from ${c.name}`);
  }
  console.log('Database backup completed successfully!\n');

  // Inventory analysis
  const users = await User.find().select('-password -refreshTokens').sort({ createdAt: 1 }).lean();
  const summary = [];

  for (const u of users) {
    const userId = u._id;
    const [
      apptsAsDoc,
      apptsAsPatient,
      billsAsPatient,
      medRecords,
      prescriptions,
      labReports,
      radReports,
      auditLogsCount,
    ] = await Promise.all([
      Appointment.countDocuments({ doctor: userId }),
      Appointment.countDocuments({ patient: userId }),
      Bill.countDocuments({ patient: userId }),
      MedicalRecord.countDocuments({ $or: [{ patient: userId }, { doctor: userId }] }),
      Prescription.countDocuments({ $or: [{ patient: userId }, { doctor: userId }] }),
      LabReport.countDocuments({ $or: [{ patient: userId }, { performedBy: userId }] }),
      RadiologyReport.countDocuments({ $or: [{ patient: userId }, { radiologist: userId }] }),
      AuditLog.countDocuments({ $or: [{ user: userId }, { userEmail: u.email }] }),
    ]);

    const isSystemOrSeed = ['admin@hms.com', 'hospitaladmin@hms.com', 'doctor@hms.com', 'reception@hms.com'].includes(u.email);
    const isTestPattern = /(\.test\.|\.audit\.|inactive\.|suspended\.|ha\.doc\.|doc\.ha\.|1790\d+)/.test(u.email);

    summary.push({
      id: String(u._id),
      email: u.email,
      name: `${u.firstName} ${u.lastName}`,
      role: u.roleName,
      status: u.status,
      isActive: u.isActive,
      isSystemOrSeed,
      isTestPattern,
      createdAt: u.createdAt,
      linked: {
        apptsAsDoc,
        apptsAsPatient,
        billsAsPatient,
        medRecords,
        prescriptions,
        labReports,
        radReports,
        auditLogsCount,
      },
    });
  }

  fs.writeFileSync(path.join(backupDir, 'user-inventory-summary.json'), JSON.stringify(summary, null, 2));
  console.log(`Inventory summary saved. Total users: ${summary.length}`);
  
  await mongoose.disconnect();
}

backupAndInventory().catch((err) => {
  console.error(err);
  process.exit(1);
});
