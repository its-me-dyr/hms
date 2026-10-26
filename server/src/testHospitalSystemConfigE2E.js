/**
 * Hospital Admin: System Configuration E2E Verification Suite
 * 
 * Verifies:
 * 1. Hospital Admin authentication and initial system configuration retrieval.
 * 2. Supported operational fields:
 *    - appointmentBufferMinutes
 *    - maxAppointmentsPerSlot
 *    - emergencyHotline / emergencyContactNumber
 *    - enableEmailNotifications
 *    - maintenanceMode
 * 3. Validation: rejects negative buffer, zero/negative slots, empty hotline.
 * 4. Synchronization: single source of truth for emergency hotline.
 * 5. Successful update and MongoDB persistence.
 * 6. AuditLog event UPDATE_SYSTEM_CONFIG generation.
 * 7. Multi-tenant isolation between Hospital A and Hospital B.
 * 8. Security & RBAC boundaries (401 unauthenticated, 403 unauthorized roles).
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

async function runSystemConfigSuite() {
  console.log('======================================================================');
  console.log('STARTING HOSPITAL ADMIN: SYSTEM CONFIGURATION E2E VERIFICATION SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  const pass = (msg) => {
    console.log(`[PASS] ${msg}`);
    passed++;
  };

  try {
    const ts = Date.now().toString().slice(-5);

    // -----------------------------------------------------------------------
    // STEP 1: AUTHENTICATION & SETUP
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
    const hospAEmail = `admin.syscfg.a.${ts}@hms.org`;
    const createHospARes = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `SysConfig Hospital A ${ts}`,
        registrationNumber: `REG-SCA-${ts}`,
        contactEmail: `contact.sca.${ts}@hms.org`,
        contactPhone: '+1 555-0301',
        emergencyHotline: '911 / 108',
        street: '100 System Drive',
        city: 'Metro City',
        state: 'NY',
        postalCode: '10001',
        country: 'United States',
        currency: 'USD',
        timezone: 'America/New_York',
      },
      adminDetails: {
        firstName: 'Sam',
        lastName: 'Admin',
        email: hospAEmail,
        phone: '+1 555-0302',
        password: 'PasswordSysCfg123!',
      },
    });
    assert.strictEqual(createHospARes.status, 201, 'Hospital A creation failed');
    pass('Hospital A created successfully');

    // Create Hospital B (for tenant isolation)
    const hospBEmail = `admin.syscfg.b.${ts}@hms.org`;
    const createHospBRes = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `SysConfig Hospital B ${ts}`,
        registrationNumber: `REG-SCB-${ts}`,
        contactEmail: `contact.scb.${ts}@hms.org`,
        contactPhone: '+1 555-0401',
        emergencyHotline: '911 / 108',
        street: '200 Isolation Way',
        city: 'Metro City',
        state: 'CA',
        postalCode: '90001',
        country: 'United States',
        currency: 'USD',
        timezone: 'America/Los_Angeles',
      },
      adminDetails: {
        firstName: 'Ben',
        lastName: 'Admin',
        email: hospBEmail,
        phone: '+1 555-0402',
        password: 'PasswordSysCfg123!',
      },
    });
    assert.strictEqual(createHospBRes.status, 201, 'Hospital B creation failed');
    pass('Hospital B created successfully');

    // Login Admin A
    const adminALogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospAEmail,
      password: 'PasswordSysCfg123!',
    });
    assert.strictEqual(adminALogin.status, 200, 'Admin A login failed');
    const adminAToken = adminALogin.data.data.accessToken;
    pass('Hospital Admin A logged in successfully');

    // Login Admin B
    const adminBLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospBEmail,
      password: 'PasswordSysCfg123!',
    });
    assert.strictEqual(adminBLogin.status, 200, 'Admin B login failed');
    const adminBToken = adminBLogin.data.data.accessToken;
    pass('Hospital Admin B logged in successfully');

    // -----------------------------------------------------------------------
    // STEP 2: GET SYSTEM CONFIGURATION
    // -----------------------------------------------------------------------
    console.log('\n--- Step 2: Retrieve System Configuration ---');

    const getRes = await request(`${API_BASE}/hospital-admin/system-config`, {
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    assert.strictEqual(getRes.status, 200, 'GET /hospital-admin/system-config returned non-200');
    pass('GET /hospital-admin/system-config returned HTTP 200');

    const cfg = getRes.data.data;
    assert.ok(cfg, 'Configuration object exists');
    assert.strictEqual(typeof cfg.appointmentBufferMinutes, 'number', 'appointmentBufferMinutes is number');
    assert.strictEqual(typeof cfg.maxAppointmentsPerSlot, 'number', 'maxAppointmentsPerSlot is number');
    assert.strictEqual(typeof cfg.enableEmailNotifications, 'boolean', 'enableEmailNotifications is boolean');
    assert.strictEqual(typeof cfg.maintenanceMode, 'boolean', 'maintenanceMode is boolean');
    assert.ok(cfg.emergencyHotline || cfg.emergencyContactNumber, 'emergencyHotline present');
    pass('All operational system configuration fields retrieved cleanly');

    // -----------------------------------------------------------------------
    // STEP 3: VALIDATION ENFORCEMENT
    // -----------------------------------------------------------------------
    console.log('\n--- Step 3: Input Validation ---');

    // Negative appointment buffer
    const badBuffer = await request(`${API_BASE}/hospital-admin/system-config`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, { appointmentBufferMinutes: -15 });
    assert.strictEqual(badBuffer.status, 400, 'Negative buffer should return 400');
    pass('Negative appointment buffer rejected with HTTP 400');

    // Buffer exceeds limit
    const hugeBuffer = await request(`${API_BASE}/hospital-admin/system-config`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, { appointmentBufferMinutes: 300 });
    assert.strictEqual(hugeBuffer.status, 400, 'Buffer > 240 mins should return 400');
    pass('Appointment buffer exceeding 240 minutes rejected with HTTP 400');

    // Zero max appointments per slot
    const zeroSlot = await request(`${API_BASE}/hospital-admin/system-config`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, { maxAppointmentsPerSlot: 0 });
    assert.strictEqual(zeroSlot.status, 400, 'Zero max slot should return 400');
    pass('Zero appointments per slot rejected with HTTP 400');

    // Negative max appointments per slot
    const negSlot = await request(`${API_BASE}/hospital-admin/system-config`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, { maxAppointmentsPerSlot: -2 });
    assert.strictEqual(negSlot.status, 400, 'Negative slot should return 400');
    pass('Negative appointments per slot rejected with HTTP 400');

    // Empty emergency hotline
    const emptyHotline = await request(`${API_BASE}/hospital-admin/system-config`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, { emergencyHotline: '   ' });
    assert.strictEqual(emptyHotline.status, 400, 'Empty emergency hotline should return 400');
    pass('Empty emergency hotline rejected with HTTP 400');

    // -----------------------------------------------------------------------
    // STEP 4: VALID UPDATE & PERSISTENCE
    // -----------------------------------------------------------------------
    console.log('\n--- Step 4: Valid Update & MongoDB Persistence ---');

    const updatePayload = {
      appointmentBufferMinutes: 25,
      maxAppointmentsPerSlot: 4,
      emergencyHotline: '+1 (800) 555-7777',
      enableEmailNotifications: false,
      maintenanceMode: true,
    };

    const updateRes = await request(`${API_BASE}/hospital-admin/system-config`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, updatePayload);
    assert.strictEqual(updateRes.status, 200, 'PUT /hospital-admin/system-config returned non-200');
    const updated = updateRes.data.data;
    assert.strictEqual(updated.appointmentBufferMinutes, 25, 'appointmentBufferMinutes updated');
    assert.strictEqual(updated.maxAppointmentsPerSlot, 4, 'maxAppointmentsPerSlot updated');
    assert.strictEqual(updated.emergencyHotline, '+1 (800) 555-7777', 'emergencyHotline updated');
    assert.strictEqual(updated.enableEmailNotifications, false, 'enableEmailNotifications updated');
    assert.strictEqual(updated.maintenanceMode, true, 'maintenanceMode updated');
    pass('PUT /hospital-admin/system-config successfully updated configuration');

    // Verify persistence via subsequent GET
    const verifyGet = await request(`${API_BASE}/hospital-admin/system-config`, {
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    assert.strictEqual(verifyGet.status, 200, 'GET verification failed');
    assert.strictEqual(verifyGet.data.data.appointmentBufferMinutes, 25, 'appointmentBufferMinutes persisted in DB');
    assert.strictEqual(verifyGet.data.data.maxAppointmentsPerSlot, 4, 'maxAppointmentsPerSlot persisted in DB');
    assert.strictEqual(verifyGet.data.data.emergencyHotline, '+1 (800) 555-7777', 'emergencyHotline persisted in DB');
    assert.strictEqual(verifyGet.data.data.maintenanceMode, true, 'maintenanceMode persisted in DB');
    pass('System configuration persistence verified via fresh GET request');

    // -----------------------------------------------------------------------
    // STEP 5: SYNCHRONIZATION WITH HOSPITAL SETTINGS
    // -----------------------------------------------------------------------
    console.log('\n--- Step 5: Hotline Synchronization ---');

    const hospSettingsRes = await request(`${API_BASE}/hospital-admin/settings`, {
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    assert.strictEqual(hospSettingsRes.status, 200, 'GET /hospital-admin/settings failed');
    assert.strictEqual(
      hospSettingsRes.data.data.emergencyHotline,
      '+1 (800) 555-7777',
      'Hospital settings emergencyHotline synchronized with system config'
    );
    pass('Single authoritative emergency hotline synchronized across modules');

    // -----------------------------------------------------------------------
    // STEP 6: AUDIT LOG VERIFICATION
    // -----------------------------------------------------------------------
    console.log('\n--- Step 6: Audit Logging ---');

    const auditRes = await request(`${API_BASE}/hospital-admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminAToken}` },
    });
    assert.strictEqual(auditRes.status, 200, 'GET /hospital-admin/audit-logs returned non-200');
    const logs = auditRes.data.data.logs || auditRes.data.data || [];
    const configLog = logs.find((l) => l.action === 'UPDATE_SYSTEM_CONFIG');
    assert.ok(configLog, 'UPDATE_SYSTEM_CONFIG event exists in audit log');
    assert.strictEqual(configLog.status, 'SUCCESS', 'Audit log status is SUCCESS');
    assert.strictEqual(configLog.module, 'admin', 'Audit log module is admin');
    pass('UPDATE_SYSTEM_CONFIG audit event successfully logged in database');

    // -----------------------------------------------------------------------
    // STEP 7: MULTI-TENANT HOSPITAL ISOLATION
    // -----------------------------------------------------------------------
    console.log('\n--- Step 7: Multi-Tenant Hospital Isolation ---');

    const adminBConfigRes = await request(`${API_BASE}/hospital-admin/system-config`, {
      headers: { Authorization: `Bearer ${adminBToken}` },
    });
    assert.strictEqual(adminBConfigRes.status, 200, 'Admin B GET system-config failed');
    const bCfg = adminBConfigRes.data.data;

    // Verify Hospital B has NOT inherited Hospital A's buffer or maintenance mode
    assert.notStrictEqual(bCfg.appointmentBufferMinutes, 25, 'Hospital B buffer must not be affected by Hospital A');
    assert.strictEqual(bCfg.maintenanceMode, false, 'Hospital B maintenance mode remains untouched (false)');
    pass('Multi-tenant isolation verified: Hospital B configuration remains completely untouched');

    // -----------------------------------------------------------------------
    // STEP 8: SECURITY & RBAC CONSTRAINTS
    // -----------------------------------------------------------------------
    console.log('\n--- Step 8: Security & RBAC Constraints ---');

    // Unauthenticated
    const noAuth = await request(`${API_BASE}/hospital-admin/system-config`, {
      method: 'PUT',
    }, { appointmentBufferMinutes: 10 });
    assert.strictEqual(noAuth.status, 401, 'Unauthenticated request should return 401');
    pass('Unauthenticated request rejected with HTTP 401');

    // Unauthorized role (Doctor)
    const doctorProvision = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAToken}` },
    }, {
      email: `doc_syscfg_${ts}@hms.com`,
      password: 'PasswordSysCfg123!',
      firstName: 'Doctor',
      lastName: 'SysCfgTest',
      role: 'DOCTOR',
      phone: '+1 555-9922',
    });
    assert.strictEqual(doctorProvision.status, 201, 'Doctor provisioning failed');

    const doctorLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: `doc_syscfg_${ts}@hms.com`,
      password: 'PasswordSysCfg123!',
    });
    assert.strictEqual(doctorLogin.status, 200, 'Doctor login failed');
    const doctorToken = doctorLogin.data.data.accessToken;

    const doctorConfigAttempt = await request(`${API_BASE}/hospital-admin/system-config`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${doctorToken}` },
    }, { appointmentBufferMinutes: 5 });
    assert.strictEqual(doctorConfigAttempt.status, 403, 'Doctor should be rejected with HTTP 403');
    pass('Unauthorized role (Doctor) strictly blocked with HTTP 403');

    console.log('\n======================================================================');
    console.log(`VERIFICATION COMPLETE: ${passed} PASSED, 0 FAILED`);
    console.log('======================================================================\n');
  } catch (error) {
    console.error('\n[FAIL] Test suite encountered an error:', error);
    process.exit(1);
  }
}

runSystemConfigSuite();
