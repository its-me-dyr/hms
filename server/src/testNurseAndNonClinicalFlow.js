/**
 * Test Nurse, Non-Clinical (Receptionist), Under Review, and Rejection Lifecycle
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

async function run() {
  console.log('=== TESTING NURSE, RECEPTIONIST, REJECTION & UNDER REVIEW ===\n');

  require('dotenv').config();
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hms';
  await mongoose.connect(mongoUri);
  const Otp = require('./models/Otp');

  const timestamp = Date.now();

  // 1. Nurse Registration & Under Review
  console.log('1. Testing Nurse Registration & Under Review...');
  const nurseEmail = `nurse.test.${timestamp}@hms.com`;
  const nurseReq = await request(`${BASE_URL}/auth/register/request-otp`, {
    method: 'POST',
    body: JSON.stringify({
      firstName: 'Clara',
      lastName: 'Barton',
      email: nurseEmail,
      phone: '+15558881111',
      dateOfBirth: '1992-06-15',
      gender: 'female',
      role: 'nurse',
      address: {
        street: '12 Nightingale Lane',
        city: 'Boston',
        state: 'MA',
        postalCode: '02115',
        country: 'United States',
      },
      emergencyContact: {
        name: 'David Barton',
        phone: '+15558882222',
        relation: 'Father',
      },
      department: 'Emergency Medicine',
      qualification: 'B.Sc Nursing, RN',
      institution: 'Boston College School of Nursing',
      yearsOfExperience: 6,
      licenseNumber: 'RN-MA-884920',
      previousOrganization: 'Massachusetts General Hospital',
      professionalDescription: 'Trauma and triage registered nurse with advanced cardiac life support certification.',
      documents: [
        {
          documentName: 'Government Photo ID',
          documentType: 'identity',
          originalName: 'license_id.pdf',
          fileUrl: '/uploads/documents/nurse-id.pdf',
          fileSize: 300000,
        },
        {
          documentName: 'Nursing Qualification Certificate',
          documentType: 'qualification_cert',
          originalName: 'nursing_degree.pdf',
          fileUrl: '/uploads/documents/nurse-deg.pdf',
          fileSize: 500000,
        },
        {
          documentName: 'Nursing Council Registration / License',
          documentType: 'license',
          originalName: 'nursing_license.pdf',
          fileUrl: '/uploads/documents/nurse-lic.pdf',
          fileSize: 400000,
        },
      ],
      password: 'Password123!',
      confirmPassword: 'Password123!',
    }),
  });

  if (!nurseReq.ok) throw new Error(`Nurse OTP request failed: ${nurseReq.data?.message}`);

  const salt = await bcrypt.genSalt(10);
  const nurseOtpHash = await bcrypt.hash('888999', salt);
  const nurseOtpRecord = await Otp.findOne({ email: nurseEmail.toLowerCase() });
  nurseOtpRecord.otpHash = nurseOtpHash;
  await nurseOtpRecord.save();

  const nurseVerify = await request(`${BASE_URL}/auth/register/verify-otp`, {
    method: 'POST',
    body: JSON.stringify({ email: nurseEmail, otp: '888999' }),
  });

  if (!nurseVerify.ok) throw new Error(`Nurse OTP verify failed: ${nurseVerify.data?.message}`);
  const nurseApp = nurseVerify.data?.data?.application;
  console.log('✓ Nurse registered with status: PENDING_VERIFICATION. App ID:', nurseApp?.id);

  // Admin login
  const adminLogin = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@hms.com', password: 'AdminPassword123!' }),
  });
  const adminToken = adminLogin.data?.data?.accessToken;

  // Mark Under Review
  console.log('\n2. Testing Super Admin Mark Under Review on Nurse application...');
  const underReviewRes = await request(`${BASE_URL}/super-admin/verifications/${nurseApp.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ action: 'UNDER_REVIEW', adminNotes: 'Contacting state nursing board for active status.' }),
  });

  if (!underReviewRes.ok) throw new Error(`Under review update failed: ${underReviewRes.data?.message}`);
  console.log('✓ Nurse application marked UNDER_REVIEW successfully!');

  // Verify nurse still cannot log in while UNDER_REVIEW
  const nurseLoginUnderReview = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: nurseEmail, password: 'Password123!' }),
  });
  if (nurseLoginUnderReview.status === 403) {
    console.log('✓ Nurse correctly blocked while under review with message:', nurseLoginUnderReview.data?.message);
  } else {
    throw new Error(`Expected HTTP 403, got ${nurseLoginUnderReview.status}`);
  }

  // 3. Non-Clinical Staff (Receptionist) Registration & Rejection
  console.log('\n3. Testing Non-Clinical Staff (Receptionist) Registration (No medical license required)...');
  const recEmail = `receptionist.test.${timestamp}@hms.com`;
  const recReq = await request(`${BASE_URL}/auth/register/request-otp`, {
    method: 'POST',
    body: JSON.stringify({
      firstName: 'Emily',
      lastName: 'Clark',
      email: recEmail,
      phone: '+15557773333',
      dateOfBirth: '1998-02-10',
      gender: 'female',
      role: 'receptionist',
      address: {
        street: '88 Oak Street',
        city: 'Springfield',
        state: 'IL',
        postalCode: '62704',
        country: 'United States',
      },
      emergencyContact: {
        name: 'James Clark',
        phone: '+15557774444',
        relation: 'Spouse',
      },
      department: 'Front Desk & Patient Services',
      qualification: 'Associate of Arts in Healthcare Administration',
      institution: 'Springfield Community College',
      yearsOfExperience: 3,
      previousOrganization: 'City Outpatient Clinic',
      professionalDescription: 'Front desk receptionist with 3 years experience handling patient check-ins and appointments.',
      documents: [
        {
          documentName: 'Government Photo ID',
          documentType: 'identity',
          originalName: 'driver_license.png',
          fileUrl: '/uploads/documents/rec-id.png',
          fileSize: 250000,
        },
        {
          documentName: 'Educational / Qualification Certificate',
          documentType: 'qualification_cert',
          originalName: 'aa_degree.pdf',
          fileUrl: '/uploads/documents/rec-degree.pdf',
          fileSize: 450000,
        },
      ],
      password: 'Password123!',
      confirmPassword: 'Password123!',
    }),
  });

  if (!recReq.ok) throw new Error(`Receptionist OTP request failed: ${recReq.data?.message}`);

  const recOtpHash = await bcrypt.hash('777888', salt);
  const recOtpRecord = await Otp.findOne({ email: recEmail.toLowerCase() });
  recOtpRecord.otpHash = recOtpHash;
  await recOtpRecord.save();

  const recVerify = await request(`${BASE_URL}/auth/register/verify-otp`, {
    method: 'POST',
    body: JSON.stringify({ email: recEmail, otp: '777888' }),
  });

  if (!recVerify.ok) throw new Error(`Receptionist OTP verify failed: ${recVerify.data?.message}`);
  const recApp = recVerify.data?.data?.application;
  console.log('✓ Receptionist registered without medical license! Status: PENDING_VERIFICATION, App ID:', recApp?.id);

  // 4. Test Rejection without reason (Must fail)
  console.log('\n4. Testing Super Admin Rejection without mandatory reason (must fail)...');
  const rejectWithoutReason = await request(`${BASE_URL}/super-admin/verifications/${recApp.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ action: 'REJECT', rejectionReason: '' }),
  });
  if (rejectWithoutReason.status === 400) {
    console.log('✓ Correctly rejected with HTTP 400:', rejectWithoutReason.data?.message);
  } else {
    throw new Error(`Expected HTTP 400 for empty rejection reason, got ${rejectWithoutReason.status}`);
  }

  // 5. Reject with reason
  console.log('\n5. Rejecting Receptionist application with mandatory reason...');
  const rejectWithReason = await request(`${BASE_URL}/super-admin/verifications/${recApp.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      action: 'REJECT',
      rejectionReason: 'Government photo ID copy is expired. Please provide a valid, current ID.',
    }),
  });

  if (!rejectWithReason.ok) throw new Error(`Rejection failed: ${rejectWithReason.data?.message}`);
  console.log('✓ Receptionist application rejected successfully! New status:', rejectWithReason.data?.data?.status || rejectWithReason.data?.status);

  // Verify rejected applicant login provides clear rejection feedback
  console.log('\n6. Checking rejected applicant login message...');
  const recLoginRejected = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: recEmail, password: 'Password123!' }),
  });

  if (recLoginRejected.status === 403 && recLoginRejected.data?.message?.includes('rejected')) {
    console.log('✓ Correctly blocked rejected applicant with message:', recLoginRejected.data?.message);
  } else {
    throw new Error(`Expected HTTP 403 rejection message, got: ${recLoginRejected.data?.message}`);
  }

  console.log('\n=== ALL NURSE, NON-CLINICAL, UNDER REVIEW & REJECTION TESTS PASSED! ===');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
