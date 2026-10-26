const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

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

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runAuditLogsE2ETests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING HOSPITAL ADMIN AUDIT LOGS E2E TEST SUITE');
  console.log('======================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hms');
  const AuditLog = mongoose.model('AuditLog', require('./models/AuditLog').schema);

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err.message || err);
      failed++;
    }
  };

  const ts = Date.now().toString().slice(-5);
  let saToken = '';
  let hospAEmail = `admin.audit.a.${ts}@hms.org`;
  let hospBEmail = `admin.audit.b.${ts}@hms.org`;
  let adminAToken = '';
  let adminBToken = '';
  let hospAId = '';
  let hospBId = '';

  // 1. Super Admin login
  await test('1. Login as Super Admin', async () => {
    const saLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: 'admin@hms.com',
      password: 'AdminPassword123!',
    });
    assert.strictEqual(saLogin.status, 200);
    saToken = saLogin.data.data.accessToken;
    assert(saToken, 'Super Admin access token returned');
  });

  const saHeaders = { Authorization: `Bearer ${saToken}` };

  // 2. Setup Hospital A and Hospital B
  await test('2. Provision Hospital A and Hospital B with Dedicated Admins', async () => {
    const createA = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `Audit Test Hospital A ${ts}`,
        registrationNumber: `REG-AUD-A-${ts}`,
        contactEmail: `contact.aud.a.${ts}@hms.org`,
        contactPhone: '+1 555-0801',
        emergencyHotline: '911',
        street: '100 Audit Ave',
        city: 'Metro City',
        state: 'NY',
        postalCode: '10001',
        country: 'United States',
        currency: 'USD',
        timezone: 'America/New_York',
      },
      adminDetails: {
        firstName: 'AuditA',
        lastName: 'Admin',
        email: hospAEmail,
        phone: '+1 555-0802',
        password: 'PasswordAudit123!',
      },
    });
    assert.strictEqual(createA.status, 201);
    hospAId = createA.data.data.hospital._id;

    const createB = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `Audit Test Hospital B ${ts}`,
        registrationNumber: `REG-AUD-B-${ts}`,
        contactEmail: `contact.aud.b.${ts}@hms.org`,
        contactPhone: '+1 555-0803',
        emergencyHotline: '911',
        street: '200 Isolation Way',
        city: 'Metro City',
        state: 'CA',
        postalCode: '90001',
        country: 'United States',
        currency: 'USD',
        timezone: 'America/Los_Angeles',
      },
      adminDetails: {
        firstName: 'AuditB',
        lastName: 'Admin',
        email: hospBEmail,
        phone: '+1 555-0804',
        password: 'PasswordAudit123!',
      },
    });
    assert.strictEqual(createB.status, 201);
    hospBId = createB.data.data.hospital._id;
  });

  // 3. Login Hospital Admin A and Admin B
  await test('3. Authenticate Hospital Admin A and Hospital Admin B', async () => {
    const loginA = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospAEmail,
      password: 'PasswordAudit123!',
    });
    assert.strictEqual(loginA.status, 200);
    adminAToken = loginA.data.data.accessToken;

    const loginB = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospBEmail,
      password: 'PasswordAudit123!',
    });
    assert.strictEqual(loginB.status, 200);
    adminBToken = loginB.data.data.accessToken;
  });

  const adminAHeaders = { headers: { Authorization: `Bearer ${adminAToken}` } };
  const adminBHeaders = { headers: { Authorization: `Bearer ${adminBToken}` } };

  // 4. Generate Hospital A and Hospital B actions to produce audit entries
  await test('4. Produce real audit entries in Hospital A & Hospital B', async () => {
    // Admin A updates system config
    const resA = await request(`${API_BASE}/hospital-admin/system-config`, {
      method: 'PUT',
      headers: { ...adminAHeaders.headers, 'Content-Type': 'application/json' },
    }, {
      appointmentBufferMinutes: 20,
      maxAppointmentsPerSlot: 4,
      emergencyHotline: '911-A-TEST',
      enableEmailNotifications: true,
      maintenanceMode: false,
    });
    assert.strictEqual(resA.status, 200);

    // Admin B updates system config
    const resB = await request(`${API_BASE}/hospital-admin/system-config`, {
      method: 'PUT',
      headers: { ...adminBHeaders.headers, 'Content-Type': 'application/json' },
    }, {
      appointmentBufferMinutes: 30,
      maxAppointmentsPerSlot: 2,
      emergencyHotline: '911-B-TEST',
      enableEmailNotifications: false,
      maintenanceMode: false,
    });
    assert.strictEqual(resB.status, 200);
  });

  // 5. Unauthenticated request must return 401
  await test('5. Unauthenticated request to /audit-logs is rejected with 401', async () => {
    const res = await request(`${API_BASE}/hospital-admin/audit-logs`);
    assert.strictEqual(res.status, 401);
  });

  // 6. Hospital Admin A retrieves their audit logs
  let countBefore = 0;
  await test('6. Hospital Admin A retrieves audit logs with 200 and pagination', async () => {
    const res = await request(`${API_BASE}/hospital-admin/audit-logs`, adminAHeaders);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data?.success, true);
    assert(Array.isArray(res.data?.data?.logs), 'data.logs is array');
    assert(res.data?.data?.pagination, 'pagination metadata exists');
    assert(res.data.data.pagination.total >= 1, 'contains at least the login/config events');
    countBefore = await AuditLog.countDocuments();
  });

  // 7. GET /audit-logs does NOT generate an audit entry (no recursive loop)
  await test('7. GET /audit-logs read does NOT create an audit entry (no loop)', async () => {
    await request(`${API_BASE}/hospital-admin/audit-logs`, adminAHeaders);
    const countAfter = await AuditLog.countDocuments();
    assert.strictEqual(countBefore, countAfter, 'AuditLog total count remained identical');
  });

  // 8. Strict Hospital Isolation: Admin A cannot see Hospital B's logs
  await test('8. Hospital Isolation: Admin A cannot see Hospital B audit logs', async () => {
    const resA = await request(`${API_BASE}/hospital-admin/audit-logs?limit=50`, adminAHeaders);
    const logsA = resA.data?.data?.logs || [];
    assert(logsA.length > 0, 'Admin A has logs');

    for (const log of logsA) {
      assert.notStrictEqual(
        log.userEmail,
        hospBEmail,
        `Admin A must not see Admin B (${hospBEmail}) activity`
      );
      if (log.details?.hospitalId) {
        assert.notStrictEqual(
          String(log.details.hospitalId),
          String(hospBId),
          'Admin A must not see Hospital B events'
        );
      }
    }

    const resB = await request(`${API_BASE}/hospital-admin/audit-logs?limit=50`, adminBHeaders);
    const logsB = resB.data?.data?.logs || [];
    assert(logsB.length > 0, 'Admin B has logs');

    for (const log of logsB) {
      assert.notStrictEqual(
        log.userEmail,
        hospAEmail,
        `Admin B must not see Admin A (${hospAEmail}) activity`
      );
      if (log.details?.hospitalId) {
        assert.notStrictEqual(
          String(log.details.hospitalId),
          String(hospAId),
          'Admin B must not see Hospital A events'
        );
      }
    }
  });

  // 9. Filter by module
  await test('9. Module filter works', async () => {
    const res = await request(`${API_BASE}/hospital-admin/audit-logs?module=admin`, adminAHeaders);
    assert.strictEqual(res.status, 200);
    const logs = res.data?.data?.logs || [];
    for (const log of logs) {
      assert.strictEqual(log.module.toLowerCase(), 'admin');
    }
  });

  // 10. Filter by status
  await test('10. Status filter works', async () => {
    const res = await request(`${API_BASE}/hospital-admin/audit-logs?status=SUCCESS`, adminAHeaders);
    assert.strictEqual(res.status, 200);
    const logs = res.data?.data?.logs || [];
    for (const log of logs) {
      assert.strictEqual(log.status, 'SUCCESS');
    }
  });

  // 11. Search query works
  await test('11. Search query works', async () => {
    const res = await request(`${API_BASE}/hospital-admin/audit-logs?search=SYSTEM_CONFIG`, adminAHeaders);
    assert.strictEqual(res.status, 200);
    const logs = res.data?.data?.logs || [];
    assert(logs.length >= 1, 'Found UPDATE_SYSTEM_CONFIG log');
    for (const log of logs) {
      assert(
        log.action.includes('SYSTEM_CONFIG') ||
        log.userEmail.includes('SYSTEM_CONFIG'),
        'Matches search term'
      );
    }
  });

  // 12. Pagination works
  await test('12. Server-side pagination parameters work', async () => {
    const res = await request(`${API_BASE}/hospital-admin/audit-logs?page=1&limit=1`, adminAHeaders);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.pagination.page, 1);
    assert.strictEqual(res.data.data.pagination.limit, 1);
    assert.strictEqual(res.data.data.logs.length, 1);
  });

  // 13. Sensitive fields protection
  await test('13. Zero exposure of passwords, hashes, tokens, or secrets', async () => {
    const res = await request(`${API_BASE}/hospital-admin/audit-logs?limit=50`, adminAHeaders);
    const logs = res.data?.data?.logs || [];

    const SENSITIVE_STRINGS = ['password', 'passwordhash', 'accesstoken', 'refreshtoken', 'otp', 'secret', 'apikey'];

    for (const log of logs) {
      const details = log.details || {};
      for (const [key, val] of Object.entries(details)) {
        const normKey = key.toLowerCase().replace(/[^a-z]/g, '');
        for (const s of SENSITIVE_STRINGS) {
          assert(!normKey.includes(s), `Log details key '${key}' contains sensitive keyword '${s}'`);
        }
      }
    }
  });

  // 14. Newest first sorting
  await test('14. Logs are ordered newest first (descending createdAt)', async () => {
    const res = await request(`${API_BASE}/hospital-admin/audit-logs?limit=10`, adminAHeaders);
    const logs = res.data?.data?.logs || [];
    for (let i = 0; i < logs.length - 1; i++) {
      const t1 = new Date(logs[i].createdAt).getTime();
      const t2 = new Date(logs[i + 1].createdAt).getTime();
      assert(t1 >= t2, `Log at index ${i} (${t1}) must be >= index ${i + 1} (${t2})`);
    }
  });

  console.log('\n======================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runAuditLogsE2ETests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
