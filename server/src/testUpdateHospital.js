/**
 * Integration test: updateHospital endpoint
 * Tests the PUT /api/v1/super-admin/hospitals/:id endpoint with
 * combined hospital + admin update to verify the fix works.
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
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
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
  // Connect to MongoDB
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  // 1. Get hospitals list
  const hospitalsRes = await apiRequest('GET', '/super-admin/hospitals');
  if (!hospitalsRes.body.success) {
    console.error('❌ GET /hospitals failed:', hospitalsRes.body.message);
    process.exit(1);
  }
  const hospitals = hospitalsRes.body.data.hospitals;
  console.log(`\n📋 Found ${hospitals.length} hospital(s):`);
  hospitals.forEach((h, i) => {
    console.log(`  [${i}] ${h.hospitalName} | ID: ${h.id} | AdminEmail: ${h.adminEmail}`);
  });

  if (hospitals.length === 0) {
    console.log('⚠️  No hospitals to test with. Create a hospital first.');
    process.exit(0);
  }

  const testHospital = hospitals[0];
  const hospitalId = testHospital.id;
  console.log(`\n🏥 Testing update on: "${testHospital.hospitalName}" (${hospitalId})`);
  console.log(`   Admin: ${testHospital.adminEmail || 'No admin linked'}`);

  // 2. Test: Change only hospital name
  console.log('\n--- TEST 1: Update hospital name only ---');
  const test1 = await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
    hospitalDetails: {
      hospitalName: testHospital.hospitalName + ' [Updated]',
      registrationNumber: testHospital.registrationNumber,
      contactEmail: testHospital.contactEmail,
    },
  });
  if (test1.body.success) {
    console.log('  ✅ PASSED — Hospital name updated to:', test1.body.data.hospital.hospitalName);
  } else {
    console.error('  ❌ FAILED:', test1.body.message);
  }

  // 3. Restore hospital name
  await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
    hospitalDetails: {
      hospitalName: testHospital.hospitalName,
      registrationNumber: testHospital.registrationNumber,
      contactEmail: testHospital.contactEmail,
    },
  });

  // 4. Test: Change hospital + admin details together
  if (testHospital.adminUser || testHospital.adminEmail) {
    console.log('\n--- TEST 2: Update hospital + admin together ---');
    const test2 = await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
      hospitalDetails: {
        hospitalName: testHospital.hospitalName,
        registrationNumber: testHospital.registrationNumber,
        contactEmail: testHospital.contactEmail,
        tagline: 'Excellence in Healthcare [test update]',
      },
      adminDetails: {
        fullName: testHospital.adminUser?.fullName || 'Test Admin',
        email: testHospital.adminEmail,
        phone: testHospital.adminPhone || '+1 555-0100',
        status: 'active',
      },
    });
    if (test2.body.success) {
      console.log('  ✅ PASSED');
      console.log('     Hospital tagline:', test2.body.data.hospital.tagline);
      console.log('     Admin name:', test2.body.data.admin?.fullName);
    } else {
      console.error('  ❌ FAILED:', test2.body.message);
    }

    // Restore tagline
    await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
      hospitalDetails: {
        hospitalName: testHospital.hospitalName,
        registrationNumber: testHospital.registrationNumber,
        contactEmail: testHospital.contactEmail,
        tagline: testHospital.tagline || '',
      },
    });
  } else {
    console.log('\n⚠️  Skipping Test 2 — no linked admin on this hospital.');
  }

  // 5. Test: Duplicate registration number check
  if (hospitals.length > 1) {
    console.log('\n--- TEST 3: Duplicate registration number rejection ---');
    const otherHosp = hospitals[1];
    const test3 = await apiRequest('PUT', `/super-admin/hospitals/${hospitalId}`, {
      hospitalDetails: {
        hospitalName: testHospital.hospitalName,
        registrationNumber: otherHosp.registrationNumber, // use another hospital's reg number
        contactEmail: testHospital.contactEmail,
      },
    });
    if (!test3.body.success && test3.status === 409) {
      console.log('  ✅ PASSED — Duplicate rejected:', test3.body.message);
    } else {
      console.error('  ❌ FAILED — Expected 409, got:', test3.status, test3.body);
    }
  }

  // 6. Test: unauthorized (no token)
  console.log('\n--- TEST 4: Authorization enforcement ---');
  const test4 = await new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 5000,
      path: `/api/v1/super-admin/hospitals/${hospitalId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': 2 },
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.write('{}');
    req.end();
  });
  if (test4.status === 401) {
    console.log('  ✅ PASSED — Unauthorized request rejected (401)');
  } else {
    console.error('  ❌ FAILED — Expected 401, got:', test4.status);
  }

  // 7. Audit log check
  console.log('\n--- TEST 5: Audit log verification ---');
  const auditRes = await apiRequest('GET', '/super-admin/audit-logs');
  if (auditRes.body.success) {
    const updateLogs = auditRes.body.data?.logs?.filter(l => l.action === 'UPDATE_HOSPITAL') || [];
    if (updateLogs.length > 0) {
      console.log(`  ✅ PASSED — Found ${updateLogs.length} UPDATE_HOSPITAL audit log(s)`);
      const latest = updateLogs[0];
      console.log(`     Latest: ${latest.action} at ${latest.createdAt}`);
      console.log(`     Hospital: ${latest.details?.hospitalName}`);
    } else {
      console.log('  ⚠️  No UPDATE_HOSPITAL audit logs found yet');
    }
  } else {
    console.log('  ⚠️  Could not fetch audit logs:', auditRes.body.message);
  }

  console.log('\n🏁 All tests complete.\n');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
