/**
 * Hospital Admin: Administrative Reports E2E Verification Suite
 * 
 * Tests:
 * 1. Super Admin setup & provisioning of Hospital A and Hospital B
 * 2. Hospital Admin A authentication
 * 3. GET /api/v1/hospital-admin/reports endpoint response structure
 * 4. Clinical Performance aggregation (Total, Completed, Cancelled, Completion Rate)
 * 5. Financial Summary aggregation (Total Invoices, Paid Invoices, Collected Revenue, Collection Rate, Currency)
 * 6. Zero/Empty State calculations (completionRate and collectionRate strictly 0% when total is 0)
 * 7. Departmental Workload & Staffing aggregation (Total Staff, Doctors, Other Staff, Workload)
 * 8. Real record creation & aggregated updates
 * 9. Multi-tenant Hospital Isolation (Admin B cannot see Hospital A data)
 * 10. Security & RBAC constraints (401 unauth, 403 unauthorized role)
 * 11. No sensitive credentials or secrets exposed in report payload
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
  console.log('STARTING HOSPITAL ADMIN: ADMINISTRATIVE REPORTS E2E VERIFICATION SUITE');
  console.log('======================================================================\n');

  try {
    const ts = Date.now().toString().slice(-5);

    // ─── STEP 1: AUTHENTICATION & PROVISIONING ───────────────────────
    console.log('--- Step 1: Authentication & Setup ---');
    const saLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: 'admin@hms.com',
      password: 'AdminPassword123!',
    });
    assert(saLogin.status === 200, 'Super Admin logged in successfully');
    const saToken = saLogin.data?.data?.accessToken;
    const saHeaders = { Authorization: `Bearer ${saToken}` };

    // Provision Hospital A
    const hospAEmail = `admin.repa.${ts}@hms.org`;
    const createHospARes = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `Alpha Reports Medical Center ${ts}`,
        registrationNumber: `REP-A-${ts}`,
        contactEmail: hospAEmail,
        contactPhone: '+1 (800) 555-7701',
        emergencyHotline: '+1 (800) 555-9911',
        street: '100 Alpha Boulevard',
        city: 'Alpha City',
        state: 'NY',
        postalCode: '10001',
        country: 'United States',
        currency: 'USD',
        currencySymbol: '$',
        timezone: 'America/New_York',
      },
      adminDetails: {
        firstName: 'Arthur',
        lastName: 'Reports',
        email: hospAEmail,
        phone: '+1 (800) 555-7702',
        password: 'AdminPassword123!',
      },
    });
    assert(createHospARes.status === 201, 'Hospital A provisioned successfully');
    const hospAId = createHospARes.data?.data?.hospital?.id;

    // Provision Hospital B (Isolation Target)
    const hospBEmail = `admin.repb.${ts}@hms.org`;
    const createHospBRes = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `Beta Reports General ${ts}`,
        registrationNumber: `REP-B-${ts}`,
        contactEmail: hospBEmail,
        contactPhone: '+1 (800) 555-8801',
        emergencyHotline: '+1 (800) 555-9922',
        street: '200 Beta Avenue',
        city: 'Beta City',
        state: 'IL',
        postalCode: '60007',
        country: 'United States',
        currency: 'EUR',
        currencySymbol: '€',
        timezone: 'America/Chicago',
      },
      adminDetails: {
        firstName: 'Beatrice',
        lastName: 'Reports',
        email: hospBEmail,
        phone: '+1 (800) 555-8802',
        password: 'AdminPassword123!',
      },
    });
    assert(createHospBRes.status === 201, 'Hospital B provisioned successfully');
    const hospBId = createHospBRes.data?.data?.hospital?.id;

    // Login as Admin A
    const adminALogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospAEmail,
      password: 'AdminPassword123!',
    });
    assert(adminALogin.status === 200, 'Hospital Admin A logged in successfully');
    const tokenA = adminALogin.data?.data?.accessToken;
    const headersA = { Authorization: `Bearer ${tokenA}` };

    // Login as Admin B
    const adminBLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospBEmail,
      password: 'AdminPassword123!',
    });
    assert(adminBLogin.status === 200, 'Hospital Admin B logged in successfully');
    const tokenB = adminBLogin.data?.data?.accessToken;
    const headersB = { Authorization: `Bearer ${tokenB}` };

    // ─── STEP 2: RETRIEVE ADMINISTRATIVE REPORTS ─────────────────────
    console.log('\n--- Step 2: Retrieve Administrative Reports ---');
    const repRes = await request(`${API_BASE}/hospital-admin/reports`, {
      method: 'GET',
      headers: headersA,
    });
    assert(repRes.status === 200, 'GET /hospital-admin/reports returned HTTP 200');
    assert(repRes.data?.success === true, 'Response indicates success: true');
    const repData = repRes.data?.data;
    assert(Boolean(repData), 'Report data object present in response');

    // ─── STEP 3: CLINICAL PERFORMANCE VERIFICATION ───────────────────
    console.log('\n--- Step 3: Clinical Performance Metrics ---');
    const clinical = repData.clinicalMetrics;
    assert(clinical !== undefined, 'clinicalMetrics object present');
    assert(typeof (clinical.totalConsultations ?? clinical.totalAppointments) === 'number', 'Total consultations is a valid number');
    assert(typeof (clinical.completed ?? clinical.completedAppointments) === 'number', 'Completed consultations is a valid number');
    assert(typeof (clinical.cancelled ?? clinical.cancelledAppointments) === 'number', 'Cancelled consultations is a valid number');
    assert(typeof clinical.completionRate === 'number', 'Completion rate is a valid number');
    // On fresh hospital with 0 records, completionRate must be 0% (not fake 100%)
    if ((clinical.totalConsultations ?? clinical.totalAppointments) === 0) {
      assert(clinical.completionRate === 0, 'Completion rate is cleanly 0% when no records exist');
    }

    // ─── STEP 4: FINANCIAL SUMMARY VERIFICATION ──────────────────────
    console.log('\n--- Step 4: Financial Summary Metrics ---');
    const financial = repData.financialMetrics;
    assert(financial !== undefined, 'financialMetrics object present');
    assert(typeof (financial.totalInvoices ?? financial.totalBills) === 'number', 'Total invoices is a valid number');
    assert(typeof (financial.paidInvoices ?? financial.paidBills) === 'number', 'Paid invoices is a valid number');
    assert(typeof (financial.collectedRevenue ?? financial.totalRevenue) === 'number', 'Collected revenue is a valid number');
    assert(typeof financial.collectionRate === 'number', 'Collection rate is a valid number');
    assert(repData.currency === 'USD', 'Currency correctly reflects Hospital A setting (USD)');
    assert(repData.currencySymbol === '$', 'Currency symbol correctly reflects Hospital A setting ($)');
    if ((financial.totalInvoices ?? financial.totalBills) === 0) {
      assert(financial.collectionRate === 0, 'Collection rate is cleanly 0% when no invoices exist');
    }

    // ─── STEP 5: DEPARTMENTAL WORKLOAD & STAFFING ────────────────────
    console.log('\n--- Step 5: Departmental Workload & Staffing ---');
    assert(Array.isArray(repData.departmentAnalytics), 'departmentAnalytics returned as array');

    // Add a department in Hospital A to verify departmental aggregation
    const deptRes = await request(`${API_BASE}/hospital-admin/departments`, {
      method: 'POST',
      headers: headersA,
    }, {
      name: `Cardiology ${ts}`,
      code: `CARD-${ts}`,
      capacity: 30,
      description: 'Department of Cardiovascular Medicine',
    });
    assert(deptRes.status === 201, 'Created Cardiology department in Hospital A');

    // Add a Doctor in Hospital A in Cardiology
    const docRes = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: headersA,
    }, {
      firstName: 'Dr. Gregory',
      lastName: `House ${ts}`,
      email: `house.${ts}@hms.org`,
      phone: '+1 (800) 555-4321',
      role: 'DOCTOR',
      department: `Cardiology ${ts}`,
      specialization: 'Cardiology',
      password: 'DoctorPassword123!',
    });
    assert(docRes.status === 201, 'Provisioned Doctor in Cardiology in Hospital A');

    // Re-fetch reports to verify departmental staffing breakdown
    const repAfterDept = await request(`${API_BASE}/hospital-admin/reports`, {
      method: 'GET',
      headers: headersA,
    });
    assert(repAfterDept.status === 200, 'Refetched reports after department and doctor creation');
    const cardDept = repAfterDept.data?.data?.departmentAnalytics?.find(
      (d) => d.name === `Cardiology ${ts}`
    );
    assert(Boolean(cardDept), 'Cardiology department listed in departmentAnalytics');
    assert(cardDept?.doctorCount === 1, 'Cardiology doctor count accurately equals 1');
    assert(cardDept?.staffCount === 1, 'Cardiology total staff count accurately equals 1');
    assert(cardDept?.otherStaffCount === 0, 'Cardiology other staff count accurately equals 0');

    // ─── STEP 6: MULTI-TENANT HOSPITAL ISOLATION ─────────────────────
    console.log('\n--- Step 6: Multi-Tenant Hospital Isolation ---');
    const repBRes = await request(`${API_BASE}/hospital-admin/reports`, {
      method: 'GET',
      headers: headersB,
    });
    assert(repBRes.status === 200, 'GET /hospital-admin/reports for Hospital B returned HTTP 200');
    assert(repBRes.data?.data?.currency === 'EUR', 'Hospital B currency correctly reflects EUR');
    assert(repBRes.data?.data?.currencySymbol === '€', 'Hospital B currency symbol correctly reflects €');
    const hospBHasCard = repBRes.data?.data?.departmentAnalytics?.some(
      (d) => d.name === `Cardiology ${ts}`
    );
    assert(!hospBHasCard, 'Hospital B report is strictly isolated: does NOT show Hospital A department');

    // ─── STEP 7: SECURITY & RBAC CONSTRAINTS ─────────────────────────
    console.log('\n--- Step 7: Security & RBAC Constraints ---');
    // Unauthenticated request
    const unauthRes = await request(`${API_BASE}/hospital-admin/reports`, { method: 'GET' });
    assert(unauthRes.status === 401, 'Unauthenticated request rejected with HTTP 401');

    // Unauthorized role (Doctor)
    const docLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: `house.${ts}@hms.org`,
      password: 'DoctorPassword123!',
    });
    const docToken = docLogin.data?.data?.accessToken;
    const docHeaders = { Authorization: `Bearer ${docToken}` };

    const docRepRes = await request(`${API_BASE}/hospital-admin/reports`, {
      method: 'GET',
      headers: docHeaders,
    });
    assert(docRepRes.status === 403, 'Unauthorized Doctor role strictly rejected with HTTP 403');

    // Security check: No credentials, passwords, or tokens in report payload
    const serialized = JSON.stringify(repData);
    assert(!serialized.includes('password'), 'Report payload contains no password fields');
    assert(!serialized.includes('accessToken'), 'Report payload contains no JWT tokens');
    assert(!serialized.includes('refreshToken'), 'Report payload contains no refresh tokens');

  } catch (err) {
    console.error('Unexpected error during verification suite:', err);
    failed++;
  }

  console.log('\n======================================================================');
  console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
