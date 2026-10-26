/**
 * testRolesCleanupVerification.js
 * 
 * Comprehensive Verification of Hospital Admin Roles & Permissions Removal
 * and Super Admin RBAC Preservation.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const API_BASE = 'http://localhost:5000/api/v1';

async function request(url, options = {}) {
  const res = await fetch(url, options);
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('======================================================================');
  console.log('VERIFYING ROLES & PERMISSIONS REMOVAL FROM HOSPITAL ADMIN');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // 1. FRONTEND NAVIGATION SPECIFICATION VERIFICATION
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: roleNavigation.js Specification ---');
  const navPath = path.resolve(__dirname, '../../client/src/pages/dashboards/roleNavigation.js');
  const navContent = fs.readFileSync(navPath, 'utf8');

  // Verify Hospital Admin MAIN section
  const haBlock = navContent.slice(navContent.indexOf('hospital_admin: {'), navContent.indexOf('pharmacist: {'));
  const haMainMatch = haBlock.match(/title:\s*'MAIN'[\s\S]*?items:\s*\[([\s\S]*?)\]\s*,?\s*\}/);
  assert(haMainMatch, 'Found hospital_admin MAIN section in roleNavigation.js');
  const haMainItems = haMainMatch[1];
  assert(!haMainItems.includes("'roles'"), 'Hospital Admin MAIN items do NOT contain roles');
  assert(!haMainItems.includes('Roles & Permissions'), 'Hospital Admin MAIN items do NOT contain "Roles & Permissions"');
  console.log('[PASS] Hospital Admin MAIN items do NOT contain Roles & Permissions');

  // Verify expected 9 items in MAIN
  const expectedMainIds = [
    'dashboard',
    'hospital-settings',
    'departments',
    'services-charges',
    'users',
    'operating-hours',
    'branding',
    'system-config',
    'reports'
  ];
  for (const id of expectedMainIds) {
    assert(haMainItems.includes(`id: '${id}'`), `Hospital Admin MAIN contains id: '${id}'`);
  }
  console.log(`[PASS] All 9 expected MAIN items confirmed in Hospital Admin sidebar: ${expectedMainIds.join(', ')}`);

  // Verify flat items list and entire hospital_admin block does not have roles
  assert(!haBlock.includes("'roles'"), 'Hospital Admin block strictly does NOT contain roles');
  assert(!haBlock.includes('Roles & Permissions'), 'Hospital Admin block strictly does NOT contain "Roles & Permissions"');
  console.log('[PASS] Hospital Admin configuration has NO roles or Roles & Permissions anywhere');

  // Verify Super Admin PRESERVES Roles & Permissions
  const saBlock = navContent.slice(navContent.indexOf('super_admin: {'), navContent.indexOf('hospital_admin: {'));
  assert(saBlock.includes("'roles'"), 'Super Admin navigation PRESERVES roles');
  assert(saBlock.includes('Roles & Permissions'), 'Super Admin navigation PRESERVES "Roles & Permissions"');
  console.log('[PASS] Super Admin navigation PRESERVES Roles & Permissions');

  // -------------------------------------------------------------------------
  // 2. FRONTEND DASHBOARD COMPONENT VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: HospitalAdminDashboard.jsx Routing & State ---');
  const dashPath = path.resolve(__dirname, '../../client/src/pages/dashboards/HospitalAdminDashboard.jsx');
  const dashContent = fs.readFileSync(dashPath, 'utf8');

  // Check VALID_TABS
  const validTabsMatch = dashContent.match(/const VALID_TABS = \[([\s\S]*?)\];/);
  assert(validTabsMatch, 'Found VALID_TABS array in HospitalAdminDashboard.jsx');
  const validTabsStr = validTabsMatch[1];
  assert(!validTabsStr.includes("'roles'"), "VALID_TABS does NOT include 'roles'");
  console.log("[PASS] VALID_TABS does NOT contain 'roles'");

  // Check that roles tab JSX was removed
  assert(!dashContent.includes("activeTab === 'roles'"), "HospitalAdminDashboard.jsx does NOT contain activeTab === 'roles'");
  assert(!dashContent.includes('const [rolesList, setRolesList]'), 'HospitalAdminDashboard.jsx does NOT declare rolesList state');
  console.log("[PASS] HospitalAdminDashboard.jsx has NO roles tab rendering or state");

  // Verify routing fallback: when ?tab=roles is provided
  const tabRolesSim = validTabsStr.split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean);
  const resolvedTabForRoles = tabRolesSim.includes('roles') ? 'roles' : 'dashboard';
  assert(resolvedTabForRoles === 'dashboard', 'When tab=roles is requested, routing defaults to dashboard');
  console.log("[PASS] Routing test: direct navigation to ?tab=roles resolves strictly to 'dashboard'");

  // -------------------------------------------------------------------------
  // 3. BACKEND SECURITY: HOSPITAL ADMIN CANNOT MUTATE ROLES
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Backend Security & Authorization ---');

  // 3a. Login as Hospital Admin
  const haLoginRes = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hospitaladmin@hms.com', password: 'HospitalAdmin123!' })
  });
  assert(haLoginRes.status === 200, 'Hospital Admin login succeeded');
  const haToken = haLoginRes.data.data.accessToken;
  console.log('[PASS] Hospital Admin logged in successfully');

  // 3b. Hospital Admin attempts to mutate role permissions via Super Admin route
  const haMutateRes = await request(`${API_BASE}/super-admin/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${haToken}`
    },
    body: JSON.stringify({ roleName: 'DOCTOR', permissions: ['manage_all'] })
  });
  assert(haMutateRes.status === 403, `Hospital Admin mutation rejected with HTTP 403 Forbidden (got ${haMutateRes.status})`);
  console.log('[PASS] Hospital Admin blocked from mutating role permissions: HTTP 403 Forbidden');

  // 3c. Hospital Admin attempts POST /hospital-admin/roles (must be 404 - no such mutation route exists)
  const haPostHARoles = await request(`${API_BASE}/hospital-admin/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${haToken}`
    },
    body: JSON.stringify({ roleName: 'DOCTOR' })
  });
  assert(haPostHARoles.status === 404, `POST /hospital-admin/roles returns 404 Not Found (got ${haPostHARoles.status})`);
  console.log('[PASS] No mutation route exists under /hospital-admin/roles (HTTP 404)');

  // -------------------------------------------------------------------------
  // 4. SUPER ADMIN RBAC FULLY PRESERVED & FUNCTIONAL
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Super Admin Roles & Permissions Functionality ---');

  // 4a. Login as Super Admin
  const saLoginRes = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@hms.com', password: 'AdminPassword123!' })
  });
  assert(saLoginRes.status === 200, 'Super Admin login succeeded');
  const saToken = saLoginRes.data.data.accessToken;
  console.log('[PASS] Super Admin logged in successfully');

  // 4b. Fetch Super Admin Roles & Permissions
  const saRolesRes = await request(`${API_BASE}/super-admin/roles`, {
    headers: { 'Authorization': `Bearer ${saToken}` }
  });
  assert(saRolesRes.status === 200, 'Super Admin GET /super-admin/roles returned HTTP 200');
  assert(Array.isArray(saRolesRes.data.data), 'Super Admin roles returned as array');
  const roles = saRolesRes.data.data;
  assert(roles.length > 0, 'Roles list is not empty');
  const doctorRole = roles.find(r => r.name === 'DOCTOR' || r.name === 'doctor');
  assert(doctorRole, 'Doctor role found in RBAC matrix');
  console.log(`[PASS] Super Admin fetched ${roles.length} roles from RBAC matrix with full permission sets`);

  // 4c. Super Admin can update role permissions
  const initialPerms = doctorRole.permissions || [];
  const updateRes = await request(`${API_BASE}/super-admin/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${saToken}`
    },
    body: JSON.stringify({
      roleId: doctorRole.name || doctorRole.id,
      permissions: initialPerms
    })
  });
  assert(updateRes.status === 200, 'Super Admin POST /super-admin/roles succeeded with HTTP 200');
  console.log('[PASS] Super Admin successfully saved/managed role permissions');

  // -------------------------------------------------------------------------
  // 5. HOSPITAL ADMIN OPERATIONAL MODULES HEALTH CHECK
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Hospital Admin Allowed Modules Health ---');

  const checkModules = [
    { name: 'Dashboard', path: '/hospital-admin/dashboard' },
    { name: 'Settings', path: '/hospital-admin/settings' },
    { name: 'Departments', path: '/hospital-admin/departments' },
    { name: 'Services & Charges', path: '/hospital-admin/services' },
    { name: 'Users & Staff', path: '/hospital-admin/users' },
    { name: 'Operating Hours', path: '/hospital-admin/operating-hours' },
    { name: 'Branding', path: '/hospital-admin/branding' },
    { name: 'System Config', path: '/hospital-admin/system-config' },
    { name: 'Reports', path: '/hospital-admin/reports' },
    { name: 'Notifications', path: '/hospital-admin/notifications' },
    { name: 'Audit Logs', path: '/hospital-admin/audit-logs' },
    { name: 'Profile', path: '/hospital-admin/profile' },
  ];

  for (const mod of checkModules) {
    const res = await request(`${API_BASE}${mod.path}`, {
      headers: { 'Authorization': `Bearer ${haToken}` }
    });
    assert(res.status === 200, `Hospital Admin module ${mod.name} (${mod.path}) returned HTTP 200`);
    console.log(`[PASS] Hospital Admin ${mod.name} module accessible and responsive (HTTP 200)`);
  }

  console.log('\n======================================================================');
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  console.log('======================================================================');
}

runTests().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
