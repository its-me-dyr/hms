/**
 * Hospital Admin: Hospital Branding E2E Verification Suite
 */

const assert = require('assert');
const http = require('http');

const API_BASE = 'http://localhost:5000/api/v1';

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (_) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runBrandingSuite() {
  console.log('======================================================================');
  console.log('STARTING HOSPITAL ADMIN: BRANDING E2E VERIFICATION SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  const pass = (msg) => {
    console.log(`[PASS] ${msg}`);
    passed++;
  };

  try {
    const ts = Date.now().toString().slice(-5);

    // -----------------------------------------------------------------------
    // STEP 1: AUTHENTICATION (SUPER ADMIN & HOSPITAL ADMINS)
    // -----------------------------------------------------------------------
    console.log('--- Step 1: Authentication & Setup ---');

    const saLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: 'admin@hms.com',
      password: 'AdminPassword123!',
    });
    assert.strictEqual(saLogin.status, 200, 'Super Admin login failed');
    const saToken = saLogin.data.data.accessToken;
    const saHeaders = { Authorization: `Bearer ${saToken}` };
    pass('Super Admin logged in successfully');

    // Create Hospital A
    const hospAEmail = `admin.brand.a.${ts}@hms.org`;
    const createHospARes = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `Brand Hospital A ${ts}`,
        registrationNumber: `REG-BA-${ts}`,
        contactEmail: `contact.ba.${ts}@hms.org`,
        contactPhone: '+1 555-0101',
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
        firstName: 'Alice',
        lastName: 'Brand',
        email: hospAEmail,
        phone: '+1 555-0102',
        password: 'PasswordAlpha123!',
      },
    });
    assert.strictEqual(createHospARes.status, 201, 'Hospital A creation failed');
    pass('Hospital A created successfully');

    // Create Hospital B
    const hospBEmail = `admin.brand.b.${ts}@hms.org`;
    const createHospBRes = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `Brand Hospital B ${ts}`,
        registrationNumber: `REG-BB-${ts}`,
        contactEmail: `contact.bb.${ts}@hms.org`,
        contactPhone: '+1 555-0201',
        emergencyHotline: '911',
        street: '200 Beta Boulevard',
        city: 'Beta City',
        state: 'CA',
        postalCode: '90001',
        country: 'United States',
        currency: 'USD',
        timezone: 'America/Los_Angeles',
      },
      adminDetails: {
        firstName: 'Bob',
        lastName: 'Brand',
        email: hospBEmail,
        phone: '+1 555-0202',
        password: 'PasswordBeta123!',
      },
    });
    assert.strictEqual(createHospBRes.status, 201, 'Hospital B creation failed');
    pass('Hospital B created successfully');

    // Login Admin A
    const adminALogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospAEmail,
      password: 'PasswordAlpha123!',
    });
    assert.strictEqual(adminALogin.status, 200, 'Admin A login failed');
    const adminAToken = adminALogin.data.data.accessToken;
    pass('Hospital Admin A logged in successfully');

    // Login Admin B
    const adminBLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospBEmail,
      password: 'PasswordBeta123!',
    });
    assert.strictEqual(adminBLogin.status, 200, 'Admin B login failed');
    const adminBToken = adminBLogin.data.data.accessToken;
    pass('Hospital Admin B logged in successfully');

    // -----------------------------------------------------------------------
    // STEP 2: GET BRANDING
    // -----------------------------------------------------------------------
    console.log('\n--- Step 2: Retrieve Branding Data ---');

    const getRes = await request(`${API_BASE}/hospital-admin/branding`, {
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    assert.strictEqual(getRes.status, 200, 'GET /hospital-admin/branding returned non-200');
    pass('GET /hospital-admin/branding returned HTTP 200');

    const branding = getRes.data.data;
    assert.ok(branding, 'Branding object exists');
    assert.strictEqual(typeof branding.primaryColor, 'string', 'primaryColor is string');
    assert.strictEqual(typeof branding.accentColor, 'string', 'accentColor is string');
    assert.strictEqual(typeof branding.headerText, 'string', 'headerText is string');
    assert.strictEqual(typeof branding.footerText, 'string', 'footerText is string');
    assert.strictEqual(branding.hospitalName, `Brand Hospital A ${ts}`, 'hospitalName matches hospital settings');
    pass('All supported branding fields and hospital identity present in response');

    // -----------------------------------------------------------------------
    // STEP 3: VALIDATION ENFORCEMENT
    // -----------------------------------------------------------------------
    console.log('\n--- Step 3: Color & Text Validation ---');

    // Invalid Primary Color
    const badPrimary = await request(`${API_BASE}/hospital-admin/branding`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, { primaryColor: 'invalid-red' });
    assert.strictEqual(badPrimary.status, 400, 'Malformed primary color should return 400');
    pass('Malformed primary color correctly rejected with HTTP 400');

    // Invalid Accent Color
    const badAccent = await request(`${API_BASE}/hospital-admin/branding`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, { accentColor: '#12' });
    assert.strictEqual(badAccent.status, 400, 'Malformed accent color should return 400');
    pass('Malformed accent color correctly rejected with HTTP 400');

    // Header Text overflow (> 150 chars)
    const longHeader = await request(`${API_BASE}/hospital-admin/branding`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, { headerText: 'A'.repeat(160) });
    assert.strictEqual(longHeader.status, 400, 'Header text > 150 chars should return 400');
    pass('Header text exceeding 150 characters rejected with HTTP 400');

    // Footer Text overflow (> 250 chars)
    const longFooter = await request(`${API_BASE}/hospital-admin/branding`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, { footerText: 'B'.repeat(260) });
    assert.strictEqual(longFooter.status, 400, 'Footer text > 250 chars should return 400');
    pass('Footer text exceeding 250 characters rejected with HTTP 400');

    // HTML sanitization test
    const htmlHeaderUpdate = await request(`${API_BASE}/hospital-admin/branding`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, {
      headerText: '<script>alert("xss")</script>Branded Medical Wing',
      footerText: '<b>© 2026 Secured Center</b>',
    });
    assert.strictEqual(htmlHeaderUpdate.status, 200, 'Sanitization update returned 200');
    assert.ok(!htmlHeaderUpdate.data.data.headerText.includes('<script>'), 'HTML script stripped from header text');
    assert.ok(!htmlHeaderUpdate.data.data.footerText.includes('<b>'), 'HTML tags stripped from footer text');
    pass('HTML tags and potential script injections safely stripped from branding text');

    // -----------------------------------------------------------------------
    // STEP 4: VALID UPDATE & PERSISTENCE
    // -----------------------------------------------------------------------
    console.log('\n--- Step 4: Valid Update & MongoDB Persistence ---');

    const updatePayload = {
      logoUrl: 'https://hms-cdn.example.com/logos/hospital-a.png',
      faviconUrl: 'https://hms-cdn.example.com/icons/favicon-a.ico',
      primaryColor: '#0284C7',
      accentColor: '#1E293B',
      headerText: 'St. Alice Excellence Hospital',
      footerText: '© 2026 St. Alice Healthcare Group. All Rights Reserved.',
    };

    const updateRes = await request(`${API_BASE}/hospital-admin/branding`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, updatePayload);
    assert.strictEqual(updateRes.status, 200, 'PUT /hospital-admin/branding returned non-200');
    const updated = updateRes.data.data;
    assert.strictEqual(updated.logoUrl, updatePayload.logoUrl, 'logoUrl persisted');
    assert.strictEqual(updated.faviconUrl, updatePayload.faviconUrl, 'faviconUrl persisted');
    assert.strictEqual(updated.primaryColor, updatePayload.primaryColor, 'primaryColor persisted');
    assert.strictEqual(updated.accentColor, updatePayload.accentColor, 'accentColor persisted');
    assert.strictEqual(updated.headerText, updatePayload.headerText, 'headerText persisted');
    assert.strictEqual(updated.footerText, updatePayload.footerText, 'footerText persisted');
    pass('PUT /hospital-admin/branding successfully updated and returned new values');

    // Verify persistence via subsequent GET
    const verifyGet = await request(`${API_BASE}/hospital-admin/branding`, {
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    assert.strictEqual(verifyGet.status, 200, 'GET verification failed');
    assert.strictEqual(verifyGet.data.data.primaryColor, '#0284C7', 'primaryColor persisted in DB');
    assert.strictEqual(verifyGet.data.data.logoUrl, updatePayload.logoUrl, 'logoUrl persisted in DB');
    pass('Branding persistence verified via fresh GET request');

    // -----------------------------------------------------------------------
    // STEP 5: AUDIT LOG VERIFICATION
    // -----------------------------------------------------------------------
    console.log('\n--- Step 5: Audit Logging ---');

    const auditRes = await request(`${API_BASE}/hospital-admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    assert.strictEqual(auditRes.status, 200, 'GET /hospital-admin/audit-logs returned non-200');
    const logs = auditRes.data.data.logs || auditRes.data.data || [];
    const brandingLog = logs.find((l) => l.action === 'UPDATE_BRANDING');
    assert.ok(brandingLog, 'UPDATE_BRANDING event exists in audit log');
    assert.strictEqual(brandingLog.status, 'SUCCESS', 'Audit log status is SUCCESS');
    assert.strictEqual(brandingLog.module, 'admin', 'Audit log module is admin');
    pass('UPDATE_BRANDING audit event successfully logged in database');

    // -----------------------------------------------------------------------
    // STEP 6: TENANT ISOLATION
    // -----------------------------------------------------------------------
    console.log('\n--- Step 6: Multi-Tenant Hospital Isolation ---');

    const adminBBrandingRes = await request(`${API_BASE}/hospital-admin/branding`, {
      headers: { Authorization: `Bearer ${adminBToken}` },
    });
    assert.strictEqual(adminBBrandingRes.status, 200, 'Admin B GET branding failed');
    const bData = adminBBrandingRes.data.data;

    // Verify Admin B does NOT have Admin A's custom colors or texts
    assert.notStrictEqual(bData.primaryColor, '#0284C7', 'Hospital B primaryColor must not be affected by Hospital A');
    assert.notStrictEqual(bData.logoUrl, updatePayload.logoUrl, 'Hospital B logoUrl must not be affected by Hospital A');
    assert.strictEqual(bData.hospitalName, `Brand Hospital B ${ts}`, 'Hospital B has its own identity');
    pass('Multi-tenant isolation verified: Hospital B remains completely untouched');

    // -----------------------------------------------------------------------
    // STEP 7: SECURITY & RBAC CONSTRAINTS
    // -----------------------------------------------------------------------
    console.log('\n--- Step 7: Security & RBAC Constraints ---');

    // Unauthenticated
    const noAuth = await request(`${API_BASE}/hospital-admin/branding`, {
      method: 'PUT',
    }, { primaryColor: '#123456' });
    assert.strictEqual(noAuth.status, 401, 'Unauthenticated request should return 401');
    pass('Unauthenticated request rejected with HTTP 401');

    // Unauthorized role: Doctor provisioned under Hospital A
    const doctorProvision = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, {
      email: `doc_branding_${ts}@hms.com`,
      password: 'PasswordAlpha123!',
      firstName: 'Doctor',
      lastName: 'BrandTest',
      role: 'DOCTOR',
      phone: '+1 555-9988',
    });
    assert.strictEqual(doctorProvision.status, 201, 'Doctor provisioning failed');

    const doctorLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: `doc_branding_${ts}@hms.com`,
      password: 'PasswordAlpha123!',
    });
    assert.strictEqual(doctorLogin.status, 200, 'Doctor login failed');
    const doctorToken = doctorLogin.data.data.accessToken;

    const doctorBrandingAttempt = await request(`${API_BASE}/hospital-admin/branding`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${doctorToken}` },
    }, { primaryColor: '#FF0000' });
    assert.strictEqual(doctorBrandingAttempt.status, 403, 'Doctor should be rejected with HTTP 403');
    pass('Unauthorized role (Doctor) strictly blocked with HTTP 403');

    console.log('\n======================================================================');
    console.log(`VERIFICATION COMPLETE: ${passed} PASSED, 0 FAILED`);
    console.log('======================================================================\n');
  } catch (error) {
    console.error('\n[FAIL] Test suite encountered an error:', error);
    process.exit(1);
  }
}

runBrandingSuite();
