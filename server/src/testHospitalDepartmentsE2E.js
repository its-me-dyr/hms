/**
 * Hospital Admin Portal → Departments E2E Test Suite
 * 
 * Verifies all criteria:
 * - Load real departments from MongoDB
 * - Search by name and code
 * - Filter active and inactive
 * - Add department
 * - Duplicate department code rejection (409)
 * - Duplicate department name rejection (409)
 * - Capacity validation (reject negative numbers with 400)
 * - Head of department assignment (only same-hospital user, reject cross-hospital user with 400)
 * - Real doctor and staff count calculation
 * - Edit department
 * - Deactivate and Activate status toggles with persistence
 * - Complete hospital isolation (Admin A cannot view/edit/status-toggle Admin B's department)
 * - RBAC enforcement (401 for unauthenticated, 403 for non-admin roles)
 * - Audit logging verification (CREATE_DEPARTMENT, UPDATE_DEPARTMENT, ACTIVATE_DEPARTMENT, DEACTIVATE_DEPARTMENT)
 * - Security verification (no secrets exposed)
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
    if (body) req.write(body);
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

async function runDepartmentTests() {
  console.log('======================================================================');
  console.log('STARTING HOSPITAL DEPARTMENTS E2E TEST SUITE');
  console.log('======================================================================\n');

  try {
    const ts = Date.now().toString().slice(-5);

    // ── 1. Authentication ──
    console.log('--- Step 1: Authentication & Provisioning ---');
    const saLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: 'admin@hms.com',
      password: 'AdminPassword123!',
    });
    assert(saLogin.status === 200, 'Super Admin logged in successfully (HTTP 200)');
    const saToken = saLogin.data?.data?.accessToken;
    const saHeaders = { Authorization: `Bearer ${saToken}` };

    // Create Hospital A and Hospital Admin A
    const hospAReg = `REG-A-${ts}`;
    const hospAEmail = `admin.depta.${ts}@hms.org`;
    const hospARes = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `Hospital Alpha Depts ${ts}`,
        registrationNumber: hospAReg,
        contactEmail: `contact.depta.${ts}@hms.org`,
        contactPhone: '+1-555-0101',
        emergencyHotline: '911',
        street: '100 Alpha Boulevard',
        city: 'Alpha City',
        state: 'NY',
        postalCode: '10001',
        country: 'United States',
      },
      adminDetails: {
        firstName: 'Arthur',
        lastName: 'Admin',
        email: hospAEmail,
        phone: '+1-555-0101',
        password: 'PasswordAlpha123!',
      },
    });
    if (hospARes.status !== 201) console.log('hospARes failed:', hospARes.status, hospARes.data);
    assert(hospARes.status === 201, 'Hospital A created with HTTP 201');

    // Create Hospital B and Hospital Admin B (for isolation testing)
    const hospBReg = `REG-B-${ts}`;
    const hospBEmail = `admin.deptb.${ts}@hms.org`;
    const hospBRes = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `Hospital Beta Depts ${ts}`,
        registrationNumber: hospBReg,
        contactEmail: `contact.deptb.${ts}@hms.org`,
        contactPhone: '+1-555-0102',
        emergencyHotline: '911',
        street: '200 Beta Boulevard',
        city: 'Beta City',
        state: 'NY',
        postalCode: '10002',
        country: 'United States',
      },
      adminDetails: {
        firstName: 'Beatrice',
        lastName: 'Admin',
        email: hospBEmail,
        phone: '+1-555-0102',
        password: 'PasswordBeta123!',
      },
    });
    if (hospBRes.status !== 201) console.log('hospBRes failed:', hospBRes.status, hospBRes.data);
    assert(hospBRes.status === 201, 'Hospital B created with HTTP 201');

    // Login as Admin A
    const adminALogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospAEmail,
      password: 'PasswordAlpha123!',
    });
    assert(adminALogin.status === 200, 'Admin A logged in (HTTP 200)');
    const tokenA = adminALogin.data?.data?.accessToken;
    const headersA = { Authorization: `Bearer ${tokenA}` };

    // Login as Admin B
    const adminBLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospBEmail,
      password: 'PasswordBeta123!',
    });
    assert(adminBLogin.status === 200, 'Admin B logged in (HTTP 200)');
    const tokenB = adminBLogin.data?.data?.accessToken;
    const headersB = { Authorization: `Bearer ${tokenB}` };

    // Provision a Doctor in Hospital A
    const doctorARes = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: headersA,
    }, {
      firstName: 'Derrick',
      lastName: 'Doctor',
      email: `dr.derrick.${ts}@hms.com`,
      password: 'Password@123',
      role: 'DOCTOR',
      phone: '+1-555-0199',
      specialization: 'Interventional Cardiology',
      qualification: 'MD, FACC',
      licenseNumber: `LIC-A-${ts}`,
      department: `Cardiology Wing ${ts}`,
      status: 'active',
    });
    if (doctorARes.status !== 201) console.log('doctorARes failed:', doctorARes.status, doctorARes.data);
    assert(doctorARes.status === 201, 'Provisioned Doctor in Hospital A (HTTP 201)');
    const doctorAId = doctorARes.data?.data?.user?.id || doctorARes.data?.data?.user?._id;

    // Provision a Doctor in Hospital B (for cross-hospital head check)
    const doctorBRes = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: headersB,
    }, {
      firstName: 'Benjamin',
      lastName: 'Doctor',
      email: `dr.benjamin.${ts}@hms.com`,
      password: 'Password@123',
      role: 'DOCTOR',
      phone: '+1-555-0299',
      specialization: 'Neurology Specialist',
      qualification: 'MD',
      licenseNumber: `LIC-B-${ts}`,
      department: 'Neurology',
      status: 'active',
    });
    if (doctorBRes.status !== 201) console.log('doctorBRes failed:', doctorBRes.status, doctorBRes.data);
    assert(doctorBRes.status === 201, 'Provisioned Doctor in Hospital B (HTTP 201)');
    const doctorBId = doctorBRes.data?.data?.user?.id || doctorBRes.data?.data?.user?._id;

    // ── 2. Load Real Departments ──
    console.log('\n--- Step 2: Load Real Departments from MongoDB ---');
    const getDeptsRes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'GET',
      headers: headersA,
    });
    assert(getDeptsRes.status === 200, 'GET /hospital-admin/departments returned HTTP 200');
    const deptsList = getDeptsRes.data?.data;
    assert(Array.isArray(deptsList) && deptsList.length >= 8, 'Real departments loaded (default clinical wings present)');
    assert(deptsList.every((d) => d.name && d.code), 'All departments have name and code fields');

    // Security check: No password or hash in department responses
    const jsonStr = JSON.stringify(deptsList);
    assert(!jsonStr.includes('password') && !jsonStr.includes('refreshTokens'), 'Security: No password or tokens exposed in response');

    // ── 3. Add Department with Real Head & Capacity ──
    console.log('\n--- Step 3: Add Department ---');
    const newDeptCode = `CARD${ts}`;
    const newDeptName = `Cardiology Wing ${ts}`;

    const addDeptRes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'POST',
      headers: headersA,
    }, {
      name: newDeptName,
      code: newDeptCode,
      description: 'Advanced cardiovascular catheterization lab and ICU.',
      location: 'Heart Pavilion, 4th Floor',
      capacity: 45,
      headOfDepartment: doctorAId,
    });
    assert(addDeptRes.status === 201, 'POST /hospital-admin/departments created department (HTTP 201)');
    const createdDeptId = addDeptRes.data?.data?._id;
    assert(Boolean(createdDeptId), 'Created department returned valid MongoDB ObjectId');
    assert(addDeptRes.data?.data?.name === newDeptName, 'Department name persisted');
    assert(addDeptRes.data?.data?.code === newDeptCode, 'Department code persisted as uppercase');
    assert(addDeptRes.data?.data?.capacity === 45, 'Capacity set to 45');

    // ── 4. Real Doctor & Staff Count Calculation ──
    console.log('\n--- Step 4: Real Doctor & Staff Counts ---');
    const verifyListRes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'GET',
      headers: headersA,
    });
    const foundCreated = verifyListRes.data?.data?.find((d) => (d.id || d._id) === createdDeptId);
    assert(Boolean(foundCreated), 'Created department found in department list');
    assert(foundCreated?.doctorsCount === 1, `Doctor count is real calculated number: ${foundCreated?.doctorsCount} (Expected 1)`);
    assert(foundCreated?.staffCount === 1, `Staff count is real calculated number: ${foundCreated?.staffCount} (Expected 1)`);
    assert(foundCreated?.headName?.includes('Derrick Doctor'), `Head specialist formatted correctly: ${foundCreated?.headName}`);

    // ── 5. Search by Name and Code ──
    console.log('\n--- Step 5: Search Functionality ---');
    // Search by Name
    const searchNameRes = await request(`${API_BASE}/hospital-admin/departments?search=${encodeURIComponent(newDeptName)}`, {
      method: 'GET',
      headers: headersA,
    });
    assert(searchNameRes.status === 200, 'Search by name returned HTTP 200');
    const searchNameList = searchNameRes.data?.data || [];
    assert(searchNameList.some((d) => d.name === newDeptName), 'Target department found via name search');

    // Search by Code
    const searchCodeRes = await request(`${API_BASE}/hospital-admin/departments?search=${newDeptCode}`, {
      method: 'GET',
      headers: headersA,
    });
    assert(searchCodeRes.status === 200, 'Search by code returned HTTP 200');
    const searchCodeList = searchCodeRes.data?.data || [];
    assert(searchCodeList.some((d) => d.code === newDeptCode), 'Target department found via code search');

    // Search with No Results
    const searchEmptyRes = await request(`${API_BASE}/hospital-admin/departments?search=NONEXISTENT_XYZ_99999`, {
      method: 'GET',
      headers: headersA,
    });
    assert(searchEmptyRes.status === 200, 'Empty search returned HTTP 200');
    assert(searchEmptyRes.data?.data?.length === 0, 'No departments matched for unknown search query');

    // ── 6. Validation & Duplicate Handling ──
    console.log('\n--- Step 6: Validation & Duplicate Prevention ---');
    // Duplicate Code Rejection
    const dupCodeRes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'POST',
      headers: headersA,
    }, {
      name: `Duplicate Code Dept ${ts}`,
      code: newDeptCode,
      capacity: 20,
    });
    assert(dupCodeRes.status === 409, 'Duplicate department code rejected with HTTP 409 Conflict');

    // Duplicate Name Rejection
    const dupNameRes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'POST',
      headers: headersA,
    }, {
      name: newDeptName,
      code: `DIFF${ts}`,
      capacity: 20,
    });
    assert(dupNameRes.status === 409, 'Duplicate department name rejected with HTTP 409 Conflict');

    // Empty Name Rejection
    const emptyNameRes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'POST',
      headers: headersA,
    }, { name: '', code: `CODE${ts}` });
    assert(emptyNameRes.status === 400, 'Empty department name rejected with HTTP 400');

    // Empty Code Rejection
    const emptyCodeRes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'POST',
      headers: headersA,
    }, { name: `Name Valid ${ts}`, code: '   ' });
    assert(emptyCodeRes.status === 400, 'Empty department code rejected with HTTP 400');

    // Negative Capacity Rejection
    const negCapRes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'POST',
      headers: headersA,
    }, {
      name: `Negative Cap Dept ${ts}`,
      code: `NEGC${ts}`,
      capacity: -15,
    });
    assert(negCapRes.status === 400, 'Negative capacity rejected with HTTP 400');

    // ── 7. Cross-Hospital Isolation for Head of Department ──
    console.log('\n--- Step 7: Head of Department Hospital Scope Verification ---');
    const foreignHeadRes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'POST',
      headers: headersA,
    }, {
      name: `Foreign Head Dept ${ts}`,
      code: `FRGN${ts}`,
      capacity: 30,
      headOfDepartment: doctorBId, // Doctor belongs to Hospital B!
    });
    assert(foreignHeadRes.status === 400, 'Assigning staff from another hospital rejected with HTTP 400');

    // ── 8. Edit Department ──
    console.log('\n--- Step 8: Edit Department ---');
    const updateRes = await request(`${API_BASE}/hospital-admin/departments/${createdDeptId}`, {
      method: 'PUT',
      headers: headersA,
    }, {
      name: `${newDeptName} Updated`,
      capacity: 60,
      location: 'Heart Pavilion, 5th Floor West',
      description: 'Updated comprehensive cardiology and cardiac surgical suites.',
    });
    assert(updateRes.status === 200, 'PUT /hospital-admin/departments/:id updated successfully');
    assert(updateRes.data?.data?.capacity === 60, 'Updated capacity persisted to 60');
    assert(updateRes.data?.data?.location === 'Heart Pavilion, 5th Floor West', 'Updated location persisted');

    // ── 9. Status Toggles: Deactivate & Activate ──
    console.log('\n--- Step 9: Activate / Deactivate Status Management ---');
    // Deactivate
    const deactRes = await request(`${API_BASE}/hospital-admin/departments/${createdDeptId}/status`, {
      method: 'PATCH',
      headers: headersA,
    }, { isActive: false });
    assert(deactRes.status === 200, 'PATCH /departments/:id/status deactivated department');
    assert(deactRes.data?.data?.isActive === false, 'Department isActive toggled to false');

    // Verify Inactive filter
    const filterInactiveRes = await request(`${API_BASE}/hospital-admin/departments?status=inactive`, {
      method: 'GET',
      headers: headersA,
    });
    assert(filterInactiveRes.status === 200, 'Filter inactive returned HTTP 200');
    const inactiveList = filterInactiveRes.data?.data || [];
    assert(inactiveList.some((d) => (d.id || d._id) === createdDeptId), 'Deactivated department appears in inactive filter');

    // Activate
    const actRes = await request(`${API_BASE}/hospital-admin/departments/${createdDeptId}/status`, {
      method: 'PATCH',
      headers: headersA,
    }, { isActive: true });
    assert(actRes.status === 200, 'PATCH /departments/:id/status re-activated department');
    assert(actRes.data?.data?.isActive === true, 'Department isActive toggled back to true');

    // ── 10. Multi-Hospital Isolation ──
    console.log('\n--- Step 10: Multi-Hospital Isolation ---');
    // Admin B GET departments does NOT contain Admin A's custom department
    const adminBDepts = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'GET',
      headers: headersB,
    });
    assert(adminBDepts.status === 200, 'Admin B GET /hospital-admin/departments returned 200');
    const bList = adminBDepts.data?.data || [];
    const leakedDept = bList.find((d) => d.code === newDeptCode);
    assert(!leakedDept, 'Hospital Isolation: Hospital B cannot see Hospital A custom department');

    // Admin B can create department with same code in their own hospital
    const adminBCreateRes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'POST',
      headers: headersB,
    }, {
      name: `Cardiology Wing ${ts}`,
      code: newDeptCode, // Same code as in Hospital A!
      capacity: 35,
    });
    assert(adminBCreateRes.status === 201, 'Hospital Isolation: Admin B can use the same code in Hospital B');

    // Admin A tries to modify Admin B's department -> Blocked with 404
    const deptBId = adminBCreateRes.data?.data?._id;
    const crossEditRes = await request(`${API_BASE}/hospital-admin/departments/${deptBId}`, {
      method: 'PUT',
      headers: headersA,
    }, { name: 'Hacked Department Name' });
    assert(crossEditRes.status === 404, 'Hospital Isolation: Admin A blocked from editing Hospital B department (HTTP 404)');

    // Admin A tries to toggle status on Admin B's department -> Blocked with 404
    const crossStatusRes = await request(`${API_BASE}/hospital-admin/departments/${deptBId}/status`, {
      method: 'PATCH',
      headers: headersA,
    }, { isActive: false });
    assert(crossStatusRes.status === 404, 'Hospital Isolation: Admin A blocked from toggling Hospital B department status (HTTP 404)');

    // ── 11. RBAC Enforcement ──
    console.log('\n--- Step 11: RBAC Enforcement ---');
    // Unauthenticated request
    const unauthRes = await request(`${API_BASE}/hospital-admin/departments`);
    assert(unauthRes.status === 401, 'Unauthenticated request rejected with HTTP 401 Unauthorized');

    // Non-admin user (e.g. Doctor)
    const docLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: `dr.derrick.${ts}@hms.com`,
      password: 'Password@123',
    });
    const docToken = docLogin.data?.data?.accessToken;
    const docDeptRes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${docToken}` },
    });
    assert(docDeptRes.status === 403, 'Non-admin role (Doctor) blocked with HTTP 403 Forbidden');

    // ── 12. Audit Logging Verification ──
    console.log('\n--- Step 12: Audit Logging Verification ---');
    const auditRes = await request(`${API_BASE}/hospital-admin/audit-logs`, {
      method: 'GET',
      headers: headersA,
    });
    const logs = auditRes.data?.data?.logs || (Array.isArray(auditRes.data?.data) ? auditRes.data?.data : []);
    const createLog = logs.find((l) => l.action === 'CREATE_DEPARTMENT' && l.details?.code === newDeptCode);
    assert(Boolean(createLog), 'Audit log entry found for CREATE_DEPARTMENT');
    const updateLog = logs.find((l) => l.action === 'UPDATE_DEPARTMENT' && l.details?.code === newDeptCode);
    assert(Boolean(updateLog), 'Audit log entry found for UPDATE_DEPARTMENT');
    const deactLog = logs.find((l) => l.action === 'DEACTIVATE_DEPARTMENT' && l.details?.code === newDeptCode);
    assert(Boolean(deactLog), 'Audit log entry found for DEACTIVATE_DEPARTMENT');
    const actLog = logs.find((l) => l.action === 'ACTIVATE_DEPARTMENT' && l.details?.code === newDeptCode);
    assert(Boolean(actLog), 'Audit log entry found for ACTIVATE_DEPARTMENT');

    console.log('\n======================================================================');
    console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite failed with unexpected error:', err);
    process.exit(1);
  }
}

runDepartmentTests();
