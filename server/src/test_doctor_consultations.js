/**
 * Doctor Clinical Workspace — Consultations E2E Test Suite
 * 
 * Verifies Doctor Consultations:
 * 1. Authentication & RBAC security (401 unauthenticated, 403 non-doctor)
 * 2. Scoped consultation listing (GET /api/v1/doctor/consultations)
 * 3. Search and status filters (all, completed, in-progress)
 * 4. Single consultation retrieval (GET /api/v1/doctor/consultations/:id)
 * 5. Authorization enforcement (cross-doctor 403 rejection)
 * 6. Consultation creation (POST /api/v1/doctor/consultations)
 * 7. Duplicate submission handling (updates existing record instead of duplicate)
 * 8. Consultation update (PUT /api/v1/doctor/consultations/:id)
 * 9. Missing required fields validation (400)
 * 10. Audit log entries verification
 */

const mongoose = require('mongoose');
const http = require('http');
const connectDB = require('./config/db');
const User = require('./models/User');
const Role = require('./models/Role');
const Appointment = require('./models/Appointment');
const MedicalRecord = require('./models/MedicalRecord');
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

    if (body) {
      req.write(dataString);
    }
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

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName} - ${details}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('--- DOCTOR CONSULTATIONS E2E TEST SUITE ---');
  console.log('======================================================\n');

  try {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        console.log(`Test server running on port ${serverPort}\n`);
        resolve();
      });
    });

    // 1. Setup Test Users
    let doctorRole = await Role.findOne({ name: 'DOCTOR' });
    if (!doctorRole) doctorRole = await Role.create({ name: 'DOCTOR', displayName: 'Doctor' });

    let patientRole = await Role.findOne({ name: 'PATIENT' });
    if (!patientRole) patientRole = await Role.create({ name: 'PATIENT', displayName: 'Patient' });

    // Doctor A
    const docAEmail = `doc_consult_a_${Date.now()}@hms.test`;
    const docA = await User.create({
      firstName: 'Alok',
      lastName: 'Verma',
      email: docAEmail,
      password: 'Password@123',
      role: doctorRole._id,
      roleName: 'DOCTOR',
      department: 'Cardiology',
      specialization: 'Cardiologist',
      status: 'active',
      isActive: true,
    });

    // Doctor B (for cross-doctor tests)
    const docBEmail = `doc_consult_b_${Date.now()}@hms.test`;
    const docB = await User.create({
      firstName: 'Bhavna',
      lastName: 'Patel',
      email: docBEmail,
      password: 'Password@123',
      role: doctorRole._id,
      roleName: 'DOCTOR',
      department: 'Neurology',
      specialization: 'Neurologist',
      status: 'active',
      isActive: true,
    });

    // Patient 1
    const p1Email = `pat_consult_1_${Date.now()}@hms.test`;
    const patient1 = await User.create({
      firstName: 'Ramesh',
      lastName: 'Kumar',
      email: p1Email,
      password: 'Password@123',
      role: patientRole._id,
      roleName: 'PATIENT',
      gender: 'male',
      patientId: `HMS-P-${Date.now().toString().slice(-4)}`,
      dateOfBirth: new Date('1985-05-15'),
      bloodGroup: 'B+',
      phone: '9876543210',
      allergies: ['Penicillin', 'Sulfa drugs'],
      emergencyContact: { name: 'Sita Kumar', relationship: 'Spouse', phone: '9876543211' },
      status: 'active',
      isActive: true,
    });

    // Patient 2
    const p2Email = `pat_consult_2_${Date.now()}@hms.test`;
    const patient2 = await User.create({
      firstName: 'Pooja',
      lastName: 'Singh',
      email: p2Email,
      password: 'Password@123',
      role: patientRole._id,
      roleName: 'PATIENT',
      gender: 'female',
      patientId: `HMS-P-${(Date.now() + 1).toString().slice(-4)}`,
      dateOfBirth: new Date('1992-09-20'),
      bloodGroup: 'O+',
      phone: '9876543212',
      allergies: [],
      status: 'active',
      isActive: true,
    });

    // Login tokens
    const tokenDocA = await loginUser(docAEmail, 'Password@123');
    const tokenDocB = await loginUser(docBEmail, 'Password@123');
    const tokenPat1 = await loginUser(p1Email, 'Password@123');

    // Create an Appointment for Doctor A and Patient 1
    const today = new Date();
    const aptA1 = await Appointment.create({
      patient: patient1._id,
      doctor: docA._id,
      department: 'Cardiology',
      appointmentDate: today,
      appointmentTime: '10:00 AM',
      status: 'In-Progress',
      reason: 'Chest pain and palpitations',
    });

    // Create a past MedicalRecord for Doctor A and Patient 2
    const pastRecord = await MedicalRecord.create({
      patient: patient2._id,
      doctor: docA._id,
      consultationDate: new Date(Date.now() - 86400000 * 2),
      diagnosis: 'Hypertension Stage 1',
      symptoms: ['Headache', 'Dizziness'],
      clinicalNotes: 'BP elevated on 3 consecutive visits. Mild arterial stiffness noted.',
      treatment: 'Lifestyle modification, Amlodipine 5mg OD, low salt diet.',
      vitals: { bp: '142/90 mmHg', heartRate: '78 bpm', temperature: '98.4 °F', spo2: '98%', weight: '68 kg' },
      followUpDate: new Date(Date.now() + 86400000 * 14),
    });

    console.log('--- 1. AUTHENTICATION & RBAC SECURITY ---');
    {
      const unauth = await makeRequest('GET', '/api/v1/doctor/consultations');
      assert(unauth.status === 401, 'Unauthenticated request rejected with 401', `Got status ${unauth.status}`);

      const nonDoc = await makeRequest('GET', '/api/v1/doctor/consultations', null, {
        Authorization: `Bearer ${tokenPat1}`,
      });
      assert(nonDoc.status === 403, 'Non-doctor (Patient) rejected with 403', `Got status ${nonDoc.status}`);
    }

    console.log('\n--- 2. GET /api/v1/doctor/consultations (LISTING & SCOPING) ---');
    {
      const res = await makeRequest('GET', '/api/v1/doctor/consultations', null, {
        Authorization: `Bearer ${tokenDocA}`,
      });
      assert(res.status === 200, 'Doctor A can fetch consultations list', `Status: ${res.status}`);
      assert(res.data.success === true, 'Response indicates success');
      const consultations = res.data.data.consultations;
      assert(Array.isArray(consultations), 'Consultations returned as an array');
      assert(consultations.length >= 2, 'Contains both in-progress visit and completed record', `Count: ${consultations.length}`);

      // Summary checks
      assert(res.data.data.summary.completed >= 1, 'Summary has completed count');
      assert(res.data.data.summary.inProgress >= 1, 'Summary has in-progress count');
    }

    console.log('\n--- 3. FILTERS & SEARCH ---');
    {
      // Status filter: completed
      const resCompleted = await makeRequest('GET', '/api/v1/doctor/consultations?status=completed', null, {
        Authorization: `Bearer ${tokenDocA}`,
      });
      assert(resCompleted.status === 200, 'Status=completed filter succeeds');
      assert(resCompleted.data.data.consultations.every((c) => c.status === 'Completed'), 'All items are Completed');

      // Status filter: in-progress
      const resInProgress = await makeRequest('GET', '/api/v1/doctor/consultations?status=in-progress', null, {
        Authorization: `Bearer ${tokenDocA}`,
      });
      assert(resInProgress.status === 200, 'Status=in-progress filter succeeds');
      assert(resInProgress.data.data.consultations.every((c) => c.status === 'In-Progress'), 'All items are In-Progress');

      // Search by patient name
      const resSearch = await makeRequest('GET', `/api/v1/doctor/consultations?search=${encodeURIComponent('Pooja')}`, null, {
        Authorization: `Bearer ${tokenDocA}`,
      });
      assert(resSearch.status === 200, 'Search by name returns 200');
      assert(resSearch.data.data.consultations.length >= 1, 'Found patient Pooja');
      assert(resSearch.data.data.consultations[0].patientName.includes('Pooja'), 'Matched patient name');

      // Search by diagnosis
      const resSearchDiag = await makeRequest('GET', `/api/v1/doctor/consultations?search=${encodeURIComponent('Hypertension')}`, null, {
        Authorization: `Bearer ${tokenDocA}`,
      });
      assert(resSearchDiag.status === 200, 'Search by diagnosis returns 200');
      assert(resSearchDiag.data.data.consultations.some((c) => c.diagnosis.includes('Hypertension')), 'Matched diagnosis');
    }

    console.log('\n--- 4. GET /api/v1/doctor/consultations/:id ---');
    {
      // Fetch MedicalRecord by ID
      const resRecord = await makeRequest('GET', `/api/v1/doctor/consultations/${pastRecord._id}`, null, {
        Authorization: `Bearer ${tokenDocA}`,
      });
      assert(resRecord.status === 200, 'Doctor A can retrieve their MedicalRecord consultation');
      assert(resRecord.data.data.consultation.diagnosis === 'Hypertension Stage 1', 'Diagnosis matches');
      assert(resRecord.data.data.consultation.patientName.includes('Pooja'), 'Patient name populated');
      assert(resRecord.data.data.consultation.vitals.bp === '142/90 mmHg', 'Vitals populated');

      // Fetch active Appointment visit by ID
      const resApt = await makeRequest('GET', `/api/v1/doctor/consultations/${aptA1._id}`, null, {
        Authorization: `Bearer ${tokenDocA}`,
      });
      assert(resApt.status === 200, 'Doctor A can retrieve active appointment visit');
      assert(resApt.data.data.consultation.patientName.includes('Ramesh'), 'Patient Ramesh Kumar loaded');
      assert(resApt.data.data.consultation.patientAllergies.includes('Penicillin'), 'Allergies displayed');

      // Non-existent ID returns 404
      const nonExistentId = new mongoose.Types.ObjectId();
      const resNotFound = await makeRequest('GET', `/api/v1/doctor/consultations/${nonExistentId}`, null, {
        Authorization: `Bearer ${tokenDocA}`,
      });
      assert(resNotFound.status === 404, 'Non-existent consultation returns 404');
    }

    console.log('\n--- 5. CROSS-DOCTOR ACCESS REJECTION (403 FORBIDDEN) ---');
    {
      // Doctor B attempts to view Doctor A's MedicalRecord
      const resCrossRecord = await makeRequest('GET', `/api/v1/doctor/consultations/${pastRecord._id}`, null, {
        Authorization: `Bearer ${tokenDocB}`,
      });
      assert(resCrossRecord.status === 403, 'Doctor B rejected with 403 on Doctor A MedicalRecord', `Status: ${resCrossRecord.status}`);

      // Doctor B attempts to view Doctor A's active Appointment
      const resCrossApt = await makeRequest('GET', `/api/v1/doctor/consultations/${aptA1._id}`, null, {
        Authorization: `Bearer ${tokenDocB}`,
      });
      assert(resCrossApt.status === 403, 'Doctor B rejected with 403 on Doctor A Appointment', `Status: ${resCrossApt.status}`);
    }

    console.log('\n--- 6. POST /api/v1/doctor/consultations (CREATE & DUPLICATE PREVENT) ---');
    let createdRecordId;
    {
      // Missing required fields
      const resBad = await makeRequest('POST', '/api/v1/doctor/consultations', {
        patientId: String(patient1._id),
        diagnosis: '', // empty diagnosis
      }, {
        Authorization: `Bearer ${tokenDocA}`,
      });
      assert(resBad.status === 400, 'Empty diagnosis rejected with 400', `Status: ${resBad.status}`);

      // Doctor B attempting to complete Doctor A's appointment returns 403
      const resCrossSave = await makeRequest('POST', '/api/v1/doctor/consultations', {
        patientId: String(patient1._id),
        appointmentId: String(aptA1._id),
        diagnosis: 'Angina Pectoris',
      }, {
        Authorization: `Bearer ${tokenDocB}`,
      });
      assert(resCrossSave.status === 403, 'Cross-doctor appointment completion rejected with 403');

      // Valid consultation completion by Doctor A
      const resCreate = await makeRequest('POST', '/api/v1/doctor/consultations', {
        patientId: String(patient1._id),
        appointmentId: String(aptA1._id),
        diagnosis: 'Supraventricular Tachycardia',
        symptoms: ['Palpitations', 'Lightheadedness'],
        clinicalNotes: 'ECG shows narrow-complex tachycardia at 160 bpm. Vagal maneuvers performed with partial relief.',
        treatment: 'Metoprolol 25mg BD, repeat ECG in 1 week, avoid caffeine.',
        vitals: { bp: '118/76 mmHg', heartRate: '120 bpm', temperature: '98.6 °F', spo2: '99%', weight: '74 kg' },
        followUpDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
      }, {
        Authorization: `Bearer ${tokenDocA}`,
      });
      assert(resCreate.status === 201, 'Doctor A successfully completes consultation (201)', `Status: ${resCreate.status}`);
      createdRecordId = resCreate.data.data.id;
      assert(createdRecordId, 'Returns created consultation ID');

      // Verify linked appointment is now Completed
      const updatedApt = await Appointment.findById(aptA1._id);
      assert(updatedApt.status === 'Completed', 'Linked appointment marked Completed');

      // Test duplicate submission: submitting again for the same appointment updates record rather than duplicating
      const resResubmit = await makeRequest('POST', '/api/v1/doctor/consultations', {
        patientId: String(patient1._id),
        appointmentId: String(aptA1._id),
        diagnosis: 'Supraventricular Tachycardia (Confirmed)',
        clinicalNotes: 'Updated with second rhythm strip.',
        treatment: 'Metoprolol 50mg BD',
      }, {
        Authorization: `Bearer ${tokenDocA}`,
      });
      assert(resResubmit.status === 200, 'Duplicate submission updates existing record (200 OK)');
      assert(String(resResubmit.data.data.id) === String(createdRecordId), 'Same record ID retained without duplication');

      const totalRecordsForApt = await MedicalRecord.countDocuments({ appointment: aptA1._id });
      assert(totalRecordsForApt === 1, 'Exactly 1 MedicalRecord exists for this appointment (zero duplication)');
    }

    console.log('\n--- 7. PUT /api/v1/doctor/consultations/:id (UPDATE NOTES) ---');
    {
      // Doctor B cannot update Doctor A's consultation
      const resCrossUpdate = await makeRequest('PUT', `/api/v1/doctor/consultations/${createdRecordId}`, {
        clinicalNotes: 'Hacked by Doctor B',
      }, {
        Authorization: `Bearer ${tokenDocB}`,
      });
      assert(resCrossUpdate.status === 403, 'Doctor B rejected with 403 on update', `Status: ${resCrossUpdate.status}`);

      // Doctor A can update clinical documentation
      const resUpdate = await makeRequest('PUT', `/api/v1/doctor/consultations/${createdRecordId}`, {
        clinicalNotes: 'Final addendum: Holter monitor ordered.',
        treatment: 'Metoprolol 50mg BD, 24h Holter monitoring.',
        vitals: { bp: '120/80 mmHg', heartRate: '76 bpm' },
      }, {
        Authorization: `Bearer ${tokenDocA}`,
      });
      assert(resUpdate.status === 200, 'Doctor A updates consultation documentation');

      const reloaded = await MedicalRecord.findById(createdRecordId);
      assert(reloaded.clinicalNotes === 'Final addendum: Holter monitor ordered.', 'Clinical notes updated in DB');
      assert(reloaded.treatment.includes('Holter monitoring'), 'Treatment plan updated in DB');
    }

    console.log('\n--- 8. AUDIT LOGGING VERIFICATION ---');
    {
      const createLog = await AuditLog.findOne({
        user: docA._id,
        action: 'CREATE_CONSULTATION',
        resourceId: String(createdRecordId),
      });
      assert(createLog !== null, 'Audit log created for consultation creation');
      assert(createLog.module === 'consultations', 'Audit log module is consultations');

      const updateLog = await AuditLog.findOne({
        user: docA._id,
        action: 'UPDATE_CONSULTATION',
        resourceId: String(createdRecordId),
      });
      assert(updateLog !== null, 'Audit log created for consultation update');
    }

    console.log('\n======================================================');
    console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('======================================================\n');

    if (failedTests > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Test suite failed with unexpected error:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
}

runTests();
