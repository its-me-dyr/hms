/**
 * Test Verification Review API & Endpoint Validation
 */

const BASE_URL = 'http://localhost:5000/api/v1';

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function runReviewVerificationTests() {
  console.log('=== TESTING SUPER ADMIN VERIFICATION REVIEW API & SECURITY ===\n');

  // 1. Super Admin Login
  console.log('1. Logging in as Super Admin (admin@hms.com)...');
  const adminLogin = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@hms.com',
      password: 'AdminPassword123!',
    }),
  });
  const adminToken = adminLogin.data.accessToken;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  console.log(`✓ Super Admin logged in: ${adminLogin.data.user.fullName} (${adminLogin.data.user.role})`);

  // 2. Fetch list of verification requests
  console.log('\n2. Fetching verification requests...');
  const verifsRes = await request(`${BASE_URL}/super-admin/verifications?limit=5`, {
    headers: adminHeaders,
  });
  const verifications = verifsRes.data.verifications;
  console.log(`✓ Found ${verifications.length} verification application(s)`);

  if (verifications.length === 0) {
    console.log('No existing applications found to test; test passed setup.');
    process.exit(0);
  }

  const sampleApp = verifications[0];
  const sampleId = sampleApp._id;
  console.log(`✓ Using application ID: ${sampleId} (${sampleApp.applicantName}, Role: ${sampleApp.role})`);

  // 3. Test GET /super-admin/verifications/:id
  console.log('\n3. Testing GET /super-admin/verifications/:id...');
  const directRes = await request(`${BASE_URL}/super-admin/verifications/${sampleId}`, {
    headers: adminHeaders,
  });
  console.log('✓ Retrieved details via /verifications/:id:', {
    id: directRes.data._id,
    applicantName: directRes.data.applicantName,
    applicantEmail: directRes.data.applicantEmail,
    role: directRes.data.role,
    status: directRes.data.status,
    documentsCount: directRes.data.documents?.length,
    historyCount: directRes.data.verificationHistory?.length,
  });

  // 4. Test GET /super-admin/verification-requests/:id (Alias route)
  console.log('\n4. Testing GET /super-admin/verification-requests/:id (Alias)...');
  const aliasRes = await request(`${BASE_URL}/super-admin/verification-requests/${sampleId}`, {
    headers: adminHeaders,
  });
  console.log('✓ Successfully retrieved details via alias route /verification-requests/:id!');
  if (aliasRes.data._id !== sampleId) {
    throw new Error('ID mismatch on alias route');
  }

  // 5. Test Invalid ObjectId format (Must return HTTP 400)
  console.log('\n5. Testing invalid ObjectId format (expecting HTTP 400)...');
  try {
    await request(`${BASE_URL}/super-admin/verification-requests/invalid-mongo-id-123`, {
      headers: adminHeaders,
    });
    throw new Error('Invalid ID should have failed with 400!');
  } catch (err) {
    if (err.status === 400) {
      console.log('✓ Correctly rejected with HTTP 400:', err.message);
    } else {
      throw err;
    }
  }

  // 6. Test Non-existent valid ObjectId (Must return HTTP 404)
  console.log('\n6. Testing non-existent valid ObjectId (expecting HTTP 404)...');
  try {
    await request(`${BASE_URL}/super-admin/verification-requests/600000000000000000000000`, {
      headers: adminHeaders,
    });
    throw new Error('Non-existent ID should have failed with 404!');
  } catch (err) {
    if (err.status === 404) {
      console.log('✓ Correctly returned HTTP 404:', err.message);
    } else {
      throw err;
    }
  }

  // 7. Test Unauthorized Access (Without JWT, expecting HTTP 401)
  console.log('\n7. Testing unauthenticated request (expecting HTTP 401)...');
  try {
    await request(`${BASE_URL}/super-admin/verification-requests/${sampleId}`);
    throw new Error('Unauthenticated request should have failed!');
  } catch (err) {
    if (err.status === 401) {
      console.log('✓ Correctly blocked unauthenticated request with HTTP 401:', err.message);
    } else {
      throw err;
    }
  }

  // 8. Test Non-SuperAdmin Access (Patient token, expecting HTTP 403)
  console.log('\n8. Testing unauthorized non-superadmin request (Patient token, expecting HTTP 403)...');
  const patientLogin = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'patient@hms.com',
      password: 'PatientPassword123!',
    }),
  });
  const patientHeaders = { Authorization: `Bearer ${patientLogin.data.accessToken}` };
  try {
    await request(`${BASE_URL}/super-admin/verification-requests/${sampleId}`, {
      headers: patientHeaders,
    });
    throw new Error('Patient should not be able to access Super Admin verification review!');
  } catch (err) {
    if (err.status === 403) {
      console.log('✓ Correctly blocked Patient access with HTTP 403:', err.message);
    } else {
      throw err;
    }
  }

  // 9. Test Saving Internal Admin Notes
  console.log('\n9. Testing saving internal administrative review notes...');
  const testNote = `Automated review check at ${new Date().toISOString()}`;
  const noteRes = await request(`${BASE_URL}/super-admin/verification-requests/${sampleId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({
      action: 'UPDATE_NOTES',
      adminNotes: testNote,
    }),
  });
  console.log('✓ Admin notes saved successfully! Note:', noteRes.data.adminNotes);

  console.log('\n=== ALL VERIFICATION REVIEW ENDPOINT TESTS PASSED ===');
  process.exit(0);
}

runReviewVerificationTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
