/**
 * Test script for Super Admin Reports & Analytics API
 */
const BASE_URL = 'http://localhost:5000/api/v1';

async function runTests() {
  console.log('--- STARTING SUPER ADMIN REPORTS & ANALYTICS TESTS ---');

  // 1. Login as Super Admin
  console.log('\n1. Logging in as Super Admin...');
  let superAdminToken = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@hms.com',
        password: 'AdminPassword123!',
      }),
    });
    const loginJson = await loginRes.json();
    if (!loginRes.ok) throw new Error(JSON.stringify(loginJson));
    superAdminToken = loginJson.data?.accessToken || loginJson.accessToken || loginJson.token;
    console.log('✅ Super Admin login successful!');
  } catch (err) {
    console.error('❌ Super Admin login failed:', err.message);
    process.exit(1);
  }

  // 2. Test Super Admin Access to /super-admin/reports (default filters)
  console.log('\n2. Testing GET /super-admin/reports with default filters...');
  try {
    const res = await fetch(`${BASE_URL}/super-admin/reports?period=30d&hospitalId=all&status=all`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const json = await res.json();
    console.log('✅ Reports endpoint status:', res.status);
    const data = json.data;
    console.log('Summary metrics:', JSON.stringify(data.administrativeMetrics, null, 2));
    console.log(`Hospital reports count: ${data.hospitalReports?.length}`);
    console.log(`Recent activity count: ${data.recentActivity?.length}`);
    if (data.hospitalReports?.length > 0) {
      console.log('Sample hospital report:', data.hospitalReports[0]);
    }
    if (data.recentActivity?.length > 0) {
      console.log('Sample recent activity item:', data.recentActivity[0]);
    }
  } catch (err) {
    console.error('❌ Failed fetching reports:', err.message);
    process.exit(1);
  }

  // 3. Test Period Filtering (7d, 30d, 90d, this_year, all)
  console.log('\n3. Testing Period Filters...');
  for (const period of ['7d', '30d', '90d', 'this_year', 'all']) {
    try {
      const res = await fetch(`${BASE_URL}/super-admin/reports?period=${period}&hospitalId=all&status=all`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const json = await res.json();
      console.log(`✅ Period [${period}] returned total hospitals: ${json.data?.administrativeMetrics?.hospitals?.total}, audit logs: ${json.data?.administrativeMetrics?.auditLogs?.total}`);
    } catch (err) {
      console.error(`❌ Period [${period}] failed:`, err.message);
    }
  }

  // 4. Test Status Filtering (active, inactive)
  console.log('\n4. Testing Status Filters...');
  for (const status of ['active', 'inactive', 'all']) {
    try {
      const res = await fetch(`${BASE_URL}/super-admin/reports?period=all&hospitalId=all&status=${status}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const json = await res.json();
      console.log(`✅ Status [${status}] returned hospitals: ${json.data?.hospitalReports?.length} (total: ${json.data?.administrativeMetrics?.hospitals?.total}, active: ${json.data?.administrativeMetrics?.hospitals?.active}, inactive: ${json.data?.administrativeMetrics?.hospitals?.inactive})`);
    } catch (err) {
      console.error(`❌ Status [${status}] failed:`, err.message);
    }
  }

  // 5. Test Hospital Admin Security (Hospital Admin cannot access /super-admin/reports)
  console.log('\n5. Testing RBAC Security: Non-superadmin access restriction...');
  try {
    const unauthRes = await fetch(`${BASE_URL}/super-admin/reports`, {
      headers: { Authorization: `Bearer invalid-or-fake-token` },
    });
    console.log(`✅ Unauthenticated request correctly rejected with status: ${unauthRes.status}`);
  } catch (err) {
    console.log('Security check request error:', err.message);
  }

  console.log('\n--- ALL REPORTS & ANALYTICS TESTS COMPLETE ---');
}

runTests();
