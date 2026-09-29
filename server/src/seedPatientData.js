/**
 * Patient Portal Seeder Script
 * 
 * Populates realistic clinical data:
 * - Active physicians across multiple medical specialties
 * - Patient A (patient@hms.com / PatientPassword123!) with rich history
 * - Patient B (patient2@hms.com / PatientPassword123!) with isolated records for privacy tests
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('./models/Role');
const User = require('./models/User');
const Appointment = require('./models/Appointment');
const MedicalRecord = require('./models/MedicalRecord');
const Prescription = require('./models/Prescription');
const LabReport = require('./models/LabReport');
const RadiologyReport = require('./models/RadiologyReport');
const Bill = require('./models/Bill');
const Notification = require('./models/Notification');
const logger = require('./utils/logger');

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hms';
    logger.info(`Connecting to database for patient data seeding: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    // Fetch Roles
    const doctorRole = await Role.findOne({ name: 'DOCTOR' });
    const patientRole = await Role.findOne({ name: 'PATIENT' });

    if (!doctorRole || !patientRole) {
      logger.error('Base roles (DOCTOR, PATIENT) not found. Please run seed.js first.');
      process.exit(1);
    }

    // 1. Seed Specialist Doctors
    logger.info('Seeding specialist doctors...');
    const doctorsData = [
      {
        firstName: 'Sarah',
        lastName: 'Jenkins',
        email: 'doctor@hms.com',
        password: 'DoctorPassword123!',
        phone: '+1 (555) 101-0001',
        role: doctorRole._id,
        roleName: 'DOCTOR',
        specialization: 'Cardiologist',
        department: 'Cardiology',
        qualification: 'MD, FACC - Harvard Medical',
        consultationFee: 90,
        availableDays: ['Monday', 'Wednesday', 'Friday'],
        availableTimeSlots: ['09:00 AM', '10:30 AM', '01:30 PM', '03:00 PM', '04:30 PM'],
        isEmailVerified: true,
        status: 'active',
      },
      {
        firstName: 'Robert',
        lastName: 'Chen',
        email: 'robert.chen@hms.com',
        password: 'DoctorPassword123!',
        phone: '+1 (555) 101-0002',
        role: doctorRole._id,
        roleName: 'DOCTOR',
        specialization: 'General Physician',
        department: 'General Medicine',
        qualification: 'MBBS, MD - Johns Hopkins',
        consultationFee: 60,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        availableTimeSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:30 PM'],
        isEmailVerified: true,
        status: 'active',
      },
      {
        firstName: 'Elena',
        lastName: 'Rostova',
        email: 'elena.rostova@hms.com',
        password: 'DoctorPassword123!',
        phone: '+1 (555) 101-0003',
        role: doctorRole._id,
        roleName: 'DOCTOR',
        specialization: 'Neurologist',
        department: 'Neurology',
        qualification: 'MD, PhD - Mayo Clinic',
        consultationFee: 120,
        availableDays: ['Tuesday', 'Thursday'],
        availableTimeSlots: ['10:00 AM', '11:30 AM', '02:30 PM', '04:00 PM'],
        isEmailVerified: true,
        status: 'active',
      },
      {
        firstName: 'James',
        lastName: 'Wilson',
        email: 'james.wilson@hms.com',
        password: 'DoctorPassword123!',
        phone: '+1 (555) 101-0004',
        role: doctorRole._id,
        roleName: 'DOCTOR',
        specialization: 'Orthopedic Surgeon',
        department: 'Orthopedics',
        qualification: 'MS (Ortho), MCh - Stanford',
        consultationFee: 100,
        availableDays: ['Monday', 'Wednesday', 'Thursday'],
        availableTimeSlots: ['09:30 AM', '11:00 AM', '01:00 PM', '03:30 PM'],
        isEmailVerified: true,
        status: 'active',
      },
      {
        firstName: 'Amina',
        lastName: 'Patel',
        email: 'amina.patel@hms.com',
        password: 'DoctorPassword123!',
        phone: '+1 (555) 101-0005',
        role: doctorRole._id,
        roleName: 'DOCTOR',
        specialization: 'Pediatrician',
        department: 'Pediatrics',
        qualification: 'MD (Pediatrics) - Columbia Univ',
        consultationFee: 75,
        availableDays: ['Monday', 'Tuesday', 'Friday'],
        availableTimeSlots: ['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM'],
        isEmailVerified: true,
        status: 'active',
      },
    ];

    const seededDoctors = [];
    for (const doc of doctorsData) {
      let existing = await User.findOne({ email: doc.email });
      if (!existing) {
        existing = new User(doc);
        await existing.save();
      } else {
        Object.assign(existing, doc);
        await existing.save();
      }
      seededDoctors.push(existing);
    }
    logger.info(`Seeded/updated ${seededDoctors.length} doctors.`);

    // 2. Seed Test Patient A (patient@hms.com)
    logger.info('Seeding Patient A (patient@hms.com)...');
    let patientA = await User.findOne({ email: 'patient@hms.com' });
    const patientAData = {
      firstName: 'Alex',
      lastName: 'Rivera',
      email: 'patient@hms.com',
      password: 'PatientPassword123!',
      phone: '+1 (555) 234-5678',
      role: patientRole._id,
      roleName: 'PATIENT',
      patientId: 'HMS-P-10042',
      dateOfBirth: new Date('1990-05-14'),
      gender: 'male',
      bloodGroup: 'O+',
      address: {
        street: '742 Evergreen Terrace',
        city: 'Springfield',
        state: 'OR',
        postalCode: '97477',
        country: 'United States',
      },
      emergencyContact: {
        name: 'Maria Rivera',
        relation: 'Spouse',
        phone: '+1 (555) 234-5679',
      },
      allergies: ['Penicillin', 'Peanuts'],
      isEmailVerified: true,
      status: 'active',
    };

    if (!patientA) {
      patientA = new User(patientAData);
      await patientA.save();
    } else {
      Object.assign(patientA, patientAData);
      await patientA.save();
    }

    // 3. Seed Test Patient B (patient2@hms.com)
    logger.info('Seeding Patient B (patient2@hms.com)...');
    let patientB = await User.findOne({ email: 'patient2@hms.com' });
    const patientBData = {
      firstName: 'Jordan',
      lastName: 'Taylor',
      email: 'patient2@hms.com',
      password: 'PatientPassword123!',
      phone: '+1 (555) 987-6543',
      role: patientRole._id,
      roleName: 'PATIENT',
      patientId: 'HMS-P-10088',
      dateOfBirth: new Date('1985-11-23'),
      gender: 'female',
      bloodGroup: 'A-',
      address: {
        street: '124 Conch Street',
        city: 'Bikini Bottom',
        state: 'HI',
        postalCode: '96815',
        country: 'United States',
      },
      emergencyContact: {
        name: 'Sam Taylor',
        relation: 'Sibling',
        phone: '+1 (555) 987-6540',
      },
      allergies: ['Latex'],
      isEmailVerified: true,
      status: 'active',
    };

    if (!patientB) {
      patientB = new User(patientBData);
      await patientB.save();
    } else {
      Object.assign(patientB, patientBData);
      await patientB.save();
    }

    // 4. Seed Patient A Clinical Records
    logger.info('Seeding clinical history for Patient A...');

    // Clear existing patient A specific records to avoid duplication on re-runs
    await Appointment.deleteMany({ patient: patientA._id });
    await MedicalRecord.deleteMany({ patient: patientA._id });
    await Prescription.deleteMany({ patient: patientA._id });
    await LabReport.deleteMany({ patient: patientA._id });
    await RadiologyReport.deleteMany({ patient: patientA._id });
    await Bill.deleteMany({ patient: patientA._id });
    await Notification.deleteMany({ recipient: patientA._id });

    // A. Appointments
    // Upcoming Appointment
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 4);
    nextWeek.setUTCHours(0, 0, 0, 0);

    const upcomingAppt = await Appointment.create({
      patient: patientA._id,
      doctor: seededDoctors[0]._id, // Dr. Sarah Jenkins
      department: 'Cardiology',
      appointmentDate: nextWeek,
      appointmentTime: '10:30 AM',
      status: 'Confirmed',
      reason: 'Routine quarterly cardiac follow-up and blood pressure review',
      notes: 'Please bring prior ECG readings and current medication list.',
      consultationFee: 90,
    });

    // Past Completed Appointment
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 25);
    lastMonth.setUTCHours(0, 0, 0, 0);

    const pastAppt = await Appointment.create({
      patient: patientA._id,
      doctor: seededDoctors[1]._id, // Dr. Robert Chen
      department: 'General Medicine',
      appointmentDate: lastMonth,
      appointmentTime: '02:00 PM',
      status: 'Completed',
      reason: 'Annual executive comprehensive health checkup',
      notes: 'Completed complete vitals, blood panel, and chest exam.',
      consultationFee: 60,
    });

    // B. Medical Record
    await MedicalRecord.create({
      patient: patientA._id,
      doctor: seededDoctors[1]._id,
      appointment: pastAppt._id,
      consultationDate: lastMonth,
      diagnosis: 'Essential Hypertension (Stage 1) - Well Controlled',
      symptoms: ['Mild occasional headache', 'Afternoon fatigue'],
      clinicalNotes:
        'Patient presents for scheduled annual health check. Cardiovascular exam shows regular rate and rhythm with no murmurs. Respiratory exam clear bilaterally. Recommended sodium restriction and 30 mins moderate daily aerobic exercise.',
      treatment: 'Oral antihypertensive therapy, lifestyle modification, and follow-up in 3 months.',
      vitals: {
        bp: '128/82 mmHg',
        heartRate: '72 bpm',
        temperature: '98.4 °F',
        respiratoryRate: '16 breaths/min',
        weight: '74 kg',
        spo2: '99%',
      },
      followUpDate: nextWeek,
    });

    // C. Prescriptions
    await Prescription.create({
      patient: patientA._id,
      doctor: seededDoctors[1]._id,
      appointment: pastAppt._id,
      prescriptionDate: lastMonth,
      diagnosis: 'Hypertension & Lipid Maintenance',
      status: 'Active',
      notes: 'Take with morning glass of water. Avoid potassium supplements unless advised.',
      medications: [
        {
          name: 'Amlodipine Besylate',
          dosage: '5 mg',
          frequency: 'Once daily (Morning)',
          duration: '90 days',
          instructions: 'Take after breakfast',
        },
        {
          name: 'Atorvastatin Calcium',
          dosage: '10 mg',
          frequency: 'Once daily (Bedtime)',
          duration: '90 days',
          instructions: 'Take at night before sleep',
        },
        {
          name: 'CoQ10 Supplement',
          dosage: '100 mg',
          frequency: 'Once daily',
          duration: '60 days',
          instructions: 'Dietary supplement',
        },
      ],
    });

    // D. Lab Reports
    await LabReport.create({
      patient: patientA._id,
      doctor: seededDoctors[1]._id,
      testName: 'Comprehensive Metabolic & Lipid Panel',
      category: 'Biochemistry',
      testDate: lastMonth,
      status: 'Completed',
      notes: 'Fasting specimen received. All liver and kidney markers within reference values.',
      results: [
        { parameter: 'Fasting Blood Glucose', result: '92', unit: 'mg/dL', referenceRange: '70 - 99', flag: 'Normal' },
        { parameter: 'Total Cholesterol', result: '185', unit: 'mg/dL', referenceRange: '< 200', flag: 'Normal' },
        { parameter: 'HDL (Good) Cholesterol', result: '54', unit: 'mg/dL', referenceRange: '> 40', flag: 'Normal' },
        { parameter: 'LDL (Bad) Cholesterol', result: '112', unit: 'mg/dL', referenceRange: '< 100', flag: 'High' },
        { parameter: 'Triglycerides', result: '135', unit: 'mg/dL', referenceRange: '< 150', flag: 'Normal' },
        { parameter: 'Serum Creatinine', result: '0.95', unit: 'mg/dL', referenceRange: '0.7 - 1.3', flag: 'Normal' },
        { parameter: 'eGFR', result: '96', unit: 'mL/min/1.73m²', referenceRange: '> 90', flag: 'Normal' },
      ],
    });

    await LabReport.create({
      patient: patientA._id,
      doctor: seededDoctors[0]._id,
      testName: 'Complete Blood Count (CBC) with Differential',
      category: 'Hematology',
      testDate: new Date(Date.now() - 5 * 86400000),
      status: 'Completed',
      notes: 'Routine outpatient hematology profile.',
      results: [
        { parameter: 'Hemoglobin', result: '15.2', unit: 'g/dL', referenceRange: '13.8 - 17.2', flag: 'Normal' },
        { parameter: 'WBC Count', result: '6.8', unit: 'x10³/µL', referenceRange: '4.5 - 11.0', flag: 'Normal' },
        { parameter: 'Platelet Count', result: '265', unit: 'x10³/µL', referenceRange: '150 - 450', flag: 'Normal' },
        { parameter: 'Hematocrit', result: '45.1', unit: '%', referenceRange: '40.7 - 50.3', flag: 'Normal' },
      ],
    });

    // E. Radiology Report
    await RadiologyReport.create({
      patient: patientA._id,
      doctor: seededDoctors[1]._id,
      examinationName: 'Chest Radiograph (PA & Lateral View)',
      modality: 'X-Ray',
      examinationDate: lastMonth,
      status: 'Completed',
      findings:
        'Cardiac silhouette is normal in size and configuration. Mediastinum and hilar contours are unremarkable. Lung fields are clear bilaterally without evidence of focal consolidation, effusion, or pneumothorax. Osseous structures intact.',
      impression: 'Normal examination. No active cardiopulmonary disease detected.',
      radiologist: 'Dr. Michael Chang, MD (Board Certified Radiologist)',
    });

    // F. Invoices / Bills
    const billDueDate = new Date();
    billDueDate.setDate(billDueDate.getDate() + 14);

    await Bill.create({
      patient: patientA._id,
      invoiceNumber: 'INV-2026-0042',
      billDate: lastMonth,
      dueDate: billDueDate,
      items: [
        { description: 'Comprehensive General OPD Consultation', category: 'Consultation', quantity: 1, unitPrice: 60, total: 60 },
        { description: 'Lipid & Metabolic Diagnostic Panel', category: 'Laboratory', quantity: 1, unitPrice: 85, total: 85 },
        { description: 'Chest Radiograph 2 Views (PA/LAT)', category: 'Radiology', quantity: 1, unitPrice: 110, total: 110 },
        { description: 'Hospital Facility & Administrative Surcharge', category: 'Other', quantity: 1, unitPrice: 20, total: 20 },
      ],
      totalAmount: 275,
      discount: 25,
      tax: 0,
      netAmount: 250,
      paidAmount: 150,
      paymentStatus: 'Partially Paid',
      paymentHistory: [
        {
          amount: 150,
          paymentMethod: 'Credit/Debit Card',
          transactionId: 'TXN-INIT-150-CARD',
          paidAt: lastMonth,
        },
      ],
    });

    // G. Notifications
    await Notification.create([
      {
        recipient: patientA._id,
        title: 'Upcoming Appointment Reminder',
        message: `You have an appointment with Dr. Sarah Jenkins in 4 days (${nextWeek.toLocaleDateString()} at 10:30 AM).`,
        type: 'appointment',
        relatedId: upcomingAppt._id,
        isRead: false,
      },
      {
        recipient: patientA._id,
        title: 'Diagnostic Lab Results Available',
        message: 'Your Complete Blood Count (CBC) test results have been verified and published.',
        type: 'lab',
        isRead: false,
      },
      {
        recipient: patientA._id,
        title: 'Prescription Added to Records',
        message: 'Dr. Robert Chen added a 90-day prescription for Amlodipine & Atorvastatin.',
        type: 'prescription',
        isRead: true,
        readAt: new Date(),
      },
    ]);

    // 5. Seed Patient B with Isolated Data
    logger.info('Seeding isolated record for Patient B...');
    await Appointment.deleteMany({ patient: patientB._id });
    await LabReport.deleteMany({ patient: patientB._id });

    await Appointment.create({
      patient: patientB._id,
      doctor: seededDoctors[4]._id, // Dr. Amina Patel
      department: 'Pediatrics',
      appointmentDate: nextWeek,
      appointmentTime: '09:00 AM',
      status: 'Confirmed',
      reason: 'Child immunization schedule review',
      consultationFee: 75,
    });

    await LabReport.create({
      patient: patientB._id,
      doctor: seededDoctors[4]._id,
      testName: 'Pediatric Blood Group & Rh Factor',
      category: 'Hematology',
      testDate: new Date(),
      status: 'Completed',
      results: [
        { parameter: 'Blood Group', result: 'A Negative (A-)', unit: '', referenceRange: 'N/A', flag: 'Normal' },
      ],
    });

    logger.info('✅ Patient Portal clinical data seeded successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding patient data:', error);
    process.exit(1);
  }
}

seed();
