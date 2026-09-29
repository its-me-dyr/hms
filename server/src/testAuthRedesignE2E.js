/**
 * Comprehensive Verification Script for HMS Authentication & User Provisioning Redesign
 * Uses standard Node native fetch.
 */

const BASE_URL = 'http://localhost:5000/api/v1';

async function req(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING HMS AUTH & PROVISIONING FLOW VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // ─── TEST 1: Public Registration Endpoints Blocked ───────────────
  console.log('\n--- TEST 1: Public Registration APIs Blocked (HTTP 403) ---');
  const regRes = await req(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: {
      email: 'hacker@public.com',
      password: 'HackerPassword123!',
      firstName: 'Public',
      lastName: 'Hacker',
    },
  });
  assert(
    regRes.status === 403 && regRes.data?.message?.includes('Public registration is disabled'),
    `Public POST /auth/register returned 403: "${regRes.data?.message}"`
  );

  const otpRes = await req(`${BASE_URL}/auth/register/request-otp`, {
    method: 'POST',
    body: {
      email: 'hacker.otp@public.com',
      role: 'doctor',
    },
  });
  assert(
    otpRes.status === 403 && otpRes.data?.message?.includes('Public registration is disabled'),
    `Public POST /auth/register/request-otp returned 403: "${otpRes.data?.message}"`
  );

  // ─── LOGIN AS ADMINISTRATOR ────────────────────────────────────────
  console.log('\n--- AUTHENTICATING AS ADMINISTRATOR ---');
  const adminLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: {
      email: 'admin@hms.com',
      password: 'AdminPassword123!',
    },
  });
  assert(adminLogin.status === 200, `Admin login successful: status ${adminLogin.status}`);
  const adminToken = adminLogin.data?.data?.accessToken;
  assert(Boolean(adminToken), 'Administrator received valid JWT token');
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // Super Admin provisions Hospital Admin
  const haEmail = `ha.auth.${Date.now()}@hms.org`;
  const haPassword = 'HospAdminPass123!';
  const provHa = await req(`${BASE_URL}/super-admin/users`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      firstName: 'Hospital',
      lastName: 'Administrator',
      email: haEmail,
      phone: '+1555019880',
      role: 'HOSPITAL_ADMIN',
      department: 'Hospital Administration',
      password: haPassword,
      status: 'active',
    },
  });
  assert(provHa.status === 201, `Hospital Admin provisioned successfully (${haEmail})`);

  // Super Admin blocked from provisioning staff directly (HTTP 403)
  const saProvDocBlocked = await req(`${BASE_URL}/super-admin/users`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      firstName: 'Blocked',
      lastName: 'Doc',
      email: `sa.doc.blocked.${Date.now()}@hms.org`,
      role: 'DOCTOR',
      department: 'Cardiology',
      password: 'Password123!',
    },
  });
  assert(saProvDocBlocked.status === 403, 'Super Admin strictly blocked from provisioning DOCTOR (HTTP 403)');

  // Hospital Admin logs in
  const haLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: { email: haEmail, password: haPassword },
  });
  assert(haLogin.status === 200, 'Hospital Admin logged in successfully');
  const haToken = haLogin.data?.data?.accessToken;
  const haHeaders = { Authorization: `Bearer ${haToken}` };

  // ─── TEST 2: Hospital Admin Provisions Doctor ─────────────────────
  console.log('\n--- TEST 2: Provision Doctor Account ---');
  const doctorEmail = `dr.test.${Date.now()}@hms.org`;
  const doctorPassword = 'DoctorPassword123!';
  let docToken = '';
  const provDoc = await req(`${BASE_URL}/hospital-admin/users`, {
    method: 'POST',
    headers: haHeaders,
    body: {
      firstName: 'Marcus',
      lastName: 'Brody',
      email: doctorEmail,
      phone: '+1555019882',
      role: 'DOCTOR',
      department: 'Cardiology',
      specialization: 'Interventional Cardiology',
      password: doctorPassword,
      status: 'active',
    },
  });
  assert(provDoc.status === 201, `Doctor provisioned successfully (${doctorEmail})`);

  const docLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: { email: doctorEmail, password: doctorPassword },
  });
  assert(docLogin.status === 200, `Doctor logged in successfully`);
  docToken = docLogin.data?.data?.accessToken;
  const docRole = docLogin.data?.data?.user?.roleName;
  assert(docRole === 'DOCTOR', `Doctor logged in; backend derived role: ${docRole}`);

  // ─── TEST 3: Hospital Admin Provisions Nurse ──────────────────────
  console.log('\n--- TEST 3: Provision Nurse Account ---');
  const nurseEmail = `nurse.test.${Date.now()}@hms.org`;
  const nursePassword = 'NursePassword123!';
  let nurseToken = '';
  const provNurse = await req(`${BASE_URL}/hospital-admin/users`, {
    method: 'POST',
    headers: haHeaders,
    body: {
      firstName: 'Florence',
      lastName: 'Nightingale',
      email: nurseEmail,
      phone: '+1555019883',
      role: 'NURSE',
      department: 'General Medicine',
      password: nursePassword,
      status: 'active',
    },
  });
  assert(provNurse.status === 201, `Nurse provisioned successfully (${nurseEmail})`);

  const nurseLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: { email: nurseEmail, password: nursePassword },
  });
  assert(nurseLogin.status === 200, `Nurse logged in successfully`);
  nurseToken = nurseLogin.data?.data?.accessToken;
  const nurseRole = nurseLogin.data?.data?.user?.roleName;
  assert(nurseRole === 'NURSE', `Nurse logged in; backend derived role: ${nurseRole}`);

  // ─── TEST 4: Hospital Admin Provisions Pharmacist ────────────────
  console.log('\n--- TEST 4: Provision Pharmacist Account ---');
  const pharmEmail = `pharm.test.${Date.now()}@hms.org`;
  const pharmPassword = 'PharmPassword123!';
  const provPharm = await req(`${BASE_URL}/hospital-admin/users`, {
    method: 'POST',
    headers: haHeaders,
    body: {
      firstName: 'Alexander',
      lastName: 'Fleming',
      email: pharmEmail,
      phone: '+1555019884',
      role: 'PHARMACIST',
      department: 'Pharmacy Services',
      password: pharmPassword,
      status: 'active',
    },
  });
  assert(provPharm.status === 201, `Pharmacist provisioned successfully (${pharmEmail})`);

  const pharmLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: { email: pharmEmail, password: pharmPassword },
  });
  assert(pharmLogin.status === 200, `Pharmacist logged in successfully`);
  const pharmRole = pharmLogin.data?.data?.user?.roleName;
  assert(pharmRole === 'PHARMACIST', `Pharmacist logged in; backend derived role: ${pharmRole}`);

  // ─── TEST 5: Hospital Admin Provisions Lab Technician ─────────────
  console.log('\n--- TEST 5: Provision Laboratory Technician Account ---');
  const labEmail = `lab.test.${Date.now()}@hms.org`;
  const labPassword = 'LabPassword123!';
  const provLab = await req(`${BASE_URL}/hospital-admin/users`, {
    method: 'POST',
    headers: haHeaders,
    body: {
      firstName: 'Marie',
      lastName: 'Curie',
      email: labEmail,
      phone: '+1555019885',
      role: 'LAB_TECH',
      department: 'Pathology & Laboratory',
      password: labPassword,
      status: 'active',
    },
  });
  assert(provLab.status === 201, `Lab Tech provisioned successfully (${labEmail})`);

  const labLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: { email: labEmail, password: labPassword },
  });
  assert(labLogin.status === 200, `Lab Tech logged in successfully`);
  const labRole = labLogin.data?.data?.user?.roleName;
  assert(labRole === 'LAB_TECH', `Lab Tech logged in; backend derived role: ${labRole}`);

  // ─── TEST 6: Hospital Admin Provisions Radiology Staff ───────────
  console.log('\n--- TEST 6: Provision Radiology Staff Account ---');
  const radEmail = `rad.test.${Date.now()}@hms.org`;
  const radPassword = 'RadPassword123!';
  const provRad = await req(`${BASE_URL}/hospital-admin/users`, {
    method: 'POST',
    headers: haHeaders,
    body: {
      firstName: 'Wilhelm',
      lastName: 'Roentgen',
      email: radEmail,
      phone: '+1555019886',
      role: 'RADIOLOGY_STAFF',
      department: 'Radiology & Imaging',
      password: radPassword,
      status: 'active',
    },
  });
  assert(provRad.status === 201, `Radiologist provisioned successfully (${radEmail})`);

  const radLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: { email: radEmail, password: radPassword },
  });
  assert(radLogin.status === 200, `Radiologist logged in successfully`);
  const radRole = radLogin.data?.data?.user?.roleName;
  assert(radRole === 'RADIOLOGY_STAFF', `Radiologist logged in; backend derived role: ${radRole}`);

  // ─── TEST 7: Reception Registers Patient with Credentials ─────────
  console.log('\n--- TEST 7: Reception Registers Patient Record & Credentials ---');
  const patientEmail = `patient.test.${Date.now()}@hms.org`;
  const patientPassword = 'PatientCustom123!';
  let patientToken = '';
  const regPat = await req(`${BASE_URL}/reception/patients`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      firstName: 'Alice',
      lastName: 'Wonderland',
      email: patientEmail,
      phone: '+1555019887',
      gender: 'female',
      bloodGroup: 'O+',
      password: patientPassword,
    },
  });
  assert(regPat.status === 201, `Reception registered patient successfully (${patientEmail})`);
  assert(Boolean(regPat.data?.data?.patientId), `Generated Patient ID: ${regPat.data?.data?.patientId}`);
  assert(
    regPat.data?.data?.credentials?.temporaryPassword === patientPassword,
    'Credentials returned to receptionist correctly'
  );

  const patLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: { email: patientEmail, password: patientPassword },
  });
  assert(patLogin.status === 200, `Patient logged in successfully`);
  patientToken = patLogin.data?.data?.accessToken;
  const patRole = patLogin.data?.data?.user?.roleName;
  assert(patRole === 'PATIENT', `Patient logged in; backend derived role: ${patRole}`);

  // ─── TEST 8: Patient Blocked from Staff / Admin APIs ──────────────
  console.log('\n--- TEST 8: Patient Blocked from Staff & Admin APIs (HTTP 403) ---');
  const patBlocked = await req(`${BASE_URL}/super-admin/users`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert(patBlocked.status === 403, `Patient calling /super-admin/users blocked with 403: "${patBlocked.data?.message}"`);

  // ─── TEST 9: Staff Blocked from Super Admin Only APIs ──────────────
  console.log('\n--- TEST 9: Staff Blocked from Super Admin Protected APIs ---');
  const staffBlocked = await req(`${BASE_URL}/super-admin/settings`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${docToken}` },
  });
  assert(staffBlocked.status === 403, `Doctor calling /super-admin/settings blocked with 403: "${staffBlocked.data?.message}"`);

  // ─── TEST 10: Ordinary Staff Cannot Provision Other Staff ──────────
  console.log('\n--- TEST 10: Ordinary Staff Cannot Provision Accounts ---');
  const nurseProvBlocked = await req(`${BASE_URL}/super-admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${nurseToken}` },
    body: {
      firstName: 'Illegal',
      lastName: 'Staff',
      email: `illegal.${Date.now()}@hms.org`,
      role: 'DOCTOR',
      password: 'Password123!',
    },
  });
  assert(nurseProvBlocked.status === 403, `Nurse provisioning staff blocked with 403: "${nurseProvBlocked.data?.message}"`);

  // ─── TEST 11: Patient Cannot Provision Accounts ───────────────────
  console.log('\n--- TEST 11: Patient Cannot Provision Accounts ---');
  const patProvBlocked = await req(`${BASE_URL}/super-admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` },
    body: {
      firstName: 'Illegal',
      lastName: 'PatientAdmin',
      email: `illegal.patient.${Date.now()}@hms.org`,
      role: 'PATIENT',
      password: 'Password123!',
    },
  });
  assert(patProvBlocked.status === 403, `Patient provisioning blocked with 403: "${patProvBlocked.data?.message}"`);

  // ─── TEST 12: Cannot Provision SUPER_ADMIN via Endpoint ───────────
  console.log('\n--- TEST 12: Cannot Provision SUPER_ADMIN Account ---');
  const saProvBlocked = await req(`${BASE_URL}/super-admin/users`, {
    method: 'POST',
    headers: adminHeaders,
    body: {
      firstName: 'Fake',
      lastName: 'SuperAdmin',
      email: `fake.superadmin.${Date.now()}@hms.org`,
      role: 'SUPER_ADMIN',
      password: 'Password123!',
    },
  });
  assert(saProvBlocked.status === 403, `SUPER_ADMIN creation rejected with 403: "${saProvBlocked.data?.message}"`);

  // ─── TEST 13: Invalid Credentials Login Error Message ─────────────
  console.log('\n--- TEST 13: Invalid Credentials Error Message ---');
  const invalidLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: {
      email: doctorEmail,
      password: 'WrongPassword999!',
    },
  });
  assert(
    invalidLogin.status === 401 && invalidLogin.data?.message === 'Invalid email or password.',
    `Invalid password returned 401 with exact message: "${invalidLogin.data?.message}"`
  );

  // ─── TEST 14: Inactive Account Login Blocked ──────────────────────
  console.log('\n--- TEST 14: Inactive Account Login Blocked ---');
  const inactiveStaffEmail = `inactive.${Date.now()}@hms.org`;
  const provInactive = await req(`${BASE_URL}/hospital-admin/users`, {
    method: 'POST',
    headers: haHeaders,
    body: {
      firstName: 'Inactive',
      lastName: 'Staff',
      email: inactiveStaffEmail,
      role: 'DOCTOR',
      department: 'Neurology',
      password: 'InactivePassword123!',
      status: 'inactive',
    },
  });
  assert(provInactive.status === 201, 'Inactive staff provisioned');

  const inactiveLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: {
      email: inactiveStaffEmail,
      password: 'InactivePassword123!',
    },
  });
  assert(
    inactiveLogin.status === 403 &&
    inactiveLogin.data?.message === 'Your account is currently inactive. Please contact the hospital administrator.',
    `Inactive account blocked with 403 and exact message: "${inactiveLogin.data?.message}"`
  );

  // ─── SUMMARY ──────────────────────────────────────────────────────
  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed === 0) {
    console.log('ALL AUTHENTICATION & PROVISIONING REQUIREMENTS VERIFIED SUCCESSFULLY!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
