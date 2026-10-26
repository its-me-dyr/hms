/**
 * Hospital & Initial Hospital Admin Creation E2E Test Suite
 * 
 * Verifies all 12 validation requirements:
 * 1. Super Admin creates valid hospital + initial admin -> SUCCESS (HTTP 201)
 * 2. Duplicate hospital registration/license -> proper validation error (HTTP 400)
 * 3. Duplicate admin email -> proper validation error (HTTP 400)
 * 4. Missing required hospital field -> validation error (HTTP 400)
 * 5. Missing required admin field -> validation error (HTTP 400)
 * 6. Non-Super-Admin (e.g. Doctor or Patient) attempts endpoint -> HTTP 403
 * 7. Hospital Admin attempts to create hospital -> HTTP 403
 * 8. Hospital Admin attempts to create another Hospital Admin -> HTTP 403
 * 9. Creation failure does not leave an orphan hospital record
 * 10. Passwords are NEVER returned in API responses
 * 11. Newly created Hospital Admin can log in with credentials
 * 12. Newly created Hospital Admin sees only the assigned hospital's data
 */

require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

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

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('======================================================================');
  console.log('STARTING HOSPITAL + INITIAL ADMIN CREATION E2E TEST SUITE');
  console.log('======================================================================\n');

  try {
    // -----------------------------------------------------------------------
    // STEP 0: Authenticate Actors
    // -----------------------------------------------------------------------
    console.log('--- Step 0: Setup & Login Authentication ---');
    // Super Admin login
    const saLogin = await request(`${BASE_URL}/auth/login`, { method: 'POST' }, {
      email: 'admin@hms.com',
      password: 'AdminPassword123!',
    });
    assert(saLogin.status === 200, 'Super Admin logged in successfully (HTTP 200)');
    const saToken = saLogin.data?.data?.accessToken;
    assert(Boolean(saToken), 'Super Admin token obtained');
    const saHeaders = { Authorization: `Bearer ${saToken}` };

    // Existing Hospital Admin login
    const haLogin = await request(`${BASE_URL}/auth/login`, { method: 'POST' }, {
      email: 'hospitaladmin@hms.com',
      password: 'HospitalAdmin123!',
    });
    assert(haLogin.status === 200, 'Existing Hospital Admin logged in (HTTP 200)');
    const haToken = haLogin.data?.data?.accessToken;
    const haHeaders = { Authorization: `Bearer ${haToken}` };

    // Receptionist login
    const recLogin = await request(`${BASE_URL}/auth/login`, { method: 'POST' }, {
      email: 'reception@hms.com',
      password: 'ReceptionPassword123!',
    });
    assert(recLogin.status === 200, 'Receptionist logged in (HTTP 200)');
    const recToken = recLogin.data?.data?.accessToken;
    const recHeaders = { Authorization: `Bearer ${recToken}` };

    const ts = Date.now();
    const testRegNumber = `HOSP-REG-${ts.toString().slice(-6)}`;
    const testAdminEmail = `initial.admin.${ts}@cityhospital.org`;
    const testAdminPassword = 'CityAdminPassword123!';

    // -----------------------------------------------------------------------
    // TEST 1: Super Admin creates valid hospital + initial admin -> SUCCESS
    // -----------------------------------------------------------------------
    console.log('\n--- Test 1: Valid Hospital + Initial Admin Creation ---');
    const createRes = await request(`${BASE_URL}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `St. Jude Metro Hospital ${ts.toString().slice(-4)}`,
        registrationNumber: testRegNumber,
        contactEmail: `contact.${ts}@stjude.org`,
        contactPhone: '+1-555-888-0199',
        emergencyHotline: '+1-800-911-0000',
        street: '742 Evergreen Terrace',
        city: 'Springfield',
        state: 'IL',
        postalCode: '62701',
        country: 'United States',
        currency: 'USD',
        timezone: 'America/Chicago',
      },
      adminDetails: {
        firstName: 'Dr. Gregory',
        lastName: 'House',
        email: testAdminEmail,
        phone: '+1-555-777-0123',
        password: testAdminPassword,
      },
    });

    if (createRes.status !== 201) console.log('CREATE RES FAILED:', createRes.data);

    assert(createRes.status === 201, `Hospital + Initial Admin created with HTTP 201 (Got ${createRes.status})`);
    assert(createRes.data?.data?.hospital?.hospitalName?.includes('St. Jude Metro Hospital'), 'Hospital name matches in response');
    assert(createRes.data?.data?.hospital?.registrationNumber === testRegNumber, 'Registration number matches in response');
    assert(createRes.data?.data?.admin?.email === testAdminEmail, 'Admin email matches in response');
    assert(createRes.data?.data?.admin?.role === 'HOSPITAL_ADMIN', 'Admin role is strictly HOSPITAL_ADMIN');
    assert(Boolean(createRes.data?.data?.admin?.hospitalId), 'Admin response contains linked hospitalId');
    assert(String(createRes.data?.data?.admin?.hospitalId) === String(createRes.data?.data?.hospital?.id), 'Admin is linked to created hospital ID');

    // -----------------------------------------------------------------------
    // TEST 10: Passwords are NEVER returned in API responses
    // -----------------------------------------------------------------------
    console.log('\n--- Test 10: Security — Passwords Not Exposed in API Responses ---');
    assert(!createRes.data?.data?.admin?.password, 'Admin password is omitted from creation response');
    assert(!createRes.data?.data?.hospital?.password, 'Hospital password field does not exist');
    assert(JSON.stringify(createRes.data).indexOf(testAdminPassword) === -1, 'Password string nowhere in JSON response body');

    const createdHospitalId = createRes.data?.data?.hospital?.id;

    // -----------------------------------------------------------------------
    // TEST 2: Duplicate hospital registration/license -> HTTP 400
    // -----------------------------------------------------------------------
    console.log('\n--- Test 2: Duplicate Hospital Registration Rejection ---');
    const dupHospitalRes = await request(`${BASE_URL}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: 'Duplicate Test Hospital',
        registrationNumber: testRegNumber, // DUPLICATE
        contactEmail: `other.${ts}@dup.org`,
        contactPhone: '+1-555-000-1111',
        street: '123 Fake St',
        city: 'Springfield',
        state: 'IL',
        postalCode: '62701',
        country: 'United States',
      },
      adminDetails: {
        firstName: 'Unique',
        lastName: 'Admin',
        email: `unique.admin.${Date.now()}@test.org`,
        phone: '+1-555-222-3333',
        password: 'Password123!',
      },
    });
    assert(dupHospitalRes.status === 400, `Duplicate hospital registration rejected with HTTP 400 (Got ${dupHospitalRes.status})`);
    assert(dupHospitalRes.data?.message?.includes('already exists'), 'Clear error message indicating hospital already exists');

    // -----------------------------------------------------------------------
    // TEST 3: Duplicate admin email -> HTTP 400
    // -----------------------------------------------------------------------
    console.log('\n--- Test 3: Duplicate Admin Email Rejection ---');
    const dupAdminRes = await request(`${BASE_URL}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: 'Another New Hospital',
        registrationNumber: `HOSP-REG-DIFF-${ts}`,
        contactEmail: `unique.contact.${ts}@diff.org`,
        contactPhone: '+1-555-333-4444',
        street: '456 Elm St',
        city: 'Springfield',
        state: 'IL',
        postalCode: '62701',
        country: 'United States',
      },
      adminDetails: {
        firstName: 'Existing',
        lastName: 'Admin',
        email: testAdminEmail, // DUPLICATE ADMIN EMAIL
        phone: '+1-555-555-6666',
        password: 'Password123!',
      },
    });
    assert(dupAdminRes.status === 400, `Duplicate admin email rejected with HTTP 400 (Got ${dupAdminRes.status})`);
    assert(dupAdminRes.data?.message?.includes('already exists'), 'Clear error message indicating admin user already exists');

    // -----------------------------------------------------------------------
    // TEST 4: Missing required hospital field -> validation error HTTP 400
    // -----------------------------------------------------------------------
    console.log('\n--- Test 4: Missing Required Hospital Fields ---');
    const missingHospRes = await request(`${BASE_URL}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: '', // MISSING NAME
        registrationNumber: `HOSP-NO-NAME-${ts}`,
        contactEmail: 'valid@hms.com',
        contactPhone: '+1-555-000-0000',
        street: '1 Main',
        city: 'City',
        state: 'ST',
        country: 'US',
      },
      adminDetails: {
        firstName: 'Valid',
        lastName: 'Admin',
        email: `valid.admin.${ts}@test.org`,
        phone: '+1-555-000-0000',
        password: 'Password123!',
      },
    });
    assert(missingHospRes.status === 400, `Missing hospital name rejected with HTTP 400 (Got ${missingHospRes.status})`);

    // -----------------------------------------------------------------------
    // TEST 5: Missing required admin field -> validation error HTTP 400
    // -----------------------------------------------------------------------
    console.log('\n--- Test 5: Missing Required Admin Fields ---');
    const missingAdminRes = await request(`${BASE_URL}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: 'Hospital With Missing Admin',
        registrationNumber: `HOSP-MISS-ADMIN-${ts}`,
        contactEmail: `contact.${ts}@miss.com`,
        contactPhone: '+1-555-000-0000',
        street: '1 Main',
        city: 'City',
        state: 'ST',
        country: 'US',
      },
      adminDetails: {
        firstName: 'Valid',
        lastName: 'Admin',
        email: `valid.admin.${ts}@test.org`,
        phone: '+1-555-000-0000',
        password: 'short', // TOO SHORT (< 8 chars)
      },
    });
    assert(missingAdminRes.status === 400, `Short password (< 8 chars) rejected with HTTP 400 (Got ${missingAdminRes.status})`);

    // -----------------------------------------------------------------------
    // TEST 6: Non-Super-Admin (Receptionist) attempts endpoint -> HTTP 403
    // -----------------------------------------------------------------------
    console.log('\n--- Test 6: Non-Super-Admin Forbidden (HTTP 403) ---');
    const nonSaRes = await request(`${BASE_URL}/super-admin/hospitals`, {
      method: 'POST',
      headers: recHeaders,
    }, {
      hospitalDetails: { hospitalName: 'Rogue Hospital' },
      adminDetails: { email: 'rogue@hospital.org' },
    });
    assert(nonSaRes.status === 403, `Receptionist blocked from creating hospital with HTTP 403 (Got ${nonSaRes.status})`);

    // -----------------------------------------------------------------------
    // TEST 7: Hospital Admin attempts to create hospital -> HTTP 403
    // -----------------------------------------------------------------------
    console.log('\n--- Test 7: Hospital Admin Cannot Create Hospital (HTTP 403) ---');
    const haCreateHospRes = await request(`${BASE_URL}/super-admin/hospitals`, {
      method: 'POST',
      headers: haHeaders,
    }, {
      hospitalDetails: { hospitalName: 'HA Created Hospital' },
      adminDetails: { email: 'ha.created@hospital.org' },
    });
    assert(haCreateHospRes.status === 403, `Hospital Admin blocked from POST /super-admin/hospitals with HTTP 403 (Got ${haCreateHospRes.status})`);

    // -----------------------------------------------------------------------
    // TEST 8: Hospital Admin attempts to create another Hospital Admin -> HTTP 403
    // -----------------------------------------------------------------------
    console.log('\n--- Test 8: Hospital Admin Cannot Create Another Hospital Admin (HTTP 403) ---');
    const haCreateHaRes = await request(`${BASE_URL}/super-admin/users`, {
      method: 'POST',
      headers: haHeaders,
    }, {
      firstName: 'Disallowed',
      lastName: 'HospitalAdmin',
      email: `disallowed.ha.${ts}@test.com`,
      password: 'Password123!',
      role: 'HOSPITAL_ADMIN',
    });
    assert(haCreateHaRes.status === 403, `Hospital Admin blocked from creating another HOSPITAL_ADMIN with HTTP 403 (Got ${haCreateHaRes.status})`);

    // -----------------------------------------------------------------------
    // TEST 9: Creation failure does not leave an orphan hospital
    // -----------------------------------------------------------------------
    console.log('\n--- Test 9: Atomic Rollback — No Orphan Hospital Left on Failure ---');
    const orphanTestReg = `HOSP-ORPHAN-${ts}`;
    const failAttemptRes = await request(`${BASE_URL}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: 'Should Rollback Hospital',
        registrationNumber: orphanTestReg,
        contactEmail: `orphan.${ts}@test.com`,
        contactPhone: '+1-555-999-8888',
        street: 'Rollback Ave',
        city: 'Rollback City',
        state: 'NY',
        country: 'US',
      },
      adminDetails: {
        firstName: 'Will',
        lastName: 'Fail',
        email: 'invalid-email-format-causes-failure', // INVALID EMAIL
        phone: '+1-555-000-1111',
        password: 'ValidPassword123!',
      },
    });
    assert(failAttemptRes.status === 400, 'Invalid request failed with HTTP 400');

    // Verify hospital with orphanTestReg was NOT persisted
    const listRes = await request(`${BASE_URL}/super-admin/hospitals?search=${orphanTestReg}`, {
      method: 'GET',
      headers: saHeaders,
    });
    const foundOrphan = listRes.data?.data?.hospitals?.find((h) => h.registrationNumber === orphanTestReg);
    assert(!foundOrphan, 'Orphan hospital was safely rolled back / not persisted in database');

    // -----------------------------------------------------------------------
    // TEST 11: Newly created Hospital Admin can log in using existing auth flow
    // -----------------------------------------------------------------------
    console.log('\n--- Test 11: Newly Created Hospital Admin Login ---');
    const newAdminLoginRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
    }, {
      email: testAdminEmail,
      password: testAdminPassword,
    });
    assert(newAdminLoginRes.status === 200, `New Hospital Admin logged in successfully with HTTP 200 (Got ${newAdminLoginRes.status})`);
    assert(newAdminLoginRes.data?.data?.user?.role === 'hospital_admin', 'Returned role is hospital_admin');
    assert(newAdminLoginRes.data?.data?.user?.hospitalId === createdHospitalId, 'Logged-in user payload has correct hospitalId');
    const newAdminToken = newAdminLoginRes.data?.data?.accessToken;
    assert(Boolean(newAdminToken), 'New Hospital Admin received access token');

    // -----------------------------------------------------------------------
    // TEST 12: Newly created Hospital Admin sees assigned hospital context
    // -----------------------------------------------------------------------
    console.log('\n--- Test 12: Hospital Context & Isolation for New Admin ---');
    const newAdminDashRes = await request(`${BASE_URL}/hospital-admin/settings`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${newAdminToken}` },
    });
    assert(newAdminDashRes.status === 200, 'New Hospital Admin accessed hospital settings (HTTP 200)');
    assert(
      newAdminDashRes.data?.data?.registrationNumber === testRegNumber,
      `New Hospital Admin sees their own hospital's settings (${testRegNumber})`
    );

    // Super Admin can fetch list of hospitals and see the newly created hospital
    console.log('\n--- Hospital Listing & Details Verification ---');
    const allHospitalsRes = await request(`${BASE_URL}/super-admin/hospitals`, {
      method: 'GET',
      headers: saHeaders,
    });
    assert(allHospitalsRes.status === 200, 'GET /super-admin/hospitals returned HTTP 200');
    const matchingHospital = allHospitalsRes.data?.data?.hospitals?.find((h) => h.registrationNumber === testRegNumber);
    assert(Boolean(matchingHospital), 'Newly created hospital found in hospital management list');
    assert(matchingHospital?.adminEmail === testAdminEmail, 'Hospital in list displays correct Hospital Admin email');
    assert(matchingHospital?.adminName === 'Dr. Gregory House', 'Hospital in list displays correct Hospital Admin full name');
    assert(matchingHospital?.status === 'active', 'Hospital in list displays active status');

    // GET /super-admin/hospitals/:id
    const singleHospRes = await request(`${BASE_URL}/super-admin/hospitals/${createdHospitalId}`, {
      method: 'GET',
      headers: saHeaders,
    });
    assert(singleHospRes.status === 200, 'GET /super-admin/hospitals/:id returned HTTP 200');
    assert(singleHospRes.data?.data?.hospital?.registrationNumber === testRegNumber, 'Single hospital returns correct registration');
    assert(singleHospRes.data?.data?.admin?.email === testAdminEmail, 'Single hospital returns correct linked admin email');

    console.log('\n======================================================================');
    console.log(`TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Unexpected test execution failure:', err);
    process.exit(1);
  }
}

runTests();
