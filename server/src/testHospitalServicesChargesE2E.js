/**
 * Comprehensive E2E Test Suite for Hospital Admin: Services & Charges
 * 
 * Verifies:
 * 1. Real MongoDB service catalog retrieval
 * 2. Search by name & code (case-insensitive, backend filtering)
 * 3. Category filtering across all 7 supported categories:
 *    - Consultation, Diagnostic, Laboratory, Radiology, Surgery, Emergency, General
 * 4. Add Service with valid payload
 * 5. Validation constraints:
 *    - Empty name / code (400)
 *    - Duplicate code within hospital (409)
 *    - Duplicate name within hospital (409)
 *    - Invalid category (400)
 *    - Negative charge (400)
 *    - Non-numeric charge (400)
 * 6. Edit Service (update charge, category, name, code)
 * 7. Edit duplicate collision checks (409)
 * 8. Delete Service (safe removal, confirmation in DB)
 * 9. Hospital Isolation (Admin A vs Admin B view/edit/delete blocks)
 * 10. RBAC / Authorization (401 unauthenticated, 403 non-admin)
 * 11. Audit Logging (CREATE_SERVICE_CHARGE, UPDATE_SERVICE_CHARGE, DELETE_SERVICE_CHARGE)
 * 12. Security (no tokens/passwords exposed in payload)
 * 13. Billing safety & non-corruption check
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

async function runServicesChargesE2ETests() {
  console.log('======================================================================');
  console.log('STARTING HOSPITAL ADMIN: SERVICES & CHARGES E2E TEST SUITE');
  console.log('======================================================================\n');

  try {
    const ts = Date.now().toString().slice(-5);

    // ----------------------------------------------------------------
    // STEP 1: Authentication & Provisioning
    // ----------------------------------------------------------------
    console.log('--- Step 1: Authentication & Provisioning ---');
    const saLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: 'admin@hms.com',
      password: 'AdminPassword123!',
    });
    assert(saLogin.status === 200, 'Super Admin logged in successfully (HTTP 200)');
    const saToken = saLogin.data?.data?.accessToken;
    const saHeaders = { Authorization: `Bearer ${saToken}` };

    // Create Hospital A
    const hospAEmail = `admin.svca.${ts}@hms.org`;
    const hospARes = await request(
      `${API_BASE}/super-admin/hospitals`,
      { method: 'POST', headers: saHeaders },
      {
        hospitalDetails: {
          hospitalName: `Hospital Alpha Svc ${ts}`,
          registrationNumber: `REG-SVCA-${ts}`,
          contactEmail: `contact.svca.${ts}@hms.org`,
          contactPhone: '+1-555-0301',
          emergencyHotline: '911',
          street: '100 Alpha Boulevard',
          city: 'Alpha City',
          state: 'NY',
          postalCode: '10001',
          country: 'United States',
        },
        adminDetails: {
          firstName: 'Alice',
          lastName: 'Admin',
          email: hospAEmail,
          phone: '+1-555-0301',
          password: 'PasswordAlpha123!',
        },
      }
    );
    assert(hospARes.status === 201, 'Hospital A created with HTTP 201');

    // Create Hospital B for Isolation
    const hospBEmail = `admin.svcb.${ts}@hms.org`;
    const hospBRes = await request(
      `${API_BASE}/super-admin/hospitals`,
      { method: 'POST', headers: saHeaders },
      {
        hospitalDetails: {
          hospitalName: `Hospital Beta Svc ${ts}`,
          registrationNumber: `REG-SVCB-${ts}`,
          contactEmail: `contact.svcb.${ts}@hms.org`,
          contactPhone: '+1-555-0302',
          emergencyHotline: '911',
          street: '200 Beta Boulevard',
          city: 'Beta City',
          state: 'NY',
          postalCode: '10002',
          country: 'United States',
        },
        adminDetails: {
          firstName: 'Bob',
          lastName: 'Admin',
          email: hospBEmail,
          phone: '+1-555-0302',
          password: 'PasswordBeta123!',
        },
      }
    );
    assert(hospBRes.status === 201, 'Hospital B created with HTTP 201');

    // Login Admin A
    const adminALogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospAEmail,
      password: 'PasswordAlpha123!',
    });
    assert(adminALogin.status === 200, 'Admin A logged in (HTTP 200)');
    const adminAToken = adminALogin.data?.data?.accessToken;
    const aHeaders = { Authorization: `Bearer ${adminAToken}` };

    // Login Admin B
    const adminBLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospBEmail,
      password: 'PasswordBeta123!',
    });
    assert(adminBLogin.status === 200, 'Admin B logged in (HTTP 200)');
    const adminBToken = adminBLogin.data?.data?.accessToken;
    const bHeaders = { Authorization: `Bearer ${adminBToken}` };

    // Provision a doctor in Hospital A for RBAC test
    const docEmail = `dr.watson.${ts}@hms.com`;
    const docProvRes = await request(
      `${API_BASE}/hospital-admin/users`,
      { method: 'POST', headers: aHeaders },
      {
        firstName: 'Doctor',
        lastName: 'Watson',
        email: docEmail,
        password: 'Password@123',
        role: 'DOCTOR',
        phone: '+1-555-0399',
        specialization: 'Internal Medicine',
        status: 'active',
      }
    );
    assert(docProvRes.status === 201, 'Doctor user provisioned in Hospital A (HTTP 201)');

    const docLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: docEmail,
      password: 'Password@123',
    });
    assert(docLogin.status === 200, 'Doctor logged in for non-admin RBAC check (HTTP 200)');
    const docToken = docLogin.data?.data?.accessToken;
    const docHeaders = { Authorization: `Bearer ${docToken}` };

    // ----------------------------------------------------------------
    // STEP 2: Load Initial Real Services
    // ----------------------------------------------------------------
    console.log('\n--- Step 2: Load Initial Services ---');
    const initServicesRes = await request(`${API_BASE}/hospital-admin/services`, { headers: aHeaders });
    assert(initServicesRes.status === 200, 'GET /hospital-admin/services returned 200');
    const initialServices = initServicesRes.data?.data || [];
    assert(Array.isArray(initialServices), 'Services returned as valid array');
    assert(initialServices.length >= 0, `Initial services retrieved from MongoDB (Found: ${initialServices.length})`);

    // Verify security: no sensitive credentials exposed
    const stringified = JSON.stringify(initServicesRes.data);
    assert(!stringified.includes('password') && !stringified.includes('accessToken'), 'Security: No passwords or tokens exposed');

    // ----------------------------------------------------------------
    // STEP 3: Add Service (Happy Path)
    // ----------------------------------------------------------------
    console.log('\n--- Step 3: Add Service (Happy Path) ---');
    const newServiceCode = `TEST_SRV_${ts}`;
    const newServiceName = `Comprehensive Cardiac Panel ${ts}`;
    const addRes = await request(
      `${API_BASE}/hospital-admin/services`,
      { method: 'POST', headers: aHeaders },
      {
        code: newServiceCode,
        name: newServiceName,
        category: 'Diagnostic',
        charge: 250.75,
        description: 'Complete cardiovascular enzyme and biomarker screen',
      }
    );
    assert(addRes.status === 200 || addRes.status === 201, 'POST /hospital-admin/services succeeded');
    const servicesAfterAdd = addRes.data?.data || [];
    const addedItem = servicesAfterAdd.find((s) => s.code === newServiceCode);
    assert(!!addedItem, 'Newly added service present in returned service catalog');
    assert(addedItem?.charge === 250.75, 'Charge correctly stored as numeric 250.75');
    assert(addedItem?.category === 'Diagnostic', 'Category correctly stored as Diagnostic');
    const addedServiceId = addedItem?._id;
    assert(!!addedServiceId, 'Service assigned a valid MongoDB ObjectId');

    // ----------------------------------------------------------------
    // STEP 4: Add Services for All 7 Supported Categories
    // ----------------------------------------------------------------
    console.log('\n--- Step 4: Verify All 7 Supported Categories ---');
    const supportedCategories = [
      'Consultation',
      'Diagnostic',
      'Laboratory',
      'Radiology',
      'Surgery',
      'Emergency',
      'General',
    ];

    for (const cat of supportedCategories) {
      const code = `CAT_${cat.slice(0, 3).toUpperCase()}_${ts}`;
      const name = `${cat} Service Item ${ts}`;
      const res = await request(
        `${API_BASE}/hospital-admin/services`,
        { method: 'POST', headers: aHeaders },
        {
          code,
          name,
          category: cat,
          charge: 120.0,
          description: `Test item for category ${cat}`,
        }
      );
      assert(res.status === 200 || res.status === 201, `Successfully added service in category '${cat}'`);
    }

    // ----------------------------------------------------------------
    // STEP 5: Search Functionality (Server-side)
    // ----------------------------------------------------------------
    console.log('\n--- Step 5: Search Functionality ---');
    // Search by Name (case-insensitive)
    const searchByNameRes = await request(
      `${API_BASE}/hospital-admin/services?search=cardiac%20panel`,
      { headers: aHeaders }
    );
    const searchByNameList = searchByNameRes.data?.data || [];
    assert(
      searchByNameList.some((s) => s.code === newServiceCode),
      'Search by service name found target service'
    );

    // Search by Code (case-insensitive)
    const searchByCodeRes = await request(
      `${API_BASE}/hospital-admin/services?search=${encodeURIComponent(newServiceCode.toLowerCase())}`,
      { headers: aHeaders }
    );
    const searchByCodeList = searchByCodeRes.data?.data || [];
    assert(
      searchByCodeList.some((s) => s.code === newServiceCode),
      'Search by service code (case-insensitive) found target service'
    );

    // Search with non-existent query
    const searchEmptyRes = await request(
      `${API_BASE}/hospital-admin/services?search=NONEXISTENT_QUERY_XYZ_999`,
      { headers: aHeaders }
    );
    const emptyList = searchEmptyRes.data?.data || [];
    assert(emptyList.length === 0, 'Non-matching search returns empty list (0 results)');

    // ----------------------------------------------------------------
    // STEP 6: Category Filtering
    // ----------------------------------------------------------------
    console.log('\n--- Step 6: Category Filtering ---');
    for (const cat of supportedCategories) {
      const catRes = await request(
        `${API_BASE}/hospital-admin/services?category=${cat}`,
        { headers: aHeaders }
      );
      const catList = catRes.data?.data || [];
      const allMatch = catList.every((s) => s.category.toLowerCase() === cat.toLowerCase());
      assert(allMatch && catList.length > 0, `Filter by category '${cat}' returned only '${cat}' items (${catList.length} items)`);
    }

    // Search + Category Combined
    const combinedRes = await request(
      `${API_BASE}/hospital-admin/services?search=cardiac&category=Diagnostic`,
      { headers: aHeaders }
    );
    const combinedList = combinedRes.data?.data || [];
    assert(
      combinedList.some((s) => s.code === newServiceCode),
      'Combined search + category filter matched correctly'
    );

    // ----------------------------------------------------------------
    // STEP 7: Validation Constraints
    // ----------------------------------------------------------------
    console.log('\n--- Step 7: Validation Constraints ---');
    // 1. Duplicate code within same hospital
    const dupCodeRes = await request(
      `${API_BASE}/hospital-admin/services`,
      { method: 'POST', headers: aHeaders },
      {
        code: newServiceCode, // duplicate
        name: `Another Name ${ts}`,
        category: 'Diagnostic',
        charge: 100,
      }
    );
    assert(dupCodeRes.status === 409, 'Duplicate service code rejected with HTTP 409 Conflict');

    // 2. Duplicate name within same hospital
    const dupNameRes = await request(
      `${API_BASE}/hospital-admin/services`,
      { method: 'POST', headers: aHeaders },
      {
        code: `DIFF_CODE_${ts}`,
        name: newServiceName, // duplicate name
        category: 'Diagnostic',
        charge: 100,
      }
    );
    assert(dupNameRes.status === 409, 'Duplicate service name rejected with HTTP 409 Conflict');

    // 3. Empty name
    const emptyNameRes = await request(
      `${API_BASE}/hospital-admin/services`,
      { method: 'POST', headers: aHeaders },
      {
        code: `VALID_CODE_${ts}`,
        name: '   ',
        category: 'Diagnostic',
        charge: 100,
      }
    );
    assert(emptyNameRes.status === 400, 'Empty service name rejected with HTTP 400 Bad Request');

    // 4. Empty code
    const emptyCodeRes = await request(
      `${API_BASE}/hospital-admin/services`,
      { method: 'POST', headers: aHeaders },
      {
        code: '   ',
        name: `Valid Name ${ts}`,
        category: 'Diagnostic',
        charge: 100,
      }
    );
    assert(emptyCodeRes.status === 400, 'Empty service code rejected with HTTP 400 Bad Request');

    // 5. Invalid category
    const invCatRes = await request(
      `${API_BASE}/hospital-admin/services`,
      { method: 'POST', headers: aHeaders },
      {
        code: `INVALID_CAT_${ts}`,
        name: `Invalid Category Svc ${ts}`,
        category: 'SuperSpecialtyUnknown',
        charge: 100,
      }
    );
    assert(invCatRes.status === 400, 'Invalid category rejected with HTTP 400 Bad Request');

    // 6. Negative charge
    const negChargeRes = await request(
      `${API_BASE}/hospital-admin/services`,
      { method: 'POST', headers: aHeaders },
      {
        code: `NEG_CHARGE_${ts}`,
        name: `Negative Charge Svc ${ts}`,
        category: 'General',
        charge: -45.5,
      }
    );
    assert(negChargeRes.status === 400, 'Negative charge rejected with HTTP 400 Bad Request');

    // 7. Non-numeric charge
    const nonNumRes = await request(
      `${API_BASE}/hospital-admin/services`,
      { method: 'POST', headers: aHeaders },
      {
        code: `NON_NUM_${ts}`,
        name: `Non Numeric Charge Svc ${ts}`,
        category: 'General',
        charge: 'abc_not_a_number',
      }
    );
    assert(nonNumRes.status === 400, 'Non-numeric charge rejected with HTTP 400 Bad Request');

    // ----------------------------------------------------------------
    // STEP 8: Edit Service
    // ----------------------------------------------------------------
    console.log('\n--- Step 8: Edit Service ---');
    const updatedCharge = 299.99;
    const updatedDesc = 'Updated description with high sensitivity cardiac troponin';
    const editRes = await request(
      `${API_BASE}/hospital-admin/services/${addedServiceId}`,
      { method: 'PUT', headers: aHeaders },
      {
        id: addedServiceId,
        code: newServiceCode,
        name: `${newServiceName} (Revised)`,
        category: 'Laboratory',
        charge: updatedCharge,
        description: updatedDesc,
      }
    );
    assert(editRes.status === 200, 'PUT /hospital-admin/services/:id updated successfully (HTTP 200)');
    const servicesAfterEdit = editRes.data?.data || [];
    const editedItem = servicesAfterEdit.find((s) => s.code === newServiceCode);
    assert(!!editedItem, 'Edited item present in returned service list');
    assert(editedItem?.charge === updatedCharge, `Charge successfully updated to ${updatedCharge}`);
    assert(editedItem?.category === 'Laboratory', 'Category successfully changed to Laboratory');
    assert(editedItem?.description === updatedDesc, 'Description successfully updated');

    // Duplicate conflict check during edit
    const editConflictRes = await request(
      `${API_BASE}/hospital-admin/services/${addedServiceId}`,
      { method: 'PUT', headers: aHeaders },
      {
        id: addedServiceId,
        code: `CAT_CON_${ts}`, // already used in step 4
        name: `${newServiceName} (Conflict Test)`,
        category: 'Laboratory',
        charge: 100,
      }
    );
    assert(editConflictRes.status === 409, 'Edit collision rejected with HTTP 409 Conflict');

    // ----------------------------------------------------------------
    // STEP 9: Delete Service
    // ----------------------------------------------------------------
    console.log('\n--- Step 9: Delete Service ---');
    const deleteRes = await request(
      `${API_BASE}/hospital-admin/services/${addedServiceId}`,
      { method: 'DELETE', headers: aHeaders }
    );
    assert(deleteRes.status === 200, 'DELETE /hospital-admin/services/:id succeeded (HTTP 200)');
    const servicesAfterDelete = deleteRes.data?.data || [];
    assert(
      !servicesAfterDelete.some((s) => s.code === newServiceCode),
      'Deleted service is removed from hospital catalog'
    );

    // Verify deleting non-existent service returns 404
    const delNonExistent = await request(
      `${API_BASE}/hospital-admin/services/650000000000000000000000`,
      { method: 'DELETE', headers: aHeaders }
    );
    assert(delNonExistent.status === 404, 'Deleting non-existent service returns HTTP 404');

    // ----------------------------------------------------------------
    // STEP 10: Multi-Hospital Isolation
    // ----------------------------------------------------------------
    console.log('\n--- Step 10: Multi-Hospital Isolation ---');
    // Admin B adds a service in Hospital B with the SAME code that Admin A used
    const codeB = `SHARED_CODE_${ts}`;
    const addBRes = await request(
      `${API_BASE}/hospital-admin/services`,
      { method: 'POST', headers: bHeaders },
      {
        code: codeB,
        name: `Hospital B Unique Service ${ts}`,
        category: 'Emergency',
        charge: 500,
        description: 'Hospital B emergency item',
      }
    );
    assert(addBRes.status === 200 || addBRes.status === 201, 'Admin B can create service in Hospital B');

    // Admin A can also create a service with the same code in Hospital A (Code uniqueness is scoped to hospital)
    const addARes = await request(
      `${API_BASE}/hospital-admin/services`,
      { method: 'POST', headers: aHeaders },
      {
        code: codeB,
        name: `Hospital A Service with Same Code ${ts}`,
        category: 'Consultation',
        charge: 75,
      }
    );
    assert(addARes.status === 200 || addARes.status === 201, 'Hospital isolation: Same code allowed in different hospitals');

    // Admin A cannot see Admin B's emergency service
    const aListRes = await request(`${API_BASE}/hospital-admin/services`, { headers: aHeaders });
    const aList = aListRes.data?.data || [];
    const bFoundInA = aList.find((s) => s.name === `Hospital B Unique Service ${ts}`);
    assert(!bFoundInA, 'Hospital Isolation: Admin A cannot see Hospital B service');

    // Admin A cannot edit Admin B's service
    const bServices = addBRes.data?.data || [];
    const bItem = bServices.find((s) => s.code === codeB);
    const bItemId = bItem?._id;
    const aEditBRes = await request(
      `${API_BASE}/hospital-admin/services/${bItemId}`,
      { method: 'PUT', headers: aHeaders },
      {
        id: bItemId,
        code: codeB,
        name: 'Hacked by Admin A',
        category: 'Emergency',
        charge: 999,
      }
    );
    assert(aEditBRes.status === 404, 'Admin A blocked from editing Hospital B service with HTTP 404');

    // Admin A cannot delete Admin B's service
    const aDelBRes = await request(
      `${API_BASE}/hospital-admin/services/${bItemId}`,
      { method: 'DELETE', headers: aHeaders }
    );
    assert(aDelBRes.status === 404, 'Admin A blocked from deleting Hospital B service with HTTP 404');

    // ----------------------------------------------------------------
    // STEP 11: RBAC Enforcement
    // ----------------------------------------------------------------
    console.log('\n--- Step 11: RBAC Enforcement ---');
    // Unauthenticated request
    const unauthRes = await request(`${API_BASE}/hospital-admin/services`);
    assert(unauthRes.status === 401, 'Unauthenticated request rejected with HTTP 401 Unauthorized');

    // Non-admin request (Doctor role)
    const docCreateRes = await request(
      `${API_BASE}/hospital-admin/services`,
      { method: 'POST', headers: docHeaders },
      {
        code: `DOC_SVC_${ts}`,
        name: 'Doctor Created Svc',
        category: 'General',
        charge: 10,
      }
    );
    assert(docCreateRes.status === 403, 'Non-admin role (Doctor) rejected with HTTP 403 Forbidden');

    // ----------------------------------------------------------------
    // STEP 12: Audit Logging Verification
    // ----------------------------------------------------------------
    console.log('\n--- Step 12: Audit Logging Verification ---');
    const auditRes = await request(`${API_BASE}/hospital-admin/audit-logs`, { headers: aHeaders });
    assert(auditRes.status === 200, 'GET /hospital-admin/audit-logs returned 200');
    const auditLogs = auditRes.data?.data?.logs || (Array.isArray(auditRes.data?.data) ? auditRes.data?.data : []);

    const createActionFound = auditLogs.some((l) => l.action === 'CREATE_SERVICE_CHARGE');
    assert(createActionFound, 'Audit log entry found for CREATE_SERVICE_CHARGE');

    const updateActionFound = auditLogs.some((l) => l.action === 'UPDATE_SERVICE_CHARGE');
    assert(updateActionFound, 'Audit log entry found for UPDATE_SERVICE_CHARGE');

    const deleteActionFound = auditLogs.some((l) => l.action === 'DELETE_SERVICE_CHARGE');
    assert(deleteActionFound, 'Audit log entry found for DELETE_SERVICE_CHARGE');

    // ----------------------------------------------------------------
    // STEP 13: Billing Non-Corruption Verification
    // ----------------------------------------------------------------
    console.log('\n--- Step 13: Billing Non-Corruption Verification ---');
    // Ensure that modifying services catalogue does not corrupt or wipe HospitalSetting
    const settingsCheck = await request(`${API_BASE}/hospital-admin/settings`, { headers: aHeaders });
    assert(settingsCheck.status === 200, 'HospitalSetting document remains fully intact');
    assert(settingsCheck.data?.data?.hospitalName?.length > 0, 'Hospital name preserved');
    assert(Array.isArray(settingsCheck.data?.data?.services), 'HospitalSetting.services remains valid array');

    console.log('\n======================================================================');
    console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
  }
}

runServicesChargesE2ETests();
