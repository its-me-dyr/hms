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

async function runHospitalProfileE2ETests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING HOSPITAL ADMIN MY PROFILE E2E TEST SUITE');
  console.log('======================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hms');
  const User = mongoose.model('User', require('./models/User').schema);
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
  let hospAdminEmail = `admin.profile.${ts}@hms.org`;
  let adminPassword = 'PasswordProfile123!';
  let adminToken = '';
  let adminId = '';

  // 1. Super Admin login to provision a dedicated hospital & admin
  await test('1. Login as Super Admin', async () => {
    const saLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: 'admin@hms.com',
      password: 'AdminPassword123!',
    });
    assert.strictEqual(saLogin.status, 200, 'Super Admin login failed');
    saToken = saLogin.data.data.accessToken;
  });

  const saHeaders = { Authorization: `Bearer ${saToken}` };

  // 2. Provision dedicated Hospital Admin for testing
  await test('2. Provision test Hospital Admin', async () => {
    const createRes = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `Profile Test Hospital ${ts}`,
        registrationNumber: `REG-PRF-${ts}`,
        contactEmail: `contact.prf.${ts}@hms.org`,
        contactPhone: '+1 555-0901',
        emergencyHotline: '911',
        street: '100 Medical Plaza',
        city: 'Metro City',
        state: 'NY',
        postalCode: '10001',
        country: 'United States',
        currency: 'USD',
        timezone: 'America/New_York',
      },
      adminDetails: {
        firstName: 'Jane',
        lastName: 'Admin',
        email: hospAdminEmail,
        phone: '+1 555-0902',
        password: adminPassword,
      },
    });
    assert.strictEqual(createRes.status, 201, 'Hospital provision failed');
    adminId = createRes.data.data.admin._id;
  });

  // 3. Login as test Hospital Admin
  await test('3. Authenticate as Hospital Admin', async () => {
    const loginRes = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospAdminEmail,
      password: adminPassword,
    });
    assert.strictEqual(loginRes.status, 200, 'Login failed');
    adminToken = loginRes.data.data.accessToken;
    adminId = loginRes.data.data.user.id || loginRes.data.data.user._id;
    assert(adminToken, 'Access token returned');
    assert(adminId, 'Admin user ID found');
  });

  const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

  // 4. Unauthenticated request to /hospital-admin/profile rejected with 401
  await test('4. Unauthenticated request rejected with 401', async () => {
    const res = await request(`${API_BASE}/hospital-admin/profile`);
    assert.strictEqual(res.status, 401);
  });

  // 5. GET /hospital-admin/profile returns authoritative profile
  await test('5. GET /hospital-admin/profile returns profile without passwords or tokens', async () => {
    const res = await request(`${API_BASE}/hospital-admin/profile`, adminHeaders);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data?.success, true);
    const profile = res.data?.data;
    assert.strictEqual(profile.email, hospAdminEmail);
    assert.strictEqual(profile.firstName, 'Jane');
    assert.strictEqual(profile.lastName, 'Admin');
    assert.strictEqual(profile.status, 'active');
    assert.strictEqual(profile.password, undefined, 'Password must not be returned');
    assert.strictEqual(profile.refreshTokens, undefined, 'Refresh tokens must not be returned');
    assert.strictEqual(profile.passwordResetToken, undefined, 'Reset token must not be returned');
  });

  // 6. Valid Profile Update
  await test('6. PUT /hospital-admin/profile updates personal details', async () => {
    const updateRes = await request(`${API_BASE}/hospital-admin/profile`, {
      method: 'PUT',
      headers: adminHeaders.headers,
    }, {
      firstName: 'Janet',
      lastName: 'Administrator',
      phone: '+1 555-0999',
      address: {
        street: '789 Executive Blvd',
        city: 'New York',
        state: 'NY',
        postalCode: '10002',
        country: 'United States',
      },
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.data?.success, true);

    // Verify persistence via fresh GET
    const freshRes = await request(`${API_BASE}/hospital-admin/profile`, adminHeaders);
    const fresh = freshRes.data?.data;
    assert.strictEqual(fresh.firstName, 'Janet');
    assert.strictEqual(fresh.lastName, 'Administrator');
    assert.strictEqual(fresh.phone, '+1 555-0999');
    assert.strictEqual(fresh.address.street, '789 Executive Blvd');
    assert.strictEqual(fresh.address.city, 'New York');
    assert.strictEqual(fresh.address.state, 'NY');
    assert.strictEqual(fresh.address.postalCode, '10002');
    assert.strictEqual(fresh.address.country, 'United States');
  });

  // 7. Validation: Empty first or last name rejected with 400
  await test('7. Empty first or last name rejected with 400', async () => {
    const resEmptyFirst = await request(`${API_BASE}/hospital-admin/profile`, {
      method: 'PUT',
      headers: adminHeaders.headers,
    }, {
      firstName: '   ',
    });
    assert.strictEqual(resEmptyFirst.status, 400);

    const resEmptyLast = await request(`${API_BASE}/hospital-admin/profile`, {
      method: 'PUT',
      headers: adminHeaders.headers,
    }, {
      lastName: '',
    });
    assert.strictEqual(resEmptyLast.status, 400);
  });

  // 8. Security: Attempting to modify email is rejected
  await test('8. Attempting to modify official login email rejected with 400', async () => {
    const res = await request(`${API_BASE}/hospital-admin/profile`, {
      method: 'PUT',
      headers: adminHeaders.headers,
    }, {
      email: 'tampered.email@hms.org',
    });
    assert.strictEqual(res.status, 400);
  });

  // 9. Security: Role escalation attempt is prevented
  await test('9. Privilege escalation attempt (changing role) is strictly prevented', async () => {
    const res = await request(`${API_BASE}/hospital-admin/profile`, {
      method: 'PUT',
      headers: adminHeaders.headers,
    }, {
      role: 'SUPER_ADMIN',
      roleName: 'SUPER_ADMIN',
      status: 'suspended',
    });
    assert.strictEqual(res.status, 200);

    const dbUser = await User.findById(adminId);
    assert.strictEqual(dbUser.roleName, 'HOSPITAL_ADMIN', 'Role remains strictly HOSPITAL_ADMIN');
    assert.strictEqual(dbUser.status, 'active', 'Status remains unchanged');
  });

  // 10. IDOR Prevention: Cannot modify another user's profile
  await test('10. IDOR protection: cannot update other users by injecting userId in payload', async () => {
    // Attempt to pass other user's ID
    const superAdminUser = await User.findOne({ roleName: 'SUPER_ADMIN' });
    if (superAdminUser) {
      await request(`${API_BASE}/hospital-admin/profile`, {
        method: 'PUT',
        headers: adminHeaders.headers,
      }, {
        userId: superAdminUser._id,
        firstName: 'HackedName',
      });
      const checkSA = await User.findById(superAdminUser._id);
      assert.notStrictEqual(checkSA.firstName, 'HackedName', 'Super Admin was not modified');
    }
  });

  // 11. Password Change: Wrong current password fails with 400
  await test('11. Password change with incorrect current password rejected with 400', async () => {
    const res = await request(`${API_BASE}/hospital-admin/change-password`, {
      method: 'PUT',
      headers: adminHeaders.headers,
    }, {
      currentPassword: 'WrongPassword123!',
      newPassword: 'BrandNewPassword123!',
    });
    assert.strictEqual(res.status, 400);
  });

  // 12. Password Change: Identical new password fails with 400
  await test('12. Password change with identical current password rejected with 400', async () => {
    const res = await request(`${API_BASE}/hospital-admin/change-password`, {
      method: 'PUT',
      headers: adminHeaders.headers,
    }, {
      currentPassword: adminPassword,
      newPassword: adminPassword,
    });
    assert.strictEqual(res.status, 400);
  });

  // 13. Valid Password Change & re-login
  const newPassword = 'UpdatedSecurePassword123!';
  await test('13. Successful password change updates password and enables login with new credentials', async () => {
    const res = await request(`${API_BASE}/hospital-admin/change-password`, {
      method: 'PUT',
      headers: adminHeaders.headers,
    }, {
      currentPassword: adminPassword,
      newPassword: newPassword,
    });
    assert.strictEqual(res.status, 200);

    // Old password fails
    const oldLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospAdminEmail,
      password: adminPassword,
    });
    assert.strictEqual(oldLogin.status, 401, 'Old password must fail');

    // New password succeeds
    const newLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospAdminEmail,
      password: newPassword,
    });
    assert.strictEqual(newLogin.status, 200, 'New password must succeed');
  });

  // 14. Audit Log verification
  await test('14. AuditLog records UPDATE_PROFILE and PASSWORD_CHANGED without exposing secrets', async () => {
    const logs = await AuditLog.find({
      $or: [{ user: adminId }, { userEmail: hospAdminEmail }],
    }).sort({ createdAt: -1 }).lean();
    assert(logs.length >= 2, 'Found audit logs for admin');

    const updateProfileLog = logs.find((l) => l.action === 'UPDATE_PROFILE');
    assert(updateProfileLog, 'UPDATE_PROFILE audit event exists');

    const changePasswordLog = logs.find((l) => l.action === 'PASSWORD_CHANGED');
    assert(changePasswordLog, 'PASSWORD_CHANGED audit event exists');

    for (const l of logs) {
      const detailsStr = JSON.stringify(l.details || {});
      assert(!detailsStr.includes(adminPassword), 'Log details never contain old password');
      assert(!detailsStr.includes(newPassword), 'Log details never contain new password');
    }
  });

  console.log('\n======================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runHospitalProfileE2ETests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
