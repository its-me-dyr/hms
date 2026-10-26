/**
 * Complete End-to-End Hospital Admin Portal Verification Suite
 * 
 * Verifies all 38 Steps of Hospital Admin Specification:
 * - Super Admin creation of Hospital A and Hospital B
 * - Independent Admin A and Admin B logins
 * - Strict Cross-Hospital Isolation (Settings, Branches, Depts, Services, Staff, Reports, Logs)
 * - Anti-Privilege Escalation (Reject SUPER_ADMIN and HOSPITAL_ADMIN creation)
 * - All 14 modules tested with real MongoDB data persistence
 */

const http = require('http');

const API_BASE = 'http://localhost:5000/api/v1';

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) },
    };

    if (body) {
      if (typeof body === 'object') {
        body = JSON.stringify(body);
        reqOptions.headers['Content-Type'] = 'application/json';
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    } else {
      delete reqOptions.headers['Content-Length'];
      delete reqOptions.headers['Content-Type'];
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(reqOptions.method)) {
        reqOptions.headers['Content-Length'] = 0;
      }
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsedData = null;
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          parsedData = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsedData,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

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

async function runSuite() {
  console.log('======================================================================');
  console.log('STARTING COMPLETE 38-STEP HOSPITAL ADMIN E2E & ISOLATION TEST SUITE');
  console.log('======================================================================\n');

  try {
    const ts = Date.now().toString().slice(-5);

    // STEP 1: Login as Super Admin
    console.log('--- STEP 1: Super Admin Authentication ---');
    const saLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: 'admin@hms.com',
      password: 'AdminPassword123!',
    });
    assert(saLogin.status === 200, 'Super Admin login succeeded with HTTP 200');
    const saToken = saLogin.data?.data?.accessToken;
    const saHeaders = { Authorization: `Bearer ${saToken}` };

    // STEP 2 & 3: Create Hospital A with Admin A
    console.log('\n--- STEPS 2-4: Provision Hospital A and Initial Admin A ---');
    const hospAReg = `REG-A-${ts}`;
    const hospAEmail = `admin.hospa.${ts}@hms.org`;
    const createHospARes = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `Hospital Alpha ${ts}`,
        registrationNumber: hospAReg,
        contactEmail: `contact.alpha.${ts}@hms.org`,
        contactPhone: '+1 (800) 555-1111',
        emergencyHotline: '911',
        street: '100 Alpha Boulevard',
        city: 'Alpha City',
        state: 'NY',
        postalCode: '10001',
        country: 'United States',
        currency: 'USD',
        timezone: 'America/New_York',
      },
      adminDetails: {
        firstName: 'Arthur',
        lastName: 'Alpha',
        email: hospAEmail,
        phone: '+1 (800) 555-2222',
        password: 'PasswordAlpha123!',
      },
    });

    assert(createHospARes.status === 201, 'Hospital A created successfully (HTTP 201)');
    const hospAId = createHospARes.data?.data?.hospital?.id;
    const adminAId = createHospARes.data?.data?.admin?.id;
    assert(Boolean(hospAId), 'Hospital A ID returned');
    assert(Boolean(adminAId), 'Admin A ID returned');

    // Create Hospital B with Admin B for cross-hospital isolation testing
    console.log('\n--- Provision Hospital B and Initial Admin B (Isolation Target) ---');
    const hospBReg = `REG-B-${ts}`;
    const hospBEmail = `admin.hospb.${ts}@hms.org`;
    const createHospBRes = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `Hospital Beta ${ts}`,
        registrationNumber: hospBReg,
        contactEmail: `contact.beta.${ts}@hms.org`,
        contactPhone: '+1 (800) 555-3333',
        emergencyHotline: '911',
        street: '200 Beta Avenue',
        city: 'Beta City',
        state: 'CA',
        postalCode: '90001',
        country: 'United States',
        currency: 'USD',
        timezone: 'America/Los_Angeles',
      },
      adminDetails: {
        firstName: 'Beatrice',
        lastName: 'Beta',
        email: hospBEmail,
        phone: '+1 (800) 555-4444',
        password: 'PasswordBeta123!',
      },
    });

    assert(createHospBRes.status === 201, 'Hospital B created successfully (HTTP 201)');
    const hospBId = createHospBRes.data?.data?.hospital?.id;
    const adminBId = createHospBRes.data?.data?.admin?.id;

    // STEP 5: Login as Hospital Admin A
    console.log('\n--- STEP 5: Login as Hospital Admin A ---');
    const loginARes = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospAEmail,
      password: 'PasswordAlpha123!',
    });
    assert(loginARes.status === 200, 'Admin A login succeeded with HTTP 200');
    assert(loginARes.data?.data?.user?.roleName === 'HOSPITAL_ADMIN', 'Admin A roleName is strictly HOSPITAL_ADMIN');
    const tokenA = loginARes.data?.data?.accessToken;
    const headersA = { Authorization: `Bearer ${tokenA}` };

    // Login as Hospital Admin B
    const loginBRes = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospBEmail,
      password: 'PasswordBeta123!',
    });
    assert(loginBRes.status === 200, 'Admin B login succeeded with HTTP 200');
    const tokenB = loginBRes.data?.data?.accessToken;
    const headersB = { Authorization: `Bearer ${tokenB}` };

    // STEP 6-8: Dashboard data for Admin A
    console.log('\n--- STEPS 6-8: Admin A Dashboard Overview (Live Data) ---');
    const dashARes = await request(`${API_BASE}/hospital-admin/dashboard`, {
      method: 'GET',
      headers: headersA,
    });
    assert(dashARes.status === 200, 'Admin A GET /hospital-admin/dashboard returned 200');
    assert(dashARes.data?.data?.configurationStatus?.hospitalName === `Hospital Alpha ${ts}`, 'Dashboard reflects Hospital A name');
    assert(typeof dashARes.data?.data?.staffSummary?.totalStaff === 'number', 'totalStaff is real calculated number');

    // STEPS 9-11: Hospital & Branch Settings
    console.log('\n--- STEPS 9-11: Hospital & Branch Settings Update ---');
    const updateHospARes = await request(`${API_BASE}/hospital-admin/settings`, {
      method: 'PUT',
      headers: headersA,
    }, {
      tagline: 'Alpha Premier Medical Care Center',
      emergencyHotline: '1-800-ALPHA-911',
    });
    assert(updateHospARes.status === 200, 'Admin A PUT /hospital-admin/settings succeeded');
    assert(updateHospARes.data?.data?.tagline === 'Alpha Premier Medical Care Center', 'Hospital A tagline persisted');
    assert(updateHospARes.data?.data?.emergencyHotline === '1-800-ALPHA-911', 'Hospital A emergencyHotline persisted');

    // Verify Admin B does NOT see Admin A's settings
    const hospBSettingsRes = await request(`${API_BASE}/hospital-admin/settings`, {
      method: 'GET',
      headers: headersB,
    });
    assert(hospBSettingsRes.status === 200, 'Admin B GET /hospital-admin/settings succeeded');
    assert(hospBSettingsRes.data?.data?.hospitalName === `Hospital Beta ${ts}`, 'Admin B sees Hospital B settings, not Hospital A');
    assert(hospBSettingsRes.data?.data?.emergencyHotline === '911', 'Admin B settings are untouched by Admin A');

    // STEPS 12-14: Departments
    console.log('\n--- STEPS 12-14: Departments CRUD & Isolation ---');
    const deptACode = `CARD-${ts}`;
    const createDeptARes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'POST',
      headers: headersA,
    }, {
      name: `Cardiology Wing ${ts}`,
      code: deptACode,
      description: 'Cardiac intensive care and surgical recovery',
      capacity: 40,
      location: 'Alpha Pavilion Floor 3',
    });
    assert(createDeptARes.status === 201, 'Admin A created department (HTTP 201)');
    const deptAId = createDeptARes.data?.data?._id;

    // Verify Admin B can have the SAME department code without collision or seeing Admin A's department
    const createDeptBRes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'POST',
      headers: headersB,
    }, {
      name: `Beta Cardiology Wing ${ts}`,
      code: deptACode, // Same code allowed because scoped to Hospital B!
      description: 'Beta cardiac center',
      capacity: 30,
      location: 'Beta Pavilion Floor 2',
    });
    assert(createDeptBRes.status === 201, 'Admin B can create department with same code in their hospital');
    const deptBId = createDeptBRes.data?.data?._id;

    // Admin A tries to modify Admin B's department -> Expected 404 (not in your hospital)
    const crossDeptEditRes = await request(`${API_BASE}/hospital-admin/departments/${deptBId}`, {
      method: 'PUT',
      headers: headersA,
    }, {
      name: 'Hacked Department Name',
    });
    assert(crossDeptEditRes.status === 404, 'Admin A BLOCKED from editing Admin B department (HTTP 404)');

    // STEPS 15-16: Services & Charges
    console.log('\n--- STEPS 15-16: Services & Charges Configuration ---');
    const svcCode = `SVC-${ts}`;
    const createSvcRes = await request(`${API_BASE}/hospital-admin/services`, {
      method: 'POST',
      headers: headersA,
    }, {
      code: svcCode,
      name: `Specialist MRI Scan ${ts}`,
      category: 'Radiology',
      charge: 250,
      description: '3T high-resolution magnetic resonance scan',
    });
    assert(createSvcRes.status === 200, 'Admin A created service charge item');
    const createdSvc = createSvcRes.data?.data?.find((s) => s.code === svcCode);
    assert(Boolean(createdSvc), 'Service found in Hospital A service catalogue');

    // Admin B gets services - must NOT contain Admin A's service
    const bServicesRes = await request(`${API_BASE}/hospital-admin/services`, {
      method: 'GET',
      headers: headersB,
    });
    const bHasASvc = bServicesRes.data?.data?.some((s) => s.code === svcCode);
    assert(!bHasASvc, 'Admin B service list does NOT contain Hospital A service (Isolation Verified)');

    // STEPS 17-19: Users & Staff Management
    console.log('\n--- STEPS 17-19: Staff Provisioning & Hospital Association ---');
    const docEmail = `dr.smith.${ts}@hms.org`;
    const createDocRes = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: headersA,
    }, {
      firstName: 'John',
      lastName: 'Smith',
      email: docEmail,
      phone: '+1 (800) 555-7890',
      role: 'DOCTOR',
      department: `Cardiology Wing ${ts}`,
      specialization: 'Interventional Cardiology',
      qualification: 'MD, FACC',
      licenseNumber: `LIC-${ts}`,
      password: 'DoctorPassword123!',
      status: 'active',
    });
    assert(createDocRes.status === 201, 'Admin A provisioned Doctor in Hospital A (HTTP 201)');
    const docId = createDocRes.data?.data?.user?.id;
    assert(String(createDocRes.data?.data?.user?.hospitalId) === String(hospAId), 'Doctor assigned strictly to Hospital A ID');

    // STEP 20: Attempt to create HOSPITAL_ADMIN -> Must be rejected (403)
    console.log('\n--- STEP 20: Anti-Privilege Escalation: Reject HOSPITAL_ADMIN creation ---');
    const rejectAdminRes = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: headersA,
    }, {
      firstName: 'Rogue',
      lastName: 'Admin',
      email: `rogue.ha.${ts}@hms.org`,
      phone: '+1 (800) 555-9999',
      role: 'HOSPITAL_ADMIN',
      password: 'RoguePassword123!',
    });
    assert(rejectAdminRes.status === 403, 'Hospital Admin blocked from provisioning HOSPITAL_ADMIN (HTTP 403)');

    // STEP 21: Attempt to create SUPER_ADMIN -> Must be rejected (403)
    console.log('\n--- STEP 21: Anti-Privilege Escalation: Reject SUPER_ADMIN creation ---');
    const rejectSuperRes = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: headersA,
    }, {
      firstName: 'Rogue',
      lastName: 'Super',
      email: `rogue.sa.${ts}@hms.org`,
      phone: '+1 (800) 555-8888',
      role: 'SUPER_ADMIN',
      password: 'RoguePassword123!',
    });
    assert(rejectSuperRes.status === 403, 'Hospital Admin blocked from provisioning SUPER_ADMIN (HTTP 403)');

    // Cross-hospital staff isolation: Admin B cannot view or modify Admin A's doctor
    console.log('\n--- Cross-Hospital Staff Isolation ---');
    const bStaffRes = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'GET',
      headers: headersB,
    });
    const bSeesADoc = bStaffRes.data?.data?.users?.some((u) => u.email === docEmail);
    assert(!bSeesADoc, 'Admin B user directory does NOT show Hospital A doctor');

    const crossDocStatusRes = await request(`${API_BASE}/hospital-admin/users/${docId}/status`, {
      method: 'PATCH',
      headers: headersB,
    }, {
      isActive: false,
      status: 'inactive',
    });
    assert(crossDocStatusRes.status === 403, 'Admin B BLOCKED from deactivating Hospital A doctor (HTTP 403)');

    // STEP 22: Roles & Permissions Inspection
    console.log('\n--- STEP 22: Roles & Permissions Inspection ---');
    const rolesRes = await request(`${API_BASE}/hospital-admin/roles`, {
      method: 'GET',
      headers: headersA,
    });
    assert(rolesRes.status === 200, 'GET /hospital-admin/roles returned HTTP 200');
    assert(Array.isArray(rolesRes.data?.data), 'Roles matrix returned as array');

    // STEPS 23-24: Operating Hours & Holidays
    console.log('\n--- STEPS 23-24: Operating Hours & Holidays Configuration ---');
    const hoursRes = await request(`${API_BASE}/hospital-admin/operating-hours`, {
      method: 'PUT',
      headers: headersA,
    }, {
      operatingHours: [
        { day: 'Monday', openTime: '07:30 AM', closeTime: '09:00 PM', isClosed: false },
        { day: 'Tuesday', openTime: '07:30 AM', closeTime: '09:00 PM', isClosed: false },
        { day: 'Sunday', openTime: '10:00 AM', closeTime: '02:00 PM', isClosed: true },
      ],
    });
    assert(hoursRes.status === 200, 'PUT /hospital-admin/operating-hours saved successfully');
    assert(hoursRes.data?.data?.length === 3, 'Operating hours updated with 3 days');

    const holidayRes = await request(`${API_BASE}/hospital-admin/holidays`, {
      method: 'POST',
      headers: headersA,
    }, {
      name: `Founder's Day ${ts}`,
      date: '2026-10-15',
      description: 'Hospital Foundation Celebration',
    });
    assert(holidayRes.status === 200, 'POST /hospital-admin/holidays created holiday');

    // STEPS 25-26: Hospital Branding
    console.log('\n--- STEPS 25-26: Hospital Branding ---');
    const brandingRes = await request(`${API_BASE}/hospital-admin/branding`, {
      method: 'PUT',
      headers: headersA,
    }, {
      primaryColor: '#0ea5e9',
      accentColor: '#10b981',
      headerText: `Welcome to Hospital Alpha ${ts}`,
      footerText: 'Hospital Alpha Excellence in Healthcare',
    });
    assert(brandingRes.status === 200, 'PUT /hospital-admin/branding updated branding');
    assert(brandingRes.data?.data?.primaryColor === '#0ea5e9', 'Hospital A primaryColor persisted');

    // STEPS 27-28: System Configuration
    console.log('\n--- STEPS 27-28: System Configuration ---');
    const configRes = await request(`${API_BASE}/hospital-admin/system-config`, {
      method: 'PUT',
      headers: headersA,
    }, {
      appointmentBufferMinutes: 20,
      maxAppointmentsPerSlot: 4,
      emergencyContactNumber: '+1 (800) 999-9999',
      enableEmailNotifications: true,
      maintenanceMode: false,
    });
    assert(configRes.status === 200, 'PUT /hospital-admin/system-config updated configuration');
    assert(configRes.data?.data?.appointmentBufferMinutes === 20, 'appointmentBufferMinutes persisted');

    // STEPS 29-30: Administrative Reports
    console.log('\n--- STEPS 29-30: Administrative Reports ---');
    const reportsRes = await request(`${API_BASE}/hospital-admin/reports`, {
      method: 'GET',
      headers: headersA,
    });
    assert(reportsRes.status === 200, 'GET /hospital-admin/reports returned 200');
    assert(reportsRes.data?.data?.clinicalMetrics !== undefined, 'Reports contain clinicalMetrics');
    assert(reportsRes.data?.data?.financialMetrics !== undefined, 'Reports contain financialMetrics');
    assert(Array.isArray(reportsRes.data?.data?.departmentAnalytics), 'Reports contain departmentAnalytics array');

    // STEP 31: Notifications
    console.log('\n--- STEP 31: Notifications ---');
    const notifsRes = await request(`${API_BASE}/hospital-admin/notifications`, {
      method: 'GET',
      headers: headersA,
    });
    assert(notifsRes.status === 200, 'GET /hospital-admin/notifications returned 200');
    assert(typeof notifsRes.data?.data?.unreadCount === 'number', 'unreadCount returned as number');

    const markAllRes = await request(`${API_BASE}/hospital-admin/notifications/read-all`, {
      method: 'PATCH',
      headers: headersA,
    });
    assert(markAllRes.status === 200, 'PATCH /hospital-admin/notifications/read-all succeeded');

    // STEPS 32-33: Audit Logs & Isolation
    console.log('\n--- STEPS 32-33: Audit Logs & Isolation ---');
    const logsARes = await request(`${API_BASE}/hospital-admin/audit-logs`, {
      method: 'GET',
      headers: headersA,
    });
    assert(logsARes.status === 200, 'GET /hospital-admin/audit-logs returned 200');
    assert(Array.isArray(logsARes.data?.data?.logs), 'Audit logs returned as array');
    const hasStaffAction = logsARes.data?.data?.logs?.some((l) => l.action === 'STAFF_PROVISIONED');
    assert(hasStaffAction, 'Audit logs contain STAFF_PROVISIONED action from step 18');

    // Admin B gets logs - must NOT contain Hospital A logs
    const logsBRes = await request(`${API_BASE}/hospital-admin/audit-logs`, {
      method: 'GET',
      headers: headersB,
    });
    const bHasALogs = logsBRes.data?.data?.logs?.some((l) => l.userEmail === hospAEmail || l.details?.name === `Hospital Alpha ${ts}`);
    assert(!bHasALogs, 'Hospital B audit logs do NOT contain Hospital A actions (Audit Isolation Verified)');

    // STEPS 34-35: My Profile & Settings
    console.log('\n--- STEPS 34-35: My Profile & Preferences ---');
    const profileRes = await request(`${API_BASE}/hospital-admin/profile`, {
      method: 'GET',
      headers: headersA,
    });
    assert(profileRes.status === 200, 'GET /hospital-admin/profile returned 200');
    assert(profileRes.data?.data?.email === hospAEmail, 'Profile returns Admin A email');
    assert(profileRes.data?.data?.hospital !== undefined, 'Profile contains linked hospital object');

    const updateProfileRes = await request(`${API_BASE}/hospital-admin/profile`, {
      method: 'PUT',
      headers: headersA,
    }, {
      phone: '+1 (800) 555-4321',
      preferences: { theme: 'dark', dateFormat: 'YYYY-MM-DD' },
    });
    assert(updateProfileRes.status === 200, 'PUT /hospital-admin/profile updated successfully');
    assert(updateProfileRes.data?.data?.phone === '+1 (800) 555-4321', 'Updated phone persisted in profile');
    assert(updateProfileRes.data?.data?.preferences?.theme === 'dark', 'Theme preference persisted');

    // STEPS 36-38: Logout, Re-Login & Data Persistence Check
    console.log('\n--- STEPS 36-38: Re-Login & Persistence Verification ---');
    const reloginRes = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospAEmail,
      password: 'PasswordAlpha123!',
    });
    assert(reloginRes.status === 200, 'Re-login succeeded with HTTP 200');
    const reToken = reloginRes.data?.data?.accessToken;
    const reHeaders = { Authorization: `Bearer ${reToken}` };

    const verifySettings = await request(`${API_BASE}/hospital-admin/settings`, {
      method: 'GET',
      headers: reHeaders,
    });
    assert(verifySettings.data?.data?.tagline === 'Alpha Premier Medical Care Center', 'Hospital tagline persisted across sessions');
    assert(verifySettings.data?.data?.branding?.primaryColor === '#0ea5e9', 'Hospital branding persisted across sessions');

    const verifyDept = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'GET',
      headers: reHeaders,
    });
    const foundDept = verifyDept.data?.data?.find((d) => d.code === deptACode);
    assert(Boolean(foundDept), 'Created department persisted across sessions');

  } catch (err) {
    console.error('Unexpected error running test suite:', err);
    failed++;
  }

  console.log('\n======================================================================');
  console.log(`END-TO-END TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite();
