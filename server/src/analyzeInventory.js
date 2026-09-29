/**
 * Parse and categorize users inventory
 */

const fs = require('fs');
const path = require('path');

const backupDir = 'D:/GD/hms/server/backups/hms-backup-2026-09-28T09-25-29-444Z';
const summary = JSON.parse(fs.readFileSync(path.join(backupDir, 'user-inventory-summary.json'), 'utf8'));

console.log(`Total users: ${summary.length}`);

const rolesCount = {};
for (const u of summary) {
  rolesCount[u.role] = (rolesCount[u.role] || 0) + 1;
}
console.log('Roles breakdown:', rolesCount);

// Group into:
// 1. Super Admins
// 2. Hospital Admins
// 3. Patients
// 4. Canonical / Seeded Staff
// 5. Staff with Linked Records (appointments, prescriptions, lab, etc.)
// 6. Test Staff accounts without critical clinical linkages

const superAdmins = summary.filter((u) => u.role === 'SUPER_ADMIN');
const hospitalAdmins = summary.filter((u) => u.role === 'HOSPITAL_ADMIN');
const patients = summary.filter((u) => u.role === 'PATIENT');
const canonicalStaff = summary.filter((u) => u.isSystemOrSeed && !['SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(u.role));
const staffWithClinicalLinks = summary.filter((u) => {
  if (['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PATIENT'].includes(u.role) || u.isSystemOrSeed) return false;
  const l = u.linked;
  return l.apptsAsDoc > 0 || l.medRecords > 0 || l.prescriptions > 0 || l.labReports > 0 || l.radReports > 0;
});

const legacyTestStaff = summary.filter((u) => {
  if (['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PATIENT'].includes(u.role) || u.isSystemOrSeed) return false;
  const l = u.linked;
  // Has NO appointments, medical records, bills, prescriptions, lab, or radiology
  return l.apptsAsDoc === 0 && l.medRecords === 0 && l.prescriptions === 0 && l.labReports === 0 && l.radReports === 0;
});

console.log(`\nSuper Admins: ${superAdmins.length}`);
console.log(`Hospital Admins: ${hospitalAdmins.length}`);
console.log(`Patients: ${patients.length}`);
console.log(`Canonical Staff: ${canonicalStaff.length}`);
console.log(`Staff with Clinical Links: ${staffWithClinicalLinks.length}`);
console.log(`Legacy Test Staff (No clinical links): ${legacyTestStaff.length}`);

console.log('\n--- Canonical Staff ---');
console.log(canonicalStaff.map((u) => `${u.email} (${u.role})`));

if (staffWithClinicalLinks.length > 0) {
  console.log('\n--- Staff with Clinical Links (PRESERVE) ---');
  console.log(staffWithClinicalLinks.map((u) => `${u.email} (${u.role}) - appts:${u.linked.apptsAsDoc}, med:${u.linked.medRecords}, lab:${u.linked.labReports}`));
}

console.log(`\n--- Sample of Legacy Test Staff (${legacyTestStaff.length} total) ---`);
console.log(legacyTestStaff.slice(0, 15).map((u) => `${u.email} (${u.role}, status: ${u.status}, active: ${u.isActive}, created: ${u.createdAt.slice(0, 10)})`));
