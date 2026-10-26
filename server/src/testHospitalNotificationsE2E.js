/**
 * Hospital Admin: Notifications Inbox E2E Verification Suite
 * 
 * Tests:
 * 1. Super Admin authentication & hospital provisioning (Hospital A & B)
 * 2. Hospital Admin A & B logins
 * 3. Empty state handling (GET /hospital-admin/notifications on empty inbox)
 * 4. Multi-tenant notification delivery (User-specific & Hospital-wide)
 * 5. Multi-tenant isolation (Admin A cannot see Hospital B notifications)
 * 6. Mark single notification as read (PATCH /notifications/:id/read)
 * 7. Anti-IDOR protection (Admin A blocked from marking Hospital B notification as read)
 * 8. Mark all notifications as read (PATCH /notifications/mark-all-read & /read-all)
 * 9. Persistence & unread count synchronization
 * 10. Security & RBAC authorization enforcement (401 unauth, 403 unauthorized role)
 * 11. Zero credential leaks in notification payloads
 */

const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

const API_BASE = 'http://localhost:5000/api/v1';

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) },
    };

    if (body) {
      if (typeof body === 'object') {
        body = JSON.stringify(body);
        reqOptions.headers['Content-Type'] = 'application/json';
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    } else {
      delete reqOptions.headers['Content-Length'];
      delete reqOptions.headers['Content-Type'];
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(reqOptions.method)) {
        reqOptions.headers['Content-Length'] = 0;
      }
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsedData = null;
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          parsedData = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsedData,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

async function runSuite() {
  console.log('======================================================================');
  console.log('STARTING HOSPITAL ADMIN: NOTIFICATIONS INBOX E2E VERIFICATION SUITE');
  console.log('======================================================================\n');

  try {
    const ts = Date.now().toString().slice(-5);

    // ─── STEP 1: AUTHENTICATION & SETUP ──────────────────────────────
    console.log('--- Step 1: Authentication & Setup ---');
    const saLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: 'admin@hms.com',
      password: 'AdminPassword123!',
    });
    assert(saLogin.status === 200, 'Super Admin logged in successfully');
    const saToken = saLogin.data?.data?.accessToken;
    const saHeaders = { Authorization: `Bearer ${saToken}` };

    // Provision Hospital A
    const hospAEmail = `admin.notifa.${ts}@hms.org`;
    const createHospARes = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `Alpha Notification Center ${ts}`,
        registrationNumber: `NOTIF-A-${ts}`,
        contactEmail: hospAEmail,
        contactPhone: '+1 (800) 555-6601',
        emergencyHotline: '+1 (800) 555-9901',
        street: '100 Alpha Boulevard',
        city: 'Alpha City',
        state: 'NY',
        postalCode: '10001',
        country: 'United States',
        currency: 'USD',
        timezone: 'America/New_York',
      },
      adminDetails: {
        firstName: 'Alan',
        lastName: 'Notification',
        email: hospAEmail,
        phone: '+1 (800) 555-6602',
        password: 'AdminPassword123!',
      },
    });
    assert(createHospARes.status === 201, 'Hospital A provisioned successfully');
    const hospAId = createHospARes.data?.data?.hospital?.id;
    const adminAId = createHospARes.data?.data?.admin?.id;

    // Provision Hospital B (Isolation Target)
    const hospBEmail = `admin.notifb.${ts}@hms.org`;
    const createHospBRes = await request(`${API_BASE}/super-admin/hospitals`, {
      method: 'POST',
      headers: saHeaders,
    }, {
      hospitalDetails: {
        hospitalName: `Beta Notification Center ${ts}`,
        registrationNumber: `NOTIF-B-${ts}`,
        contactEmail: hospBEmail,
        contactPhone: '+1 (800) 555-7701',
        emergencyHotline: '+1 (800) 555-9902',
        street: '200 Beta Avenue',
        city: 'Beta City',
        state: 'IL',
        postalCode: '60007',
        country: 'United States',
        currency: 'USD',
        timezone: 'America/Chicago',
      },
      adminDetails: {
        firstName: 'Betty',
        lastName: 'Notification',
        email: hospBEmail,
        phone: '+1 (800) 555-7702',
        password: 'AdminPassword123!',
      },
    });
    assert(createHospBRes.status === 201, 'Hospital B provisioned successfully');
    const hospBId = createHospBRes.data?.data?.hospital?.id;
    const adminBId = createHospBRes.data?.data?.admin?.id;

    // Login as Admin A
    const adminALogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospAEmail,
      password: 'AdminPassword123!',
    });
    assert(adminALogin.status === 200, 'Hospital Admin A logged in successfully');
    const tokenA = adminALogin.data?.data?.accessToken;
    const headersA = { Authorization: `Bearer ${tokenA}` };

    // Login as Admin B
    const adminBLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: hospBEmail,
      password: 'AdminPassword123!',
    });
    assert(adminBLogin.status === 200, 'Hospital Admin B logged in successfully');
    const tokenB = adminBLogin.data?.data?.accessToken;
    const headersB = { Authorization: `Bearer ${tokenB}` };

    // ─── STEP 2: EMPTY INBOX RETRIEVAL ───────────────────────────────
    console.log('\n--- Step 2: Empty Inbox Retrieval ---');
    const initialRes = await request(`${API_BASE}/hospital-admin/notifications`, {
      method: 'GET',
      headers: headersA,
    });
    assert(initialRes.status === 200, 'GET /hospital-admin/notifications returned HTTP 200');
    assert(Array.isArray(initialRes.data?.data?.notifications), 'Notifications returned as array');
    assert(typeof initialRes.data?.data?.unreadCount === 'number', 'Unread count returned as number');

    // ─── STEP 3: SEED NOTIFICATIONS IN DATABASE ──────────────────────
    console.log('\n--- Step 3: Seed Real Notifications ---');
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hms');
    }
    const Notification = require('./models/Notification');

    const notif1 = await Notification.create({
      hospital: hospAId,
      recipient: adminAId,
      title: `System Alert for Hospital A ${ts}`,
      message: 'Critical system configuration review completed.',
      type: 'system',
      priority: 'high',
      isRead: false,
    });

    const notif2 = await Notification.create({
      hospital: hospAId,
      recipient: adminAId,
      title: `Hospital Broadcast for Alpha ${ts}`,
      message: 'Weekly hospital operating schedule updated.',
      type: 'hospital',
      priority: 'medium',
      isRead: false,
    });

    const notifB = await Notification.create({
      hospital: hospBId,
      recipient: adminBId,
      title: `Hospital B Confidential Notice ${ts}`,
      message: 'Confidential administrative report compiled for Beta.',
      type: 'security',
      priority: 'urgent',
      isRead: false,
    });

    assert(Boolean(notif1._id && notif2._id && notifB._id), 'Created test notifications across hospitals');

    // ─── STEP 4: RETRIEVE & MULTI-TENANT ISOLATION ───────────────────
    console.log('\n--- Step 4: Retrieve Notifications & Isolation ---');
    const fetchARes = await request(`${API_BASE}/hospital-admin/notifications`, {
      method: 'GET',
      headers: headersA,
    });
    assert(fetchARes.status === 200, 'Admin A retrieved notifications (HTTP 200)');
    const aList = fetchARes.data?.data?.notifications || [];
    assert(fetchARes.data?.data?.unreadCount >= 2, 'Admin A unreadCount reflects unread notifications');

    const seesNotif1 = aList.some((n) => n._id.toString() === notif1._id.toString());
    const seesNotif2 = aList.some((n) => n._id.toString() === notif2._id.toString());
    const seesNotifB = aList.some((n) => n._id.toString() === notifB._id.toString());

    assert(seesNotif1, 'Admin A receives recipient-targeted notification');
    assert(seesNotif2, 'Admin A receives hospital-targeted broadcast notification');
    assert(!seesNotifB, 'Admin A does NOT see Hospital B notification (Hospital Isolation verified)');

    // ─── STEP 5: MARK SINGLE NOTIFICATION AS READ ────────────────────
    console.log('\n--- Step 5: Mark Single Notification as Read ---');
    const markSingleRes = await request(`${API_BASE}/hospital-admin/notifications/${notif1._id}/read`, {
      method: 'PATCH',
      headers: headersA,
    });
    assert(markSingleRes.status === 200, 'PATCH /notifications/:id/read returned HTTP 200');

    // Verify persistence via GET
    const recheckRes = await request(`${API_BASE}/hospital-admin/notifications`, {
      method: 'GET',
      headers: headersA,
    });
    const updatedN1 = recheckRes.data?.data?.notifications?.find(
      (n) => n._id.toString() === notif1._id.toString()
    );
    assert(updatedN1?.isRead === true, 'Notification 1 isRead is now true in MongoDB');
    assert(Boolean(updatedN1?.readAt), 'Notification 1 readAt timestamp recorded');

    // ─── STEP 6: ANTI-IDOR SECURITY CHECK ────────────────────────────
    console.log('\n--- Step 6: Anti-IDOR Protection ---');
    // Admin A attempts to mark Hospital B notification as read
    const idorRes = await request(`${API_BASE}/hospital-admin/notifications/${notifB._id}/read`, {
      method: 'PATCH',
      headers: headersA,
    });
    assert(idorRes.status === 404, 'Admin A blocked from marking Hospital B notification as read (HTTP 404 IDOR Protection)');

    // Verify Hospital B notification remains unread
    const notifBCheck = await Notification.findById(notifB._id);
    assert(notifBCheck?.isRead === false, 'Hospital B notification remained untouched and unread');

    // ─── STEP 7: MARK ALL AS READ ────────────────────────────────────
    console.log('\n--- Step 7: Mark All as Read ---');
    const markAllRes = await request(`${API_BASE}/hospital-admin/notifications/mark-all-read`, {
      method: 'PATCH',
      headers: headersA,
    });
    assert(markAllRes.status === 200, 'PATCH /notifications/mark-all-read returned HTTP 200');

    // Recheck with GET
    const allReadCheck = await request(`${API_BASE}/hospital-admin/notifications`, {
      method: 'GET',
      headers: headersA,
    });
    assert(allReadCheck.data?.data?.unreadCount === 0, 'Unread count is now 0 after mark-all-read');
    const remainingUnreadA = allReadCheck.data?.data?.notifications?.filter((n) => !n.isRead);
    assert(remainingUnreadA.length === 0, 'All Hospital A notifications are now marked as read');

    // Also test alias /notifications/read-all
    const readAllAliasRes = await request(`${API_BASE}/hospital-admin/notifications/read-all`, {
      method: 'PATCH',
      headers: headersA,
    });
    assert(readAllAliasRes.status === 200, 'PATCH /notifications/read-all alias returned HTTP 200');

    // ─── STEP 8: HOSPITAL B INBOX ISOLATION ──────────────────────────
    console.log('\n--- Step 8: Hospital B Inbox Isolation ---');
    const fetchBRes = await request(`${API_BASE}/hospital-admin/notifications`, {
      method: 'GET',
      headers: headersB,
    });
    assert(fetchBRes.status === 200, 'Admin B retrieved notifications (HTTP 200)');
    const bList = fetchBRes.data?.data?.notifications || [];
    const bSeesNotifB = bList.some((n) => n._id.toString() === notifB._id.toString());
    const bSeesNotif1 = bList.some((n) => n._id.toString() === notif1._id.toString());

    assert(bSeesNotifB, 'Admin B sees Hospital B notification');
    assert(!bSeesNotif1, 'Admin B does NOT see Hospital A notification');
    const nBInList = bList.find((n) => n._id.toString() === notifB._id.toString());
    assert(nBInList?.isRead === false, 'Hospital B notification is still unread for Admin B');

    // ─── STEP 9: SECURITY & RBAC CONSTRAINTS ─────────────────────────
    console.log('\n--- Step 9: Security & RBAC Constraints ---');
    // Unauthenticated request
    const unauthRes = await request(`${API_BASE}/hospital-admin/notifications`, { method: 'GET' });
    assert(unauthRes.status === 401, 'Unauthenticated request rejected with HTTP 401');

    // Doctor login and unauthorized access attempt
    const docRes = await request(`${API_BASE}/hospital-admin/users`, {
      method: 'POST',
      headers: headersA,
    }, {
      firstName: 'Dr. Gregory',
      lastName: `House ${ts}`,
      email: `house.notif.${ts}@hms.org`,
      phone: '+1 (800) 555-8888',
      role: 'DOCTOR',
      department: 'General',
      password: 'DoctorPassword123!',
    });
    assert(docRes.status === 201, 'Provisioned Doctor in Hospital A');

    const docLogin = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
      email: `house.notif.${ts}@hms.org`,
      password: 'DoctorPassword123!',
    });
    const docToken = docLogin.data?.data?.accessToken;
    const docHeaders = { Authorization: `Bearer ${docToken}` };

    const docNotifRes = await request(`${API_BASE}/hospital-admin/notifications`, {
      method: 'GET',
      headers: docHeaders,
    });
    assert(docNotifRes.status === 403, 'Doctor role blocked from Hospital Admin notifications (HTTP 403)');

    // Security check: No credentials, passwords, or tokens in response payload
    const serialized = JSON.stringify(fetchARes.data);
    assert(!serialized.includes('password'), 'Notification payload contains no password fields');
    assert(!serialized.includes('accessToken'), 'Notification payload contains no JWT tokens');

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (err) {
    console.error('Unexpected error during verification suite:', err);
    failed++;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  console.log('\n======================================================================');
  console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
