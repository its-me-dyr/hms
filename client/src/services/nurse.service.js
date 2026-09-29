/**
 * Nursing Care Station Service Layer
 * 
 * Manages clinical inpatient data, vitals logs, eMAR medication administration,
 * doctor order acknowledgement, nursing SOAP notes, shift handovers, and emergency call alerts.
 * Uses real patient records from receptionService and maintains reactive in-memory clinical state.
 */

import { receptionService } from './reception.service';

// Clinical Initial Mock Data Generator for Inpatients
const INITIAL_INPATIENTS = [
  {
    id: 'inp-1',
    patientId: 'HMS-P-1002',
    name: 'Eleanor Vance',
    age: 42,
    gender: 'Female',
    bloodGroup: 'A+',
    ward: 'Ward 3A - Medical',
    room: 'Room 301',
    bed: 'Bed 301-A',
    admissionDate: '2026-09-14',
    attendingDoctor: 'Dr. Sarah Jenkins (Cardiology)',
    diagnosis: 'Acute Coronary Syndrome / Post-Angioplasty',
    acuity: 'Monitoring', // Stable, Monitoring, Post-Op, Critical
    diet: 'Low Sodium Cardiac Diet',
    codeStatus: 'Full Code',
    allergies: 'Penicillin, NSAIDs',
    ivAccess: 'Left Forearm 20G (Placed 15/09)',
    foley: 'No',
    oxygen: '2L via Nasal Cannula',
    lastVitals: {
      bp: '124/78',
      hr: 76,
      spo2: 98,
      temp: '98.6°F',
      rr: 16,
      glucose: 110,
      time: '08:30 AM',
      status: 'normal',
    },
  },
  {
    id: 'inp-2',
    patientId: 'HMS-P-1004',
    name: 'Thomas Anderson',
    age: 58,
    gender: 'Male',
    bloodGroup: 'O+',
    ward: 'Ward 3A - Medical',
    room: 'Room 302',
    bed: 'Bed 302-B',
    admissionDate: '2026-09-15',
    attendingDoctor: 'Dr. Robert Chen (Neurology)',
    diagnosis: 'Transient Ischemic Attack (TIA) / Hypertension',
    acuity: 'Critical',
    diet: 'Diabetic Soft Diet',
    codeStatus: 'Full Code',
    allergies: 'Sulfa Drugs',
    ivAccess: 'Right Antecubital 18G',
    foley: 'Yes (Clear, 450ml output)',
    oxygen: 'Room Air',
    lastVitals: {
      bp: '158/96',
      hr: 92,
      spo2: 95,
      temp: '99.1°F',
      rr: 20,
      glucose: 184,
      time: '08:45 AM',
      status: 'warning',
    },
  },
  {
    id: 'inp-3',
    patientId: 'HMS-P-1007',
    name: 'Rachel Green',
    age: 29,
    gender: 'Female',
    bloodGroup: 'B+',
    ward: 'Ward 3B - Surgical',
    room: 'Room 305',
    bed: 'Bed 305-A',
    admissionDate: '2026-09-16',
    attendingDoctor: 'Dr. Michael Chang (General Surgery)',
    diagnosis: 'Post-Op Laparoscopic Cholecystectomy (Day 1)',
    acuity: 'Post-Op',
    diet: 'Clear Liquids as Tolerated',
    codeStatus: 'Full Code',
    allergies: 'NKDA',
    ivAccess: 'Left Hand 22G Infusing D5W @ 75ml/hr',
    foley: 'Discontinued',
    oxygen: 'Room Air',
    lastVitals: {
      bp: '118/74',
      hr: 72,
      spo2: 99,
      temp: '98.4°F',
      rr: 15,
      glucose: 98,
      time: '08:15 AM',
      status: 'normal',
    },
  },
  {
    id: 'inp-4',
    patientId: 'HMS-P-1011',
    name: 'James Holden',
    age: 65,
    gender: 'Male',
    bloodGroup: 'AB+',
    ward: 'Ward 3B - Surgical',
    room: 'Room 306',
    bed: 'Bed 306-A',
    admissionDate: '2026-09-12',
    attendingDoctor: 'Dr. Sarah Jenkins (Cardiology)',
    diagnosis: 'Congestive Heart Failure Exacerbation',
    acuity: 'Monitoring',
    diet: '2g Sodium / 1.5L Fluid Restriction',
    codeStatus: 'DNR (Do Not Resuscitate)',
    allergies: 'Latex, Aspirin',
    ivAccess: 'Right Forearm 20G Hep-Lock',
    foley: 'No',
    oxygen: '3L via Nasal Cannula',
    lastVitals: {
      bp: '136/82',
      hr: 84,
      spo2: 94,
      temp: '98.8°F',
      rr: 18,
      glucose: 122,
      time: '08:00 AM',
      status: 'normal',
    },
  },
  {
    id: 'inp-5',
    patientId: 'HMS-P-1015',
    name: 'Chloe Decker',
    age: 34,
    gender: 'Female',
    bloodGroup: 'O-',
    ward: 'Ward 3A - Medical',
    room: 'Room 303',
    bed: 'Bed 303-A',
    admissionDate: '2026-09-16',
    attendingDoctor: 'Dr. Emily Watson (Pediatrics/Internal)',
    diagnosis: 'Severe Pyelonephritis / Dehydration',
    acuity: 'Stable',
    diet: 'Regular Hospital Diet',
    codeStatus: 'Full Code',
    allergies: 'Ciprofloxacin',
    ivAccess: 'Right Forearm 20G with IV Ceftriaxone',
    foley: 'No',
    oxygen: 'Room Air',
    lastVitals: {
      bp: '112/68',
      hr: 68,
      spo2: 99,
      temp: '100.2°F',
      rr: 16,
      glucose: 104,
      time: '08:50 AM',
      status: 'warning',
    },
  },
];

// eMAR (Electronic Medication Administration Record)
const INITIAL_MEDICATIONS = [
  {
    id: 'med-1',
    patientId: 'HMS-P-1002',
    patientName: 'Eleanor Vance',
    roomBed: '301-A',
    drugName: 'Aspirin (Enteric Coated)',
    dosage: '81 mg',
    route: 'Oral (PO)',
    frequency: 'Once Daily',
    dueTime: '09:00 AM',
    status: 'Due', // Due, Given, Held
    orderedBy: 'Dr. Sarah Jenkins',
    indication: 'Antiplatelet therapy',
  },
  {
    id: 'med-2',
    patientId: 'HMS-P-1002',
    patientName: 'Eleanor Vance',
    roomBed: '301-A',
    drugName: 'Metoprolol Tartrate',
    dosage: '25 mg',
    route: 'Oral (PO)',
    frequency: 'BID (Twice Daily)',
    dueTime: '09:00 AM',
    status: 'Due',
    orderedBy: 'Dr. Sarah Jenkins',
    indication: 'Heart rate & BP control (Hold if HR < 60)',
  },
  {
    id: 'med-3',
    patientId: 'HMS-P-1004',
    patientName: 'Thomas Anderson',
    roomBed: '302-B',
    drugName: 'Lisinopril',
    dosage: '20 mg',
    route: 'Oral (PO)',
    frequency: 'Once Daily',
    dueTime: '09:00 AM',
    status: 'Due',
    orderedBy: 'Dr. Robert Chen',
    indication: 'Hypertension management',
  },
  {
    id: 'med-4',
    patientId: 'HMS-P-1004',
    patientName: 'Thomas Anderson',
    roomBed: '302-B',
    drugName: 'Atorvastatin',
    dosage: '40 mg',
    route: 'Oral (PO)',
    frequency: 'QHS (Nightly)',
    dueTime: '10:00 PM',
    status: 'Scheduled',
    orderedBy: 'Dr. Robert Chen',
    indication: 'Hyperlipidemia',
  },
  {
    id: 'med-5',
    patientId: 'HMS-P-1007',
    patientName: 'Rachel Green',
    roomBed: '305-A',
    drugName: 'Ondansetron (Zofran)',
    dosage: '4 mg',
    route: 'IV Push',
    frequency: 'Q8H PRN Nausea',
    dueTime: '09:30 AM',
    status: 'Due',
    orderedBy: 'Dr. Michael Chang',
    indication: 'Post-op nausea / vomiting prophylaxis',
  },
  {
    id: 'med-6',
    patientId: 'HMS-P-1015',
    patientName: 'Chloe Decker',
    roomBed: '303-A',
    drugName: 'Ceftriaxone',
    dosage: '1 g in 100ml NS',
    route: 'IV Piggyback over 30 min',
    frequency: 'Q24H',
    dueTime: '10:00 AM',
    status: 'Due',
    orderedBy: 'Dr. Emily Watson',
    indication: 'Pyelonephritis IV antibiotic coverage',
  },
  {
    id: 'med-7',
    patientId: 'HMS-P-1011',
    patientName: 'James Holden',
    roomBed: '306-A',
    drugName: 'Furosemide (Lasix)',
    dosage: '40 mg',
    route: 'IV Push (slow over 2 min)',
    frequency: 'BID',
    dueTime: '08:00 AM',
    status: 'Given',
    administeredAt: '08:05 AM',
    administeredBy: 'Nurse Deva Chitturi, RN',
    orderedBy: 'Dr. Sarah Jenkins',
    indication: 'Diuresis for CHF fluid overload',
  },
];

// Clinical Vitals History Log
const INITIAL_VITALS = [
  {
    id: 'vit-1',
    patientId: 'HMS-P-1004',
    patientName: 'Thomas Anderson',
    roomBed: '302-B',
    time: '08:45 AM',
    date: '2026-09-17',
    bp: '158/96',
    hr: 92,
    spo2: 95,
    temp: '99.1',
    rr: 20,
    glucose: 184,
    painScore: '4/10 (Headache)',
    recordedBy: 'Deva Chitturi, RN',
    notes: 'BP elevated. Reported mild temporal headache. Notified Dr. Chen.',
    alert: true,
  },
  {
    id: 'vit-2',
    patientId: 'HMS-P-1015',
    patientName: 'Chloe Decker',
    roomBed: '303-A',
    time: '08:50 AM',
    date: '2026-09-17',
    bp: '112/68',
    hr: 68,
    spo2: 99,
    temp: '100.2',
    rr: 16,
    glucose: 104,
    painScore: '3/10 (Flank)',
    recordedBy: 'Deva Chitturi, RN',
    notes: 'Low-grade fever persisting. Cool compress applied. IV fluids infusing.',
    alert: true,
  },
  {
    id: 'vit-3',
    patientId: 'HMS-P-1002',
    patientName: 'Eleanor Vance',
    roomBed: '301-A',
    time: '08:30 AM',
    date: '2026-09-17',
    bp: '124/78',
    hr: 76,
    spo2: 98,
    temp: '98.6',
    rr: 16,
    glucose: 110,
    painScore: '0/10',
    recordedBy: 'Deva Chitturi, RN',
    notes: 'Vitals stable. Groin puncture site soft, dry, without hematoma.',
    alert: false,
  },
  {
    id: 'vit-4',
    patientId: 'HMS-P-1007',
    patientName: 'Rachel Green',
    roomBed: '305-A',
    time: '08:15 AM',
    date: '2026-09-17',
    bp: '118/74',
    hr: 72,
    spo2: 99,
    temp: '98.4',
    rr: 15,
    glucose: 98,
    painScore: '3/10 (Incisional)',
    recordedBy: 'Deva Chitturi, RN',
    notes: 'Incisional surgical dressing clean, dry, and intact.',
    alert: false,
  },
  {
    id: 'vit-5',
    patientId: 'HMS-P-1011',
    patientName: 'James Holden',
    roomBed: '306-A',
    time: '08:00 AM',
    date: '2026-09-17',
    bp: '136/82',
    hr: 84,
    spo2: 94,
    temp: '98.8',
    rr: 18,
    glucose: 122,
    painScore: '1/10',
    recordedBy: 'Deva Chitturi, RN',
    notes: 'Bilateral basal lung crackles noted. On 3L O2 cannula.',
    alert: false,
  },
];

// Nursing SOAP Progress Notes
const INITIAL_NOTES = [
  {
    id: 'note-1',
    patientId: 'HMS-P-1004',
    patientName: 'Thomas Anderson',
    roomBed: '302-B',
    timestamp: '2026-09-17 08:50 AM',
    author: 'Deva Chitturi, RN (Staff Nurse)',
    shift: 'Morning Shift',
    category: 'Physician Notification',
    soap: {
      s: 'Patient states "I have had a throbbing ache on the right side of my head since 7:30 AM."',
      o: 'Alert and oriented x 4. Pupils equal, round, reactive to light. Cranial nerves intact. BP 158/96, HR 92. No acute facial droop or arm drift.',
      a: 'Hypertensive headache post-TIA under neurology observation.',
      p: 'Dr. Robert Chen notified via hospital pager at 08:48 AM. Morning Lisinopril 20mg prepared. Continue strict neuro checks Q2H.',
    },
  },
  {
    id: 'note-2',
    patientId: 'HMS-P-1007',
    patientName: 'Rachel Green',
    roomBed: '305-A',
    timestamp: '2026-09-17 08:20 AM',
    author: 'Deva Chitturi, RN (Staff Nurse)',
    shift: 'Morning Shift',
    category: 'Post-Op Assessment',
    soap: {
      s: 'Patient ambulated to chair with 1-person assistance. States pain is well managed with oral analgesics.',
      o: 'Abdomen soft, bowel sounds present in all four quadrants. 4 laparoscopic puncture dressings dry with no strikethrough bleeding.',
      a: 'Post-cholecystectomy recovery progressing normally.',
      p: 'Advancing diet to clear liquids. Encourage incentive spirometry 10 breaths every hour.',
    },
  },
  {
    id: 'note-3',
    patientId: 'HMS-P-1011',
    patientName: 'James Holden',
    roomBed: '306-A',
    timestamp: '2026-09-17 07:45 AM',
    author: 'Deva Chitturi, RN (Staff Nurse)',
    shift: 'Morning Shift',
    category: 'Routine Care',
    soap: {
      s: 'Patient reports mild dyspnea when lying flat. Sleeping with head of bed elevated to 45 degrees.',
      o: '2+ pitting pedal edema noted up to mid-calf. 3L O2 maintains SpO2 at 94%. Urine output 350ml in past 8 hours.',
      a: 'CHF fluid retention.',
      p: 'IV Furosemide administered as scheduled. Daily standing weight obtained: 84.2 kg. Strict fluid restriction maintained.',
    },
  },
];

// Doctor Orders & Clinical Instructions
const INITIAL_INSTRUCTIONS = [
  {
    id: 'inst-1',
    patientId: 'HMS-P-1004',
    patientName: 'Thomas Anderson',
    roomBed: '302-B',
    doctor: 'Dr. Robert Chen',
    department: 'Neurology',
    timeOrdered: '08:15 AM',
    priority: 'STAT',
    type: 'Diagnostic / Neuro',
    instruction: 'Perform repeat NIHSS neurological assessment. If BP remains > 160/100 after Lisinopril, call resident on call for IV Labetalol order.',
    status: 'Active', // Active, Acknowledged, Completed
    acknowledgedBy: null,
  },
  {
    id: 'inst-2',
    patientId: 'HMS-P-1002',
    patientName: 'Eleanor Vance',
    roomBed: '301-A',
    doctor: 'Dr. Sarah Jenkins',
    department: 'Cardiology',
    timeOrdered: '07:30 AM',
    priority: 'Routine',
    type: 'Labs & Orders',
    instruction: 'Draw repeat 12-hour high-sensitivity Troponin-I and basic metabolic panel at 11:00 AM. Monitor telemetry continuous rhythm.',
    status: 'Acknowledged',
    acknowledgedBy: 'Deva Chitturi, RN (07:40 AM)',
  },
  {
    id: 'inst-3',
    patientId: 'HMS-P-1007',
    patientName: 'Rachel Green',
    roomBed: '305-A',
    doctor: 'Dr. Michael Chang',
    department: 'General Surgery',
    timeOrdered: '07:00 AM',
    priority: 'Routine',
    type: 'Diet & Ambulation',
    instruction: 'Patient may start clear liquids. Encourage ambulation in corridor BID with nursing staff. Discontinue IV fluids if tolerating oral fluids.',
    status: 'Acknowledged',
    acknowledgedBy: 'Deva Chitturi, RN (07:15 AM)',
  },
  {
    id: 'inst-4',
    patientId: 'HMS-P-1015',
    patientName: 'Chloe Decker',
    roomBed: '303-A',
    doctor: 'Dr. Emily Watson',
    department: 'Internal Medicine',
    timeOrdered: '08:30 AM',
    priority: 'STAT',
    type: 'Medication / IV',
    instruction: 'Ensure blood cultures x 2 are drawn BEFORE starting the second dose of IV Ceftriaxone. Push oral hydration to 2000 ml/24h.',
    status: 'Active',
    acknowledgedBy: null,
  },
];

// Nursing Care Tasks Checklist
const INITIAL_TASKS = [
  {
    id: 'tsk-1',
    patientName: 'Eleanor Vance (301-A)',
    task: 'Inspect right groin puncture site for hematoma / bruit',
    dueTime: '09:00 AM',
    category: 'Assessment',
    completed: false,
    priority: 'High',
  },
  {
    id: 'tsk-2',
    patientName: 'Thomas Anderson (302-B)',
    task: 'Check blood glucose and administer morning Lisinopril',
    dueTime: '09:00 AM',
    category: 'Medication',
    completed: false,
    priority: 'High',
  },
  {
    id: 'tsk-3',
    patientName: 'Rachel Green (305-A)',
    task: 'Ambulate patient in hallway and coach incentive spirometer x 10',
    dueTime: '09:30 AM',
    category: 'Mobility',
    completed: false,
    priority: 'Medium',
  },
  {
    id: 'tsk-4',
    patientName: 'James Holden (306-A)',
    task: 'Empty Foley catheter bag & record accurate 8-hour I/O fluid output',
    dueTime: '10:00 AM',
    category: 'I/O Fluid',
    completed: false,
    priority: 'Medium',
  },
  {
    id: 'tsk-5',
    patientName: 'Chloe Decker (303-A)',
    task: 'Flush IV line and initiate IV Ceftriaxone 1g infusion piggyback',
    dueTime: '10:00 AM',
    category: 'IV Therapy',
    completed: false,
    priority: 'High',
  },
  {
    id: 'tsk-6',
    patientName: 'Ward 3A General',
    task: 'Morning shift crash cart & defibrillator check / seal verification',
    dueTime: '08:00 AM',
    category: 'Safety',
    completed: true,
    completedBy: 'Deva Chitturi, RN at 07:15 AM',
    priority: 'High',
  },
];

// Live Emergency Call Bells / Alerts
const INITIAL_ALERTS = [
  {
    id: 'alt-1',
    room: 'Room 302',
    bed: 'Bed 302-B',
    patientName: 'Thomas Anderson',
    type: 'Bedside Call Light',
    urgency: 'Urgent',
    timeElapsed: '2 min ago',
    details: 'Patient requesting assistance to restroom. High fall risk protocol in place.',
    status: 'Active',
  },
  {
    id: 'alt-2',
    room: 'Room 305',
    bed: 'Bed 305-A',
    patientName: 'Rachel Green',
    type: 'Bathroom Pull Cord',
    urgency: 'Normal',
    timeElapsed: '6 min ago',
    details: 'Completed morning freshen-up. Requesting help returning to bed.',
    status: 'Acknowledged',
  },
];

class NurseService {
  constructor() {
    this.inpatients = [...INITIAL_INPATIENTS];
    this.medications = [...INITIAL_MEDICATIONS];
    this.vitals = [...INITIAL_VITALS];
    this.notes = [...INITIAL_NOTES];
    this.instructions = [...INITIAL_INSTRUCTIONS];
    this.tasks = [...INITIAL_TASKS];
    this.alerts = [...INITIAL_ALERTS];
  }

  // Dashboard Overview Aggregator
  async getDashboard() {
    try {
      // Fetch live real patients from backend if possible to augment ward list
      const realPatientsRes = await receptionService.getPatients({ limit: 10 }).catch(() => null);
      const realPatients = realPatientsRes?.data?.patients || realPatientsRes?.data || [];

      // Link real patients if available
      if (realPatients.length > 0) {
        realPatients.slice(0, 3).forEach((rp, idx) => {
          if (this.inpatients[idx]) {
            this.inpatients[idx].name = `${rp.firstName} ${rp.lastName}`;
            this.inpatients[idx].patientId = rp.patientId || `HMS-P-${1000 + idx}`;
            this.inpatients[idx].gender = rp.gender || this.inpatients[idx].gender;
            this.inpatients[idx].bloodGroup = rp.bloodGroup || this.inpatients[idx].bloodGroup;
          }
        });
      }
    } catch {
      // Fallback to rich inpatient state
    }

    const dueMedsCount = this.medications.filter((m) => m.status === 'Due').length;
    const pendingVitalsCount = this.inpatients.filter(
      (p) => p.acuity === 'Critical' || p.acuity === 'Monitoring'
    ).length;
    const activeAlertsCount = this.alerts.filter((a) => a.status === 'Active').length;

    return {
      kpi: {
        wardInpatients: this.inpatients.length,
        bedOccupancyRate: '83%',
        dueMedications: dueMedsCount,
        pendingVitals: pendingVitalsCount,
        activeAlerts: activeAlertsCount,
        completedTasks: this.tasks.filter((t) => t.completed).length,
        totalTasks: this.tasks.length,
      },
      inpatients: this.inpatients,
      dueMedications: this.medications.filter((m) => m.status === 'Due').slice(0, 4),
      recentVitals: this.vitals.slice(0, 5),
      activeAlerts: this.alerts.filter((a) => a.status === 'Active'),
      doctorInstructions: this.instructions.slice(0, 4),
      shiftTasks: this.tasks.slice(0, 5),
    };
  }

  // Inpatients
  async getInpatients(filter = {}) {
    let list = [...this.inpatients];
    if (filter.ward) {
      list = list.filter((p) => p.ward.toLowerCase().includes(filter.ward.toLowerCase()));
    }
    if (filter.acuity) {
      list = list.filter((p) => p.acuity.toLowerCase() === filter.acuity.toLowerCase());
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.patientId.toLowerCase().includes(q) ||
          p.room.toLowerCase().includes(q) ||
          p.bed.toLowerCase().includes(q)
      );
    }
    return { data: list };
  }

  // Vitals
  async getVitals(patientId = null) {
    let list = [...this.vitals];
    if (patientId) {
      list = list.filter((v) => v.patientId === patientId);
    }
    return { data: list };
  }

  async addVitals(vitalsData) {
    const newEntry = {
      id: `vit-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0],
      recordedBy: 'Deva Chitturi, RN',
      alert: parseInt(vitalsData.bp?.split('/')[0] || '120', 10) > 140 || parseFloat(vitalsData.temp || '98.6') > 100.0,
      ...vitalsData,
    };
    this.vitals.unshift(newEntry);

    // Update patient record
    const p = this.inpatients.find((item) => item.patientId === vitalsData.patientId);
    if (p) {
      p.lastVitals = {
        bp: vitalsData.bp,
        hr: parseInt(vitalsData.hr, 10),
        spo2: parseInt(vitalsData.spo2, 10),
        temp: `${vitalsData.temp}°F`,
        rr: parseInt(vitalsData.rr, 10),
        glucose: parseInt(vitalsData.glucose || '100', 10),
        time: newEntry.time,
        status: newEntry.alert ? 'warning' : 'normal',
      };
    }

    return { success: true, data: newEntry };
  }

  // Medications
  async getMedications(filter = {}) {
    let list = [...this.medications];
    if (filter.status) {
      list = list.filter((m) => m.status === filter.status);
    }
    if (filter.patientId) {
      list = list.filter((m) => m.patientId === filter.patientId);
    }
    return { data: list };
  }

  async administerMedication(medId, notes = '') {
    const med = this.medications.find((m) => m.id === medId);
    if (!med) throw new Error('Medication order not found.');
    med.status = 'Given';
    med.administeredAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    med.administeredBy = 'Deva Chitturi, RN';
    med.adminNotes = notes;
    return { success: true, data: med };
  }

  async holdMedication(medId, reason = '') {
    const med = this.medications.find((m) => m.id === medId);
    if (!med) throw new Error('Medication order not found.');
    med.status = 'Held';
    med.holdReason = reason;
    med.heldBy = 'Deva Chitturi, RN';
    return { success: true, data: med };
  }

  // Nursing Notes
  async getNotes(patientId = null) {
    let list = [...this.notes];
    if (patientId) {
      list = list.filter((n) => n.patientId === patientId);
    }
    return { data: list };
  }

  async addNote(noteData) {
    const newNote = {
      id: `note-${Date.now()}`,
      timestamp: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      author: 'Deva Chitturi, RN (Staff Nurse)',
      shift: 'Morning Shift',
      ...noteData,
    };
    this.notes.unshift(newNote);
    return { success: true, data: newNote };
  }

  // Doctor Instructions
  async getDoctorInstructions() {
    return { data: [...this.instructions] };
  }

  async acknowledgeInstruction(instructionId) {
    const inst = this.instructions.find((i) => i.id === instructionId);
    if (!inst) throw new Error('Instruction not found');
    inst.status = 'Acknowledged';
    inst.acknowledgedBy = `Deva Chitturi, RN (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    return { success: true, data: inst };
  }

  async completeInstruction(instructionId) {
    const inst = this.instructions.find((i) => i.id === instructionId);
    if (!inst) throw new Error('Instruction not found');
    inst.status = 'Completed';
    inst.completedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { success: true, data: inst };
  }

  // Shift Care Tasks
  async getCareTasks() {
    return { data: [...this.tasks] };
  }

  async toggleCareTask(taskId) {
    const t = this.tasks.find((task) => task.id === taskId);
    if (!t) throw new Error('Task not found');
    t.completed = !t.completed;
    if (t.completed) {
      t.completedBy = `Deva Chitturi, RN at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      t.completedBy = null;
    }
    return { success: true, data: t };
  }

  // Alerts & Call Bells
  async getAlerts() {
    return { data: [...this.alerts] };
  }

  async acknowledgeAlert(alertId) {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) throw new Error('Alert not found');
    alert.status = 'Acknowledged';
    return { success: true, data: alert };
  }

  async clearAlert(alertId) {
    this.alerts = this.alerts.filter((a) => a.id !== alertId);
    return { success: true };
  }
}

export const nurseService = new NurseService();
