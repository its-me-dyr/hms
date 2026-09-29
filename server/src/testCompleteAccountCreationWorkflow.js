/**
 * Test Complete Role-Based Account Creation Workflow & Security Verification
 * 
 * Hierarchy: SUPER_ADMIN → HOSPITAL_ADMIN → HOSPITAL STAFF → PATIENTS
 * 
 * Verifies all 12 Project Testing Requirements:
 * 1. Super Admin can create a Hospital Admin.
 * 2. Super Admin cannot create Doctor, Nurse, Receptionist, Pharmacist, Lab Tech, Radiology Staff, or Billing Staff.
 * 3. Super Admin cannot create another Super Admin.
 * 4. Hospital Admin can create all seven permitted staff roles.
 * 5. Hospital Admin cannot create a Super Admin or another Hospital Admin.
 * 6. Hospital Admin cannot create staff for another hospital/branch.
 * 7. Receptionist can register a patient successfully (with unique HMS-P-XXXX ID & credentials).
 * 8. Receptionist cannot create staff or administrative accounts.
 * 9. Patients cannot create any accounts.
 * 10. Public staff registration remains blocked.
 * 11. Role tampering and unauthorized direct API calls are rejected.
 * 12. Existing login, portal redirects, patient records, and account permissions continue to work.
 */

require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api/v1';

function req(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const postData = body ? JSON.stringify(body) : null;
    const headers = {
      ...(options.headers || {}),
    };
    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const reqOptions = {
      hostname: u.hostname,
      port: u.port || 5000,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers,
    };

    const clientReq = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    clientReq.on('error', reject);
    if (postData) {
      clientReq.write(postData);
    }
    clientReq.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runWorkflowTest() {
  console.log('\n===============================================================');
  console.log('STARTING STRICT ROLE-BASED ACCOUNT CREATION WORKFLOW AUDIT');
  console.log('===============================================================\n');

  const ts = Date.now();

  // -----------------------------------------------------------------
  // 1. Super Admin Authentication & Capabilities
  // -----------------------------------------------------------------
  console.log('--- Step 1: Super Admin Permissions & Restrictions ---');

  const saLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
  }, {
    email: 'admin@hms.com',
    password: 'AdminPassword123!',
  });

  assert(saLogin.status === 200, 'Super Admin logged in successfully (HTTP 200)');
  const saToken = saLogin.body?.data?.accessToken;
  assert(Boolean(saToken), 'Super Admin access token received');

  // Req 1: Super Admin CAN create Hospital Admin
  const newHospitalAdminEmail = `hospadmin.wf.${ts}@hms.com`;
  const haPassword = 'HospAdminPass123!';
  const createHaRes = await req(`${BASE_URL}/super-admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${saToken}` },
  }, {
    firstName: 'Eleanor',
    lastName: 'Vance',
    email: newHospitalAdminEmail,
    password: haPassword,
    role: 'HOSPITAL_ADMIN',
    department: 'Hospital Administration',
    phone: '+1-555-0101',
    hospitalBranch: 'MAIN-01',
    status: 'active',
  });

  assert(createHaRes.status === 201, `Req 1: Super Admin created Hospital Admin (${newHospitalAdminEmail}) (HTTP 201)`);
  assert(createHaRes.body?.data?.user?.role === 'HOSPITAL_ADMIN', 'Created account role confirmed as HOSPITAL_ADMIN');
  assert(createHaRes.body?.data?.user?.isActive === true, 'Created Hospital Admin account is active');

  // Req 2: Super Admin CANNOT create any operational staff roles (Doctor, Nurse, Receptionist, Pharmacist, Lab, Rad, Billing)
  const forbiddenStaffRolesForSuperAdmin = [
    'DOCTOR',
    'NURSE',
    'RECEPTIONIST',
    'PHARMACIST',
    'LAB_TECH',
    'RADIOLOGY_STAFF',
    'BILLING_STAFF',
  ];

  for (const role of forbiddenStaffRolesForSuperAdmin) {
    const res = await req(`${BASE_URL}/super-admin/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${saToken}` },
    }, {
      firstName: 'Disallowed',
      lastName: role,
      email: `sa.disallowed.${role.toLowerCase()}.${ts}@hms.com`,
      password: 'Password123!',
      role,
      department: 'General Medicine',
      phone: '+1-555-0999',
    });
    assert(res.status === 403, `Req 2: Super Admin blocked from creating ${role} (HTTP 403)`);
  }

  // Req 3: Super Admin CANNOT create another Super Admin via account provisioning
  const saCreateSaRes = await req(`${BASE_URL}/super-admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${saToken}` },
  }, {
    firstName: 'Rogue',
    lastName: 'SuperAdmin',
    email: `rogue.sa.${ts}@hms.com`,
    password: 'Password123!',
    role: 'SUPER_ADMIN',
    department: 'Hospital Administration',
    phone: '+1-555-0999',
  });
  assert(saCreateSaRes.status === 403, 'Req 3: Super Admin blocked from creating another Super Admin (HTTP 403)');

  // -----------------------------------------------------------------
  // 2. Hospital Admin Login & Boundaries
  // -----------------------------------------------------------------
  console.log('\n--- Step 2: Hospital Admin Permissions & Boundaries ---');

  const haLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
  }, {
    email: newHospitalAdminEmail,
    password: haPassword,
  });

  assert(haLogin.status === 200, 'Hospital Admin logged in successfully (HTTP 200)');
  const haToken = haLogin.body?.data?.accessToken;
  assert(Boolean(haToken), 'Hospital Admin access token received');
  assert(haLogin.body?.data?.user?.role === 'hospital_admin', 'Role in login payload is hospital_admin');

  // Req 5: Hospital Admin CANNOT create Super Admin or another Hospital Admin
  const haCreateSa = await req(`${BASE_URL}/hospital-admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${haToken}` },
  }, {
    firstName: 'Illicit',
    lastName: 'SA',
    email: `illicit.sa.${ts}@hms.com`,
    password: 'Password123!',
    role: 'SUPER_ADMIN',
    department: 'Hospital Administration',
  });
  assert(haCreateSa.status === 403, 'Req 5a: Hospital Admin blocked from creating Super Admin (HTTP 403)');

  const haCreateHa = await req(`${BASE_URL}/hospital-admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${haToken}` },
  }, {
    firstName: 'Illicit',
    lastName: 'HA',
    email: `illicit.ha.${ts}@hms.com`,
    password: 'Password123!',
    role: 'HOSPITAL_ADMIN',
    department: 'Hospital Administration',
  });
  assert(haCreateHa.status === 403, 'Req 5b: Hospital Admin blocked from creating another Hospital Admin (HTTP 403)');

  // Req 6: Hospital Admin CANNOT create staff for another hospital branch
  const haCreateWrongBranch = await req(`${BASE_URL}/hospital-admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${haToken}` },
  }, {
    firstName: 'Cross',
    lastName: 'HospitalStaff',
    email: `cross.branch.${ts}@hms.com`,
    password: 'Password123!',
    role: 'DOCTOR',
    department: 'Cardiology',
    hospitalBranch: 'BRANCH-99-EXTERNAL',
  });
  assert(haCreateWrongBranch.status === 403, 'Req 6: Hospital Admin blocked from creating staff for another branch (HTTP 403)');

  // Req 4: Hospital Admin CAN create all seven permitted staff roles
  console.log('\n--- Step 3: Hospital Admin Creates 7 Operational Staff Roles ---');

  const permittedStaffRoles = [
    { role: 'DOCTOR', prefix: 'doc', dept: 'Cardiology' },
    { role: 'NURSE', prefix: 'nurse', dept: 'General Medicine' },
    { role: 'RECEPTIONIST', prefix: 'rec', dept: 'Front Desk & Patient Services' },
    { role: 'PHARMACIST', prefix: 'pharm', dept: 'Pharmacy Services' },
    { role: 'LAB_TECH', prefix: 'lab', dept: 'Pathology & Laboratory' },
    { role: 'RADIOLOGY_STAFF', prefix: 'rad', dept: 'Radiology & Imaging' },
    { role: 'BILLING_STAFF', prefix: 'bill', dept: 'Billing & Accounts' },
  ];

  const createdStaff = {};

  for (const s of permittedStaffRoles) {
    const staffEmail = `test.${s.prefix}.${ts}@hms.com`;
    const staffPassword = `StaffPass123!_${s.prefix}`;
    const staffRes = await req(`${BASE_URL}/hospital-admin/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${haToken}` },
    }, {
      firstName: 'Test',
      lastName: s.role,
      email: staffEmail,
      password: staffPassword,
      role: s.role,
      department: s.dept,
      phone: '+1-555-0123',
      hospitalBranch: 'MAIN-01',
      specialization: s.role === 'DOCTOR' ? 'Cardiology' : undefined,
    });

    assert(staffRes.status === 201, `Req 4: Hospital Admin provisioned ${s.role} (${staffEmail}) (HTTP 201)`);
    assert(staffRes.body?.data?.user?.email === staffEmail, `${s.role} email returned`);
    assert(staffRes.body?.data?.user?.role === s.role, `${s.role} role verified`);

    createdStaff[s.role] = {
      email: staffEmail,
      password: staffPassword,
    };
  }

  // Staff log in with credentials created by Hospital Admin
  console.log('\n--- Step 4: Staff Authentication with Admin Credentials ---');

  const docLogin = await req(`${BASE_URL}/auth/login`, { method: 'POST' }, createdStaff['DOCTOR']);
  assert(docLogin.status === 200, 'Doctor logged in with admin credentials');
  assert(docLogin.body?.data?.user?.role === 'doctor', 'Doctor role verified');

  const recLogin = await req(`${BASE_URL}/auth/login`, { method: 'POST' }, createdStaff['RECEPTIONIST']);
  assert(recLogin.status === 200, 'Receptionist logged in with admin credentials');
  assert(recLogin.body?.data?.user?.role === 'receptionist', 'Receptionist role verified');
  const recToken = recLogin.body?.data?.accessToken;

  const nurseLogin = await req(`${BASE_URL}/auth/login`, { method: 'POST' }, createdStaff['NURSE']);
  assert(nurseLogin.status === 200, 'Nurse logged in with admin credentials');
  assert(nurseLogin.body?.data?.user?.role === 'nurse', 'Nurse role verified');

  const pharmLogin = await req(`${BASE_URL}/auth/login`, { method: 'POST' }, createdStaff['PHARMACIST']);
  assert(pharmLogin.status === 200, 'Pharmacist logged in with admin credentials');
  assert(pharmLogin.body?.data?.user?.role === 'pharmacist', 'Pharmacist role verified');

  const labLogin = await req(`${BASE_URL}/auth/login`, { method: 'POST' }, createdStaff['LAB_TECH']);
  assert(labLogin.status === 200, 'Lab Tech logged in with admin credentials');
  assert(labLogin.body?.data?.user?.roleName === 'LAB_TECH', 'Lab Tech role verified (LAB_TECH)');

  const radLogin = await req(`${BASE_URL}/auth/login`, { method: 'POST' }, createdStaff['RADIOLOGY_STAFF']);
  assert(radLogin.status === 200, 'Radiology Staff logged in with admin credentials');
  assert(radLogin.body?.data?.user?.role === 'radiology_staff', 'Radiology Staff role verified');

  const billLogin = await req(`${BASE_URL}/auth/login`, { method: 'POST' }, createdStaff['BILLING_STAFF']);
  assert(billLogin.status === 200, 'Billing Staff logged in with admin credentials');
  assert(billLogin.body?.data?.user?.role === 'billing_staff', 'Billing Staff role verified');

  // -----------------------------------------------------------------
  // 3. Receptionist Capabilities & Restrictions
  // -----------------------------------------------------------------
  console.log('\n--- Step 5: Receptionist Capabilities & Restrictions ---');

  // Req 8: Receptionist cannot create staff or administrative accounts
  const recCreateStaff = await req(`${BASE_URL}/hospital-admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recToken}` },
  }, {
    firstName: 'Illicit',
    lastName: 'Staff',
    email: `rec.staff.${ts}@hms.com`,
    password: 'Password123!',
    role: 'DOCTOR',
    department: 'Cardiology',
  });
  assert(recCreateStaff.status === 403, 'Req 8a: Receptionist blocked from creating staff accounts (HTTP 403)');

  const recCreateAdmin = await req(`${BASE_URL}/super-admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recToken}` },
  }, {
    firstName: 'Illicit',
    lastName: 'Admin',
    email: `rec.admin.${ts}@hms.com`,
    password: 'Password123!',
    role: 'HOSPITAL_ADMIN',
    department: 'Hospital Administration',
  });
  assert(recCreateAdmin.status === 403, 'Req 8b: Receptionist blocked from creating administrative accounts (HTTP 403)');

  // Req 7: Receptionist registers patient successfully with unique ID & credentials
  const patientEmail = `patient.strict.${ts}@hms-patient.org`;
  const patientTempPass = 'PatientSecretPass123!';
  const createPatientRes = await req(`${BASE_URL}/reception/patients`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${recToken}` },
  }, {
    firstName: 'Arthur',
    lastName: 'Dent',
    email: patientEmail,
    password: patientTempPass,
    phone: '+1-555-4242',
    dateOfBirth: '1982-03-11',
    gender: 'male',
    bloodGroup: 'O+',
    address: {
      street: '42 Sub-Etha Expressway',
      city: 'London',
      state: 'Islington',
      postalCode: 'NW1',
      country: 'UK',
    },
    emergencyContact: {
      name: 'Ford Prefect',
      relation: 'Friend',
      phone: '+1-555-9999',
    },
    allergies: ['Penicillin'],
  });

  assert(createPatientRes.status === 201, `Req 7: Receptionist registered patient (${patientEmail}) (HTTP 201)`);
  const patientData = createPatientRes.body?.data;
  assert(Boolean(patientData?.patientId), `Generated Patient ID: ${patientData?.patientId}`);
  assert(patientData?.patientId.startsWith('HMS-P-'), 'Patient ID follows canonical HMS-P-XXXX format');
  assert(patientData?.credentials?.portalUsername === patientEmail, 'Credentials contain portal username matching email');
  assert(patientData?.credentials?.temporaryPassword === patientTempPass, 'Credentials contain temporary password');

  // -----------------------------------------------------------------
  // 4. Patient Login & Security Boundary Isolation
  // -----------------------------------------------------------------
  console.log('\n--- Step 6: Patient Login & Scope Isolation ---');

  const patientLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
  }, {
    email: patientEmail,
    password: patientTempPass,
  });

  assert(patientLogin.status === 200, 'Patient logged in with receptionist-issued credentials (HTTP 200)');
  assert(patientLogin.body?.data?.user?.role === 'patient', 'Patient role verified as patient');
  const patientToken = patientLogin.body?.data?.accessToken;
  assert(Boolean(patientToken), 'Patient access token received');

  // Patient accesses own portal dashboard
  const patientDash = await req(`${BASE_URL}/patient/dashboard-summary`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert(patientDash.status === 200, 'Patient accessed own portal dashboard summary (HTTP 200)');
  assert(patientDash.body?.data?.patient?.email === patientEmail, 'Patient dashboard returned only own patient profile');

  // Req 9: Patients cannot create any accounts
  const patientCreateStaff = await req(`${BASE_URL}/hospital-admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` },
  }, {
    firstName: 'Patient',
    lastName: 'RogueStaff',
    email: `pat.rogue.${ts}@hms.com`,
    password: 'Password123!',
    role: 'DOCTOR',
  });
  assert(patientCreateStaff.status === 403, 'Req 9a: Patient blocked from creating staff accounts (HTTP 403)');

  const patientCreatePatient = await req(`${BASE_URL}/reception/patients`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` },
  }, {
    firstName: 'Another',
    lastName: 'Patient',
    email: `pat.another.${ts}@hms-patient.org`,
    password: 'Password123!',
  });
  assert(patientCreatePatient.status === 403, 'Req 9b: Patient blocked from creating patient accounts (HTTP 403)');

  const patientCreateAdmin = await req(`${BASE_URL}/super-admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` },
  }, {
    firstName: 'Patient',
    lastName: 'Admin',
    email: `pat.admin.${ts}@hms.com`,
    password: 'Password123!',
    role: 'HOSPITAL_ADMIN',
  });
  assert(patientCreateAdmin.status === 403, 'Req 9c: Patient blocked from creating admin accounts (HTTP 403)');

  // -----------------------------------------------------------------
  // 5. Public Registration Blocked (Req 10)
  // -----------------------------------------------------------------
  console.log('\n--- Step 7: Public Staff Registration Disablement ---');

  const publicRegDirect = await req(`${BASE_URL}/auth/register`, {
    method: 'POST',
  }, {
    email: `public.staff.${ts}@hms.com`,
    password: 'Password123!',
    role: 'DOCTOR',
  });
  assert(publicRegDirect.status === 403, 'Req 10a: Public POST /auth/register returned HTTP 403');

  const publicRegOtp = await req(`${BASE_URL}/auth/register/request-otp`, {
    method: 'POST',
  }, {
    email: `public.otp.${ts}@hms.com`,
  });
  assert(publicRegOtp.status === 403, 'Req 10b: Public POST /auth/register/request-otp returned HTTP 403');

  // -----------------------------------------------------------------
  // 6. Role Tampering & Privilege Escalation (Req 11)
  // -----------------------------------------------------------------
  console.log('\n--- Step 8: Role Tampering & Privilege Escalation Prevention ---');

  // Patient attempts to update role to SUPER_ADMIN via profile update
  const tamperRes = await req(`${BASE_URL}/patient/profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${patientToken}` },
  }, {
    roleName: 'SUPER_ADMIN',
    role: 'SUPER_ADMIN',
    phone: '+1-555-9999',
  });
  assert(tamperRes.status === 200, 'Profile update request processed without crashing');

  // Verify role remained strictly PATIENT
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hms');
  const User = require('./models/User');
  const Appointment = require('./models/Appointment');
  const MedicalRecord = require('./models/MedicalRecord');
  const Bill = require('./models/Bill');

  const updatedPatient = await User.findOne({ email: patientEmail });
  assert(updatedPatient.roleName === 'PATIENT', 'Req 11: Patient roleName remains strictly PATIENT after tamper attempt');

  // -----------------------------------------------------------------
  // 7. Existing Data Integrity & Permissions (Req 12)
  // -----------------------------------------------------------------
  console.log('\n--- Step 9: Existing Data Safety & System Regression Check ---');

  const canonicalDoctor = await User.findOne({ email: 'doctor@hms.com' });
  assert(canonicalDoctor && canonicalDoctor.isActive === true, 'Req 12a: Canonical doctor remains active and preserved');

  const canonicalReception = await User.findOne({ email: 'reception@hms.com' });
  assert(canonicalReception && canonicalReception.isActive === true, 'Req 12b: Canonical receptionist remains active and preserved');

  const robertChen = await User.findOne({ email: 'robert.chen@hms.com' });
  assert(robertChen && robertChen.isActive === true, 'Req 12c: Clinical doctor Robert Chen remains active and preserved');

  const aminaPatel = await User.findOne({ email: 'amina.patel@hms.com' });
  assert(aminaPatel && aminaPatel.isActive === true, 'Req 12d: Clinical doctor Amina Patel remains active and preserved');

  // Check 104 deactivated legacy test staff accounts are intact and inactive
  const inactiveCount = await User.countDocuments({ isActive: false, status: 'inactive' });
  assert(inactiveCount >= 104, `Req 12e: Deactivated legacy test staff accounts remain safely inactive (${inactiveCount} accounts)`);

  // Try logging in with a confirmed deactivated test account
  const deactivatedLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
  }, {
    email: 'elena.rostova@hms.com',
    password: 'DoctorPassword123!',
  });
  assert(deactivatedLogin.status === 403, 'Req 12f: Deactivated account blocked from login (HTTP 403)');

  const totalAppointments = await Appointment.countDocuments();
  assert(totalAppointments >= 5, `Req 12g: Clinical appointments intact (${totalAppointments} records)`);

  const totalMedicalRecords = await MedicalRecord.countDocuments();
  assert(totalMedicalRecords >= 1, `Req 12h: Clinical medical records intact (${totalMedicalRecords} records)`);

  const totalBills = await Bill.countDocuments();
  assert(totalBills >= 1, `Req 12i: Financial bills intact (${totalBills} records)`);

  await mongoose.disconnect();

  console.log('\n===============================================================');
  console.log(`STRICT WORKFLOW AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runWorkflowTest().catch((err) => {
  console.error('Fatal error in workflow test:', err);
  process.exit(1);
});
