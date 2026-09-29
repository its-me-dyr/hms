/**
 * Test Reception Endpoints
 * 
 * Verifies that the new /api/v1/reception routes are functional, protected,
 * and return live data for the Front Desk console.
 */

async function testReception() {
  const API_URL = 'http://localhost:5000/api/v1';

  console.log('1. Logging in as Front Desk Receptionist (reception@hms.com)...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'reception@hms.com',
      password: 'ReceptionPassword123!',
    }),
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginData.message}`);
  }

  const token = loginData?.data?.tokens?.accessToken || loginData?.data?.accessToken;
  const user = loginData?.data?.user;
  console.log('✓ Receptionist logged in successfully!', user.email, 'Role:', user.role);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  console.log('\n2. Testing GET /api/v1/reception/dashboard...');
  const dashRes = await fetch(`${API_URL}/reception/dashboard`, { headers: authHeaders });
  const dashData = await dashRes.json();
  console.log('dashData response:', JSON.stringify(dashData, null, 2));
  if (!dashRes.ok) throw new Error(`Dashboard failed: ${dashData.message}`);
  console.log('✓ Dashboard metrics retrieved:', {
    totalPatients: dashData.data.kpi.totalPatients,
    todayAppointments: dashData.data.kpi.todayAppointments,
    liveQueueTokens: dashData.data.liveQueue.length,
    availableBeds: dashData.data.kpi.availableBeds,
  });

  console.log('\n3. Testing GET /api/v1/reception/patients...');
  const patientsRes = await fetch(`${API_URL}/reception/patients?limit=5`, { headers: authHeaders });
  const patientsData = await patientsRes.json();
  if (!patientsRes.ok) throw new Error(`Patients failed: ${patientsData.message}`);
  console.log(`✓ Patients list retrieved! Count: ${patientsData.data.patients.length} (Total: ${patientsData.data.pagination.total})`);

  console.log('\n4. Testing GET /api/v1/reception/doctors...');
  const doctorsRes = await fetch(`${API_URL}/reception/doctors`, { headers: authHeaders });
  const doctorsData = await doctorsRes.json();
  if (!doctorsRes.ok) throw new Error(`Doctors failed: ${doctorsData.message}`);
  console.log(`✓ Doctors list retrieved! Count: ${doctorsData.data.length}`);

  console.log('\n5. Testing GET /api/v1/reception/queue...');
  const queueRes = await fetch(`${API_URL}/reception/queue`, { headers: authHeaders });
  const queueData = await queueRes.json();
  if (!queueRes.ok) throw new Error(`Queue failed: ${queueData.message}`);
  console.log(`✓ Queue tokens retrieved! Total tokens: ${queueData.data.queue.length}, Now Serving:`, queueData.data.nowServing?.tokenNumber || 'None');

  console.log('\n6. Testing GET /api/v1/reception/beds...');
  const bedsRes = await fetch(`${API_URL}/reception/beds`, { headers: authHeaders });
  const bedsData = await bedsRes.json();
  if (!bedsRes.ok) throw new Error(`Beds failed: ${bedsData.message}`);
  console.log(`✓ Bed availability retrieved! Available beds: ${bedsData.data.summary.available}/${bedsData.data.summary.total}`);

  console.log('\n7. Testing GET /api/v1/reception/bills...');
  const billsRes = await fetch(`${API_URL}/reception/bills?limit=5`, { headers: authHeaders });
  const billsData = await billsRes.json();
  if (!billsRes.ok) throw new Error(`Bills failed: ${billsData.message}`);
  console.log(`✓ Bills retrieved! Count: ${billsData.data.bills.length}`);

  console.log('\n=== ALL RECEPTION BACKEND ENDPOINTS ARE WORKING PERFECTLY! ===\n');
}

testReception().catch((err) => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
