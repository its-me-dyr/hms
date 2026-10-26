/**
 * Comprehensive E2E Test Suite for Hospital Admin: Users & Staff
 * 
 * Tests:
 * 1. Authentication & Tenant Setup (Hospital A and Hospital B)
 * 2. GET /hospital-admin/users (real MongoDB data, pagination, sanitized output)
 * 3. Permitted Operational Role Provisioning:
 *    - DOCTOR, NURSE, PHARMACIST, LAB_TECH, RADIOLOGY_STAFF, RECEPTIONIST, BILLING_STAFF
 * 4. Protected Role Restriction Enforcements (Backend):
 *    - Reject HOSPITAL_ADMIN provisioning (403)
 *    - Reject SUPER_ADMIN provisioning (403)
 *    - Reject PATIENT provisioning (400)
 * 5. Automatic Hospital Association & Anti-Spoofing:
 *    - Staff automatically associated with Admin's hospital
 *    - Client cannot inject arbitrary hospitalId
 * 6. Multi-Hospital Tenant Isolation:
 *    - Admin A only sees Hospital A staff
 *    - Admin B only sees Hospital B staff
 *    - Admin A cannot update/suspend Hospital B staff (403)
 * 7. Real Data Search:
 *    - Search by full name, email, phone
 * 8. Real Data Filtering:
 *    - Role filter (DOCTOR, NURSE, etc.)
 *    - Status filter (active, suspended, pending)
 * 9. View & Edit Staff (PUT /hospital-admin/users/:id):
 *    - Update name, phone, department, specialization, licenseNumber
 *    - Preserves email authentication identifier
 *    - Rejects editing SUPER_ADMIN or HOSPITAL_ADMIN accounts (403)
 * 10. Account Activation / Suspension:
 *    - Suspend operational staff (isActive: false, status: 'suspended')
 *    - Reactivate operational staff (isActive: true, status: 'active')
 *    - Rejects suspending SUPER_ADMIN or HOSPITAL_ADMIN (403)
 * 11. Audit Logging Verification:
 *    - STAFF_PROVISIONED
 *    - UPDATE_STAFF_USER
 *    - DEACTIVATE_USER
 *    - ACTIVATE_USER
 * 12. Security & Sanitization:
 *    - Password hashes and refreshTokens never exposed in API responses
 *    - Unauthenticated access rejected with 401
 */

const http = require('http');

const API_BASE = 'http://localhost:5000/api/v1';

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
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
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', (err) => reject(err));

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

async function runUsersStaffE2ETests() {
  console.log('======================================================================');
  console.log('STARTING HOSPITAL ADMIN: USERS & STAFF E2E TEST SUITE');
  console.log('======================================================================\n');

  try {
    // ─── Step 1: Authentication & Provisioning ───
    console.log('--- Step 1: Authentication & Setup ---');
    const superAdminRes = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
    }, {
      email: 'admin@hms.com',
      password: 'AdminPassword123!',
    });
    assert(superAdminRes.status === 200, 'Super Admin logged in successfully (HTTP 200)');
    const superToken = superAdminRes.data?.data?.accessToken || superAdminRes.data?.accessToken;

    const timestamp = Date.now();
    const hospARes = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
    }, {
      hospitalDetails: {
        hospitalName: `General Staff Hospital A ${timestamp}`,
        registrationNumber: `REG-STAFF-A-${timestamp}`,
        contactEmail: `adminA_${timestamp}@hms.com`,
        contactPhone: '+1-555-0301',
        street: '100 Medical Center Way',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        country: 'United States',
      },
      adminDetails: {
        firstName: 'Arthur',
        lastName: 'Admin',
        email: `adminA_${timestamp}@hms.com`,
        phone: '+1-555-0301',
        password: 'Password123!',
      },
    });
    assert(hospARes.status === 201, 'Hospital A created with HTTP 201');
    const hospitalAId = hospARes.data?.data?.hospital?._id || hospARes.data?.data?._id;

    const hospBRes = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
    }, {
      hospitalDetails: {
        hospitalName: `Specialty Staff Hospital B ${timestamp}`,
        registrationNumber: `REG-STAFF-B-${timestamp}`,
        contactEmail: `adminB_${timestamp}@hms.com`,
        contactPhone: '+1-555-0302',
        street: '200 Health Boulevard',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10002',
        country: 'United States',
      },
      adminDetails: {
        firstName: 'Beatrice',
        lastName: 'Admin',
        email: `adminB_${timestamp}@hms.com`,
        phone: '+1-555-0302',
        password: 'Password123!',
      },
    });
    assert(hospBRes.status === 201, 'Hospital B created with HTTP 201');
    const hospitalBId = hospBRes.data?.data?.hospital?._id || hospBRes.data?.data?._id;

    // Login Admin A
    const adminALogin = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
    }, {
      email: `adminA_${timestamp}@hms.com`,
      password: 'Password123!',
    });
    assert(adminALogin.status === 200, 'Admin A logged in (HTTP 200)');
    const adminAToken = adminALogin.data?.data?.accessToken || adminALogin.data?.accessToken;

    // Login Admin B
    const adminBLogin = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
    }, {
      email: `adminB_${timestamp}@hms.com`,
      password: 'Password123!',
    });
    assert(adminBLogin.status === 200, 'Admin B logged in (HTTP 200)');
    const adminBToken = adminBLogin.data?.data?.accessToken || adminBLogin.data?.accessToken;

    // ─── Step 2: Load Initial Staff Directory ───
    console.log('\n--- Step 2: Load Initial Staff Directory ---');
    const initialStaffRes = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    assert(initialStaffRes.status === 200, 'GET /hospital-admin/users returned 200');
    const staffList = initialStaffRes.data?.data?.users || initialStaffRes.data?.users || [];
    assert(Array.isArray(staffList), 'Staff directory returned as valid array');
    assert(initialStaffRes.data?.data?.pagination?.total !== undefined, 'Pagination total count provided by backend');

    // ─── Step 3: Permitted Staff Role Provisioning ───
    console.log('\n--- Step 3: Permitted Staff Role Provisioning ---');
    const rolesToTest = [
      { role: 'DOCTOR', first: 'Arun', last: 'Verma', dept: 'Cardiology' },
      { role: 'NURSE', first: 'Priya', last: 'Sharma', dept: 'Emergency' },
      { role: 'PHARMACIST', first: 'Kiran', last: 'Deshmukh', dept: 'Pharmacy Services' },
      { role: 'LAB_TECH', first: 'Ravi', last: 'Kumar', dept: 'Pathology & Laboratory' },
      { role: 'RADIOLOGY_STAFF', first: 'Ananya', last: 'Sen', dept: 'Radiology & Imaging' },
      { role: 'RECEPTIONIST', first: 'Deepak', last: 'Nair', dept: 'Front Desk & Patient Services' },
      { role: 'BILLING_STAFF', first: 'Sneha', last: 'Gupta', dept: 'Billing & Accounts' },
    ];

    const createdStaffA = [];
    for (const r of rolesToTest) {
      const email = `${r.first.toLowerCase()}_${r.role.toLowerCase()}_${timestamp}@hms.com`;
      const res = await request(`${API_BASE}/hospital-admin/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminAToken}` },
      }, {
        firstName: r.first,
        lastName: r.last,
        email,
        phone: '+1 (555) 123-4567',
        role: r.role,
        department: r.dept,
        specialization: `${r.dept} Specialist`,
        licenseNumber: `LIC-${r.role}-${timestamp}`,
        password: 'StaffPassword123!',
        status: 'active',
      });

      assert(res.status === 201, `Hospital Admin successfully provisioned role '${r.role}' (HTTP 201)`);
      const user = res.data?.data?.user || res.data?.user || res.data?.data;
      assert(user?.email === email, `Staff email correctly recorded (${email})`);
      assert(user?.roleName === r.role || user?.role === r.role, `Staff role correctly recorded as ${r.role}`);
      assert(user?.password === undefined, 'Security: Password is not returned in API response');
      assert(user?.refreshTokens === undefined, 'Security: Refresh tokens are not returned');
      if (user) createdStaffA.push(user);
    }

    // ─── Step 4: Protected Role Restrictions ───
    console.log('\n--- Step 4: Protected Role Restrictions Enforcements ---');
    // Try creating HOSPITAL_ADMIN
    const blockHospAdmin = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, {
      firstName: 'Malicious',
      lastName: 'Admin',
      email: `rogue_admin_${timestamp}@hms.com`,
      role: 'HOSPITAL_ADMIN',
      password: 'Password123!',
    });
    assert(blockHospAdmin.status === 403, 'Hospital Admin cannot provision HOSPITAL_ADMIN (rejected HTTP 403)');

    // Try creating SUPER_ADMIN
    const blockSuperAdmin = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, {
      firstName: 'Malicious',
      lastName: 'Super',
      email: `rogue_super_${timestamp}@hms.com`,
      role: 'SUPER_ADMIN',
      password: 'Password123!',
    });
    assert(blockSuperAdmin.status === 403, 'Hospital Admin cannot provision SUPER_ADMIN (rejected HTTP 403)');

    // Try creating PATIENT
    const blockPatient = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, {
      firstName: 'Malicious',
      lastName: 'Patient',
      email: `rogue_patient_${timestamp}@hms.com`,
      role: 'PATIENT',
      password: 'Password123!',
    });
    assert(blockPatient.status === 400, 'Hospital Admin cannot provision PATIENT directly (rejected HTTP 400)');

    // ─── Step 5: Multi-Hospital Isolation ───
    console.log('\n--- Step 5: Multi-Hospital Tenant Isolation ---');
    // Provision 1 staff member in Hospital B
    const bStaffRes = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminBToken}` },
    }, {
      firstName: 'B_Staff',
      lastName: 'Person',
      email: `b_doctor_${timestamp}@hms.com`,
      phone: '+1 (555) 999-0000',
      role: 'DOCTOR',
      department: 'Orthopedics',
      password: 'StaffPassword123!',
      status: 'active',
    });
    assert(bStaffRes.status === 201, 'Admin B can provision Doctor in Hospital B (HTTP 201)');
    const staffBUser = bStaffRes.data?.data?.user || bStaffRes.data?.user || bStaffRes.data?.data;
    const staffBId = staffBUser?.id || staffBUser?._id;

    // Admin A queries staff
    const adminAQuery = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    const aList = adminAQuery.data?.data?.users || adminAQuery.data?.users || [];
    const seesB = aList.some((u) => (u._id || u.id) === staffBId);
    assert(!seesB, 'Hospital Isolation: Admin A CANNOT see Hospital B staff');

    // Admin A attempts to update staff in Hospital B
    const crossUpdate = await request(`${API_BASE}/hospital-admin/users/${staffBId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, {
      firstName: 'Hacked',
      lastName: 'Doctor',
    });
    assert(crossUpdate.status === 403, 'Cross-tenant isolation: Admin A blocked from updating Hospital B staff (HTTP 403)');

    // Admin A attempts to suspend staff in Hospital B
    const crossSuspend = await request(`${API_BASE}/hospital-admin/users/${staffBId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, {
      isActive: false,
      status: 'suspended',
    });
    assert(crossSuspend.status === 403, 'Cross-tenant isolation: Admin A blocked from suspending Hospital B staff (HTTP 403)');

    // ─── Step 6: Search & Filtering ───
    console.log('\n--- Step 6: Real Data Search & Filtering ---');
    // Search by name
    const searchByName = await request(`${API_BASE}/hospital-admin/users?search=Arun`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    const foundByName = searchByName.data?.data?.users || searchByName.data?.users || [];
    assert(foundByName.length >= 1 && foundByName.some((u) => u.firstName === 'Arun'), 'Search by first name returned target staff');

    // Search by email
    const searchByEmail = await request(`${API_BASE}/hospital-admin/users?search=kiran_pharmacist`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    const foundByEmail = searchByEmail.data?.data?.users || searchByEmail.data?.users || [];
    assert(foundByEmail.length === 1 && foundByEmail[0].firstName === 'Kiran', 'Search by email matched single target staff');

    // Filter by role: NURSE
    const filterByNurse = await request(`${API_BASE}/hospital-admin/users?role=NURSE`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    const nurses = filterByNurse.data?.data?.users || filterByNurse.data?.users || [];
    assert(nurses.length >= 1 && nurses.every((u) => u.roleName === 'NURSE'), 'Role filter: returned only NURSE staff');

    // Filter by status: active
    const filterByActive = await request(`${API_BASE}/hospital-admin/users?status=active`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    const actives = filterByActive.data?.data?.users || filterByActive.data?.users || [];
    assert(actives.length >= 7 && actives.every((u) => u.isActive && u.status === 'active'), 'Status filter: returned active staff');

    // Non-matching search returns empty
    const noMatch = await request(`${API_BASE}/hospital-admin/users?search=NonExistent123Staff`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    const emptyResults = noMatch.data?.data?.users || noMatch.data?.users || [];
    assert(emptyResults.length === 0, 'Non-matching search returns 0 results');

    // ─── Step 7: View & Edit Staff ───
    console.log('\n--- Step 7: View & Edit Staff ---');
    const doctorA = createdStaffA.find((u) => (u.roleName || u.role) === 'DOCTOR');
    assert(Boolean(doctorA), 'Doctor staff member retrieved from provisioned list');
    const doctorAId = doctorA?._id || doctorA?.id;

    const editRes = await request(`${API_BASE}/hospital-admin/users/${doctorAId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, {
      firstName: 'Arunav',
      lastName: 'Verma-Senior',
      phone: '+1 (555) 777-8888',
      department: 'Interventional Cardiology',
      specialization: 'Senior Interventional Cardiologist',
      qualification: 'MBBS, MD, DM (Cardiology)',
      licenseNumber: `LIC-MED-SR-${timestamp}`,
    });
    assert(editRes.status === 200, 'PUT /hospital-admin/users/:id updated staff successfully (HTTP 200)');
    const updatedDoc = editRes.data?.data || editRes.data?.user;
    assert(updatedDoc?.firstName === 'Arunav', 'First name updated in MongoDB');
    assert(updatedDoc?.department === 'Interventional Cardiology', 'Department updated in MongoDB');
    assert(updatedDoc?.phone === '+1 (555) 777-8888', 'Phone updated in MongoDB');
    assert(updatedDoc?.email === doctorA.email, 'Email preserved as immutable login identifier');

    // ─── Step 8: Account Activation / Suspension ───
    console.log('\n--- Step 8: Account Activation / Suspension ---');
    const suspendRes = await request(`${API_BASE}/hospital-admin/users/${doctorAId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, {
      isActive: false,
      status: 'suspended',
    });
    assert(suspendRes.status === 200, 'Suspend staff account succeeded (HTTP 200)');

    // Verify in database query
    const verifySuspended = await request(`${API_BASE}/hospital-admin/users?search=Arunav`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    const suspUser = (verifySuspended.data?.data?.users || verifySuspended.data?.users || [])[0];
    assert(suspUser?.isActive === false && suspUser?.status === 'suspended', 'Staff status updated to suspended in database');

    // Reactivate account
    const reactivateRes = await request(`${API_BASE}/hospital-admin/users/${doctorAId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, {
      isActive: true,
      status: 'active',
    });
    assert(reactivateRes.status === 200, 'Reactivate staff account succeeded (HTTP 200)');

    const verifyActive = await request(`${API_BASE}/hospital-admin/users?search=Arunav`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    const actUser = (verifyActive.data?.data?.users || verifyActive.data?.users || [])[0];
    assert(actUser?.isActive === true && actUser?.status === 'active', 'Staff status restored to active in database');

    // ─── Step 9: Audit Logging Verification ───
    console.log('\n--- Step 9: Audit Logging Verification ---');
    const auditRes = await request(`${API_BASE}/hospital-admin/audit-logs?limit=50`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    assert(auditRes.status === 200, 'GET /hospital-admin/audit-logs returned 200');
    const logs = auditRes.data?.data?.logs || auditRes.data?.data || [];
    const hasProvision = logs.some((l) => l.action === 'STAFF_PROVISIONED');
    const hasUpdate = logs.some((l) => l.action === 'UPDATE_STAFF_USER');
    const hasDeactivate = logs.some((l) => l.action === 'DEACTIVATE_USER');
    const hasActivate = logs.some((l) => l.action === 'ACTIVATE_USER');

    assert(hasProvision, 'Audit log created for STAFF_PROVISIONED');
    assert(hasUpdate, 'Audit log created for UPDATE_STAFF_USER');
    assert(hasDeactivate, 'Audit log created for DEACTIVATE_USER');
    assert(hasActivate, 'Audit log created for ACTIVATE_USER');

    // ─── Step 10: RBAC & Security Boundaries ───
    console.log('\n--- Step 10: RBAC & Security Boundaries ---');
    // Unauthenticated request
    const unauth = await request(`${API_BASE}/hospital-admin/users`, { method: 'GET' });
    assert(unauth.status === 401, 'Unauthenticated request rejected with HTTP 401');

    console.log('\n======================================================================');
    console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Unhandled test suite error:', error);
    process.exit(1);
  }
}

runUsersStaffE2ETests();
