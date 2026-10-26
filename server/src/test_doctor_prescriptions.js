/**
 * Doctor Clinical Workspace — Prescriptions E2E Test Suite
 * 
 * Verifies Doctor Prescriptions:
 * 1. Authentication & RBAC security (401 unauthenticated, 403 non-doctor)
 * 2. Scoped prescription listing (GET /api/v1/doctor/prescriptions)
 * 3. Search and status filters (all, active, completed, discontinued)
 * 4. Single prescription retrieval (GET /api/v1/doctor/prescriptions/:id)
 * 5. Authorization enforcement (cross-doctor 403 rejection)
 * 6. Prescription creation (POST /api/v1/doctor/prescriptions) with validation
 * 7. Duplicate submission handling (returns existing within 30s window)
 * 8. Status update / Discontinue prescription (PATCH /api/v1/doctor/prescriptions/:id/status)
 * 9. Medicines catalog for prescribing (GET /api/v1/doctor/medicines)
 * 10. Audit log entries verification
 */

const mongoose = require('mongoose');
const http = require('http');
const connectDB = require('./config/db');
const User = require('./models/User');
const Role = require('./models/Role');
const Appointment = require('./models/Appointment');
const Prescription = require('./models/Prescription');
const AuditLog = require('./models/AuditLog');
const app = require('./app');

let server;
let serverPort;

function makeRequest(method, reqPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const reqHeaders = { ...headers };
    if (body) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: serverPort,
        path: reqPath,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => {
          resData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = resData ? JSON.parse(resData) : null;
            resolve({ status: res.statusCode, data: parsed, headers: res.headers });
          } catch (e) {
            resolve({ status: res.statusCode, data: resData, headers: res.headers });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (body) req.write(dataString);
    req.end();
  });
}

async function loginUser(email, password) {
  const res = await makeRequest('POST', '/api/v1/auth/login', { email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return res.data?.data?.accessToken || res.data?.accessToken || res.data?.data?.tokens?.accessToken || res.data?.data?.token;
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🩺 HMS DOCTOR CLINICAL WORKSPACE — PRESCRIPTIONS E2E');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        console.log(`Test HTTP server listening on port ${serverPort}\n`);
        resolve();
      });
    });

    // 1. Setup isolated test users
    let doctorRole = await Role.findOne({ name: 'doctor' });
    if (!doctorRole) doctorRole = await Role.findOne({ name: 'DOCTOR' });
    if (!doctorRole) doctorRole = await Role.create({ name: 'doctor', displayName: 'Doctor' });

    let patientRole = await Role.findOne({ name: 'patient' });
    if (!patientRole) patientRole = await Role.findOne({ name: 'PATIENT' });
    if (!patientRole) patientRole = await Role.create({ name: 'patient', displayName: 'Patient' });

    const timestamp = Date.now();

    const doctorA = await User.create({
      firstName: 'Vikram',
      lastName: 'Seth',
      email: `test_doc_rx_a_${timestamp}@hospital.test`,
      password: 'Password123!',
      role: doctorRole._id,
      department: 'General Medicine',
      specialization: 'Internal Medicine',
      status: 'active',
      isActive: true,
    });

    const doctorB = await User.create({
      firstName: 'Ananya',
      lastName: 'Roy',
      email: `test_doc_rx_b_${timestamp}@hospital.test`,
      password: 'Password123!',
      role: doctorRole._id,
      department: 'Cardiology',
      specialization: 'Cardiologist',
      status: 'active',
      isActive: true,
    });

    const patient = await User.create({
      firstName: 'Ramesh',
      lastName: 'Gupta',
      email: `test_patient_rx_${timestamp}@hospital.test`,
      password: 'Password123!',
      role: patientRole._id,
      gender: 'male',
      bloodGroup: 'B+',
      allergies: ['Penicillin', 'Sulfa drugs'],
      status: 'active',
      isActive: true,
    });

    console.log(`Doctor A: ${doctorA.email} (${doctorA._id})`);
    console.log(`Doctor B: ${doctorB.email} (${doctorB._id})`);
    console.log(`Patient:  ${patient.email} (${patient._id})\n`);

    // Login tokens
    const tokenDocA = await loginUser(doctorA.email, 'Password123!');
    const tokenDocB = await loginUser(doctorB.email, 'Password123!');
    const tokenPatient = await loginUser(patient.email, 'Password123!');

    assert(!!tokenDocA, 'Doctor A authenticated successfully');
    assert(!!tokenDocB, 'Doctor B authenticated successfully');
    assert(!!tokenPatient, 'Patient authenticated successfully');

    // -------------------------------------------------------------------------
    // TEST SUITE 1: Security & RBAC Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Security & RBAC Enforcement ---');

    // 1.1 Unauthenticated request rejected with 401
    const unauthRes = await makeRequest('GET', '/api/v1/doctor/prescriptions');
    assert(unauthRes.status === 401, 'Unauthenticated request receives 401 Unauthorized', `status: ${unauthRes.status}`);

    // 1.2 Non-doctor role rejected with 403
    const nonDoctorRes = await makeRequest(
      'GET',
      '/api/v1/doctor/prescriptions',
      null,
      { Authorization: `Bearer ${tokenPatient}` }
    );
    assert(nonDoctorRes.status === 403, 'Patient role receives 403 Forbidden on doctor prescriptions', `status: ${nonDoctorRes.status}`);

    // -------------------------------------------------------------------------
    // TEST SUITE 2: Medicines Catalog Endpoint
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Medicines Catalog Endpoint ---');

    const medsRes = await makeRequest(
      'GET',
      '/api/v1/doctor/medicines',
      null,
      { Authorization: `Bearer ${tokenDocA}` }
    );
    assert(medsRes.status === 200, 'GET /api/v1/doctor/medicines returns 200 OK');
    const catalogMeds = medsRes.data?.data?.medicines || [];
    assert(catalogMeds.length > 0, 'Catalog contains standard prescription items', `count: ${catalogMeds.length}`);
    assert(!!catalogMeds[0]?.name && !!catalogMeds[0]?.strength, 'Catalog items include name and strength');

    // -------------------------------------------------------------------------
    // TEST SUITE 3: Prescription Creation & Validation
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Prescription Creation & Validation ---');

    // 3.1 Validation: Missing patientId
    const missingPatientRes = await makeRequest(
      'POST',
      '/api/v1/doctor/prescriptions',
      {
        medications: [{ name: 'Paracetamol', dosage: '650mg', frequency: 'TDS', duration: '3 days' }],
      },
      { Authorization: `Bearer ${tokenDocA}` }
    );
    assert(missingPatientRes.status === 400, 'Creation rejected with 400 when patientId is missing');

    // 3.2 Validation: Empty medications list
    const emptyMedsRes = await makeRequest(
      'POST',
      '/api/v1/doctor/prescriptions',
      {
        patientId: patient._id.toString(),
        medications: [],
      },
      { Authorization: `Bearer ${tokenDocA}` }
    );
    assert(emptyMedsRes.status === 400, 'Creation rejected with 400 when medications array is empty');

    // 3.3 Validation: Missing dosage in item
    const missingDosageRes = await makeRequest(
      'POST',
      '/api/v1/doctor/prescriptions',
      {
        patientId: patient._id.toString(),
        medications: [{ name: 'Amoxicillin', dosage: '', frequency: 'BD', duration: '5 days' }],
      },
      { Authorization: `Bearer ${tokenDocA}` }
    );
    assert(missingDosageRes.status === 400, 'Creation rejected with 400 when medication dosage is blank');

    // 3.4 Successful Prescription Creation by Doctor A
    const validRxPayload = {
      patientId: patient._id.toString(),
      diagnosis: 'Acute Upper Respiratory Tract Infection',
      medications: [
        {
          name: 'Amoxicillin & Clavulanate',
          dosage: '625 mg',
          frequency: 'Twice daily after meals',
          duration: '5 days',
          instructions: 'Take with food or milk',
        },
        {
          name: 'Paracetamol',
          dosage: '650 mg',
          frequency: 'Thrice daily',
          duration: '3 days',
          instructions: 'Take SOS for fever or pain',
        },
      ],
      notes: 'Drink plenty of warm fluids. Return if symptoms worsen after 48 hours.',
    };

    const createRes = await makeRequest(
      'POST',
      '/api/v1/doctor/prescriptions',
      validRxPayload,
      { Authorization: `Bearer ${tokenDocA}` }
    );

    assert(createRes.status === 201, 'POST /api/v1/doctor/prescriptions creates prescription (201 Created)', `status: ${createRes.status}`);
    const createdRx = createRes.data?.data;
    assert(!!createdRx?.id, 'Response contains prescription ID');
    assert(createdRx?.prescriptionCode?.startsWith('RX-'), `Response includes formatted prescriptionCode: ${createdRx?.prescriptionCode}`);
    assert(createdRx?.status === 'Active', 'Created prescription status is Active');

    // 3.5 Rapid duplicate submission protection
    const dupRes = await makeRequest(
      'POST',
      '/api/v1/doctor/prescriptions',
      validRxPayload,
      { Authorization: `Bearer ${tokenDocA}` }
    );
    assert(dupRes.status === 200, 'Duplicate submission handled gracefully (200 OK)');
    assert(dupRes.data?.data?.id === createdRx.id, 'Duplicate returns existing prescription ID');

    // -------------------------------------------------------------------------
    // TEST SUITE 4: Prescriptions Directory Listing & Scoping
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Prescriptions Directory Listing & Scoping ---');

    const listRes = await makeRequest(
      'GET',
      '/api/v1/doctor/prescriptions',
      null,
      { Authorization: `Bearer ${tokenDocA}` }
    );

    assert(listRes.status === 200, 'GET /api/v1/doctor/prescriptions returns 200 OK');
    const listData = listRes.data?.data;
    assert(Array.isArray(listData?.prescriptions), 'Response contains prescriptions array');
    assert(listData?.summary?.total >= 1, `Summary contains total >= 1: ${listData?.summary?.total}`);
    assert(listData?.summary?.active >= 1, `Summary contains active >= 1: ${listData?.summary?.active}`);

    const foundInList = listData.prescriptions.find((p) => p.id === createdRx.id);
    assert(!!foundInList, 'Created prescription appears in Doctor A listing');
    assert(foundInList?.patientName === `${patient.firstName} ${patient.lastName || ''}`.trim(), 'Prescription patient name populated');
    assert(foundInList?.medications?.length === 2, 'Prescription medications list preserved');

    // 4.2 Status Filtering
    const activeFilterRes = await makeRequest(
      'GET',
      '/api/v1/doctor/prescriptions?status=Active',
      null,
      { Authorization: `Bearer ${tokenDocA}` }
    );
    assert(activeFilterRes.status === 200, 'Filter status=Active returns 200 OK');
    const allActive = activeFilterRes.data?.data?.prescriptions.every((p) => p.status === 'Active');
    assert(allActive, 'All returned items in status=Active filter have status Active');

    // 4.3 Search Filtering
    const searchRes = await makeRequest(
      'GET',
      `/api/v1/doctor/prescriptions?search=${encodeURIComponent(createdRx.prescriptionCode)}`,
      null,
      { Authorization: `Bearer ${tokenDocA}` }
    );
    assert(searchRes.status === 200, 'Search by Rx code returns 200 OK');
    assert(searchRes.data?.data?.prescriptions.length >= 1, 'Search finds matching prescription');

    // -------------------------------------------------------------------------
    // TEST SUITE 5: Single Prescription Details & Data Population
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Single Prescription Details & Data Population ---');

    const detailsRes = await makeRequest(
      'GET',
      `/api/v1/doctor/prescriptions/${createdRx.id}`,
      null,
      { Authorization: `Bearer ${tokenDocA}` }
    );

    assert(detailsRes.status === 200, 'GET /api/v1/doctor/prescriptions/:id returns 200 OK');
    const details = detailsRes.data?.data?.prescription;
    assert(details?.id === createdRx.id, 'Fetched prescription matches requested ID');
    assert(!!details?.doctorName, `Prescribing doctor populated: ${details?.doctorName}`);
    assert(details?.diagnosis === validRxPayload.diagnosis, 'Diagnosis preserved');
    assert(details?.medications?.length === 2, 'All medication items present');
    assert(details?.medications[0]?.dosage === '625 mg', 'Medication dosage accurate');
    assert(details?.notes === validRxPayload.notes, 'Notes preserved');
    assert(Array.isArray(details?.patientAllergies) && details?.patientAllergies.includes('Penicillin'), 'Patient allergies populated');

    // -------------------------------------------------------------------------
    // TEST SUITE 6: Cross-Doctor Isolation & RBAC Rejection
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Cross-Doctor Isolation & RBAC Rejection ---');

    // 6.1 Doctor B attempting to view Doctor A's prescription receives 403
    const crossViewRes = await makeRequest(
      'GET',
      `/api/v1/doctor/prescriptions/${createdRx.id}`,
      null,
      { Authorization: `Bearer ${tokenDocB}` }
    );
    assert(crossViewRes.status === 403, 'Doctor B receives 403 Forbidden viewing Doctor A prescription', `status: ${crossViewRes.status}`);

    // 6.2 Doctor B attempting to update Doctor A's prescription status receives 403
    const crossUpdateRes = await makeRequest(
      'PATCH',
      `/api/v1/doctor/prescriptions/${createdRx.id}/status`,
      { status: 'Discontinued', reason: 'Unauthorized attempt' },
      { Authorization: `Bearer ${tokenDocB}` }
    );
    assert(crossUpdateRes.status === 403, 'Doctor B receives 403 Forbidden modifying Doctor A prescription', `status: ${crossUpdateRes.status}`);

    // 6.3 Doctor B's listing does not show Doctor A's prescription
    const docBListRes = await makeRequest(
      'GET',
      '/api/v1/doctor/prescriptions',
      null,
      { Authorization: `Bearer ${tokenDocB}` }
    );
    const docBList = docBListRes.data?.data?.prescriptions || [];
    const leakedRx = docBList.find((p) => p.id === createdRx.id);
    assert(!leakedRx, 'Doctor B listing does not leak Doctor A prescriptions');

    // -------------------------------------------------------------------------
    // TEST SUITE 7: Status Updates (Discontinue Prescription)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Status Updates (Discontinue Prescription) ---');

    // 7.1 Invalid status rejected with 400
    const invalidStatusRes = await makeRequest(
      'PATCH',
      `/api/v1/doctor/prescriptions/${createdRx.id}/status`,
      { status: 'PendingReview' },
      { Authorization: `Bearer ${tokenDocA}` }
    );
    assert(invalidStatusRes.status === 400, 'Invalid status update receives 400 Bad Request');

    // 7.2 Doctor A updates status to Discontinued
    const discontinueRes = await makeRequest(
      'PATCH',
      `/api/v1/doctor/prescriptions/${createdRx.id}/status`,
      { status: 'Discontinued', reason: 'Patient developed mild gastrointestinal upset' },
      { Authorization: `Bearer ${tokenDocA}` }
    );
    assert(discontinueRes.status === 200, 'Discontinue prescription returns 200 OK', `status: ${discontinueRes.status}`);
    assert(discontinueRes.data?.data?.status === 'Discontinued', 'Prescription status updated to Discontinued');

    // Verify status persists in DB
    const verifyDoc = await Prescription.findById(createdRx.id);
    assert(verifyDoc.status === 'Discontinued', 'Prescription status in DB is Discontinued');
    assert(verifyDoc.notes.includes('Status changed to Discontinued'), 'Discontinuation reason appended to notes');

    // -------------------------------------------------------------------------
    // TEST SUITE 8: Audit Log Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Audit Log Verification ---');

    const createAudit = await AuditLog.findOne({
      action: 'CREATE_PRESCRIPTION',
      resourceId: String(createdRx.id),
    });
    assert(!!createAudit, 'AuditLog entry created for CREATE_PRESCRIPTION');
    assert(createAudit?.status === 'SUCCESS', 'AuditLog CREATE_PRESCRIPTION marked SUCCESS');

    const statusAudit = await AuditLog.findOne({
      action: 'UPDATE_PRESCRIPTION_STATUS',
      resourceId: String(createdRx.id),
    });
    assert(!!statusAudit, 'AuditLog entry created for UPDATE_PRESCRIPTION_STATUS');
    assert(statusAudit?.details?.newStatus === 'Discontinued', 'AuditLog records correct new status');

    // Cleanup test users
    await Prescription.deleteMany({ patient: patient._id });
    await User.deleteMany({ _id: { $in: [doctorA._id, doctorB._id, patient._id] } });

  } catch (err) {
    console.error('Test run error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.connection.close();

    console.log('\n======================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
