/**
 * Categorize all staff accounts into Canonical/Legitimate vs Legacy Test Accounts
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Appointment = require('./models/Appointment');
const Bill = require('./models/Bill');
const MedicalRecord = require('./models/MedicalRecord');
const Prescription = require('./models/Prescription');
const LabReport = require('./models/LabReport');
const RadiologyReport = require('./models/RadiologyReport');
const AuditLog = require('./models/AuditLog');

async function categorizeStaff() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hms');

  // Only consider staff accounts (exclude PATIENT)
  const staff = await User.find({ roleName: { $ne: 'PATIENT' } }).sort({ createdAt: 1 }).lean();

  const canonicalOrLegitimate = [];
  const confirmedLegacyTestStaff = [];

  for (const s of staff) {
    const userId = s._id;
    const [
      apptsAsDoc,
      billsAsPatient,
      medRecords,
      prescriptions,
      labReports,
      radReports,
      auditLogsCount,
    ] = await Promise.all([
      Appointment.countDocuments({ doctor: userId }),
      Bill.countDocuments({ patient: userId }),
      MedicalRecord.countDocuments({ $or: [{ patient: userId }, { doctor: userId }] }),
      Prescription.countDocuments({ $or: [{ patient: userId }, { doctor: userId }] }),
      LabReport.countDocuments({ $or: [{ patient: userId }, { performedBy: userId }] }),
      RadiologyReport.countDocuments({ $or: [{ patient: userId }, { radiologist: userId }] }),
      AuditLog.countDocuments({ $or: [{ user: userId }, { userEmail: s.email }] }),
    ]);

    const hasClinicalLinks = (apptsAsDoc + medRecords + prescriptions + labReports + radReports) > 0;
    const isCanonical = [
      'admin@hms.com',
      'hospitaladmin@hms.com',
      'doctor@hms.com',
      'reception@hms.com',
      'robert.chen@hms.com',
      'amina.patel@hms.com',
    ].includes(s.email.toLowerCase());

    const isSuperOrHospitalAdmin = ['SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(s.roleName);

    const record = {
      id: String(s._id),
      email: s.email,
      name: `${s.firstName} ${s.lastName}`,
      role: s.roleName,
      status: s.status,
      isActive: s.isActive,
      createdAt: s.createdAt,
      linkedRecords: {
        appointments: apptsAsDoc,
        medicalRecords: medRecords,
        prescriptions,
        labReports,
        radiologyReports: radReports,
        auditLogs: auditLogsCount,
      },
    };

    if (isCanonical || isSuperOrHospitalAdmin || hasClinicalLinks) {
      canonicalOrLegitimate.push(record);
    } else {
      confirmedLegacyTestStaff.push(record);
    }
  }

  console.log(`Canonical / Protected Accounts: ${canonicalOrLegitimate.length}`);
  console.log(`Confirmed Legacy Test Staff Accounts: ${confirmedLegacyTestStaff.length}`);

  console.log('\n--- Canonical / Protected Accounts ---');
  console.log(canonicalOrLegitimate.map((u) => `${u.email} [${u.role}] (Status: ${u.status}, Active: ${u.isActive})`));

  console.log('\n--- Sample of Confirmed Legacy Test Staff Accounts ---');
  console.log(confirmedLegacyTestStaff.slice(0, 10).map((u) => `${u.email} [${u.role}] (Status: ${u.status}, Active: ${u.isActive}, Created: ${new Date(u.createdAt).toISOString().slice(0, 10)})`));

  await mongoose.disconnect();
}

categorizeStaff().catch((err) => {
  console.error(err);
  process.exit(1);
});
