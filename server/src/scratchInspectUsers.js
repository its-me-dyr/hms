/**
 * Inspect Users & Linked Records Script
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


async function inspectUsers() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hms');

  const users = await User.find().select('-password -refreshTokens').sort({ createdAt: 1 }).lean();
  console.log(`Total users found: ${users.length}\n`);

  const report = [];

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

    report.push({
      id: String(u._id),
      email: u.email,
      name: `${u.firstName} ${u.lastName}`,
      role: u.roleName,
      status: u.status,
      isActive: u.isActive,
      patientId: u.patientId || null,
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

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

inspectUsers().catch((err) => {
  console.error(err);
  process.exit(1);
});
