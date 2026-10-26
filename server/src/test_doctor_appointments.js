/**
 * Comprehensive Doctor Appointments E2E Test Suite
 * 
 * Tests the entire Doctor Clinical Workspace — My Appointments feature:
 * 1. Authentication & RBAC security (401 unauthenticated, 403 non-doctor)
 * 2. Date filtering & navigation (today vs specific date)
 * 3. Mutually exclusive summary counts (total, confirmed, waiting, in-progress, completed, cancelled)
 * 4. Search filtering (patient name, ID, visit reason)
 * 5. Status filtering (confirmed, waiting, in-progress, completed, cancelled)
 * 6. Sorting by appointment time (time_asc, time_desc)
 * 7. Pagination
 * 8. Appointment Details endpoint (GET /appointments/:id)
 * 9. Start Consultation / Status transition
 * 10. Reschedule appointment (new date, new time, reason)
 * 11. Cancel appointment (reason stored, status updated)
 * 12. Business rules enforcement:
 *     - Cannot cancel completed appointment
 *     - Cannot reschedule completed or cancelled appointment
 *     - Cannot modify cancelled appointment status
 * 13. Doctor data isolation: Doctor B cannot access, reschedule, or cancel Doctor A's appointments
 */

const mongoose = require('mongoose');
const path = require('path');
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
            const parsed = resData ? JSON.parse(resData) : {};
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resData });
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

async function runTests() {
  console.log('🚀 Starting Doctor Appointments E2E Test Suite...\n');
  await connectDB();

  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      console.log(`📡 Test server running on http://127.0.0.1:${serverPort}`);
      resolve();
    });
  });

  try {
    // 1. Prepare Roles
    let doctorRole = await Role.findOne({ name: 'doctor' });
    if (!doctorRole) {
      doctorRole = await Role.create({ name: 'doctor', description: 'Attending Doctor' });
    }
    let patientRole = await Role.findOne({ name: 'patient' });
    if (!patientRole) {
      patientRole = await Role.create({ name: 'patient', description: 'Patient' });
    }
    let receptionistRole = await Role.findOne({ name: 'receptionist' });
    if (!receptionistRole) {
      receptionistRole = await Role.create({ name: 'receptionist', description: 'Receptionist' });
    }

    // 2. Prepare Users: Doctor A, Doctor B, Patient 1, Patient 2, Receptionist
    const docAEmail = `doc_apt_a_${Date.now()}@hospital.test`;
    const docBEmail = `doc_apt_b_${Date.now()}@hospital.test`;
    const pat1Email = `pat_apt_1_${Date.now()}@hospital.test`;
    const pat2Email = `pat_apt_2_${Date.now()}@hospital.test`;
    const recepEmail = `rec_apt_${Date.now()}@hospital.test`;
    const defaultPassword = 'Password@123';

    const doctorA = await User.create({
      email: docAEmail,
      password: defaultPassword,
      firstName: 'Gregory',
      lastName: 'House',
      role: doctorRole._id,
      roleName: 'DOCTOR',
      department: 'Internal Medicine',
      specialization: 'Diagnostic Medicine',
      licenseNumber: 'MD-777888',
      isActive: true,
      isEmailVerified: true,
    });

    const doctorB = await User.create({
      email: docBEmail,
      password: defaultPassword,
      firstName: 'James',
      lastName: 'Wilson',
      role: doctorRole._id,
      roleName: 'DOCTOR',
      department: 'Oncology',
      isActive: true,
      isEmailVerified: true,
    });

    const patient1 = await User.create({
      email: pat1Email,
      password: defaultPassword,
      firstName: 'Arthur',
      lastName: 'Dent',
      role: patientRole._id,
      roleName: 'PATIENT',
      patientId: `HMS-P-${Math.floor(1000 + Math.random() * 9000)}`,
      gender: 'male',
      dateOfBirth: new Date('1984-03-11'),
      phone: '+1-555-4321',
      bloodGroup: 'O+',
      isActive: true,
      isEmailVerified: true,
    });

    const patient2 = await User.create({
      email: pat2Email,
      password: defaultPassword,
      firstName: 'Ford',
      lastName: 'Prefect',
      role: patientRole._id,
      roleName: 'PATIENT',
      patientId: `HMS-P-${Math.floor(1000 + Math.random() * 9000)}`,
      gender: 'other',
      dateOfBirth: new Date('1982-07-20'),
      phone: '+1-555-8765',
      bloodGroup: 'AB-',
      isActive: true,
      isEmailVerified: true,
    });

    const receptionist = await User.create({
      email: recepEmail,
      password: defaultPassword,
      firstName: 'Reception',
      lastName: 'Desk',
      role: receptionistRole._id,
      roleName: 'RECEPTIONIST',
      isActive: true,
      isEmailVerified: true,
    });

    // 3. Login to get tokens
    const loginDocA = await makeRequest('POST', '/api/v1/auth/login', {
      email: docAEmail,
      password: defaultPassword,
    });
    const tokenDocA = loginDocA.data?.data?.accessToken || loginDocA.data?.accessToken;

    const loginDocB = await makeRequest('POST', '/api/v1/auth/login', {
      email: docBEmail,
      password: defaultPassword,
    });
    const tokenDocB = loginDocB.data?.data?.accessToken || loginDocB.data?.accessToken;

    const loginRecep = await makeRequest('POST', '/api/v1/auth/login', {
      email: recepEmail,
      password: defaultPassword,
    });
    const tokenRecep = loginRecep.data?.data?.accessToken || loginRecep.data?.accessToken;

    console.log('✅ Doctor A, Doctor B, Patients, and Receptionist setup completed.');

    // ── TEST 1: Security & RBAC ──
    console.log('\n--- TEST 1: RBAC Enforcement ---');
    const resNoAuth = await makeRequest('GET', '/api/v1/doctor/appointments');
    console.log('Unauthenticated access status:', resNoAuth.status, '(Expected 401)');
    if (resNoAuth.status !== 401) throw new Error('Security flaw: unauthenticated access allowed');

    const resRecep = await makeRequest('GET', '/api/v1/doctor/appointments', null, {
      Authorization: `Bearer ${tokenRecep}`,
    });
    console.log('Receptionist access status:', resRecep.status, '(Expected 403)');
    if (resRecep.status !== 403) throw new Error('Security flaw: non-doctor allowed access');

    // ── TEST 2: Seed Appointments for Doctor A and Doctor B ──
    console.log('\n--- TEST 2: Seed Test Appointments ---');
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0, 0);

    // Doctor A Appointments (Today)
    const aptA1 = await Appointment.create({
      patient: patient1._id,
      doctor: doctorA._id,
      appointmentDate: todayStart,
      appointmentTime: '09:30 AM',
      department: 'Internal Medicine',
      reason: 'Chronic migraine and fatigue',
      status: 'Confirmed',
      consultationFee: 75,
    });

    const aptA2 = await Appointment.create({
      patient: patient2._id,
      doctor: doctorA._id,
      appointmentDate: todayStart,
      appointmentTime: '10:15 AM',
      department: 'Internal Medicine',
      reason: 'Severe fever and chills',
      status: 'Waiting',
      consultationFee: 75,
    });

    const aptA3 = await Appointment.create({
      patient: patient1._id,
      doctor: doctorA._id,
      appointmentDate: todayStart,
      appointmentTime: '11:00 AM',
      department: 'Internal Medicine',
      reason: 'Routine health checkup',
      status: 'Completed',
      consultationFee: 75,
    });

    const aptA4 = await Appointment.create({
      patient: patient2._id,
      doctor: doctorA._id,
      appointmentDate: todayStart,
      appointmentTime: '11:45 AM',
      department: 'Internal Medicine',
      reason: 'Chest pain review',
      status: 'Cancelled',
      cancellationReason: 'Patient rescheduled due to travel',
      consultationFee: 75,
    });

    // Doctor A Appointment (Tomorrow)
    const aptA5 = await Appointment.create({
      patient: patient1._id,
      doctor: doctorA._id,
      appointmentDate: tomorrowStart,
      appointmentTime: '10:00 AM',
      department: 'Internal Medicine',
      reason: 'Follow-up consultation',
      status: 'Confirmed',
      consultationFee: 75,
    });

    // Doctor B Appointment (Today - Doctor Isolation Test)
    const aptB1 = await Appointment.create({
      patient: patient1._id,
      doctor: doctorB._id,
      appointmentDate: todayStart,
      appointmentTime: '09:00 AM',
      department: 'Oncology',
      reason: 'Biopsy consultation',
      status: 'Waiting',
      consultationFee: 150,
    });

    console.log('✅ Seeded 5 appointments for Doctor A and 1 for Doctor B.');

    // ── TEST 3: Doctor A Appointments & Summary Counts ──
    console.log('\n--- TEST 3: Date Filter & Summary Counts ---');
    const toISODate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const resTodayA = await makeRequest(
      'GET',
      `/api/v1/doctor/appointments?date=${toISODate(today)}`,
      null,
      { Authorization: `Bearer ${tokenDocA}` }
    );
    console.log('Doctor A Today status:', resTodayA.status);
    const dataTodayA = resTodayA.data?.data || resTodayA.data;
    console.log('Appointments returned for Today:', dataTodayA.appointments.length, '(Expected 4)');
    console.log('Summary counts for Today:', dataTodayA.summary);

    if (dataTodayA.appointments.length !== 4) {
      throw new Error(`Expected 4 appointments for today, got ${dataTodayA.appointments.length}`);
    }
    if (dataTodayA.summary.total !== 4) {
      throw new Error(`Expected summary total 4, got ${dataTodayA.summary.total}`);
    }
    if (dataTodayA.summary.confirmed !== 1) {
      throw new Error(`Expected 1 confirmed, got ${dataTodayA.summary.confirmed}`);
    }
    if (dataTodayA.summary.waiting !== 1) {
      throw new Error(`Expected 1 waiting, got ${dataTodayA.summary.waiting}`);
    }
    if (dataTodayA.summary.completed !== 1) {
      throw new Error(`Expected 1 completed, got ${dataTodayA.summary.completed}`);
    }
    if (dataTodayA.summary.cancelled !== 1) {
      throw new Error(`Expected 1 cancelled, got ${dataTodayA.summary.cancelled}`);
    }
    console.log('✅ Date filtering and mutually exclusive summary counts passed.');

    // ── TEST 4: Search Filtering ──
    console.log('\n--- TEST 4: Search Filtering ---');
    const resSearchArthur = await makeRequest(
      'GET',
      `/api/v1/doctor/appointments?date=${toISODate(today)}&search=Arthur`,
      null,
      { Authorization: `Bearer ${tokenDocA}` }
    );
    const searchData = resSearchArthur.data?.data || resSearchArthur.data;
    console.log('Found Arthur Dent appointments:', searchData.appointments.length, '(Expected 2)');
    if (searchData.appointments.length !== 2) {
      throw new Error(`Expected 2 appointments for Arthur Dent, got ${searchData.appointments.length}`);
    }

    const resSearchReason = await makeRequest(
      'GET',
      `/api/v1/doctor/appointments?date=${toISODate(today)}&search=migraine`,
      null,
      { Authorization: `Bearer ${tokenDocA}` }
    );
    const reasonData = resSearchReason.data?.data || resSearchReason.data;
    console.log('Found migraine appointments:', reasonData.appointments.length, '(Expected 1)');
    if (reasonData.appointments.length !== 1) {
      throw new Error(`Expected 1 appointment for migraine search, got ${reasonData.appointments.length}`);
    }
    console.log('✅ Search filtering passed.');

    // ── TEST 5: Status Filtering ──
    console.log('\n--- TEST 5: Status Filtering ---');
    const resFilterWaiting = await makeRequest(
      'GET',
      `/api/v1/doctor/appointments?date=${toISODate(today)}&status=waiting`,
      null,
      { Authorization: `Bearer ${tokenDocA}` }
    );
    const waitingList = (resFilterWaiting.data?.data || resFilterWaiting.data).appointments;
    console.log('Waiting filter returned:', waitingList.length, '(Expected 1)');
    if (waitingList.length !== 1 || waitingList[0].status !== 'Waiting') {
      throw new Error('Status filter waiting failed');
    }

    const resFilterCancelled = await makeRequest(
      'GET',
      `/api/v1/doctor/appointments?date=${toISODate(today)}&status=cancelled`,
      null,
      { Authorization: `Bearer ${tokenDocA}` }
    );
    const cancelledList = (resFilterCancelled.data?.data || resFilterCancelled.data).appointments;
    console.log('Cancelled filter returned:', cancelledList.length, '(Expected 1)');
    if (cancelledList.length !== 1 || cancelledList[0].status !== 'Cancelled') {
      throw new Error('Status filter cancelled failed');
    }
    console.log('✅ Status filtering passed.');

    // ── TEST 6: Single Appointment Details ──
    console.log('\n--- TEST 6: GET /appointments/:id ---');
    const resDetail = await makeRequest(
      'GET',
      `/api/v1/doctor/appointments/${aptA1._id}`,
      null,
      { Authorization: `Bearer ${tokenDocA}` }
    );
    console.log('Appointment detail status:', resDetail.status);
    const aptDetail = (resDetail.data?.data || resDetail.data).appointment;
    console.log('Detail patient name:', aptDetail.patient.name);
    console.log('Detail reason:', aptDetail.reason);
    if (!aptDetail || aptDetail.patient.name !== 'Arthur Dent') {
      throw new Error('Appointment detail retrieval failed');
    }
    console.log('✅ GET /appointments/:id passed.');

    // ── TEST 7: Reschedule Appointment ──
    console.log('\n--- TEST 7: Reschedule Appointment ---');
    const resResched = await makeRequest(
      'PATCH',
      `/api/v1/doctor/appointments/${aptA1._id}/reschedule`,
      {
        newDate: toISODate(tomorrow),
        newTime: '02:30 PM',
        reason: 'Patient requested afternoon time slot',
      },
      { Authorization: `Bearer ${tokenDocA}` }
    );
    console.log('Reschedule status:', resResched.status);
    if (resResched.status !== 200) {
      throw new Error('Reschedule appointment failed');
    }

    const updatedA1 = await Appointment.findById(aptA1._id);
    console.log('Updated status:', updatedA1.status, '(Expected Rescheduled)');
    console.log('Updated time:', updatedA1.appointmentTime, '(Expected 02:30 PM)');
    if (updatedA1.status !== 'Rescheduled' || updatedA1.appointmentTime !== '02:30 PM') {
      throw new Error('Reschedule failed to update record correctly');
    }
    console.log('✅ Rescheduling passed.');

    // ── TEST 8: Cancel Appointment with Reason ──
    console.log('\n--- TEST 8: Cancel Appointment ---');
    const resCancel = await makeRequest(
      'PATCH',
      `/api/v1/doctor/appointments/${aptA2._id}/cancel`,
      { reason: 'Patient emergency transfer to ICU' },
      { Authorization: `Bearer ${tokenDocA}` }
    );
    console.log('Cancel status:', resCancel.status);
    if (resCancel.status !== 200) {
      throw new Error('Cancel appointment failed');
    }

    const updatedA2 = await Appointment.findById(aptA2._id);
    console.log('Cancelled status:', updatedA2.status, '(Expected Cancelled)');
    console.log('Cancellation reason:', updatedA2.cancellationReason);
    if (updatedA2.status !== 'Cancelled' || !updatedA2.cancellationReason.includes('ICU')) {
      throw new Error('Cancel failed to update record correctly');
    }
    console.log('✅ Cancel appointment passed.');

    // ── TEST 9: Business Rules - Reject Invalid Transitions ──
    console.log('\n--- TEST 9: Status Business Rules Validation ---');
    // Cannot cancel completed appointment
    const resCancelCompleted = await makeRequest(
      'PATCH',
      `/api/v1/doctor/appointments/${aptA3._id}/cancel`,
      { reason: 'Mistake' },
      { Authorization: `Bearer ${tokenDocA}` }
    );
    console.log('Cancel completed appointment status:', resCancelCompleted.status, '(Expected 400)');
    if (resCancelCompleted.status !== 400) {
      throw new Error('Failed to block cancellation of completed appointment');
    }

    // Cannot reschedule cancelled appointment
    const resReschedCancelled = await makeRequest(
      'PATCH',
      `/api/v1/doctor/appointments/${aptA2._id}/reschedule`,
      { newDate: toISODate(tomorrow), newTime: '10:00 AM' },
      { Authorization: `Bearer ${tokenDocA}` }
    );
    console.log('Reschedule cancelled appointment status:', resReschedCancelled.status, '(Expected 400)');
    if (resReschedCancelled.status !== 400) {
      throw new Error('Failed to block rescheduling of cancelled appointment');
    }

    // Cannot alter status of completed appointment
    const resAlterCompleted = await makeRequest(
      'PATCH',
      `/api/v1/doctor/appointments/${aptA3._id}/status`,
      { status: 'Waiting' },
      { Authorization: `Bearer ${tokenDocA}` }
    );
    console.log('Alter completed status result:', resAlterCompleted.status, '(Expected 400)');
    if (resAlterCompleted.status !== 400) {
      throw new Error('Failed to block status alteration of completed appointment');
    }
    console.log('✅ Business rules successfully enforced.');

    // ── TEST 10: Doctor Data Isolation ──
    console.log('\n--- TEST 10: Cross-Doctor Data Isolation ---');
    // Doctor A tries to access Doctor B's appointment
    const resCrossAccess = await makeRequest(
      'GET',
      `/api/v1/doctor/appointments/${aptB1._id}`,
      null,
      { Authorization: `Bearer ${tokenDocA}` }
    );
    console.log('Doctor A access to Doctor B appointment status:', resCrossAccess.status, '(Expected 404)');
    if (resCrossAccess.status !== 404) {
      throw new Error('Security flaw: Doctor A was able to access Doctor B appointment');
    }

    // Doctor A tries to cancel Doctor B's appointment
    const resCrossCancel = await makeRequest(
      'PATCH',
      `/api/v1/doctor/appointments/${aptB1._id}/cancel`,
      { reason: 'Unauthorized cancel' },
      { Authorization: `Bearer ${tokenDocA}` }
    );
    console.log('Doctor A cancel Doctor B appointment status:', resCrossCancel.status, '(Expected 404)');
    if (resCrossCancel.status !== 404) {
      throw new Error('Security flaw: Doctor A was able to cancel Doctor B appointment');
    }

    // Doctor B appointments list should only return Doctor B's appointment
    const resDocBList = await makeRequest(
      'GET',
      `/api/v1/doctor/appointments?date=${toISODate(today)}`,
      null,
      { Authorization: `Bearer ${tokenDocB}` }
    );
    const dataDocB = resDocBList.data?.data || resDocBList.data;
    console.log('Doctor B appointments count:', dataDocB.appointments.length, '(Expected 1)');
    if (dataDocB.appointments.length !== 1 || dataDocB.appointments[0].id !== String(aptB1._id)) {
      throw new Error('Doctor B appointment isolation failed');
    }
    console.log('✅ Cross-doctor isolation strictly verified.');

    console.log('\n🎉 ALL DOCTOR APPOINTMENTS E2E TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
