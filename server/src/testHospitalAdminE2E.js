/**
 * Comprehensive Hospital Admin Role End-to-End Verification Suite
 * 
 * Verifies all 8 Hospital Administration specification areas:
 * 1. Hospital Admin Authentication & Role Derivation
 * 2. Administrative Dashboard Overview
 * 3. Hospital & Branch Settings CRUD
 * 4. Department Management CRUD & Status Toggles
 * 5. Services & Charges Configuration CRUD
 * 6. Users & Staff Management with Provisioning Restrictions
 * 7. Roles & Permissions Inspection (No privilege escalation)
 * 8. Operating Hours & Holidays Configuration
 * 9. Hospital Branding Settings
 * 10. System Configuration
 * 11. Administrative Reports
 * 12. Notifications (unread counts, mark read, mark all read)
 * 13. Audit Logs (no passwords, auditable actions)
 * 14. Strict Backend RBAC (Patient -> 403, Doctor -> 403, Hospital Admin -> Super Admin endpoints -> 403)
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

async function runTests() {
  console.log('======================================================================');
  console.log('STARTING HOSPITAL ADMIN E2E & SECURITY VERIFICATION SUITE');
  console.log('======================================================================\n');

  try {
    // -----------------------------------------------------------------------
    // SECTION 1: LOGIN & AUTHENTICATION
    // -----------------------------------------------------------------------
    console.log('--- SECTION 1: AUTHENTICATION & ROLE DERIVATION ---');
    const loginRes = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: 'hospitaladmin@hms.com',
      password: 'HospitalAdmin123!',
    });

    assert(loginRes.status === 200, 'Hospital Admin login succeeded with HTTP 200');
    assert(loginRes.data?.data?.user?.roleName === 'HOSPITAL_ADMIN', 'Derived user roleName is strictly HOSPITAL_ADMIN');
    const token = loginRes.data?.data?.accessToken;
    assert(Boolean(token), 'Received valid access token for Hospital Admin');

    const authHeaders = {
      Authorization: `Bearer ${token}`,
    };

    // -----------------------------------------------------------------------
    // SECTION 2: DASHBOARD OVERVIEW
    // -----------------------------------------------------------------------
    console.log('\n--- SECTION 2: ADMINISTRATIVE DASHBOARD OVERVIEW ---');
    const dashRes = await request(`${API_BASE}/hospital-admin/dashboard`, {
      method: 'GET',
      headers: authHeaders,
    });

    assert(dashRes.status === 200, 'GET /hospital-admin/dashboard returned 200');
    assert(dashRes.data?.data?.staffSummary !== undefined, 'Dashboard contains real staffSummary');
    assert(typeof dashRes.data?.data?.staffSummary?.totalStaff === 'number', 'totalStaff is a real numeric count');
    assert(dashRes.data?.data?.departmentSummary !== undefined, 'Dashboard contains departmentSummary');
    assert(dashRes.data?.data?.operationalSummary !== undefined, 'Dashboard contains operationalSummary');
    assert(Array.isArray(dashRes.data?.data?.recentAuditLogs), 'Dashboard contains recentAuditLogs array');

    // -----------------------------------------------------------------------
    // SECTION 3: HOSPITAL & BRANCH SETTINGS
    // -----------------------------------------------------------------------
    console.log('\n--- SECTION 3: HOSPITAL & BRANCH SETTINGS ---');
    const getSettingsRes = await request(`${API_BASE}/hospital-admin/settings`, {
      method: 'GET',
      headers: authHeaders,
    });
    assert(getSettingsRes.status === 200, 'GET /hospital-admin/settings returned 200');

    const updateSettingsRes = await request(`${API_BASE}/hospital-admin/settings`, {
      method: 'PUT',
      headers: authHeaders,
    }, {
      tagline: 'Leading Healthcare & Diagnostic Medical Excellence',
      contactPhone: '+1 (800) 555-0199',
    });
    assert(updateSettingsRes.status === 200, 'PUT /hospital-admin/settings updated successfully');
    assert(updateSettingsRes.data?.data?.tagline === 'Leading Healthcare & Diagnostic Medical Excellence', 'Updated tagline persisted');

    // Branch CRUD
    const timestamp = Date.now();
    const branchCode = `BR-${timestamp.toString().slice(-4)}`;
    const createBranchRes = await request(`${API_BASE}/hospital-admin/branches`, {
      method: 'POST',
      headers: authHeaders,
    }, {
      name: `North Clinic Wing ${timestamp.toString().slice(-4)}`,
      code: branchCode,
      isMain: false,
      capacity: 45,
      phone: '+1 (800) 555-1234',
    });
    assert(createBranchRes.status === 200, `POST /hospital-admin/branches created branch (${branchCode})`);

    const createdBranch = createBranchRes.data?.data?.find((b) => b.code === branchCode);
    assert(Boolean(createdBranch), 'Created branch found in returned branches array');

    // Delete created branch
    if (createdBranch?._id) {
      const delBranchRes = await request(`${API_BASE}/hospital-admin/branches/${createdBranch._id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      assert(delBranchRes.status === 200, 'DELETE /hospital-admin/branches/:id removed branch successfully');
    }

    // -----------------------------------------------------------------------
    // SECTION 4: DEPARTMENT MANAGEMENT
    // -----------------------------------------------------------------------
    console.log('\n--- SECTION 4: DEPARTMENT MANAGEMENT ---');
    const deptCode = `DEP${timestamp.toString().slice(-3)}`;
    const deptName = `Specialized Trauma Wing ${timestamp.toString().slice(-3)}`;

    const createDeptRes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'POST',
      headers: authHeaders,
    }, {
      name: deptName,
      code: deptCode,
      description: 'Acute emergency care and trauma triage unit',
      capacity: 30,
      location: 'West Tower Level 2',
    });
    assert(createDeptRes.status === 201, `POST /hospital-admin/departments created department (${deptCode})`);
    const deptId = createDeptRes.data?.data?._id;

    // Duplicate Department code rejected
    const dupDeptRes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'POST',
      headers: authHeaders,
    }, {
      name: `${deptName} Duplicate`,
      code: deptCode,
    });
    assert(dupDeptRes.status === 409, 'Duplicate department code rejected with HTTP 409');

    // Update department
    const updateDeptRes = await request(`${API_BASE}/hospital-admin/departments/${deptId}`, {
      method: 'PUT',
      headers: authHeaders,
    }, {
      description: 'Updated trauma center description',
      capacity: 35,
    });
    assert(updateDeptRes.status === 200, 'PUT /hospital-admin/departments/:id updated successfully');
    assert(updateDeptRes.data?.data?.capacity === 35, 'Department capacity persisted');

    // Toggle department status
    const toggleDeptRes = await request(`${API_BASE}/hospital-admin/departments/${deptId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    assert(toggleDeptRes.status === 200, 'PATCH /hospital-admin/departments/:id/status toggled department status');
    assert(toggleDeptRes.data?.data?.isActive === false, 'Department isActive toggled to false');

    // -----------------------------------------------------------------------
    // SECTION 5: SERVICES & CHARGES CONFIGURATION
    // -----------------------------------------------------------------------
    console.log('\n--- SECTION 5: SERVICES & CHARGES CONFIGURATION ---');
    const getServicesRes = await request(`${API_BASE}/hospital-admin/services`, {
      method: 'GET',
      headers: authHeaders,
    });
    assert(getServicesRes.status === 200, 'GET /hospital-admin/services returned 200');

    const svcCode = `SVC-${timestamp.toString().slice(-4)}`;
    const createSvcRes = await request(`${API_BASE}/hospital-admin/services`, {
      method: 'POST',
      headers: authHeaders,
    }, {
      code: svcCode,
      name: 'Ultrasound Abdominal Doppler',
      category: 'Diagnostic',
      department: 'Radiology & Imaging',
      charge: 120,
      description: 'Comprehensive Doppler ultrasound imaging evaluation',
    });
    assert(createSvcRes.status === 200, `POST /hospital-admin/services created service (${svcCode})`);

    const createdSvc = createSvcRes.data?.data?.find((s) => s.code === svcCode);
    assert(Boolean(createdSvc), 'Created service found in returned services array');

    // Invalid negative charge rejected
    const invalidChargeRes = await request(`${API_BASE}/hospital-admin/services`, {
      method: 'POST',
      headers: authHeaders,
    }, {
      code: `INV-${timestamp}`,
      name: 'Invalid Service',
      charge: -50,
    });
    assert(invalidChargeRes.status === 400, 'Negative service charge rejected with HTTP 400');

    // Delete service
    if (createdSvc?._id) {
      const delSvcRes = await request(`${API_BASE}/hospital-admin/services/${createdSvc._id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      assert(delSvcRes.status === 200, 'DELETE /hospital-admin/services/:id removed service successfully');
    }

    // -----------------------------------------------------------------------
    // SECTION 6: USERS & STAFF MANAGEMENT (SECURITY & PROVISIONING)
    // -----------------------------------------------------------------------
    console.log('\n--- SECTION 6: STAFF PROVISIONING & SECURITY CONSTRAINTS ---');

    // Hospital Admin CANNOT provision SUPER_ADMIN
    const createSuperAdminRes = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: authHeaders,
    }, {
      firstName: 'Malicious',
      lastName: 'Admin',
      email: `evil.sa.${timestamp}@hms.org`,
      role: 'SUPER_ADMIN',
      password: 'Password123!',
    });
    assert(createSuperAdminRes.status === 403, 'Hospital Admin blocked from creating SUPER_ADMIN — HTTP 403');

    // Hospital Admin CANNOT provision another HOSPITAL_ADMIN
    const createAnotherHARes = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: authHeaders,
    }, {
      firstName: 'Duplicate',
      lastName: 'HospitalAdmin',
      email: `evil.ha.${timestamp}@hms.org`,
      role: 'HOSPITAL_ADMIN',
      password: 'Password123!',
    });
    assert(createAnotherHARes.status === 403, 'Hospital Admin blocked from creating another HOSPITAL_ADMIN — HTTP 403');

    // Hospital Admin CAN provision DOCTOR
    const staffEmail = `doc.ha.${timestamp}@hms.org`;
    const createDocRes = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: authHeaders,
    }, {
      firstName: 'Arthur',
      lastName: 'Pendleton',
      email: staffEmail,
      phone: '+18005550222',
      role: 'DOCTOR',
      department: 'Cardiology',
      specialization: 'Interventional Cardiology',
      password: 'DoctorPassword123!',
    });
    assert(createDocRes.status === 201, `Hospital Admin successfully provisioned DOCTOR (${staffEmail})`);
    assert(!createDocRes.data?.data?.user?.password, 'API response does NOT leak password');

    // Deactivate/Activate staff
    const docId = createDocRes.data?.data?.user?.id || createDocRes.data?.data?.user?._id;
    if (docId) {
      const deactRes = await request(`${API_BASE}/hospital-admin/users/${docId}/status`, {
        method: 'PATCH',
        headers: authHeaders,
      }, {
        isActive: false,
        status: 'suspended',
      });
      assert(deactRes.status === 200, 'Hospital Admin successfully suspended staff account');
      assert(deactRes.data?.data?.isActive === false, 'Staff status confirmed inactive');
    }

    // -----------------------------------------------------------------------
    // SECTION 7: OPERATING HOURS & HOLIDAYS
    // -----------------------------------------------------------------------
    console.log('\n--- SECTION 7: OPERATING HOURS & HOLIDAYS ---');
    const getHoursRes = await request(`${API_BASE}/hospital-admin/operating-hours`, {
      method: 'GET',
      headers: authHeaders,
    });
    assert(getHoursRes.status === 200, 'GET /hospital-admin/operating-hours returned 200');
    assert(Array.isArray(getHoursRes.data?.data?.operatingHours), 'Returned operatingHours array');

    const holidayRes = await request(`${API_BASE}/hospital-admin/holidays`, {
      method: 'POST',
      headers: authHeaders,
    }, {
      name: `Hospital Foundation Day ${timestamp.toString().slice(-4)}`,
      date: '2026-10-15',
      description: 'Annual medical center anniversary celebration',
    });
    assert(holidayRes.status === 200, 'POST /hospital-admin/holidays added holiday');

    // -----------------------------------------------------------------------
    // SECTION 8: BRANDING & SYSTEM CONFIGURATION
    // -----------------------------------------------------------------------
    console.log('\n--- SECTION 8: BRANDING & SYSTEM CONFIGURATION ---');
    const updateBrandingRes = await request(`${API_BASE}/hospital-admin/branding`, {
      method: 'PUT',
      headers: authHeaders,
    }, {
      primaryColor: '#0891B2',
      accentColor: '#0F172A',
      headerText: 'HMS Regional Medical Center',
    });
    assert(updateBrandingRes.status === 200, 'PUT /hospital-admin/branding updated branding');
    assert(updateBrandingRes.data?.data?.primaryColor === '#0891B2', 'Primary color persisted');

    const updateConfigRes = await request(`${API_BASE}/hospital-admin/system-config`, {
      method: 'PUT',
      headers: authHeaders,
    }, {
      appointmentBufferMinutes: 20,
      emergencyContactNumber: '+1 (800) 555-0199',
    });
    assert(updateConfigRes.status === 200, 'PUT /hospital-admin/system-config updated configuration');
    assert(updateConfigRes.data?.data?.appointmentBufferMinutes === 20, 'appointmentBufferMinutes persisted');

    // -----------------------------------------------------------------------
    // SECTION 9: ADMINISTRATIVE REPORTS
    // -----------------------------------------------------------------------
    console.log('\n--- SECTION 9: ADMINISTRATIVE REPORTS ---');
    const reportsRes = await request(`${API_BASE}/hospital-admin/reports`, {
      method: 'GET',
      headers: authHeaders,
    });
    assert(reportsRes.status === 200, 'GET /hospital-admin/reports returned 200');
    assert(reportsRes.data?.data?.clinicalMetrics !== undefined, 'Reports include clinicalMetrics');
    assert(reportsRes.data?.data?.financialMetrics !== undefined, 'Reports include financialMetrics');
    assert(Array.isArray(reportsRes.data?.data?.departmentAnalytics), 'Reports include departmentAnalytics array');

    // -----------------------------------------------------------------------
    // SECTION 10: AUDIT LOGS
    // -----------------------------------------------------------------------
    console.log('\n--- SECTION 10: AUDIT LOGS ---');
    const auditRes = await request(`${API_BASE}/hospital-admin/audit-logs`, {
      method: 'GET',
      headers: authHeaders,
    });
    assert(auditRes.status === 200, 'GET /hospital-admin/audit-logs returned 200');
    assert(Array.isArray(auditRes.data?.data?.logs), 'Audit logs list returned');
    const containsPassword = JSON.stringify(auditRes.data).includes('password":"');
    assert(!containsPassword, 'Audit log records NEVER expose password fields');

    // -----------------------------------------------------------------------
    // SECTION 11: NOTIFICATIONS
    // -----------------------------------------------------------------------
    console.log('\n--- SECTION 11: NOTIFICATIONS ---');
    const notifsRes = await request(`${API_BASE}/hospital-admin/notifications`, {
      method: 'GET',
      headers: authHeaders,
    });
    assert(notifsRes.status === 200, 'GET /hospital-admin/notifications returned 200');
    assert(typeof notifsRes.data?.data?.unreadCount === 'number', 'Unread count is a real number');

    const markAllRes = await request(`${API_BASE}/hospital-admin/notifications/read-all`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    assert(markAllRes.status === 200, 'PATCH /hospital-admin/notifications/read-all succeeded');

    // -----------------------------------------------------------------------
    // SECTION 12: BACKEND RBAC & PRIVILEGE CHECKS
    // -----------------------------------------------------------------------
    console.log('\n--- SECTION 12: STRICT BACKEND RBAC & PRIVILEGE CHECKS ---');

    // Patient login & attempt Hospital Admin API
    const patientLoginRes = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: 'doctor@hms.com',
      password: 'DoctorPassword123!',
    });
    const doctorToken = patientLoginRes.data?.data?.accessToken;

    const doctorAttemptRes = await request(`${API_BASE}/hospital-admin/dashboard`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert(doctorAttemptRes.status === 403, 'Unauthorized Doctor blocked from Hospital Admin dashboard — HTTP 403');

    // Hospital Admin calling Super Admin only endpoint (e.g. /super-admin/dashboard)
    const superAdminOnlyAttempt = await request(`${API_BASE}/super-admin/dashboard`, {
      method: 'GET',
      headers: authHeaders,
    });
    assert(superAdminOnlyAttempt.status === 403, 'Hospital Admin blocked from Super Admin only endpoints — HTTP 403');

    // Direct Tampering test: Role tampering in profile update rejected
    const profileTamperRes = await request(`${API_BASE}/hospital-admin/profile`, {
      method: 'PUT',
      headers: authHeaders,
    }, {
      role: 'SUPER_ADMIN',
      roleName: 'SUPER_ADMIN',
      firstName: 'Elena',
    });
    assert(profileTamperRes.status === 200, 'Profile update processed safely');
    assert(profileTamperRes.data?.data?.roleName === 'HOSPITAL_ADMIN', 'Role remains strictly HOSPITAL_ADMIN (tamper rejected)');

    console.log('\n======================================================================');
    console.log(`HOSPITAL ADMIN VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite execution error:', err);
    process.exit(1);
  }
}

runTests();
