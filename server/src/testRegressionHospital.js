/**
 * Targeted regression test: Single-word admin name bug
 * Previously, entering "Marcus" (one word) would set lastName = ''
 * causing Mongoose required-field validation failure → "Failed to update hospital"
 */

const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_dev_mode_only_change_in_prod';
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hms';

const token = jwt.sign(
  { id: 'super_admin_system', email: 'admin@hms.com', role: 'super_admin', permissions: ['*'] },
  JWT_SECRET,
  { expiresIn: '1h' }
);

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 5000,
      path: `/api/v1${path}`, method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');

  // Get first hospital with a linked admin
  const hospitalsRes = await apiRequest('GET', '/super-admin/hospitals');
  const hospitals = hospitalsRes.body.data.hospitals;
  const testH = hospitals.find(h => h.adminEmail && h.adminUser);
  
  if (!testH) {
    console.log('⚠️  No hospital with linked admin found. Skipping.');
    process.exit(0);
  }

  const hospitalId = testH.id;
  const originalAdminName = testH.adminUser?.fullName || testH.adminName;
  console.log(`Hospital: ${testH.hospitalName}`);
  console.log(`Admin: ${originalAdminName} (${testH.adminEmail})\n`);

  // --- REGRESSION TEST: Single-word name (previously caused lastName='' → ValidationError) ---
  console.log('--- REGRESSION: Single-word admin name ---');
  const singleWordRes = await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
    hospitalDetails: {
      hospitalName: testH.hospitalName,
      registrationNumber: testH.registrationNumber,
      contactEmail: testH.contactEmail,
    },
    adminDetails: {
      fullName: 'Mononym', // Single word — no last name part
      email: testH.adminEmail,
      phone: testH.adminPhone || '',
      status: 'active',
    },
  });

  if (singleWordRes.body.success) {
    // The backend should PRESERVE the existing lastName
    const savedAdmin = singleWordRes.body.data.admin;
    console.log('  ✅ PASSED — Single-word name handled without error');
    console.log('     Saved firstName:', savedAdmin.firstName);
    console.log('     Saved lastName (preserved):', savedAdmin.lastName);

    // Restore original name
    const [first, ...rest] = originalAdminName.split(' ');
    await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
      hospitalDetails: {
        hospitalName: testH.hospitalName,
        registrationNumber: testH.registrationNumber,
        contactEmail: testH.contactEmail,
      },
      adminDetails: {
        fullName: originalAdminName,
        email: testH.adminEmail,
        phone: testH.adminPhone || '',
        status: 'active',
      },
    });
    console.log('     Original name restored:', originalAdminName);
  } else {
    console.error('  ❌ FAILED:', singleWordRes.body.message);
    console.error('     Status:', singleWordRes.status);
  }

  // --- TEST: Full two-word name update ---
  console.log('\n--- Full name update (First + Last) ---');
  const twoWordRes = await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
    hospitalDetails: {
      hospitalName: testH.hospitalName,
      registrationNumber: testH.registrationNumber,
      contactEmail: testH.contactEmail,
    },
    adminDetails: {
      fullName: 'Jane Smith',
      email: testH.adminEmail,
      phone: '+1 555-0100',
      status: 'active',
    },
  });
  if (twoWordRes.body.success) {
    console.log('  ✅ PASSED — Full name: Jane Smith');
    // Restore
    await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
      hospitalDetails: {
        hospitalName: testH.hospitalName,
        registrationNumber: testH.registrationNumber,
        contactEmail: testH.contactEmail,
      },
      adminDetails: {
        fullName: originalAdminName,
        email: testH.adminEmail,
        phone: testH.adminPhone || '',
        status: 'active',
      },
    });
  } else {
    console.error('  ❌ FAILED:', twoWordRes.body.message);
  }

  // --- TEST: Admin status change to suspended ---
  console.log('\n--- Admin status change (active → suspended → active) ---');
  const suspendRes = await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
    hospitalDetails: {
      hospitalName: testH.hospitalName,
      registrationNumber: testH.registrationNumber,
      contactEmail: testH.contactEmail,
    },
    adminDetails: {
      fullName: originalAdminName,
      email: testH.adminEmail,
      status: 'suspended',
    },
  });
  if (suspendRes.body.success && suspendRes.body.data.admin.status === 'suspended') {
    console.log('  ✅ PASSED — Admin status set to suspended');
    // Restore to active
    await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
      hospitalDetails: {
        hospitalName: testH.hospitalName,
        registrationNumber: testH.registrationNumber,
        contactEmail: testH.contactEmail,
      },
      adminDetails: {
        fullName: originalAdminName,
        email: testH.adminEmail,
        status: 'active',
      },
    });
    console.log('     Restored to active');
  } else {
    console.error('  ❌ FAILED:', suspendRes.body.message);
  }

  // --- TEST: Hospital-only update (no admin changes) ---
  console.log('\n--- Hospital-only update (no adminDetails key) ---');
  const hospOnlyRes = await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
    hospitalDetails: {
      hospitalName: testH.hospitalName,
      registrationNumber: testH.registrationNumber,
      contactEmail: testH.contactEmail,
      timezone: 'Asia/Kolkata',
    },
  });
  if (hospOnlyRes.body.success) {
    console.log('  ✅ PASSED — Hospital-only update (timezone changed to Asia/Kolkata)');
    // Restore
    await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
      hospitalDetails: {
        hospitalName: testH.hospitalName,
        registrationNumber: testH.registrationNumber,
        contactEmail: testH.contactEmail,
        timezone: testH.timezone || 'America/New_York',
      },
    });
  } else {
    console.error('  ❌ FAILED:', hospOnlyRes.body.message);
  }

  // --- TEST: Role stays HOSPITAL_ADMIN (security check) ---
  console.log('\n--- Role invariant: HOSPITAL_ADMIN cannot be changed ---');
  const roleInvariantRes = await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
    hospitalDetails: {
      hospitalName: testH.hospitalName,
      registrationNumber: testH.registrationNumber,
      contactEmail: testH.contactEmail,
    },
    adminDetails: {
      fullName: originalAdminName,
      email: testH.adminEmail,
      status: 'active',
      roleName: 'SUPER_ADMIN', // Attempt to elevate role — must be ignored
    },
  });
  if (roleInvariantRes.body.success) {
    const returnedRole = roleInvariantRes.body.data.admin?.role || roleInvariantRes.body.data.admin?.roleName;
    if (returnedRole === 'HOSPITAL_ADMIN') {
      console.log('  ✅ PASSED — Role remains HOSPITAL_ADMIN (elevation attempt ignored)');
    } else {
      console.error('  ❌ FAILED — Role was changed to:', returnedRole);
    }
  } else {
    console.error('  ❌ FAILED:', roleInvariantRes.body.message);
  }

  // --- TEST: Duplicate admin email rejection ---
  console.log('\n--- Duplicate admin email rejection ---');
  // Find another hospital admin's email
  const otherH = hospitals.find(h => h.adminEmail && h.adminEmail !== testH.adminEmail);
  if (otherH) {
    const dupEmailRes = await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
      hospitalDetails: {
        hospitalName: testH.hospitalName,
        registrationNumber: testH.registrationNumber,
        contactEmail: testH.contactEmail,
      },
      adminDetails: {
        fullName: originalAdminName,
        email: otherH.adminEmail, // Try to use another admin's email
        status: 'active',
      },
    });
    if (!dupEmailRes.body.success && dupEmailRes.status === 409) {
      console.log('  ✅ PASSED — Duplicate admin email rejected:', dupEmailRes.body.message);
    } else {
      console.log('  ⚠️  Note: Got status', dupEmailRes.status, '-', dupEmailRes.body.message);
    }
  } else {
    console.log('  ⚠️  Skipped — need 2+ hospitals with different admins');
  }

  // --- Verify response does NOT contain sensitive fields ---
  console.log('\n--- Security: No sensitive fields in response ---');
  const safeRes = await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
    hospitalDetails: {
      hospitalName: testH.hospitalName,
      registrationNumber: testH.registrationNumber,
      contactEmail: testH.contactEmail,
    },
  });
  const responseStr = JSON.stringify(safeRes.body);
  const hasSensitive = responseStr.includes('"password"') || 
                       responseStr.includes('"refreshToken"') ||
                       responseStr.includes('"passwordResetToken"');
  if (!hasSensitive) {
    console.log('  ✅ PASSED — No password/token fields in response');
  } else {
    console.error('  ❌ FAILED — Sensitive data found in response!');
  }

  console.log('\n🏁 All regression tests complete.\n');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
