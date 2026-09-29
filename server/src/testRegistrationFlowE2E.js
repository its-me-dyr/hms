/**
 * Test Unified Registration Flow & Verification Summary E2E
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('=== RUNNING UNIFIED REGISTRATION FLOW & VERIFICATION TESTS ===\n');

  const timestamp = Date.now();

  // 1. Test Security: Direct registration with super_admin or hospital_admin must be rejected
  console.log('1. Testing Security: Disallowing public registration for privileged roles...');
  const privilegedRes1 = await request(`${BASE_URL}/auth/register/request-otp`, {
    method: 'POST',
    body: JSON.stringify({
      firstName: 'Malicious',
      lastName: 'Admin',
      email: `evil.admin.${timestamp}@hms.com`,
      phone: '+15550009999',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      role: 'super_admin',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    }),
  });

  if (privilegedRes1.status === 400) {
    console.log('✓ Correctly rejected super_admin registration with HTTP 400:', privilegedRes1.data?.message);
  } else {
    throw new Error(`Expected HTTP 400 for super_admin, got ${privilegedRes1.status}`);
  }

  const privilegedRes2 = await request(`${BASE_URL}/auth/register/request-otp`, {
    method: 'POST',
    body: JSON.stringify({
      firstName: 'Malicious',
      lastName: 'HospitalAdmin',
      email: `evil.hospadmin.${timestamp}@hms.com`,
      phone: '+15550009998',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      role: 'hospital_admin',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    }),
  });

  if (privilegedRes2.status === 400) {
    console.log('✓ Correctly rejected hospital_admin registration with HTTP 400:', privilegedRes2.data?.message);
  } else {
    throw new Error(`Expected HTTP 400 for hospital_admin, got ${privilegedRes2.status}`);
  }

  // Connect to DB directly for OTP simulation
  require('dotenv').config();
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hms';
  await mongoose.connect(mongoUri);
  const Otp = require('./models/Otp');
  const User = require('./models/User');

  // 2. Test Patient Registration Flow
  console.log('\n2. Testing Patient Registration (Common details -> OTP -> ACTIVE)...');
  const patientEmail = `patient.flow.${timestamp}@hms.com`;
  const patientReq = await request(`${BASE_URL}/auth/register/request-otp`, {
    method: 'POST',
    body: JSON.stringify({
      firstName: 'Alice',
      lastName: 'Patient',
      email: patientEmail,
      phone: '+15551112222',
      dateOfBirth: '1995-04-12',
      gender: 'female',
      role: 'patient',
      address: {
        street: '100 Health Way',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        country: 'United States',
      },
      emergencyContact: {
        name: 'Bob Patient',
        phone: '+15551113333',
        relation: 'Brother',
      },
      password: 'Password123!',
      confirmPassword: 'Password123!',
    }),
  });

  if (!patientReq.ok) {
    throw new Error(`Patient OTP request failed: ${patientReq.data?.message}`);
  }
  console.log('✓ Patient OTP requested successfully');

  // Simulate raw OTP 123456
  const salt = await bcrypt.genSalt(10);
  const testOtpHash = await bcrypt.hash('123456', salt);
  const patientOtpRecord = await Otp.findOne({ email: patientEmail.toLowerCase() });
  if (!patientOtpRecord) throw new Error('Patient OTP record not found');
  patientOtpRecord.otpHash = testOtpHash;
  await patientOtpRecord.save();

  const patientVerify = await request(`${BASE_URL}/auth/register/verify-otp`, {
    method: 'POST',
    body: JSON.stringify({
      email: patientEmail,
      otp: '123456',
    }),
  });

  if (!patientVerify.ok) {
    throw new Error(`Patient OTP verification failed: ${patientVerify.data?.message}`);
  }

  console.log('✓ Patient verified successfully! Returned status:', patientVerify.data?.data?.status);
  if (patientVerify.data?.data?.status !== 'active') {
    throw new Error(`Expected patient status 'active', got: ${patientVerify.data?.data?.status}`);
  }

  // Verify Patient can log in immediately
  const patientLogin = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: patientEmail,
      password: 'Password123!',
    }),
  });

  if (!patientLogin.ok) {
    throw new Error(`Patient login failed: ${patientLogin.data?.message}`);
  }
  console.log('✓ Patient logged in immediately! Role:', patientLogin.data?.data?.user?.role);

  // Check that address and emergency contact are saved in User document
  const patientUserDoc = await User.findOne({ email: patientEmail });
  if (patientUserDoc?.address?.street !== '100 Health Way' || patientUserDoc?.emergencyContact?.name !== 'Bob Patient') {
    throw new Error('Patient address or emergency contact was not saved correctly to User document!');
  }
  console.log('✓ Patient address & emergency contact successfully saved to User document!');

  // 3. Test Staff (Doctor) Registration Flow
  console.log('\n3. Testing Staff (Doctor) Registration (Common + Doctor credentials + Docs -> OTP -> PENDING_VERIFICATION)...');
  const doctorEmail = `dr.flow.${timestamp}@hms.com`;
  const doctorReq = await request(`${BASE_URL}/auth/register/request-otp`, {
    method: 'POST',
    body: JSON.stringify({
      firstName: 'Marcus',
      lastName: 'Brody',
      email: doctorEmail,
      phone: '+15553334444',
      dateOfBirth: '1982-08-20',
      gender: 'male',
      role: 'doctor',
      address: {
        street: '450 Clinical Ave, Suite 12',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60611',
        country: 'United States',
      },
      emergencyContact: {
        name: 'Sarah Brody',
        phone: '+15553335555',
        relation: 'Spouse',
      },
      department: 'Cardiology',
      specialization: 'Interventional Cardiology',
      qualification: 'MD, FACC',
      institution: 'Northwestern University',
      yearsOfExperience: 14,
      licenseNumber: 'MD-REG-60611-IL',
      previousOrganization: 'Chicago Memorial Hospital',
      professionalDescription: 'Senior interventional cardiologist with 14 years clinical experience in catheterization.',
      documents: [
        {
          documentName: 'Government Photo ID',
          documentType: 'identity',
          originalName: 'passport_scan.pdf',
          fileUrl: '/uploads/documents/test-passport.pdf',
          fileSize: 450000,
        },
        {
          documentName: 'Medical Qualification Certificate',
          documentType: 'qualification_cert',
          originalName: 'md_degree.pdf',
          fileUrl: '/uploads/documents/test-md.pdf',
          fileSize: 680000,
        },
        {
          documentName: 'Medical Registration / License',
          documentType: 'license',
          originalName: 'medical_license.pdf',
          fileUrl: '/uploads/documents/test-license.pdf',
          fileSize: 320000,
        },
      ],
      password: 'Password123!',
      confirmPassword: 'Password123!',
    }),
  });

  if (!doctorReq.ok) {
    throw new Error(`Doctor OTP request failed: ${doctorReq.data?.message}`);
  }
  console.log('✓ Doctor OTP requested successfully');

  // Simulate raw OTP 654321
  const testDoctorOtpHash = await bcrypt.hash('654321', salt);
  const doctorOtpRecord = await Otp.findOne({ email: doctorEmail.toLowerCase() });
  if (!doctorOtpRecord) throw new Error('Doctor OTP record not found');
  doctorOtpRecord.otpHash = testDoctorOtpHash;
  await doctorOtpRecord.save();

  const doctorVerify = await request(`${BASE_URL}/auth/register/verify-otp`, {
    method: 'POST',
    body: JSON.stringify({
      email: doctorEmail,
      otp: '654321',
    }),
  });

  if (!doctorVerify.ok) {
    throw new Error(`Doctor OTP verification failed: ${doctorVerify.data?.message}`);
  }

  const verifyData = doctorVerify.data?.data || {};
  console.log('✓ Doctor verified successfully! Status:', verifyData.status);
  if (verifyData.status !== 'pending_verification') {
    throw new Error(`Expected doctor status 'pending_verification', got: ${verifyData.status}`);
  }

  const application = verifyData.application;
  console.log('✓ Backend returned application object:', {
    id: application?.id,
    applicantName: application?.applicantName,
    role: application?.role,
    department: application?.department,
    status: application?.status,
    documentsCount: application?.documentsCount,
    submittedAt: application?.submittedAt,
  });

  if (!application?.id || application?.status !== 'PENDING_VERIFICATION') {
    throw new Error('Application object missing or status not PENDING_VERIFICATION!');
  }

  // 4. Verify Doctor CANNOT log in before Super Admin approval
  console.log('\n4. Verifying Doctor CANNOT log in while PENDING_VERIFICATION...');
  const doctorLoginBlocked = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: doctorEmail,
      password: 'Password123!',
    }),
  });

  if (doctorLoginBlocked.status === 403) {
    console.log('✓ Correctly blocked with HTTP 403:', doctorLoginBlocked.data?.message);
  } else {
    throw new Error(`Expected HTTP 403 for unapproved doctor, got ${doctorLoginBlocked.status}`);
  }

  // 5. Super Admin Review & Approval
  console.log('\n5. Logging in as Super Admin to verify application in review queue...');
  const adminLogin = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@hms.com',
      password: 'AdminPassword123!',
    }),
  });

  if (!adminLogin.ok) {
    throw new Error(`Admin login failed: ${adminLogin.data?.message}`);
  }
  const adminToken = adminLogin.data?.data?.accessToken;

  // Fetch application details via Super Admin Review API
  const reviewRes = await request(`${BASE_URL}/super-admin/verifications/${application.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (!reviewRes.ok) {
    throw new Error(`Super Admin review fetch failed: ${reviewRes.data?.message}`);
  }

  const reviewApp = reviewRes.data?.data || {};
  console.log('✓ Super Admin review page data retrieved:');
  console.log(`  - Applicant: ${reviewApp.applicantName} (${reviewApp.applicantEmail})`);
  console.log(`  - Role: ${reviewApp.role}, Dept: ${reviewApp.department}`);
  console.log(`  - Street Address: ${reviewApp.personalInfo?.address?.street}`);
  console.log(`  - Emergency Contact: ${reviewApp.personalInfo?.emergencyContact?.name}`);
  console.log(`  - Specialization: ${reviewApp.professionalInfo?.specialization}`);
  console.log(`  - License: ${reviewApp.professionalInfo?.licenseNumber}`);
  console.log(`  - Documents: ${reviewApp.documents?.length} documents`);

  // Approve Doctor Application
  console.log('\n6. Super Admin approving application...');
  const approveRes = await request(`${BASE_URL}/super-admin/verifications/${application.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      action: 'APPROVE',
      adminNotes: 'Verified medical council registration and credentials.',
    }),
  });

  if (!approveRes.ok) {
    throw new Error(`Approval failed: ${approveRes.data?.message}`);
  }
  console.log('✓ Application approved successfully by Super Admin! New status:', approveRes.data?.data?.status || approveRes.data?.status);

  // Verify Approved Doctor can now log in
  console.log('\n7. Testing Approved Doctor login...');
  const doctorLoginApproved = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: doctorEmail,
      password: 'Password123!',
    }),
  });

  if (!doctorLoginApproved.ok) {
    throw new Error(`Doctor login failed after approval: ${doctorLoginApproved.data?.message}`);
  }
  console.log('✓ Approved doctor logged in successfully! Role:', doctorLoginApproved.data?.data?.user?.role, 'Status:', doctorLoginApproved.data?.data?.user?.status);

  console.log('\n=== ALL UNIFIED REGISTRATION FLOW & VERIFICATION TESTS PASSED! ===');
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
