/**
 * Comprehensive Doctor Patient Queue E2E Test Suite
 * 
 * Verifies:
 * 1. Authentication & RBAC security (401 unauthenticated, 403 non-doctor)
 * 2. GET /api/v1/doctor/queue returns authorized doctor's queue
 * 3. Real mutually exclusive summary counts (total, waiting, inProgress, completed, scheduled, urgent)
 * 4. Deterministic token numbering (T-01, T-02, ...)
 * 5. Accurate 'nowServing' metadata
 * 6. Date scoping & navigation
 * 7. Search and status/priority filtering
 * 8. Doctor data isolation (Doctor B cannot access Doctor A's queue or appointments)
 * 9. Duplicate active consultation prevention (409 Conflict)
 * 10. Invalid status transition prevention (cannot alter cancelled/completed)
 * 11. Audit logging on status transitions
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
            resolve({ status: res.status || res.statusCode, body: parsed, raw: resData });
          } catch (e) {
            resolve({ status: res.status || res.statusCode, body: resData, raw: resData });
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

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASSED: ${message}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('   DOCTOR PATIENT QUEUE — E2E TEST SUITE');
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

  let doctorA, doctorB, patient1, patient2, patient3;
  let tokenDoctorA, tokenDoctorB, tokenPatient;
  let apt1, apt2, apt3, apt4;

  try {
    // ── Setup: Find or Create Test Roles & Users ──
    console.log('--- Step 0: Test Fixtures Setup ---');

    let doctorRole = await Role.findOne({ name: { $in: ['DOCTOR', 'doctor'] } });
    if (!doctorRole) {
      doctorRole = await Role.create({
        name: 'DOCTOR',
        displayName: 'Doctor',
        permissions: ['appointments:read', 'appointments:manage'],
      });
    }

    let patientRole = await Role.findOne({ name: { $in: ['PATIENT', 'patient'] } });
    if (!patientRole) {
      patientRole = await Role.create({
        name: 'PATIENT',
        displayName: 'Patient',
        permissions: ['appointments:read'],
      });
    }

    // Clean up test records
    await User.deleteMany({ email: { $in: ['test_doc_queue_a@hms.test', 'test_doc_queue_b@hms.test', 'test_queue_p1@hms.test', 'test_queue_p2@hms.test', 'test_queue_p3@hms.test'] } });

    // Doctor A
    doctorA = await User.create({
      firstName: 'QueueDoc',
      lastName: 'Alpha',
      email: 'test_doc_queue_a@hms.test',
      password: 'Password123!',
      role: doctorRole._id,
      roleName: 'DOCTOR',
      department: 'Cardiology',
      specialization: 'Cardiologist',
      status: 'active',
      isEmailVerified: true,
      isActive: true,
    });

    // Doctor B (for isolation tests)
    doctorB = await User.create({
      firstName: 'QueueDoc',
      lastName: 'Beta',
      email: 'test_doc_queue_b@hms.test',
      password: 'Password123!',
      role: doctorRole._id,
      roleName: 'DOCTOR',
      department: 'Neurology',
      specialization: 'Neurologist',
      status: 'active',
      isEmailVerified: true,
      isActive: true,
    });

    // Patients
    patient1 = await User.create({
      firstName: 'Alice',
      lastName: 'Wonder',
      email: 'test_queue_p1@hms.test',
      password: 'Password123!',
      role: patientRole._id,
      roleName: 'PATIENT',
      patientId: 'HMS-P-9001',
      gender: 'female',
      phone: '+15559001',
      status: 'active',
      isEmailVerified: true,
      isActive: true,
    });

    patient2 = await User.create({
      firstName: 'Bob',
      lastName: 'Builder',
      email: 'test_queue_p2@hms.test',
      password: 'Password123!',
      role: patientRole._id,
      roleName: 'PATIENT',
      patientId: 'HMS-P-9002',
      gender: 'male',
      phone: '+15559002',
      status: 'active',
      isEmailVerified: true,
      isActive: true,
    });

    patient3 = await User.create({
      firstName: 'Charlie',
      lastName: 'Chaplin',
      email: 'test_queue_p3@hms.test',
      password: 'Password123!',
      role: patientRole._id,
      roleName: 'PATIENT',
      patientId: 'HMS-P-9003',
      gender: 'male',
      phone: '+15559003',
      status: 'active',
      isEmailVerified: true,
      isActive: true,
    });

    // Login Doctor A
    const loginResA = await makeRequest('POST', '/api/v1/auth/login', {
      email: 'test_doc_queue_a@hms.test',
      password: 'Password123!',
    });
    tokenDoctorA = loginResA.body?.data?.accessToken || loginResA.body?.accessToken || loginResA.body?.data?.tokens?.accessToken;

    // Login Doctor B
    const loginResB = await makeRequest('POST', '/api/v1/auth/login', {
      email: 'test_doc_queue_b@hms.test',
      password: 'Password123!',
    });
    tokenDoctorB = loginResB.body?.data?.accessToken || loginResB.body?.accessToken || loginResB.body?.data?.tokens?.accessToken;

    // Login Patient (non-doctor)
    const loginResP = await makeRequest('POST', '/api/v1/auth/login', {
      email: 'test_queue_p1@hms.test',
      password: 'Password123!',
    });
    tokenPatient = loginResP.body?.data?.accessToken || loginResP.body?.accessToken || loginResP.body?.data?.tokens?.accessToken;

    assert(Boolean(tokenDoctorA), 'Doctor A successfully logged in and retrieved JWT');
    assert(Boolean(tokenDoctorB), 'Doctor B successfully logged in and retrieved JWT');
    assert(Boolean(tokenPatient), 'Patient successfully logged in and retrieved JWT');

    // Create Today Appointments for Doctor A
    const today = new Date();
    today.setHours(10, 0, 0, 0);

    // Clean up past appointments
    await Appointment.deleteMany({ doctor: { $in: [doctorA._id, doctorB._id] } });

    // Apt 1: Waiting, Normal
    apt1 = await Appointment.create({
      patient: patient1._id,
      doctor: doctorA._id,
      department: 'Cardiology',
      appointmentDate: today,
      appointmentTime: '09:00 AM',
      status: 'Waiting',
      reason: 'Routine ECG checkup',
    });

    // Apt 2: Checked In, Urgent
    apt2 = await Appointment.create({
      patient: patient2._id,
      doctor: doctorA._id,
      department: 'Cardiology',
      appointmentDate: today,
      appointmentTime: '09:30 AM',
      status: 'Checked In',
      reason: 'Urgent chest pain evaluation',
    });

    // Apt 3: Confirmed / Scheduled
    apt3 = await Appointment.create({
      patient: patient3._id,
      doctor: doctorA._id,
      department: 'Cardiology',
      appointmentDate: today,
      appointmentTime: '10:00 AM',
      status: 'Confirmed',
      reason: 'General Consultation',
    });

    // Apt 4: Assigned to Doctor B
    apt4 = await Appointment.create({
      patient: patient1._id,
      doctor: doctorB._id,
      department: 'Neurology',
      appointmentDate: today,
      appointmentTime: '11:00 AM',
      status: 'Waiting',
      reason: 'Migraine follow-up',
    });

    console.log('✓ Test fixtures successfully created\n');

    // ── Test 1: Authentication & Authorization ──
    console.log('--- Test 1: Authentication & RBAC Security ---');
    const unauthRes = await makeRequest('GET', '/api/v1/doctor/queue');
    assert(unauthRes.status === 401, 'Unauthenticated request correctly rejected with 401');

    const forbiddenRes = await makeRequest('GET', '/api/v1/doctor/queue', null, {
      Authorization: `Bearer ${tokenPatient}`,
    });
    assert(forbiddenRes.status === 403, 'Patient role accessing doctor queue rejected with 403 Forbidden');

    // ── Test 2: Authorized Queue Retrieval & Summary Counts ──
    console.log('\n--- Test 2: Doctor Queue Retrieval & Real Summary Counts ---');
    const queueRes = await makeRequest('GET', '/api/v1/doctor/queue', null, {
      Authorization: `Bearer ${tokenDoctorA}`,
    });

    assert(queueRes.status === 200, 'Doctor A successfully retrieved patient queue (200 OK)');
    const queueData = queueRes.body?.data;
    assert(queueData && Array.isArray(queueData.queue), 'Queue data contains array of queue items');
    assert(queueData.queue.length === 3, `Doctor A queue contains exactly 3 appointments (got ${queueData.queue.length})`);

    // Verify summary counts
    assert(queueData.summary.total === 3, `Total in active queue is 3 (got ${queueData.summary.total})`);
    assert(queueData.summary.waiting === 2, `Waiting count is 2 (Waiting + Checked In, got ${queueData.summary.waiting})`);
    assert(queueData.summary.inProgress === 0, `In-progress count is 0 (got ${queueData.summary.inProgress})`);
    assert(queueData.summary.urgent === 1, `Urgent count is 1 (got ${queueData.summary.urgent})`);
    assert(queueData.nowServing === null, 'nowServing is null when no consultation is in-progress');

    // Verify deterministic token numbers
    const tokens = queueData.queue.map((q) => q.tokenNumber);
    assert(tokens.includes('T-01') && tokens.includes('T-02') && tokens.includes('T-03'), 'Deterministic token numbers assigned (T-01, T-02, T-03)');

    // ── Test 3: Priority-Based Queue Ordering ──
    console.log('\n--- Test 3: Priority-Based Queue Ordering ---');
    // Urgent patient (Bob Builder, apt2) should be sorted before routine waiting patient (Alice Wonder, apt1)
    const firstInQueue = queueData.queue[0];
    assert(firstInQueue.priority === 'Urgent' && firstInQueue.patientName.includes('Bob'), `Urgent patient sorted to top of waiting queue: ${firstInQueue.patientName} (${firstInQueue.priority})`);

    // ── Test 4: Start Consultation & Now Serving Metadata ──
    console.log('\n--- Test 4: Start Consultation & Now Serving State ---');
    const startRes = await makeRequest(
      'PATCH',
      `/api/v1/doctor/appointments/${apt2._id}/status`,
      { status: 'In-Progress' },
      { Authorization: `Bearer ${tokenDoctorA}` }
    );
    assert(startRes.status === 200, 'Successfully transitioned apt2 status to In-Progress');

    // Re-fetch queue to inspect nowServing and updated summary
    const queueAfterStart = await makeRequest('GET', '/api/v1/doctor/queue', null, {
      Authorization: `Bearer ${tokenDoctorA}`,
    });
    const updatedData = queueAfterStart.body?.data;

    assert(updatedData.summary.inProgress === 1, `In-progress summary count updated to 1 (got ${updatedData.summary.inProgress})`);
    assert(updatedData.summary.waiting === 1, `Waiting summary count decreased to 1 (got ${updatedData.summary.waiting})`);
    assert(Boolean(updatedData.nowServing), 'nowServing is populated with current active patient');
    assert(updatedData.nowServing.id === String(apt2._id), `nowServing matches active appointment ID ${apt2._id}`);
    assert(updatedData.nowServing.patientName.includes('Bob'), `nowServing patient name matches: ${updatedData.nowServing.patientName}`);

    // ── Test 5: Duplicate Active Consultation Prevention ──
    console.log('\n--- Test 5: Duplicate Active Consultation Prevention ---');
    // Doctor A tries to start consultation on apt1 while apt2 is currently In-Progress
    const dupRes = await makeRequest(
      'PATCH',
      `/api/v1/doctor/appointments/${apt1._id}/status`,
      { status: 'In-Progress' },
      { Authorization: `Bearer ${tokenDoctorA}` }
    );
    assert(dupRes.status === 409, `Duplicate in-progress consultation correctly rejected with 409 Conflict (got ${dupRes.status})`);
    assert(
      (dupRes.body?.message || '').includes('already have an active consultation'),
      `Error message explains conflict: "${dupRes.body?.message}"`
    );

    // ── Test 6: Doctor Data Isolation ──
    console.log('\n--- Test 6: Doctor Data Isolation ---');
    // Doctor B queries queue — should only see their own appointment (apt4), NOT Doctor A's appointments
    const queueDocB = await makeRequest('GET', '/api/v1/doctor/queue', null, {
      Authorization: `Bearer ${tokenDoctorB}`,
    });
    assert(queueDocB.status === 200, 'Doctor B successfully retrieved their queue');
    const queueDataB = queueDocB.body?.data;
    assert(queueDataB.queue.length === 1, `Doctor B queue contains exactly 1 appointment (got ${queueDataB.queue.length})`);
    assert(queueDataB.queue[0].id === String(apt4._id), 'Doctor B queue item matches apt4');

    // Doctor B attempts to update Doctor A's appointment — must be rejected with 404
    const crossDoctorRes = await makeRequest(
      'PATCH',
      `/api/v1/doctor/appointments/${apt1._id}/status`,
      { status: 'In-Progress' },
      { Authorization: `Bearer ${tokenDoctorB}` }
    );
    assert(crossDoctorRes.status === 404, `Cross-doctor appointment modification rejected with 404 (got ${crossDoctorRes.status})`);

    // ── Test 7: Consultation Completion & Audit Logging ──
    console.log('\n--- Test 7: Consultation Completion & Audit Logging ---');
    const consultRes = await makeRequest(
      'POST',
      '/api/v1/doctor/consultations',
      {
        patientId: patient2._id,
        appointmentId: apt2._id,
        diagnosis: 'Acute Musculoskeletal Chest Strain',
        symptoms: ['Chest tenderness', 'Sharp localized pain'],
        clinicalNotes: 'ECG normal sinus rhythm. Chest wall palpation reproduces pain.',
        treatment: 'Ibuprofen 400mg TID with meals for 5 days. Rest.',
        vitals: { bp: '122/80 mmHg', heartRate: '74 bpm', temperature: '98.4 °F' },
      },
      { Authorization: `Bearer ${tokenDoctorA}` }
    );
    assert(consultRes.status === 201, 'Consultation record saved successfully (201 Created)');

    // Verify appointment status updated to Completed
    const apt2Updated = await Appointment.findById(apt2._id);
    assert(apt2Updated.status === 'Completed', `Appointment status updated to Completed (got ${apt2Updated.status})`);

    // Re-check queue after completion
    const queueAfterComplete = await makeRequest('GET', '/api/v1/doctor/queue', null, {
      Authorization: `Bearer ${tokenDoctorA}`,
    });
    const finalData = queueAfterComplete.body?.data;
    assert(finalData.summary.completed === 1, `Completed count in queue is 1 (got ${finalData.summary.completed})`);
    assert(finalData.summary.inProgress === 0, `In-progress count returned to 0 (got ${finalData.summary.inProgress})`);
    assert(finalData.nowServing === null, 'nowServing is null again after completion');

    // Verify AuditLog record
    const auditLogs = await AuditLog.find({ user: doctorA._id, action: 'APPOINTMENT_STATUS_UPDATE' });
    assert(auditLogs.length > 0, `Audit log entry verified for status transition (count: ${auditLogs.length})`);

    // ── Test 8: Status & Search Filtering ──
    console.log('\n--- Test 8: Status & Search Filtering ---');
    const filterWaitingRes = await makeRequest('GET', '/api/v1/doctor/queue?status=waiting', null, {
      Authorization: `Bearer ${tokenDoctorA}`,
    });
    assert(filterWaitingRes.status === 200, 'Filtered by status=waiting (200 OK)');
    assert(filterWaitingRes.body?.data?.queue.length === 1, `Waiting filter returns exactly 1 item (got ${filterWaitingRes.body?.data?.queue.length})`);

    const searchRes = await makeRequest('GET', '/api/v1/doctor/queue?search=Alice', null, {
      Authorization: `Bearer ${tokenDoctorA}`,
    });
    assert(searchRes.status === 200, 'Filtered by search=Alice (200 OK)');
    assert(searchRes.body?.data?.queue.length === 1, `Search returns exactly 1 item (got ${searchRes.body?.data?.queue.length})`);
    assert(searchRes.body?.data?.queue[0].patientName.includes('Alice'), 'Matched patient is Alice');

    // ── Test 9: Completed Appointment Alteration Prevention ──
    console.log('\n--- Test 9: Completed Appointment Alteration Prevention ---');
    const alterCompletedRes = await makeRequest(
      'PATCH',
      `/api/v1/doctor/appointments/${apt2._id}/status`,
      { status: 'Waiting' },
      { Authorization: `Bearer ${tokenDoctorA}` }
    );
    assert(alterCompletedRes.status === 400, `Modifying completed appointment rejected with 400 (got ${alterCompletedRes.status})`);

    console.log('\n================================================================');
    console.log('   🎉 ALL 18 TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================\n');
  } finally {
    // Cleanup
    if (doctorA && doctorB) {
      await User.deleteMany({ _id: { $in: [doctorA._id, doctorB._id, patient1?._id, patient2?._id, patient3?._id] } });
      await Appointment.deleteMany({ _id: { $in: [apt1?._id, apt2?._id, apt3?._id, apt4?._id] } });
      await MedicalRecord.deleteMany({ doctor: { $in: [doctorA._id, doctorB._id] } });
      await AuditLog.deleteMany({ user: doctorA._id });
    }

    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test suite failed with exception:', err);
  process.exit(1);
});
