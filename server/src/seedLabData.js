/**
 * Laboratory Diagnostic Seeder Script
 * 
 * Populates standard clinical test catalog and realistic laboratory workflow records.
 * Usage: node src/seedLabData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('./models/Role');
const User = require('./models/User');
const LabTest = require('./models/LabTest');
const LabReport = require('./models/LabReport');
const Notification = require('./models/Notification');
const logger = require('./utils/logger');

const standardTests = [
  {
    testCode: 'CBC-01',
    testName: 'Complete Blood Count (CBC) with Differential',
    category: 'Hematology',
    department: 'Central Hematology Lab',
    description: 'Measures RBC, WBC, Hemoglobin, Platelets, and differential leukocyte count.',
    sampleType: 'Whole Blood',
    sampleContainer: 'EDTA Vacutainer (Lavender top)',
    requiredQuantity: '3 mL',
    fastingRequired: false,
    turnaroundTimeHours: 3,
    price: 350,
    parameters: [
      { name: 'Hemoglobin', unit: 'g/dL', referenceRange: '13.0 - 17.5', minValue: 13.0, maxValue: 17.5, criticalLow: 7.0, criticalHigh: 20.0 },
      { name: 'Red Blood Cell (RBC) Count', unit: 'x10^6/uL', referenceRange: '4.5 - 5.9', minValue: 4.5, maxValue: 5.9, criticalLow: 2.0, criticalHigh: 7.0 },
      { name: 'Total Leukocyte Count (WBC)', unit: 'cells/cu.mm', referenceRange: '4,000 - 11,000', minValue: 4000, maxValue: 11000, criticalLow: 2000, criticalHigh: 30000 },
      { name: 'Platelet Count', unit: 'x10^3/uL', referenceRange: '150 - 450', minValue: 150, maxValue: 450, criticalLow: 40, criticalHigh: 1000 },
      { name: 'Hematocrit (PCV)', unit: '%', referenceRange: '40.0 - 52.0', minValue: 40.0, maxValue: 52.0, criticalLow: 20.0, criticalHigh: 60.0 },
      { name: 'Neutrophils', unit: '%', referenceRange: '40 - 75', minValue: 40, maxValue: 75 },
      { name: 'Lymphocytes', unit: '%', referenceRange: '20 - 45', minValue: 20, maxValue: 45 },
    ],
  },
  {
    testCode: 'LFT-02',
    testName: 'Liver Function Panel (LFT)',
    category: 'Biochemistry',
    department: 'Clinical Chemistry',
    description: 'Comprehensive liver enzymes, bilirubin fractions, and total proteins.',
    sampleType: 'Serum',
    sampleContainer: 'SST Gel Separator (Gold/Yellow top)',
    requiredQuantity: '4 mL',
    fastingRequired: true,
    turnaroundTimeHours: 4,
    price: 650,
    parameters: [
      { name: 'Total Bilirubin', unit: 'mg/dL', referenceRange: '0.2 - 1.2', minValue: 0.2, maxValue: 1.2, criticalHigh: 15.0 },
      { name: 'Direct Bilirubin', unit: 'mg/dL', referenceRange: '0.0 - 0.3', minValue: 0.0, maxValue: 0.3 },
      { name: 'SGOT / AST', unit: 'U/L', referenceRange: '10 - 40', minValue: 10, maxValue: 40, criticalHigh: 500 },
      { name: 'SGPT / ALT', unit: 'U/L', referenceRange: '7 - 56', minValue: 7, maxValue: 56, criticalHigh: 500 },
      { name: 'Alkaline Phosphatase (ALP)', unit: 'U/L', referenceRange: '44 - 147', minValue: 44, maxValue: 147 },
      { name: 'Total Protein', unit: 'g/dL', referenceRange: '6.0 - 8.3', minValue: 6.0, maxValue: 8.3 },
      { name: 'Albumin', unit: 'g/dL', referenceRange: '3.5 - 5.0', minValue: 3.5, maxValue: 5.0 },
    ],
  },
  {
    testCode: 'RFT-03',
    testName: 'Renal / Kidney Function Test (RFT/KFT)',
    category: 'Biochemistry',
    department: 'Clinical Chemistry',
    description: 'Evaluates kidney filtration, nitrogenous wastes, and electrolytes.',
    sampleType: 'Serum',
    sampleContainer: 'Plain Clot Activator (Red top)',
    requiredQuantity: '3 mL',
    fastingRequired: false,
    turnaroundTimeHours: 4,
    price: 550,
    parameters: [
      { name: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', referenceRange: '7 - 20', minValue: 7, maxValue: 20, criticalHigh: 80 },
      { name: 'Serum Creatinine', unit: 'mg/dL', referenceRange: '0.7 - 1.3', minValue: 0.7, maxValue: 1.3, criticalHigh: 5.0 },
      { name: 'Serum Sodium (Na+)', unit: 'mEq/L', referenceRange: '135 - 145', minValue: 135, maxValue: 145, criticalLow: 120, criticalHigh: 160 },
      { name: 'Serum Potassium (K+)', unit: 'mEq/L', referenceRange: '3.5 - 5.1', minValue: 3.5, maxValue: 5.1, criticalLow: 2.8, criticalHigh: 6.5 },
      { name: 'Uric Acid', unit: 'mg/dL', referenceRange: '3.5 - 7.2', minValue: 3.5, maxValue: 7.2 },
    ],
  },
  {
    testCode: 'LIPID-04',
    testName: 'Lipid Profile Comprehensive',
    category: 'Biochemistry',
    department: 'Clinical Chemistry',
    description: 'Assesses cardiovascular risk via cholesterol and triglyceride fractions.',
    sampleType: 'Serum',
    sampleContainer: 'SST Gel Separator (Yellow top)',
    requiredQuantity: '3 mL',
    fastingRequired: true,
    turnaroundTimeHours: 5,
    price: 600,
    parameters: [
      { name: 'Total Cholesterol', unit: 'mg/dL', referenceRange: '< 200', minValue: 100, maxValue: 200 },
      { name: 'Triglycerides', unit: 'mg/dL', referenceRange: '< 150', minValue: 50, maxValue: 150, criticalHigh: 1000 },
      { name: 'HDL Cholesterol', unit: 'mg/dL', referenceRange: '> 40', minValue: 40, maxValue: 80 },
      { name: 'LDL Cholesterol', unit: 'mg/dL', referenceRange: '< 100', minValue: 40, maxValue: 100 },
      { name: 'VLDL Cholesterol', unit: 'mg/dL', referenceRange: '5 - 30', minValue: 5, maxValue: 30 },
    ],
  },
  {
    testCode: 'HBA1C-05',
    testName: 'Glycated Hemoglobin (HbA1c)',
    category: 'Biochemistry',
    department: 'Central Clinical Chemistry',
    description: 'Gold standard measure of glycemic control over past 3 months.',
    sampleType: 'Whole Blood',
    sampleContainer: 'EDTA Tube (Lavender top)',
    requiredQuantity: '2 mL',
    fastingRequired: false,
    turnaroundTimeHours: 3,
    price: 450,
    parameters: [
      { name: 'HbA1c', unit: '%', referenceRange: '4.0 - 5.6', minValue: 4.0, maxValue: 5.6, criticalHigh: 12.0 },
      { name: 'Estimated Average Glucose (eAG)', unit: 'mg/dL', referenceRange: '70 - 114', minValue: 70, maxValue: 114 },
    ],
  },
  {
    testCode: 'THYROID-06',
    testName: 'Thyroid Function Panel (TFT)',
    category: 'Immunology',
    department: 'Immunology & Endocrinology',
    description: 'Evaluation of thyroid stimulating hormone and circulating thyroid hormones.',
    sampleType: 'Serum',
    sampleContainer: 'SST Gel Separator',
    requiredQuantity: '3 mL',
    fastingRequired: false,
    turnaroundTimeHours: 6,
    price: 700,
    parameters: [
      { name: 'TSH (Ultrasensitive)', unit: 'uIU/mL', referenceRange: '0.45 - 4.50', minValue: 0.45, maxValue: 4.50, criticalLow: 0.05, criticalHigh: 50.0 },
      { name: 'Free T3 (FT3)', unit: 'pg/mL', referenceRange: '2.0 - 4.4', minValue: 2.0, maxValue: 4.4 },
      { name: 'Free T4 (FT4)', unit: 'ng/dL', referenceRange: '0.82 - 1.77', minValue: 0.82, maxValue: 1.77 },
    ],
  },
  {
    testCode: 'URINE-07',
    testName: 'Urinalysis (Routine & Microscopic)',
    category: 'Urinalysis',
    department: 'Clinical Pathology',
    description: 'Physical, chemical, and microscopic examination of clean-catch urine.',
    sampleType: 'Urine (Clean-Catch Midstream)',
    sampleContainer: 'Sterile Urine Cup (Screw Cap)',
    requiredQuantity: '15 mL',
    fastingRequired: false,
    turnaroundTimeHours: 2,
    price: 200,
    parameters: [
      { name: 'Color', unit: '', referenceRange: 'Pale Yellow - Amber' },
      { name: 'Specific Gravity', unit: '', referenceRange: '1.005 - 1.030', minValue: 1.005, maxValue: 1.030 },
      { name: 'pH', unit: '', referenceRange: '5.0 - 8.0', minValue: 5.0, maxValue: 8.0 },
      { name: 'Protein', unit: '', referenceRange: 'Negative' },
      { name: 'Glucose', unit: '', referenceRange: 'Negative' },
      { name: 'Pus Cells / WBC', unit: '/hpf', referenceRange: '0 - 5', minValue: 0, maxValue: 5 },
      { name: 'Red Blood Cells', unit: '/hpf', referenceRange: '0 - 2', minValue: 0, maxValue: 2 },
    ],
  },
];

async function seedLab() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hms';
    await mongoose.connect(mongoUri);
    logger.info('Connected to database for Laboratory seeding.');

    // 1. Ensure lab_technician role exists
    let labRole = await Role.findOne({ name: 'LAB_TECHNICIAN' });
    if (!labRole) {
      labRole = await Role.findOne({ name: 'LAB_TECH' });
    }
    if (!labRole) {
      labRole = await Role.create({
        name: 'LAB_TECHNICIAN',
        displayName: 'Laboratory Technician',
        description: 'Performs specimen collection, in-vitro diagnostic testing, results entry, and report verification.',
        permissions: ['laboratory:read', 'laboratory:write', 'patients:read'],
        isSystemRole: true,
      });
      logger.info('Created LAB_TECHNICIAN role.');
    }

    // 2. Ensure default demo lab technician user exists: lab@hms.com / LabPassword123!
    let labUser = await User.findOne({ email: 'lab@hms.com' });
    if (!labUser) {
      labUser = new User({
        firstName: 'Elena',
        lastName: 'Kovacs',
        email: 'lab@hms.com',
        password: 'LabPassword123!',
        phone: '+18005550109',
        role: labRole._id,
        roleName: 'LAB_TECHNICIAN',
        isEmailVerified: true,
        isActive: true,
        status: 'active',
      });
      await labUser.save();
      logger.info('Created demo Lab Technician user: lab@hms.com / LabPassword123!');
    }

    // Also ensure Deva Chitturi's lab user is active
    await User.updateOne(
      { email: 'chitturidevadharshini@gmail.com' },
      { $set: { roleName: 'LAB_TECHNICIAN', role: labRole._id, isActive: true, status: 'active', isEmailVerified: true } }
    );

    // 3. Seed Standard Test Catalog
    logger.info('Seeding diagnostic test catalog...');
    for (const testData of standardTests) {
      await LabTest.findOneAndUpdate(
        { testCode: testData.testCode },
        testData,
        { upsert: true, returnDocument: 'after' }
      );
    }
    logger.info(`Test catalog seeded with ${standardTests.length} tests.`);

    // 4. Find demo patients and doctors
    const patientA = await User.findOne({ email: 'patient@hms.com' }) || await User.findOne({ roleName: 'PATIENT' });
    const patientB = await User.findOne({ email: 'patient2@hms.com' }) || await User.findOne({ roleName: 'PATIENT', _id: { $ne: patientA?._id } });
    const doctor = await User.findOne({ email: 'doctor@hms.com' }) || await User.findOne({ roleName: 'DOCTOR' });

    if (!patientA || !doctor) {
      logger.warn('Could not find demo patient or doctor. Skipping lab request seeding.');
      process.exit(0);
    }

    logger.info('Seeding active laboratory workflow investigation orders...');

    // Clear old seeded demo requests if needed or insert comprehensive set
    const existingCount = await LabReport.countDocuments();
    if (existingCount < 5) {
      const now = new Date();

      // Order 1: Pending Routine test (Awaiting collection)
      await LabReport.create({
        requestId: 'LR-2026-1001',
        patient: patientA._id,
        doctor: doctor._id,
        department: 'Internal Medicine',
        testCode: 'LIPID-04',
        testName: 'Lipid Profile Comprehensive',
        category: 'Biochemistry',
        priority: 'Routine',
        clinicalNotes: 'Annual executive physical examination and cardiovascular risk assessment.',
        status: 'Pending',
        sampleType: 'Serum',
        sampleContainer: 'SST Gel Separator (Yellow top)',
        price: 600,
        billingStatus: 'Pending',
        testDate: now,
      });

      // Order 2: STAT Urgent test (Accepted / Sample Pending)
      await LabReport.create({
        requestId: 'LR-2026-1002',
        patient: patientB ? patientB._id : patientA._id,
        doctor: doctor._id,
        department: 'Emergency Medicine',
        testCode: 'CBC-01',
        testName: 'Complete Blood Count (CBC) with Differential',
        category: 'Hematology',
        priority: 'STAT',
        clinicalNotes: 'Patient presenting with high fever, petechiae, and acute fatigue. Rule out severe infection.',
        status: 'Sample Pending',
        sampleType: 'Whole Blood',
        sampleContainer: 'EDTA Vacutainer (Lavender top)',
        price: 350,
        billingStatus: 'Paid',
        testDate: now,
      });

      // Order 3: Sample Collected (Barcoded & in specimen log)
      await LabReport.create({
        requestId: 'LR-2026-1003',
        patient: patientA._id,
        doctor: doctor._id,
        department: 'Endocrinology',
        testCode: 'HBA1C-05',
        testName: 'Glycated Hemoglobin (HbA1c)',
        category: 'Biochemistry',
        priority: 'Routine',
        clinicalNotes: 'Follow-up for Type 2 Diabetes Mellitus management. Fasting blood sugar correlation.',
        status: 'Sample Collected',
        sampleId: 'SMP-26481',
        sampleType: 'Whole Blood',
        sampleContainer: 'EDTA Tube (Lavender top)',
        sampleCondition: 'Acceptable',
        sampleCollectedAt: new Date(Date.now() - 3600000),
        collectedBy: labUser._id,
        collectionNotes: 'Venipuncture right antecubital fossa. Smooth draw, no hemolysis.',
        price: 450,
        billingStatus: 'Paid',
        testDate: now,
      });

      // Order 4: Test in In-Vitro Processing
      await LabReport.create({
        requestId: 'LR-2026-1004',
        patient: patientB ? patientB._id : patientA._id,
        doctor: doctor._id,
        department: 'Gastroenterology',
        testCode: 'LFT-02',
        testName: 'Liver Function Panel (LFT)',
        category: 'Biochemistry',
        priority: 'Urgent',
        clinicalNotes: 'Patient reports right upper quadrant discomfort. Check transaminases and bilirubin.',
        status: 'Processing',
        sampleId: 'SMP-26482',
        sampleType: 'Serum',
        sampleContainer: 'SST Gel Separator (Gold/Yellow top)',
        sampleCondition: 'Acceptable',
        sampleCollectedAt: new Date(Date.now() - 7200000),
        collectedBy: labUser._id,
        processingStartedAt: new Date(Date.now() - 1800000),
        processedBy: labUser._id,
        processingNotes: 'Centrifuged at 3000 RPM for 10 min. Calibrated analyzer running photometric assay.',
        price: 650,
        billingStatus: 'Paid',
        testDate: now,
      });

      // Order 5: Processing complete, results entered with CRITICAL high potassium alert
      await LabReport.create({
        requestId: 'LR-2026-1005',
        patient: patientA._id,
        doctor: doctor._id,
        department: 'Nephrology',
        testCode: 'RFT-03',
        testName: 'Renal / Kidney Function Test (RFT/KFT)',
        category: 'Biochemistry',
        priority: 'STAT',
        clinicalNotes: 'Patient on ACE inhibitors, reports muscle weakness. Urgent electrolytes check.',
        status: 'Result Pending',
        sampleId: 'SMP-26483',
        sampleType: 'Serum',
        sampleContainer: 'Plain Clot Activator (Red top)',
        sampleCondition: 'Acceptable',
        sampleCollectedAt: new Date(Date.now() - 10800000),
        collectedBy: labUser._id,
        processingStartedAt: new Date(Date.now() - 5400000),
        processingCompletedAt: new Date(Date.now() - 3600000),
        processedBy: labUser._id,
        resultsEnteredAt: new Date(Date.now() - 1800000),
        resultsEnteredBy: labUser._id,
        technicianNotes: 'Repeat run performed on automated ISE analyzer. Serum Potassium verified high.',
        isCritical: true,
        criticalSeverity: 'Critical',
        criticalNotified: true,
        criticalNotifiedAt: new Date(Date.now() - 1700000),
        results: [
          { parameter: 'Blood Urea Nitrogen (BUN)', result: '38', unit: 'mg/dL', referenceRange: '7 - 20', flag: 'High' },
          { parameter: 'Serum Creatinine', result: '2.4', unit: 'mg/dL', referenceRange: '0.7 - 1.3', flag: 'High' },
          { parameter: 'Serum Sodium (Na+)', result: '136', unit: 'mEq/L', referenceRange: '135 - 145', flag: 'Normal' },
          { parameter: 'Serum Potassium (K+)', result: '6.8', unit: 'mEq/L', referenceRange: '3.5 - 5.1', flag: 'Critical', method: 'Ion Selective Electrode (ISE)' },
          { parameter: 'Uric Acid', result: '7.8', unit: 'mg/dL', referenceRange: '3.5 - 7.2', flag: 'High' },
        ],
        price: 550,
        billingStatus: 'Paid',
        testDate: now,
      });

      // Order 6: Fully Verified and Completed Report
      await LabReport.create({
        requestId: 'LR-2026-1006',
        patient: patientB ? patientB._id : patientA._id,
        doctor: doctor._id,
        department: 'General Medicine',
        testCode: 'CBC-01',
        testName: 'Complete Blood Count (CBC) with Differential',
        category: 'Hematology',
        priority: 'Routine',
        clinicalNotes: 'Pre-operative clearance investigation.',
        status: 'Verified',
        sampleId: 'SMP-26470',
        sampleType: 'Whole Blood',
        sampleContainer: 'EDTA Vacutainer (Lavender top)',
        sampleCondition: 'Acceptable',
        sampleCollectedAt: new Date(Date.now() - 86400000),
        collectedBy: labUser._id,
        processingStartedAt: new Date(Date.now() - 82800000),
        processingCompletedAt: new Date(Date.now() - 79200000),
        processedBy: labUser._id,
        resultsEnteredAt: new Date(Date.now() - 75600000),
        resultsEnteredBy: labUser._id,
        verifiedAt: new Date(Date.now() - 72000000),
        verifiedBy: labUser._id,
        verificationNotes: 'Peripheral smear and differential counts reviewed. Clinical findings normal.',
        isCritical: false,
        results: [
          { parameter: 'Hemoglobin', result: '14.8', unit: 'g/dL', referenceRange: '13.0 - 17.5', flag: 'Normal' },
          { parameter: 'Red Blood Cell (RBC) Count', result: '5.1', unit: 'x10^6/uL', referenceRange: '4.5 - 5.9', flag: 'Normal' },
          { parameter: 'Total Leukocyte Count (WBC)', result: '7,400', unit: 'cells/cu.mm', referenceRange: '4,000 - 11,000', flag: 'Normal' },
          { parameter: 'Platelet Count', result: '280', unit: 'x10^3/uL', referenceRange: '150 - 450', flag: 'Normal' },
          { parameter: 'Hematocrit (PCV)', result: '44.5', unit: '%', referenceRange: '40.0 - 52.0', flag: 'Normal' },
          { parameter: 'Neutrophils', result: '62', unit: '%', referenceRange: '40 - 75', flag: 'Normal' },
          { parameter: 'Lymphocytes', unit: '%', result: '31', referenceRange: '20 - 45', flag: 'Normal' },
        ],
        price: 350,
        billingStatus: 'Paid',
        testDate: new Date(Date.now() - 86400000),
      });

      // Order 7: Rejected Specimen (Hemolyzed)
      await LabReport.create({
        requestId: 'LR-2026-1007',
        patient: patientA._id,
        doctor: doctor._id,
        department: 'Outpatient Clinic',
        testCode: 'THYROID-06',
        testName: 'Thyroid Function Panel (TFT)',
        category: 'Immunology',
        priority: 'Routine',
        clinicalNotes: 'Suspected hypothyroidism. Cold intolerance.',
        status: 'Rejected',
        sampleId: 'SMP-26465',
        sampleType: 'Serum',
        sampleContainer: 'SST Gel Separator',
        sampleCondition: 'Hemolyzed',
        sampleCollectedAt: new Date(Date.now() - 43200000),
        collectedBy: labUser._id,
        rejectionReason: 'Severe 4+ gross hemolysis observed upon centrifugation. Specimen unsuitable for photometric/chemiluminescent assay. Recollection requested.',
        price: 700,
        billingStatus: 'Pending',
        testDate: new Date(Date.now() - 43200000),
      });

      logger.info('Created 7 comprehensive clinical laboratory orders across all workflow stages.');
    }

    // 5. Seed Laboratory Notification
    const unreadLabNotif = await Notification.findOne({ type: 'lab', isRead: false });
    if (!unreadLabNotif && labUser) {
      await Notification.create({
        recipient: labUser._id,
        title: 'New STAT Lab Request: LR-2026-1002',
        message: 'Emergency Department has ordered STAT Complete Blood Count. Specimen collection pending.',
        type: 'lab',
      });
      logger.info('Created sample lab notification.');
    }

    logger.info('Laboratory seeding completed successfully! ✨');
    process.exit(0);
  } catch (err) {
    logger.error('Error seeding laboratory data:', err);
    process.exit(1);
  }
}

seedLab();
