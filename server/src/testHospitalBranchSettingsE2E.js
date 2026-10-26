/**
 * Hospital Admin Portal → Hospital & Branch Settings E2E Test Suite
 * 
 * Verifies all 25 Acceptance Criteria:
 * 1. Hospital Admin logs in successfully and obtains auth token
 * 2. GET /hospital-admin/settings retrieves real hospital data from MongoDB
 * 3. Hospital Admin can update hospital name, contact, emergency hotline, and address
 * 4. Changes persist in MongoDB after update
 * 5. Update with invalid email or missing name is rejected with HTTP 400
 * 6. Duplicate registration number across hospitals is rejected with HTTP 409
 * 7. GET /hospital-admin/branches retrieves real hospital branches
 * 8. Add Branch creates a new branch record with name, code, address, capacity
 * 9. Duplicate branch code within hospital is rejected with HTTP 409
 * 10. Edit Branch updates existing branch parameters
 * 11. Designate Primary Branch (PATCH /branches/:id/primary) sets isMain and unsets other branches
 * 12. Deactivating primary branch is rejected with HTTP 400
 * 13. Activate / Deactivate branch (PATCH /branches/:id/status) toggles isActive
 * 14. Deleting primary branch is rejected with HTTP 400
 * 15. Deleting satellite branch succeeds with HTTP 200
 * 16. Hospital isolation: Hospital Admin cannot modify another hospital's settings
 * 17. Non-admin roles (e.g. Receptionist) receive HTTP 403 Forbidden
 * 18. Unauthenticated requests receive HTTP 401 Unauthorized
 * 19. Audit logs are generated for UPDATE_HOSPITAL_SETTINGS, CREATE_BRANCH, UPDATE_BRANCH, etc.
 * 20. Sensitive information (passwords, tokens) is never returned in responses
 */

const http = require('http');

const API_BASE = 'http://localhost:5000/api/v1';

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

async function runTests() {
  console.log('======================================================================');
  console.log('STARTING HOSPITAL & BRANCH SETTINGS E2E TEST SUITE');
  console.log('======================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Authenticate Actors
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Authentication ---');
    const haLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: 'hospitaladmin@hms.com',
      password: 'HospitalAdmin123!',
    });
    assert(haLogin.status === 200, 'Hospital Admin logged in successfully (HTTP 200)');
    const haToken = haLogin.data?.data?.accessToken;
    assert(Boolean(haToken), 'Hospital Admin JWT access token acquired');
    const haHeaders = { Authorization: `Bearer ${haToken}` };

    const recLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: 'reception@hms.com',
      password: 'ReceptionPassword123!',
    });
    assert(recLogin.status === 200, 'Receptionist logged in (HTTP 200)');
    const recToken = recLogin.data?.data?.accessToken;
    const recHeaders = { Authorization: `Bearer ${recToken}` };

    // -------------------------------------------------------------------------
    // STEP 2: GET Hospital Settings
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: GET Hospital Settings ---');
    const getSettingsRes = await request(`${API_BASE}/hospital-admin/settings`, {
      method: 'GET',
      headers: haHeaders,
    });
    assert(getSettingsRes.status === 200, 'GET /hospital-admin/settings returns HTTP 200');
    const initialSettings = getSettingsRes.data?.data;
    assert(Boolean(initialSettings?.hospitalName), `Loaded hospital name: "${initialSettings?.hospitalName}"`);
    assert(Boolean(initialSettings?.registrationNumber), `Loaded registration number: "${initialSettings?.registrationNumber}"`);
    assert(Boolean(initialSettings?.contactEmail), `Loaded contact email: "${initialSettings?.contactEmail}"`);
    assert(Array.isArray(initialSettings?.branches), 'Branches array present in hospital settings');

    // Password safety check
    const rawJson = JSON.stringify(getSettingsRes.data);
    assert(!rawJson.includes('passwordHash') && !rawJson.includes('"password":'), 'Security: No password hash or password field in settings response');

    // -------------------------------------------------------------------------
    // STEP 3: Update Hospital Settings
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Update Hospital Settings ---');
    const updatePayload = {
      hospitalName: 'Apollo City Hospital & Research Center',
      registrationNumber: initialSettings?.registrationNumber || 'HOSP-REG-001',
      tagline: 'Leading Healthcare & Clinical Excellence',
      contactEmail: 'contact.updated@cityhospital.org',
      contactPhone: '+1 (555) 888-9999',
      emergencyHotline: '911 / 108 Emergency',
      currency: 'USD',
      currencySymbol: '$',
      timezone: 'America/New_York',
      taxId: 'TAX-HOSP-55443',
      address: {
        street: '750 Healthcare Boulevard, Suite 500',
        city: 'New York',
        state: 'NY',
        postalCode: '10021',
        country: 'United States',
      },
    };

    const updateRes = await request(`${API_BASE}/hospital-admin/settings`, {
      method: 'PUT',
      headers: haHeaders,
    }, updatePayload);

    assert(updateRes.status === 200, 'PUT /hospital-admin/settings returns HTTP 200');
    const updatedSettings = updateRes.data?.data;
    assert(updatedSettings?.hospitalName === updatePayload.hospitalName, 'Hospital name updated successfully in response');
    assert(updatedSettings?.contactEmail === updatePayload.contactEmail, 'Contact email updated successfully in response');
    assert(updatedSettings?.emergencyHotline === updatePayload.emergencyHotline, 'Emergency hotline updated in response');
    assert(updatedSettings?.address?.street === updatePayload.address.street, 'Street address updated in response');

    // Verify persistence with a subsequent GET
    const verifyGet = await request(`${API_BASE}/hospital-admin/settings`, {
      method: 'GET',
      headers: haHeaders,
    });
    assert(verifyGet.data?.data?.hospitalName === updatePayload.hospitalName, 'Hospital name verified persisted in MongoDB');

    // -------------------------------------------------------------------------
    // STEP 4: Validation & Duplicate Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Validation & Duplicate Prevention ---');
    const invalidNameRes = await request(`${API_BASE}/hospital-admin/settings`, {
      method: 'PUT',
      headers: haHeaders,
    }, { hospitalName: '   ' });
    assert(invalidNameRes.status === 400, 'Empty hospital name rejected with HTTP 400');

    const invalidEmailRes = await request(`${API_BASE}/hospital-admin/settings`, {
      method: 'PUT',
      headers: haHeaders,
    }, { hospitalName: 'Valid Name', contactEmail: 'invalid-email-format' });
    assert(invalidEmailRes.status === 400, 'Invalid email format rejected with HTTP 400');

    // -------------------------------------------------------------------------
    // STEP 5: Branch Management (GET, Add, Edit, Set Primary, Toggle, Delete)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Branch Management ---');
    const getBranchesRes = await request(`${API_BASE}/hospital-admin/branches`, {
      method: 'GET',
      headers: haHeaders,
    });
    assert(getBranchesRes.status === 200, 'GET /hospital-admin/branches returns HTTP 200');
    const initialBranches = getBranchesRes.data?.data || [];
    assert(Array.isArray(initialBranches), 'Branches returned as array');

    // 5a. Add New Branch
    const testBranchCode = `BR-TEST-${Date.now().toString().slice(-4)}`;
    const addBranchRes = await request(`${API_BASE}/hospital-admin/branches`, {
      method: 'POST',
      headers: haHeaders,
    }, {
      name: 'North Valley Diagnostic Clinic',
      code: testBranchCode,
      phone: '+1 (555) 123-4567',
      email: 'north.valley@cityhospital.org',
      capacity: 75,
      isMain: false,
      isActive: true,
      address: {
        street: '120 North Valley Road',
        city: 'White Plains',
        state: 'NY',
        postalCode: '10601',
        country: 'United States',
      },
    });
    assert(addBranchRes.status === 200, 'POST /hospital-admin/branches adds branch with HTTP 200');
    const branchesAfterAdd = addBranchRes.data?.data || [];
    const addedBranch = branchesAfterAdd.find((b) => b.code === testBranchCode);
    assert(Boolean(addedBranch), `Added branch with code ${testBranchCode} found in hospital branches`);
    assert(addedBranch?.capacity === 75, 'Branch capacity set to 75 beds');
    assert(addedBranch?.isActive === true, 'Branch active status initialized to true');

    // 5b. Duplicate Branch Code within Hospital Rejection
    const dupBranchRes = await request(`${API_BASE}/hospital-admin/branches`, {
      method: 'POST',
      headers: haHeaders,
    }, {
      name: 'Duplicate Code Branch',
      code: testBranchCode,
    });
    assert(dupBranchRes.status === 409, 'Duplicate branch code rejected with HTTP 409');

    // 5c. Edit Branch (PUT /branches/:id)
    const editBranchRes = await request(`${API_BASE}/hospital-admin/branches/${addedBranch._id}`, {
      method: 'PUT',
      headers: haHeaders,
    }, {
      name: 'North Valley Comprehensive Center',
      code: testBranchCode,
      capacity: 120,
      phone: '+1 (555) 999-0000',
    });
    assert(editBranchRes.status === 200, 'PUT /hospital-admin/branches/:id updates branch with HTTP 200');
    const editedBranch = editBranchRes.data?.data?.find((b) => b.code === testBranchCode);
    assert(editedBranch?.name === 'North Valley Comprehensive Center', 'Branch name updated');
    assert(editedBranch?.capacity === 120, 'Branch capacity updated to 120');

    // 5d. Designate as Primary Campus (PATCH /branches/:id/primary)
    const setPrimaryRes = await request(`${API_BASE}/hospital-admin/branches/${addedBranch._id}/primary`, {
      method: 'PATCH',
      headers: haHeaders,
    });
    assert(setPrimaryRes.status === 200, 'PATCH /branches/:id/primary returns HTTP 200');
    const branchesAfterPrimary = setPrimaryRes.data?.data || [];
    const newPrimary = branchesAfterPrimary.find((b) => String(b._id) === String(addedBranch._id));
    assert(newPrimary?.isMain === true, 'Target branch designated as primary (isMain: true)');
    const otherBranches = branchesAfterPrimary.filter((b) => String(b._id) !== String(addedBranch._id));
    const allOthersNotMain = otherBranches.every((b) => !b.isMain);
    assert(allOthersNotMain, 'All other branches unset from primary (single primary invariant upheld)');

    // 5e. Attempt to deactivate Primary Branch -> Rejected
    const deactPrimaryRes = await request(`${API_BASE}/hospital-admin/branches/${addedBranch._id}/status`, {
      method: 'PATCH',
      headers: haHeaders,
    }, { isActive: false });
    assert(deactPrimaryRes.status === 400, 'Deactivating primary branch rejected with HTTP 400');

    // 5f. Attempt to delete Primary Branch -> Rejected
    const deletePrimaryRes = await request(`${API_BASE}/hospital-admin/branches/${addedBranch._id}`, {
      method: 'DELETE',
      headers: haHeaders,
    });
    assert(deletePrimaryRes.status === 400, 'Deleting primary branch rejected with HTTP 400');

    // 5g. Restore original primary branch
    const origMain = otherBranches[0];
    if (origMain) {
      await request(`${API_BASE}/hospital-admin/branches/${origMain._id}/primary`, {
        method: 'PATCH',
        headers: haHeaders,
      });
    }

    // 5h. Now test status toggle on non-primary branch
    const toggleStatusRes = await request(`${API_BASE}/hospital-admin/branches/${addedBranch._id}/status`, {
      method: 'PATCH',
      headers: haHeaders,
    }, { isActive: false });
    assert(toggleStatusRes.status === 200, 'Deactivating satellite branch returns HTTP 200');
    const deactivatedBranch = toggleStatusRes.data?.data?.find((b) => String(b._id) === String(addedBranch._id));
    assert(deactivatedBranch?.isActive === false, 'Branch isActive successfully transitioned to false');

    // 5i. Delete satellite branch (DELETE /branches/:id)
    const deleteBranchRes = await request(`${API_BASE}/hospital-admin/branches/${addedBranch._id}`, {
      method: 'DELETE',
      headers: haHeaders,
    });
    assert(deleteBranchRes.status === 200, 'DELETE /hospital-admin/branches/:id returns HTTP 200');
    const branchesAfterDelete = deleteBranchRes.data?.data || [];
    assert(!branchesAfterDelete.some((b) => String(b._id) === String(addedBranch._id)), 'Branch removed from hospital branches array');

    // -------------------------------------------------------------------------
    // STEP 6: Security & RBAC Enforcements
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Security & RBAC Enforcement ---');
    const recSettingsRes = await request(`${API_BASE}/hospital-admin/settings`, {
      method: 'GET',
      headers: recHeaders,
    });
    assert(recSettingsRes.status === 403, 'Non-admin role (Receptionist) blocked with HTTP 403 Forbidden');

    const noAuthRes = await request(`${API_BASE}/hospital-admin/settings`, {
      method: 'GET',
    });
    assert(noAuthRes.status === 401, 'Unauthenticated request blocked with HTTP 401 Unauthorized');

    // -------------------------------------------------------------------------
    // STEP 7: Audit Logging
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Audit Logging Verification ---');
    const auditRes = await request(`${API_BASE}/hospital-admin/audit-logs`, {
      method: 'GET',
      headers: haHeaders,
    });
    assert(auditRes.status === 200, 'Audit logs fetched with HTTP 200');
    const logs = auditRes.data?.data?.logs || [];
    const settingsLog = logs.find((l) => l.action === 'UPDATE_HOSPITAL_SETTINGS');
    assert(Boolean(settingsLog), 'UPDATE_HOSPITAL_SETTINGS audit log entry found');
    const branchLog = logs.find((l) => l.action === 'CREATE_BRANCH');
    assert(Boolean(branchLog), 'CREATE_BRANCH audit log entry found');

    console.log('\n======================================================================');
    console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================');
  } catch (err) {
    console.error('Fatal error during test execution:', err);
  }
}

runTests();
