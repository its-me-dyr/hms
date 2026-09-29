/**
 * Deactivate Confirmed Legacy Test Staff Accounts
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Appointment = require('./models/Appointment');
const MedicalRecord = require('./models/MedicalRecord');
const Prescription = require('./models/Prescription');
const LabReport = require('./models/LabReport');
const RadiologyReport = require('./models/RadiologyReport');
const AuditLog = require('./models/AuditLog');

async function deactivateLegacyTestStaff() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hms');

  const staff = await User.find({ roleName: { $ne: 'PATIENT' } }).lean();

  const canonicalEmails = [
    'admin@hms.com',
    'hospitaladmin@hms.com',
    'doctor@hms.com',
    'reception@hms.com',
    'robert.chen@hms.com',
    'amina.patel@hms.com',
  ];

  let deactivatedCount = 0;
  const deactivatedList = [];

  for (const s of staff) {
    if (canonicalEmails.includes(s.email.toLowerCase())) continue;
    if (['SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(s.roleName)) continue;

    const userId = s._id;
    const [
      apptsAsDoc,
      medRecords,
      prescriptions,
      labReports,
      radReports,
    ] = await Promise.all([
      Appointment.countDocuments({ doctor: userId }),
      MedicalRecord.countDocuments({ $or: [{ patient: userId }, { doctor: userId }] }),
      Prescription.countDocuments({ $or: [{ patient: userId }, { doctor: userId }] }),
      LabReport.countDocuments({ $or: [{ patient: userId }, { performedBy: userId }] }),
      RadiologyReport.countDocuments({ $or: [{ patient: userId }, { radiologist: userId }] }),
    ]);

    const hasClinicalLinks = (apptsAsDoc + medRecords + prescriptions + labReports + radReports) > 0;
    if (hasClinicalLinks) continue;

    // Deactivate safely
    await User.updateOne(
      { _id: s._id },
      { $set: { isActive: false, status: 'inactive' } }
    );

    deactivatedList.push({
      id: String(s._id),
      email: s.email,
      role: s.roleName,
      previousStatus: s.status,
      newStatus: 'inactive',
      isActive: false,
    });
    deactivatedCount++;
  }

  // Create audit log for bulk deactivation
  await AuditLog.create({
    userEmail: 'admin@hms.com',
    userRole: 'SUPER_ADMIN',
    action: 'LEGACY_TEST_STAFF_DEACTIVATION',
    module: 'admin',
    status: 'SUCCESS',
    details: {
      deactivatedCount,
      summary: `Deactivated ${deactivatedCount} legacy test staff accounts with zero clinical linkages.`,
    },
  });

  console.log(`Successfully deactivated ${deactivatedCount} legacy test staff accounts.`);
  await mongoose.disconnect();
}

deactivateLegacyTestStaff().catch((err) => {
  console.error(err);
  process.exit(1);
});
