/**
 * Comprehensive Doctor Patients E2E Test Suite
 * 
 * Verifies Doctor Clinical Workspace — My Patients:
 * 1. Authentication & RBAC security (401 unauthenticated, 403 non-doctor)
 * 2. Scoped assigned patient retrieval (appointments & consultations)
 * 3. Real summary calculations (Total Assigned, Active, Inactive, Recent Visits)
 * 4. Search filtering (patient name, ID, phone)
 * 5. Status filtering (all, active, inactive)
 * 6. Sorting (lastVisit, name)
 * 7. Real last visit & next follow-up dates
 * 8. Doctor data isolation (Doctor B cannot see Doctor A's patients)
 * 9. Server-side pagination
 */

const mongoose = require('mongoose');
const http = require('http');
const connectDB = require('./config/db');
const User = require('./models/User');
const Role = require('./models/Role');
const Appointment = require('./models/Appointment');
const MedicalRecord = require('./models/MedicalRecord');
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

    req.on('error', reject);
    if (body) req.write(dataString);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ PASSED: ${message}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('   DOCTOR PATIENTS DIRECTORY — E2E TEST SUITE');
  console.log('================================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      console.log(`Test server running on port ${serverPort}\n`);
      resolve();
    });
  });

  try {
    // 0. Setup Fixtures
    console.log('--- Step 0: Test Fixtures Setup ---');
    let doctorRole = await Role.findOne({ name: 'DOCTOR' });
    if (!doctorRole) {
      doctorRole = await Role.create({
        name: 'DOCTOR',
        displayName: 'Doctor',
        permissions: ['patients:read', 'appointments:read', 'appointments:update', 'consultations:write'],
        isSystemRole: true,
      });
    }

    let patientRole = await Role.findOne({ name: 'PATIENT' });
    if (!patientRole) {
      patientRole = await Role.create({
        name: 'PATIENT',
        displayName: 'Patient',
        permissions: [],
        isSystemRole: true,
      });
    }

    const testPassword = 'Password123!';

    // Cleanup old test users
    await User.deleteMany({
      email: {
        $in: [
          'test_doc_pat_a@hms.test',
          'test_doc_pat_b@hms.test',
          'test_pat_1@hms.test',
          'test_pat_2@hms.test',
          'test_pat_3@hms.test',
        ],
      },
    });

    const docA = await User.create({
      firstName: 'Doctor',
      lastName: 'Alpha',
      email: 'test_doc_pat_a@hms.test',
      password: testPassword,
      role: doctorRole._id,
      roleName: 'DOCTOR',
      department: 'Cardiology',
      specialization: 'Cardiologist',
      status: 'active',
      isActive: true,
    });

    const docB = await User.create({
      firstName: 'Doctor',
      lastName: 'Beta',
      email: 'test_doc_pat_b@hms.test',
      password: testPassword,
      role: doctorRole._id,
      roleName: 'DOCTOR',
      department: 'Neurology',
      specialization: 'Neurologist',
      status: 'active',
      isActive: true,
    });

    const pat1 = await User.create({
      firstName: 'Alice',
      lastName: 'Wonderland',
      email: 'test_pat_1@hms.test',
      password: testPassword,
      role: patientRole._id,
      roleName: 'PATIENT',
      patientId: 'HMS-P-ALICE01',
      phone: '+1 555-0101',
      gender: 'female',
      dateOfBirth: new Date('1990-05-15'),
      bloodGroup: 'A+',
      status: 'active',
      isActive: true,
    });

    const pat2 = await User.create({
      firstName: 'Bob',
      lastName: 'Builder',
      email: 'test_pat_2@hms.test',
      password: testPassword,
      role: patientRole._id,
      roleName: 'PATIENT',
      patientId: 'HMS-P-BOB002',
      phone: '+1 555-0202',
      gender: 'male',
      dateOfBirth: new Date('1985-08-20'),
      bloodGroup: 'O+',
      status: 'active',
      isActive: true,
    });

    const pat3 = await User.create({
      firstName: 'Charlie',
      lastName: 'Chaplin',
      email: 'test_pat_3@hms.test',
      password: testPassword,
      role: patientRole._id,
      roleName: 'PATIENT',
      patientId: 'HMS-P-CHARLIE3',
      phone: '+1 555-0303',
      gender: 'male',
      dateOfBirth: new Date('1975-01-10'),
      bloodGroup: 'B+',
      status: 'active',
      isActive: true,
    });

    // Cleanup old test records
    await Appointment.deleteMany({ patient: { $in: [pat1._id, pat2._id, pat3._id] } });
    await MedicalRecord.deleteMany({ patient: { $in: [pat1._id, pat2._id, pat3._id] } });

    // Link pat1 to docA via Appointment
    await Appointment.create({
      patient: pat1._id,
      doctor: docA._id,
      department: 'Cardiology',
      appointmentDate: new Date(),
      appointmentTime: '09:00 AM',
      reason: 'Routine ECG examination',
      status: 'Confirmed',
    });

    // Link pat2 to docA via Appointment & MedicalRecord (consultation completed 2 days ago, follow up in 5 days)
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const fiveDaysFuture = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    const aptBob = await Appointment.create({
      patient: pat2._id,
      doctor: docA._id,
      department: 'Cardiology',
      appointmentDate: twoDaysAgo,
      appointmentTime: '10:30 AM',
      reason: 'Chest tightness',
      status: 'Completed',
    });

    await MedicalRecord.create({
      patient: pat2._id,
      doctor: docA._id,
      appointment: aptBob._id,
      consultationDate: twoDaysAgo,
      diagnosis: 'Mild Angina Pectoris',
      symptoms: ['Chest tightness', 'Shortness of breath'],
      clinicalNotes: 'ECG normal at rest. Prescribed beta-blockers.',
      treatment: 'Metoprolol 25mg daily',
      followUpDate: fiveDaysFuture,
    });

    // Link pat3 to docB only
    await Appointment.create({
      patient: pat3._id,
      doctor: docB._id,
      department: 'Neurology',
      appointmentDate: new Date(),
      appointmentTime: '11:00 AM',
      reason: 'Migraine consultation',
      status: 'Confirmed',
    });

    // Login users to get JWTs
    const loginDocA = await makeRequest('POST', '/api/v1/auth/login', {
      email: 'test_doc_pat_a@hms.test',
      password: testPassword,
    });
    const tokenDocA = loginDocA.data?.data?.accessToken || loginDocA.data?.accessToken || loginDocA.data?.data?.tokens?.accessToken || loginDocA.data?.data?.token;

    const loginDocB = await makeRequest('POST', '/api/v1/auth/login', {
      email: 'test_doc_pat_b@hms.test',
      password: testPassword,
    });
    const tokenDocB = loginDocB.data?.data?.accessToken || loginDocB.data?.accessToken || loginDocB.data?.data?.tokens?.accessToken || loginDocB.data?.data?.token;

    const loginPat = await makeRequest('POST', '/api/v1/auth/login', {
      email: 'test_pat_1@hms.test',
      password: testPassword,
    });
    const tokenPat = loginPat.data?.data?.accessToken || loginPat.data?.accessToken || loginPat.data?.data?.tokens?.accessToken || loginPat.data?.data?.token;

    assert(Boolean(tokenDocA), 'Doctor A successfully authenticated');
    assert(Boolean(tokenDocB), 'Doctor B successfully authenticated');
    assert(Boolean(tokenPat), 'Patient successfully authenticated');
    console.log('✓ Test fixtures successfully created\n');

    // Test 1: Authentication & RBAC Security
    console.log('--- Test 1: Authentication & RBAC Security ---');
    const unauthRes = await makeRequest('GET', '/api/v1/doctor/patients');
    assert(unauthRes.status === 401, 'Unauthenticated request correctly rejected with 401');

    const patForbiddenRes = await makeRequest('GET', '/api/v1/doctor/patients', null, {
      Authorization: `Bearer ${tokenPat}`,
    });
    assert(patForbiddenRes.status === 403, 'Non-doctor role request rejected with 403 Forbidden\n');

    // Test 2: Scoped Assigned Patient Retrieval & Summary Metrics
    console.log('--- Test 2: Scoped Assigned Patient Retrieval & Summary Metrics ---');
    const docAPatientsRes = await makeRequest('GET', '/api/v1/doctor/patients', null, {
      Authorization: `Bearer ${tokenDocA}`,
    });
    assert(docAPatientsRes.status === 200, 'Doctor A successfully retrieved assigned patients (200 OK)');
    const payloadA = docAPatientsRes.data.data;
    assert(Array.isArray(payloadA.patients), 'Response contains patients array');
    assert(payloadA.patients.length === 2, `Doctor A assigned patients count is 2 (got ${payloadA.patients.length})`);
    assert(payloadA.summary.total === 2, `Total assigned patients summary is 2 (got ${payloadA.summary.total})`);
    assert(payloadA.summary.active === 2, `Active patients summary is 2 (got ${payloadA.summary.active})`);
    assert(payloadA.summary.inactive === 0, `Inactive patients summary is 0 (got ${payloadA.summary.inactive})`);
    assert(payloadA.summary.recentVisits === 1, `Recent visits (last 7 days) count is 1 (got ${payloadA.summary.recentVisits})\n`);

    // Test 3: Last Visit & Next Follow-Up Real Data
    console.log('--- Test 3: Last Visit & Next Follow-Up Real Data ---');
    const bobRecord = payloadA.patients.find((p) => p.name === 'Bob Builder');
    const aliceRecord = payloadA.patients.find((p) => p.name === 'Alice Wonderland');

    assert(Boolean(bobRecord), 'Found Bob Builder in Doctor A patients');
    assert(Boolean(bobRecord.lastVisitDate), 'Bob Builder has real lastVisitDate from completed consultation');
    assert(bobRecord.lastVisitDiagnosis === 'Mild Angina Pectoris', 'Bob Builder last visit diagnosis matches record');
    assert(Boolean(bobRecord.nextFollowUpDate), 'Bob Builder has real nextFollowUpDate');

    assert(Boolean(aliceRecord), 'Found Alice Wonderland in Doctor A patients');
    assert(aliceRecord.lastVisitDate === null, 'Alice Wonderland with only confirmed future appointment has null lastVisitDate (No visits recorded)');
    assert(aliceRecord.nextFollowUpDate !== null, 'Alice Wonderland has next appointment scheduled\n');

    // Test 4: Search Filtering
    console.log('--- Test 4: Search Filtering ---');
    const searchAliceRes = await makeRequest('GET', '/api/v1/doctor/patients?search=Alice', null, {
      Authorization: `Bearer ${tokenDocA}`,
    });
    assert(searchAliceRes.data.data.patients.length === 1, 'Search for "Alice" returns exactly 1 patient');
    assert(searchAliceRes.data.data.patients[0].name === 'Alice Wonderland', 'Matched patient is Alice Wonderland');

    const searchIdRes = await makeRequest('GET', '/api/v1/doctor/patients?search=BOB002', null, {
      Authorization: `Bearer ${tokenDocA}`,
    });
    assert(searchIdRes.data.data.patients.length === 1, 'Search by patientId "BOB002" returns exactly 1 patient');
    assert(searchIdRes.data.data.patients[0].name === 'Bob Builder', 'Matched patient is Bob Builder');

    const searchNoneRes = await makeRequest('GET', '/api/v1/doctor/patients?search=NonExistentPatient', null, {
      Authorization: `Bearer ${tokenDocA}`,
    });
    assert(searchNoneRes.data.data.patients.length === 0, 'Search for non-existent patient returns 0 results\n');

    // Test 5: Status Filtering
    console.log('--- Test 5: Status Filtering ---');
    const activeFilterRes = await makeRequest('GET', '/api/v1/doctor/patients?status=active', null, {
      Authorization: `Bearer ${tokenDocA}`,
    });
    assert(activeFilterRes.data.data.patients.length === 2, 'Filter status=active returns 2 active patients');

    const inactiveFilterRes = await makeRequest('GET', '/api/v1/doctor/patients?status=inactive', null, {
      Authorization: `Bearer ${tokenDocA}`,
    });
    assert(inactiveFilterRes.data.data.patients.length === 0, 'Filter status=inactive returns 0 inactive patients\n');

    // Test 6: Sorting
    console.log('--- Test 6: Sorting ---');
    const sortLastVisitRes = await makeRequest('GET', '/api/v1/doctor/patients?sortBy=lastVisit&sortOrder=desc', null, {
      Authorization: `Bearer ${tokenDocA}`,
    });
    assert(sortLastVisitRes.data.data.patients[0].name === 'Bob Builder', 'Sorting by lastVisit desc places Bob Builder first (has recent visit)');

    const sortNameRes = await makeRequest('GET', '/api/v1/doctor/patients?sortBy=name&sortOrder=asc', null, {
      Authorization: `Bearer ${tokenDocA}`,
    });
    assert(sortNameRes.data.data.patients[0].name === 'Alice Wonderland', 'Sorting by name asc places Alice Wonderland first\n');

    // Test 7: Doctor Data Isolation
    console.log('--- Test 7: Doctor Data Isolation ---');
    const docBPatientsRes = await makeRequest('GET', '/api/v1/doctor/patients', null, {
      Authorization: `Bearer ${tokenDocB}`,
    });
    const payloadB = docBPatientsRes.data.data;
    assert(payloadB.patients.length === 1, `Doctor B sees only 1 patient (got ${payloadB.patients.length})`);
    assert(payloadB.patients[0].name === 'Charlie Chaplin', 'Doctor B sees Charlie Chaplin');
    assert(
      !payloadB.patients.some((p) => p.name === 'Alice Wonderland' || p.name === 'Bob Builder'),
      'Doctor B cannot see Doctor A assigned patients (Strict isolation verified)\n'
    );

    // Test 8: Pagination
    console.log('--- Test 8: Server-Side Pagination ---');
    const pageRes = await makeRequest('GET', '/api/v1/doctor/patients?page=1&limit=1', null, {
      Authorization: `Bearer ${tokenDocA}`,
    });
    assert(pageRes.data.data.patients.length === 1, 'Pagination limit=1 returns 1 patient');
    assert(pageRes.data.data.pagination.pages === 2, `Pagination total pages is 2 (got ${pageRes.data.data.pagination.pages})\n`);

    // Test 9: Authorized Longitudinal Medical Record Details (GET /patients/:id)
    console.log('--- Test 9: Longitudinal Medical Record Details & Security ---');
    const patDetailsRes = await makeRequest('GET', `/api/v1/doctor/patients/${pat2._id}`, null, {
      Authorization: `Bearer ${tokenDocA}`,
    });
    assert(patDetailsRes.status === 200, 'Doctor A successfully retrieved Bob Builder clinical records (200 OK)');
    const bobE2E = patDetailsRes.data.data;
    assert(bobE2E.patient.name === 'Bob Builder', 'Patient name matches Bob Builder');
    assert(Array.isArray(bobE2E.timeline), 'Longitudinal timeline array returned');
    assert(bobE2E.timeline.length >= 2, `Timeline contains at least 2 events (got ${bobE2E.timeline.length})`);
    assert(bobE2E.timeline[0].type === 'consultation' || bobE2E.timeline[0].type === 'appointment', 'Timeline entries categorized');
    assert(Array.isArray(bobE2E.consultations), 'Consultations array returned');
    assert(bobE2E.consultations.length === 1, 'Bob Builder has 1 consultation on file');
    assert(bobE2E.consultations[0].diagnosis === 'Mild Angina Pectoris', 'Consultation diagnosis matches');

    // Access by patientId string
    const patIdLookupRes = await makeRequest('GET', `/api/v1/doctor/patients/${pat2.patientId}`, null, {
      Authorization: `Bearer ${tokenDocA}`,
    });
    assert(patIdLookupRes.status === 200, 'Lookup by hospital patientId string (HMS-P-BOB002) succeeds with 200 OK');

    // Cross-doctor unauthorized access attempt
    const unauthorizedDocBRes = await makeRequest('GET', `/api/v1/doctor/patients/${pat2._id}`, null, {
      Authorization: `Bearer ${tokenDocB}`,
    });
    assert(unauthorizedDocBRes.status === 403, 'Doctor B unauthorized access to Doctor A patient correctly rejected with 403 Forbidden');

    console.log('================================================================');
    console.log('   🎉 ALL 32 DOCTOR PATIENT TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================\n');
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
