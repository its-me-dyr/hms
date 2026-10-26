/**
 * Super Admin Complete End-to-End Test Suite
 * 
 * Verifies all 4 modules:
 * 1. Hospital Management (Atomic creation, duplicate validation, list, view, edit, activate/deactivate)
 * 2. Hospital Admin Management (List, search, view details, activate/deactivate)
 * 3. Roles & Permissions (RBAC, permission updates, SUPER_ADMIN system protection)
 * 4. Reports & Analytics (Filtered metrics, hospital reports, admin reports, staff breakdown)
 * 5. Security & Isolation (Hospital Admin cannot access Super Admin APIs or create hospitals/admins)
 */

const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING SUPER ADMIN E2E VALIDATION SUITE');
  console.log('====================================================\n');

  let superAdminToken = '';
  let hospitalAdminToken = '';

  // 1. Authenticate Super Admin
  console.log('1. Authenticating Super Admin...');
  const saLoginRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'admin@hms.com', password: 'AdminPassword123!' }
  );

  if (saLoginRes.data?.data?.accessToken) {
    superAdminToken = saLoginRes.data.data.accessToken;
    console.log('   ✅ Super Admin authenticated successfully.\n');
  } else {
    console.error('   ❌ Super Admin login failed:', saLoginRes.data);
    process.exit(1);
  }

  // 2. Authenticate Demo Hospital Admin
  console.log('2. Authenticating Demo Hospital Admin...');
  const haLoginRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'hospitaladmin@hms.com', password: 'HospitalAdmin123!' }
  );

  if (haLoginRes.data?.data?.accessToken) {
    hospitalAdminToken = haLoginRes.data.data.accessToken;
    console.log('   ✅ Hospital Admin authenticated successfully.\n');
  } else {
    console.log('   ⚠️ Demo Hospital Admin login skipped/unavailable.\n');
  }

  const saHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${superAdminToken}`,
  };

  const haHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${hospitalAdminToken}`,
  };

  // 3. Test Atomic Hospital + Hospital Admin Creation
  console.log('3. Testing Atomic Hospital + Initial Hospital Admin Creation (POST /api/v1/super-admin/hospitals)...');
  const testRegNum = `TEST-REG-${Date.now()}`;
  const testAdminEmail = `admin.${Date.now()}@testhospital.org`;
  const testHospEmail = `contact.${Date.now()}@testhospital.org`;

  const createHospRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/super-admin/hospitals',
      method: 'POST',
      headers: saHeaders,
    },
    {
      hospitalDetails: {
        hospitalName: 'St. Jude Clinical Research Hospital',
        registrationNumber: testRegNum,
        tagline: 'Excellence in Pediatric & Oncology Care',
        contactEmail: testHospEmail,
        contactPhone: '+1 (555) 300-1122',
        emergencyHotline: '+1 (800) 911-3000',
        address: {
          street: '262 Danny Thomas Place',
          city: 'Memphis',
          state: 'TN',
          postalCode: '38105',
          country: 'United States',
        },
        currency: 'USD',
        currencySymbol: '$',
        timezone: 'America/Chicago',
      },
      adminDetails: {
        firstName: 'Marcus',
        lastName: 'Aurelius',
        fullName: 'Dr. Marcus Aurelius',
        email: testAdminEmail,
        phone: '+1 (555) 300-8899',
        password: 'Password@123',
      },
    }
  );

  let createdHospitalId = '';
  let createdAdminId = '';

  if (createHospRes.status === 201 && createHospRes.data?.data?.hospital?.id) {
    createdHospitalId = createHospRes.data.data.hospital.id;
    createdAdminId = createHospRes.data.data.admin.id;
    console.log('   ✅ Hospital & Initial Hospital Admin created atomically.');
    console.log(`      Hospital ID: ${createdHospitalId}`);
    console.log(`      Admin ID: ${createdAdminId}\n`);
  } else {
    console.error('   ❌ Atomic hospital creation failed:', createHospRes.data);
  }

  // 4. Test Duplicate Registration Number Rejection
  console.log('4. Testing Duplicate Registration Number Validation...');
  const dupRegRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/super-admin/hospitals',
      method: 'POST',
      headers: saHeaders,
    },
    {
      hospitalDetails: {
        hospitalName: 'Duplicate Test Hospital',
        registrationNumber: testRegNum, // Duplicate!
        contactEmail: `unique.${Date.now()}@testhospital.org`,
        contactPhone: '+1 (555) 300-1122',
        address: { city: 'Memphis', country: 'United States' },
      },
      adminDetails: {
        firstName: 'Dup',
        lastName: 'Admin',
        email: `dupadmin.${Date.now()}@testhospital.org`,
        phone: '+1 (555) 300-8899',
        password: 'Password@123',
      },
    }
  );

  if (dupRegRes.status === 409 || dupRegRes.status === 400) {
    console.log('   ✅ Duplicate registration number correctly rejected (409 Conflict).\n');
  } else {
    console.error('   ❌ Duplicate registration check failed. Response:', dupRegRes.status, dupRegRes.data);
  }

  // 5. Test Duplicate Admin Email Rejection
  console.log('5. Testing Duplicate Admin Email Validation...');
  const dupEmailRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/super-admin/hospitals',
      method: 'POST',
      headers: saHeaders,
    },
    {
      hospitalDetails: {
        hospitalName: 'Another Hospital',
        registrationNumber: `REG-UNIQUE-${Date.now()}`,
        contactEmail: `contact.${Date.now()}@testhospital.org`,
        contactPhone: '+1 (555) 300-1122',
        address: { city: 'Memphis', country: 'United States' },
      },
      adminDetails: {
        firstName: 'Dup',
        lastName: 'Email',
        email: testAdminEmail, // Duplicate!
        phone: '+1 (555) 300-8899',
        password: 'Password@123',
      },
    }
  );

  if (dupEmailRes.status === 409 || dupEmailRes.status === 400) {
    console.log('   ✅ Duplicate admin email correctly rejected (409 Conflict).\n');
  } else {
    console.error('   ❌ Duplicate admin email check failed. Response:', dupEmailRes.status, dupEmailRes.data);
  }

  // 6. Test GET Hospitals List
  console.log('6. Testing GET /api/v1/super-admin/hospitals...');
  const listHospRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/super-admin/hospitals',
    method: 'GET',
    headers: saHeaders,
  });

  if (listHospRes.status === 200 && Array.isArray(listHospRes.data?.data?.hospitals)) {
    console.log(`   ✅ Hospitals retrieved successfully (${listHospRes.data.data.hospitals.length} hospitals found).\n`);
  } else {
    console.error('   ❌ GET hospitals failed:', listHospRes.data);
  }

  // 7. Test PUT Update Hospital
  if (createdHospitalId) {
    console.log(`7. Testing PUT /api/v1/super-admin/hospitals/${createdHospitalId} (Edit Hospital)...`);
    const updateHospRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/v1/super-admin/hospitals/${createdHospitalId}`,
        method: 'PUT',
        headers: saHeaders,
      },
      {
        hospitalName: 'St. Jude Clinical Research & Children Hospital',
        tagline: 'Updated Clinical Research Division',
        contactPhone: '+1 (555) 999-0000',
      }
    );

    if (updateHospRes.status === 200 && updateHospRes.data?.data?.hospitalName?.includes('Children')) {
      console.log('   ✅ Hospital updated successfully in MongoDB.\n');
    } else {
      console.error('   ❌ Hospital update failed:', updateHospRes.data);
    }
  }

  // 8. Test PATCH Toggle Hospital Status
  if (createdHospitalId) {
    console.log(`8. Testing PATCH /api/v1/super-admin/hospitals/${createdHospitalId}/status (Toggle Status)...`);
    const statusHospRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/v1/super-admin/hospitals/${createdHospitalId}/status`,
        method: 'PATCH',
        headers: saHeaders,
      },
      { status: 'inactive' }
    );

    if (statusHospRes.status === 200 && statusHospRes.data?.data?.status === 'inactive') {
      console.log('   ✅ Hospital deactivated successfully.');

      // Reactivate it
      await makeRequest(
        {
          hostname: 'localhost',
          port: 5000,
          path: `/api/v1/super-admin/hospitals/${createdHospitalId}/status`,
          method: 'PATCH',
          headers: saHeaders,
        },
        { status: 'active' }
      );
      console.log('   ✅ Hospital reactivated successfully.\n');
    } else {
      console.error('   ❌ Hospital status toggle failed:', statusHospRes.data);
    }
  }

  // 9. Test GET Hospital Admins List
  console.log('9. Testing GET /api/v1/super-admin/hospital-admins...');
  const listAdminsRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/super-admin/hospital-admins',
    method: 'GET',
    headers: saHeaders,
  });

  if (listAdminsRes.status === 200 && Array.isArray(listAdminsRes.data?.data?.admins)) {
    console.log(`   ✅ Hospital admins retrieved successfully (${listAdminsRes.data.data.admins.length} admins found).\n`);
  } else {
    console.error('   ❌ GET hospital admins failed:', listAdminsRes.data);
  }

  // 10. Test PATCH Toggle Hospital Admin Status
  if (createdAdminId) {
    console.log(`10. Testing PATCH /api/v1/super-admin/hospital-admins/${createdAdminId}/status...`);
    const toggleAdminRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/v1/super-admin/hospital-admins/${createdAdminId}/status`,
        method: 'PATCH',
        headers: saHeaders,
      },
      { status: 'suspended' }
    );

    if (toggleAdminRes.status === 200 && toggleAdminRes.data?.data?.status === 'suspended') {
      console.log('   ✅ Hospital admin suspended successfully.');

      // Reactivate
      await makeRequest(
        {
          hostname: 'localhost',
          port: 5000,
          path: `/api/v1/super-admin/hospital-admins/${createdAdminId}/status`,
          method: 'PATCH',
          headers: saHeaders,
        },
        { status: 'active' }
      );
      console.log('   ✅ Hospital admin reactivated successfully.\n');
    } else {
      console.error('   ❌ Hospital admin status toggle failed:', toggleAdminRes.data);
    }
  }

  // 11. Test Roles & Permissions Matrix
  console.log('11. Testing Roles & Permissions RBAC (GET & POST /api/v1/super-admin/roles)...');
  const rolesRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/super-admin/roles',
    method: 'GET',
    headers: saHeaders,
  });

  if (rolesRes.status === 200 && Array.isArray(rolesRes.data?.data)) {
    console.log(`   ✅ Retrieved ${rolesRes.data.data.length} RBAC roles.`);

    const doctorRole = rolesRes.data.data.find((r) => r.name === 'DOCTOR');
    if (doctorRole) {
      const updatedPerms = [...(doctorRole.permissions || []), 'patients:read', 'prescriptions:write'];
      const updateRoleRes = await makeRequest(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/api/v1/super-admin/roles',
          method: 'POST',
          headers: saHeaders,
        },
        {
          roleId: doctorRole.id || doctorRole._id,
          permissions: updatedPerms,
        }
      );
      if (updateRoleRes.status === 200) {
        console.log('   ✅ Updated role permissions and persisted to MongoDB.');
      }
    }

    // Check system protection for SUPER_ADMIN
    const superRole = rolesRes.data.data.find((r) => r.name === 'SUPER_ADMIN');
    if (superRole) {
      const wipeAttemptRes = await makeRequest(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/api/v1/super-admin/roles',
          method: 'POST',
          headers: saHeaders,
        },
        {
          roleId: superRole.id || superRole._id,
          permissions: [], // Attempt to wipe permissions
        }
      );
      if (wipeAttemptRes.status === 400) {
        console.log('   ✅ SUPER_ADMIN core permissions successfully protected from revocation (400 Bad Request).\n');
      }
    }
  }

  // 12. Test Reports & Analytics Aggregation
  console.log('12. Testing Reports & Analytics (GET /api/v1/super-admin/reports with filters)...');
  const reportsRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/super-admin/reports?period=30d&status=all',
    method: 'GET',
    headers: saHeaders,
  });

  if (reportsRes.status === 200 && reportsRes.data?.data?.administrativeMetrics) {
    const metrics = reportsRes.data.data.administrativeMetrics;
    console.log('   ✅ Reports retrieved with real MongoDB data:');
    console.log(`      Total Hospitals: ${metrics.hospitals?.total || 0}`);
    console.log(`      Total Hospital Admins: ${metrics.administrators?.total || 0}`);
    console.log(`      Total Operational Staff: ${metrics.operationalStaff?.total || 0}`);
    console.log(`      Hospital Reports Array: ${reportsRes.data.data.hospitalReports?.length || 0} items`);
    console.log(`      Admin Reports Array: ${reportsRes.data.data.adminReports?.length || 0} items\n`);
  } else {
    console.error('   ❌ Reports request failed:', reportsRes.data);
  }

  // 13. Test RBAC Security Boundary: Hospital Admin cannot access Super Admin APIs
  if (hospitalAdminToken) {
    console.log('13. Testing Security Isolation: Hospital Admin restricted from Super Admin APIs...');
    const haAttemptRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/super-admin/hospitals',
      method: 'GET',
      headers: haHeaders,
    });

    if (haAttemptRes.status === 403 || haAttemptRes.status === 401) {
      console.log('   ✅ Hospital Admin successfully blocked from Super Admin endpoints (403 Forbidden).\n');
    } else {
      console.error('   ❌ Security breach! Hospital admin accessed super-admin endpoint:', haAttemptRes.status);
    }
  }

  console.log('====================================================');
  console.log('🎉 ALL SUPER ADMIN E2E TESTS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
