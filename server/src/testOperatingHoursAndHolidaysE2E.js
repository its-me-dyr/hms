/**
 * testOperatingHoursAndHolidaysE2E.js
 * 
 * End-to-End & Security Verification Suite for:
 * Hospital Admin Operating Hours & Holidays Management
 */

const assert = require('assert');

const API_BASE = 'http://localhost:5000/api/v1';

async function request(url, options = {}, body = null) {
  const reqOptions = {
    method: options.method || 'GET',
    headers: { ...(options.headers || {}) },
  };

  if (body) {
    reqOptions.headers['Content-Type'] = 'application/json';
    reqOptions.body = JSON.stringify(body);
  }

  const res = await fetch(url, reqOptions);
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

let passed = 0;
let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('======================================================================');
  console.log('STARTING OPERATING HOURS & HOLIDAYS VERIFICATION SUITE');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // 1. AUTHENTICATION & LOGIN
  // -------------------------------------------------------------------------
  console.log('--- SECTION 1: AUTHENTICATION ---');
  const loginRes = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
    email: 'hospitaladmin@hms.com',
    password: 'HospitalAdmin123!',
  });
  check(loginRes.status === 200, 'Hospital Admin logged in successfully with HTTP 200');
  const token = loginRes.data?.data?.accessToken;
  check(Boolean(token), 'Received valid access token for Hospital Admin');

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  // -------------------------------------------------------------------------
  // 2. GET OPERATING HOURS & HOLIDAYS
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 2: GET OPERATING HOURS & HOLIDAYS ---');
  const getRes = await request(`${API_BASE}/hospital-admin/operating-hours`, {
    headers: authHeaders,
  });
  check(getRes.status === 200, 'GET /hospital-admin/operating-hours returned HTTP 200');
  check(Array.isArray(getRes.data?.data?.operatingHours), 'Returned operatingHours array');
  check(Array.isArray(getRes.data?.data?.holidays), 'Returned holidays array');
  const hours = getRes.data?.data?.operatingHours || [];
  check(hours.length >= 7, `Returned weekly schedule with ${hours.length} days`);

  const dayNames = hours.map((h) => h.day);
  const expectedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const allDaysPresent = expectedDays.every((d) => dayNames.includes(d));
  check(allDaysPresent, 'All 7 standard days (Monday-Sunday) are present in the schedule');

  // -------------------------------------------------------------------------
  // 3. TIME VALIDATION (REJECTIONS)
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 3: OPERATING HOURS TIME VALIDATION ---');

  // 3a. Identical opening and closing times
  const identicalRes = await request(`${API_BASE}/hospital-admin/operating-hours`, {
    method: 'PUT',
    headers: authHeaders,
  }, {
    operatingHours: [
      { day: 'Monday', openTime: '09:00 AM', closeTime: '09:00 AM', isClosed: false },
    ],
  });
  check(identicalRes.status === 400, 'Identical opening and closing time rejected with HTTP 400');
  check(
    identicalRes.data?.message?.includes('identical'),
    `Descriptive error returned: "${identicalRes.data?.message}"`
  );

  // 3b. Closing time before opening time
  const invertedRes = await request(`${API_BASE}/hospital-admin/operating-hours`, {
    method: 'PUT',
    headers: authHeaders,
  }, {
    operatingHours: [
      { day: 'Tuesday', openTime: '05:00 PM', closeTime: '09:00 AM', isClosed: false },
    ],
  });
  check(invertedRes.status === 400, 'Closing time before opening time rejected with HTTP 400');
  check(
    invertedRes.data?.message?.includes('after opening time'),
    `Descriptive error returned: "${invertedRes.data?.message}"`
  );

  // 3c. Missing time when day is open
  const missingTimeRes = await request(`${API_BASE}/hospital-admin/operating-hours`, {
    method: 'PUT',
    headers: authHeaders,
  }, {
    operatingHours: [
      { day: 'Wednesday', openTime: '', closeTime: '05:00 PM', isClosed: false },
    ],
  });
  check(missingTimeRes.status === 400, 'Missing open time rejected with HTTP 400');

  // 3d. Malformed time string
  const malformedRes = await request(`${API_BASE}/hospital-admin/operating-hours`, {
    method: 'PUT',
    headers: authHeaders,
  }, {
    operatingHours: [
      { day: 'Thursday', openTime: '25:99', closeTime: '06:00 PM', isClosed: false },
    ],
  });
  check(malformedRes.status === 400, 'Malformed time string rejected with HTTP 400');

  // -------------------------------------------------------------------------
  // 4. VALID OPERATING HOURS PERSISTENCE
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 4: VALID SCHEDULE PERSISTENCE ---');
  const validSchedule = [
    { day: 'Monday', openTime: '08:30 AM', closeTime: '06:30 PM', isClosed: false },
    { day: 'Tuesday', openTime: '08:30 AM', closeTime: '06:30 PM', isClosed: false },
    { day: 'Wednesday', openTime: '08:30 AM', closeTime: '06:30 PM', isClosed: false },
    { day: 'Thursday', openTime: '08:30 AM', closeTime: '06:30 PM', isClosed: false },
    { day: 'Friday', openTime: '08:30 AM', closeTime: '05:00 PM', isClosed: false },
    { day: 'Saturday', openTime: '09:00 AM', closeTime: '02:00 PM', isClosed: false },
    { day: 'Sunday', openTime: '09:00 AM', closeTime: '01:00 PM', isClosed: true },
  ];

  const updateRes = await request(`${API_BASE}/hospital-admin/operating-hours`, {
    method: 'PUT',
    headers: authHeaders,
  }, {
    operatingHours: validSchedule,
  });
  check(updateRes.status === 200, 'Valid operating hours updated with HTTP 200');
  check(updateRes.data?.data?.length === 7, 'Response returned all 7 days');

  // Verify persistence by fetching fresh from backend
  const verifyGetRes = await request(`${API_BASE}/hospital-admin/operating-hours`, {
    headers: authHeaders,
  });
  const savedMonday = verifyGetRes.data?.data?.operatingHours?.find((h) => h.day === 'Monday');
  const savedSunday = verifyGetRes.data?.data?.operatingHours?.find((h) => h.day === 'Sunday');
  check(savedMonday?.openTime === '08:30 AM', 'Monday opening time 08:30 AM persisted in DB');
  check(savedMonday?.closeTime === '06:30 PM', 'Monday closing time 06:30 PM persisted in DB');
  check(savedMonday?.isClosed === false, 'Monday isClosed: false persisted in DB');
  check(savedSunday?.isClosed === true, 'Sunday isClosed: true persisted in DB');

  // -------------------------------------------------------------------------
  // 5. HOLIDAYS CRUD & VALIDATION
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 5: HOLIDAYS CRUD & DUPLICATE VALIDATION ---');
  const uniqueDate = `2026-11-${String(Math.floor(10 + Math.random() * 18))}`;
  const holidayName = `Test National Health Day ${Date.now().toString().slice(-4)}`;

  // 5a. Validation: missing name or date
  const missingNameRes = await request(`${API_BASE}/hospital-admin/holidays`, {
    method: 'POST',
    headers: authHeaders,
  }, {
    name: '',
    date: uniqueDate,
  });
  check(missingNameRes.status === 400, 'Holiday with empty name rejected with HTTP 400');

  const invalidDateRes = await request(`${API_BASE}/hospital-admin/holidays`, {
    method: 'POST',
    headers: authHeaders,
  }, {
    name: 'Invalid Date Holiday',
    date: 'not-a-date',
  });
  check(invalidDateRes.status === 400, 'Invalid holiday date rejected with HTTP 400');

  // 5b. Valid creation
  const addHolidayRes = await request(`${API_BASE}/hospital-admin/holidays`, {
    method: 'POST',
    headers: authHeaders,
  }, {
    name: holidayName,
    date: uniqueDate,
    description: 'Special administrative closure',
  });
  check(addHolidayRes.status === 200, 'POST /hospital-admin/holidays created holiday with HTTP 200');

  const returnedHolidays = addHolidayRes.data?.data || [];
  const createdHoliday = returnedHolidays.find((h) => h.date === uniqueDate);
  check(Boolean(createdHoliday), `Created holiday (${uniqueDate}) found in returned array`);
  check(createdHoliday?.name === holidayName, 'Created holiday name persisted accurately');

  // 5c. Duplicate date prevention (must not create duplicate entry)
  const initialCount = addHolidayRes.data?.data?.length || 0;
  const duplicateRes = await request(`${API_BASE}/hospital-admin/holidays`, {
    method: 'POST',
    headers: authHeaders,
  }, {
    name: 'Updated Health Day Name',
    date: uniqueDate,
    description: 'Updated closure notes',
  });
  check(duplicateRes.status === 200, 'Submitting same date processed with HTTP 200');
  const countAfter = duplicateRes.data?.data?.length || 0;
  check(countAfter === initialCount, `Holiday count did not duplicate (${countAfter} === ${initialCount})`);
  const updatedHoliday = duplicateRes.data?.data?.find((h) => h.date === uniqueDate);
  check(updatedHoliday?.name === 'Updated Health Day Name', 'Record on same date was updated without creating duplicate entry');

  // 5d. Delete holiday
  if (createdHoliday?._id) {
    const deleteRes = await request(`${API_BASE}/hospital-admin/holidays/${createdHoliday._id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    check(deleteRes.status === 200, 'DELETE /hospital-admin/holidays/:id succeeded with HTTP 200');

    // Confirm deletion from backend
    const afterDeleteGet = await request(`${API_BASE}/hospital-admin/operating-hours`, {
      headers: authHeaders,
    });
    const stillExists = afterDeleteGet.data?.data?.holidays?.some(
      (h) => h._id === createdHoliday._id || h.date === uniqueDate
    );
    check(!stillExists, 'Deleted holiday is no longer in MongoDB');
  }

  // -------------------------------------------------------------------------
  // 6. AUDIT LOG GENERATION
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 6: AUDIT LOG VERIFICATION ---');
  const auditRes = await request(`${API_BASE}/hospital-admin/audit-logs`, {
    headers: authHeaders,
  });
  check(auditRes.status === 200, 'GET /hospital-admin/audit-logs returned HTTP 200');
  const auditLogs = auditRes.data?.data?.logs || [];
  const hasHoursAudit = auditLogs.some((l) => l.action === 'UPDATE_OPERATING_HOURS');
  const hasHolidayAudit = auditLogs.some((l) => l.action === 'CREATE_HOLIDAY' || l.action === 'DELETE_HOLIDAY');
  check(hasHoursAudit, 'UPDATE_OPERATING_HOURS audit record present in audit log');
  check(hasHolidayAudit, 'CREATE_HOLIDAY or DELETE_HOLIDAY audit record present in audit log');

  // -------------------------------------------------------------------------
  // 7. SECURITY & ACCESS CONTROL
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 7: SECURITY & RBAC CONSTRAINTS ---');

  // Unauthorized request (no token)
  const unauthRes = await request(`${API_BASE}/hospital-admin/operating-hours`, {
    method: 'PUT',
  }, { operatingHours: [] });
  check(unauthRes.status === 401, 'Unauthenticated request rejected with HTTP 401');

  // Clinical staff role trying to mutate operating hours
  const docLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
    email: 'doctor@hms.com',
    password: 'DoctorPassword123!',
  });
  if (docLogin.data?.data?.accessToken) {
    const docRes = await request(`${API_BASE}/hospital-admin/operating-hours`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${docLogin.data.data.accessToken}` },
    }, { operatingHours: validSchedule });
    check(docRes.status === 403, 'Doctor blocked from mutating operating hours with HTTP 403');
  }

  console.log('\n======================================================================');
  console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});
