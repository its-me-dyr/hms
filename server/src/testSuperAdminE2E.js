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

async function runTests() {
  console.log('=== RUNNING SUPER ADMIN & STAFF VERIFICATION WORKFLOW E2E ===\n');

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

  // 2. Fetch Super Admin Dashboard Overview
  console.log('\n2. Testing GET /super-admin/dashboard...');
  const dashRes = await request(`${BASE_URL}/super-admin/dashboard`, { headers: adminHeaders });
  console.log('✓ Dashboard KPIs:', dashRes.data.kpis);
  console.log('✓ Departments:', dashRes.data.departments.length);

  // 3. Register a test doctor staff account
  const testEmail = `doctor.test.${Date.now()}@hms.com`;
  console.log(`\n3. Registering test Doctor (${testEmail})...`);
  
  // Directly verify registration in DB for testing without external email delays
  const Otp = require('./models/OtpVerification');
  const User = require('./models/User');
  const StaffVerification = require('./models/StaffVerification');
  const mongoose = require('mongoose');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hms');
  }

  // Request OTP
  await request(`${BASE_URL}/auth/register/request-otp`, {
    method: 'POST',
    body: JSON.stringify({
      firstName: 'Jonathan',
      lastName: 'Reeves',
      email: testEmail,
      phone: '+18005559090',
      dateOfBirth: '1985-06-15',
      gender: 'male',
      role: 'doctor',
      password: 'DoctorPassword123!',
      confirmPassword: 'DoctorPassword123!',
      department: 'Cardiology',
      qualification: 'MD, DM Cardiology',
      institution: 'Johns Hopkins University',
      yearsOfExperience: 10,
      licenseNumber: 'MED-REG-89201',
      specialization: 'Interventional Cardiologist',
    }),
  });

  // Fetch OTP record from DB to verify
  const otpRecord = await Otp.findOne({ email: testEmail });
  if (!otpRecord) throw new Error('OTP record not generated');

  // Verify OTP using authService or endpoint
  const authService = require('./services/auth.service');
  // Hash comparison requires the raw OTP; let's verify via verifyRegistrationOtp with simulated raw OTP
  // Or manually invoke authService.verifyRegistrationOtp after setting known hash:
  const bcrypt = require('bcryptjs');
  const knownSalt = await bcrypt.genSalt(10);
  otpRecord.otpHash = await bcrypt.hash('123456', knownSalt);
  await otpRecord.save();

  const verifyRes = await request(`${BASE_URL}/auth/register/verify-otp`, {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      otp: '123456',
    }),
  });

  console.log('✓ Doctor registered with status:', verifyRes.data.status);
  if (verifyRes.data.status !== 'pending_verification') {
    throw new Error(`Expected pending_verification, got ${verifyRes.data.status}`);
  }

  // 4. Test Login as Pending Doctor (Must fail with 403)
  console.log('\n4. Verifying pending Doctor cannot log in before approval...');
  try {
    await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: 'DoctorPassword123!',
      }),
    });
    throw new Error('Doctor should NOT be able to log in while pending!');
  } catch (err) {
    if (err.status === 403) {
      console.log('✓ Correctly rejected with HTTP 403:', err.message);
    } else {
      throw err;
    }
  }

  // 5. Super Admin fetches verification requests and finds application
  console.log('\n5. Super Admin fetching verification requests...');
  const verifsRes = await request(`${BASE_URL}/super-admin/verifications?search=${encodeURIComponent(testEmail)}`, {
    headers: adminHeaders,
  });
  const myVerif = verifsRes.data.verifications[0];
  if (!myVerif || myVerif.applicantEmail !== testEmail) {
    throw new Error('Verification application not found in list!');
  }
  console.log(`✓ Found verification application ID ${myVerif._id} with status ${myVerif.status}`);

  // 6. Test Rejection without mandatory reason (Must fail with 400)
  console.log('\n6. Testing Super Admin rejection without reason (must fail)...');
  try {
    await request(`${BASE_URL}/super-admin/verifications/${myVerif._id}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        action: 'REJECT',
        rejectionReason: '',
      }),
    });
    throw new Error('Rejection should fail without reason!');
  } catch (err) {
    if (err.status === 400) {
      console.log('✓ Correctly rejected with HTTP 400:', err.message);
    } else {
      throw err;
    }
  }

  // 7. Super Admin Rejects with reason
  console.log('\n7. Super Admin rejecting with valid reason...');
  const rejectRes = await request(`${BASE_URL}/super-admin/verifications/${myVerif._id}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({
      action: 'REJECT',
      rejectionReason: 'Medical license certificate copy is unclear. Please re-upload.',
    }),
  });
  console.log('✓ Application status updated to:', rejectRes.data.status);

  // 8. Rejected staff tries to log in -> receives rejection reason
  console.log('\n8. Checking rejected staff login feedback...');
  try {
    await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: 'DoctorPassword123!',
      }),
    });
    throw new Error('Rejected staff should NOT be able to log in!');
  } catch (err) {
    if (err.status === 403 && err.message.includes('rejected')) {
      console.log('✓ Correctly blocked with rejection feedback:', err.message);
    } else {
      throw err;
    }
  }

  // 8b. Rejected staff resubmits application with corrected credentials & documents
  console.log('\n8b. Testing rejected staff application resubmission...');
  const resubmitRes = await request(`${BASE_URL}/auth/resubmit-application`, {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: 'DoctorPassword123!',
      licenseNumber: 'MED-REG-89201-VERIFIED',
      resubmissionNotes: 'Re-uploaded certified council license document.',
      documents: [
        {
          name: 'Medical Council License (Certified)',
          documentType: 'Medical Council License',
          fileUrl: '/api/v1/auth/documents/sample-updated-license.pdf',
          fileKey: 'sample-updated-license.pdf',
          fileSize: 102400,
          mimeType: 'application/pdf',
        },
      ],
    }),
  });
  console.log('✓ Application resubmitted successfully! New status:', resubmitRes.data.status);

  // 9. Super Admin Approves application
  console.log('\n9. Super Admin approving application...');
  const approveRes = await request(`${BASE_URL}/super-admin/verifications/${myVerif._id}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({
      action: 'APPROVE',
      adminNotes: 'Verified with National Medical Council registry.',
    }),
  });
  console.log('✓ Application status updated to:', approveRes.data.status);

  // 10. Approved Doctor can now log in
  console.log('\n10. Approved Doctor logging in...');
  const doctorLogin = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: 'DoctorPassword123!',
    }),
  });
  console.log(`✓ Doctor logged in successfully! Role: ${doctorLogin.data.user.role}, Status: ${doctorLogin.data.user.status}`);

  // 11. Test Department CRUD
  console.log('\n11. Testing Super Admin Department Management...');
  const testDeptCode = `TST${Date.now().toString().slice(-4)}`;
  const deptCreate = await request(`${BASE_URL}/super-admin/departments`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      name: `Test Wing ${testDeptCode}`,
      code: testDeptCode,
      description: 'Automated test clinical wing',
      location: 'East Wing Level 3',
      capacity: 15,
    }),
  });
  console.log(`✓ Department created: ${deptCreate.data.name} (${deptCreate.data.code})`);

  // 12. Test Audit Logs
  console.log('\n12. Testing Super Admin Audit Logs...');
  const logsRes = await request(`${BASE_URL}/super-admin/audit-logs?limit=5`, {
    headers: adminHeaders,
  });
  console.log(`✓ Retrieved ${logsRes.data.logs.length} audit logs. Total logged events: ${logsRes.data.pagination.total}`);

  console.log('\n=== ALL SUPER ADMIN & VERIFICATION E2E CHECKS PASSED ===');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Super Admin E2E Test Failed:', err);
  process.exit(1);
});
