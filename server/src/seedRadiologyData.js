/**
 * Radiology & Imaging Seeder Script
 * 
 * Populates standard imaging equipment and realistic diagnostic radiology workflow records.
 * Usage: node src/seedRadiologyData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('./models/Role');
const User = require('./models/User');
const RadiologyEquipment = require('./models/RadiologyEquipment');
const RadiologyReport = require('./models/RadiologyReport');
const Notification = require('./models/Notification');
const logger = require('./utils/logger');

const standardEquipment = [
  {
    name: 'Siemens MAGNETOM Sola 1.5T MRI',
    modality: 'MRI',
    room: 'MRI Suite A (Ground Floor)',
    model: 'MAGNETOM Sola 1.5T BioMatrix',
    manufacturer: 'Siemens Healthineers',
    serialNumber: 'SN-MRI-994821',
    status: 'operational',
    lastCalibrationDate: new Date(),
    nextMaintenanceDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    maintenanceNotes: 'Helium boil-off check passed (94%). All RF surface coils tuned and calibrated.',
  },
  {
    name: 'GE Revolution Apex 128-Slice CT',
    modality: 'CT Scan',
    room: 'CT Suite 1 (Radiology West)',
    model: 'Revolution Apex 128 Elite',
    manufacturer: 'GE Healthcare',
    serialNumber: 'SN-CT-773102',
    status: 'operational',
    lastCalibrationDate: new Date(),
    nextMaintenanceDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    maintenanceNotes: 'Air and water phantom calibration within ±1 HU. High-speed gantry balanced.',
  },
  {
    name: 'Philips DigitalDiagnost C90 DR',
    modality: 'X-Ray',
    room: 'X-Ray Room 1 (Outpatient Wing)',
    model: 'DigitalDiagnost C90 High-Throughput',
    manufacturer: 'Philips Healthcare',
    serialNumber: 'SN-XR-441829',
    status: 'operational',
    lastCalibrationDate: new Date(),
    nextMaintenanceDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    maintenanceNotes: 'DAP meter calibrated. Collimator light field alignment verified.',
  },
  {
    name: 'GE LOGIQ E10 High-Res Ultrasound',
    modality: 'Ultrasound',
    room: 'US Room 2 (Radiology Floor 2)',
    model: 'LOGIQ E10 Series with XDclear',
    manufacturer: 'GE Healthcare',
    serialNumber: 'SN-US-229041',
    status: 'operational',
    lastCalibrationDate: new Date(),
    nextMaintenanceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    maintenanceNotes: 'Transducers (C1-6 and L2-9) tested for element dropout; passed QA.',
  },
  {
    name: 'Hologic Selenia Dimensions 3D Mammography',
    modality: 'Mammography',
    room: 'Women’s Imaging Suite (3rd Floor)',
    model: 'Selenia Dimensions Tomosynthesis',
    manufacturer: 'Hologic Inc.',
    serialNumber: 'SN-MAM-110293',
    status: 'operational',
    lastCalibrationDate: new Date(),
    nextMaintenanceDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    maintenanceNotes: 'MQSA weekly and monthly phantom tests certified and filed.',
  },
];

async function seedRadiologyData() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hms';
    logger.info(`Connecting to database for radiology seeding: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    // 1. Ensure RADIOLOGY_STAFF role exists
    let radRole = await Role.findOne({ name: 'RADIOLOGY_STAFF' });
    if (!radRole) {
      radRole = await Role.create({
        name: 'RADIOLOGY_STAFF',
        displayName: 'Radiology Staff',
        description: 'Performs diagnostic imaging acquisitions, room scheduling, and preliminary report drafting.',
        permissions: ['patients:read', 'radiology:read', 'radiology:write', 'pacs:access'],
        isSystemRole: true,
      });
      logger.info('Created RADIOLOGY_STAFF role in database.');
    }

    // 2. Ensure demo user exists
    let radUser = await User.findOne({ email: 'radiology@hms.com' });
    if (!radUser) {
      radUser = new User({
        firstName: 'Elena',
        lastName: 'Rostova',
        email: 'radiology@hms.com',
        password: 'RadiologyPassword123!',
        phone: '+18005550112',
        role: radRole._id,
        roleName: 'RADIOLOGY_STAFF',
        isEmailVerified: true,
        isActive: true,
        status: 'active',
      });
      await radUser.save();
      logger.info('Created demo Radiology user: radiology@hms.com / RadiologyPassword123!');
    } else {
      await User.updateOne(
        { email: 'radiology@hms.com' },
        { $set: { roleName: 'RADIOLOGY_STAFF', role: radRole._id, isActive: true, status: 'active', isEmailVerified: true } }
      );
    }

    // 3. Seed Equipment
    logger.info('Seeding radiology equipment units...');
    const equipmentDocs = [];
    for (const eqData of standardEquipment) {
      const eq = await RadiologyEquipment.findOneAndUpdate(
        { name: eqData.name },
        eqData,
        { upsert: true, returnDocument: 'after' }
      );
      equipmentDocs.push(eq);
    }
    logger.info(`Seeded ${equipmentDocs.length} radiology equipment units.`);

    // 4. Find demo patient and doctor
    const patientA = await User.findOne({ email: 'patient@hms.com' }) || await User.findOne({ roleName: 'PATIENT' });
    const patientB = await User.findOne({ email: 'patient2@hms.com' }) || await User.findOne({ roleName: 'PATIENT', _id: { $ne: patientA?._id } });
    const doctor = await User.findOne({ email: 'doctor@hms.com' }) || await User.findOne({ roleName: 'DOCTOR' });

    if (!patientA || !doctor) {
      logger.warn('No demo patient or doctor found. Please ensure database has base users.');
      process.exit(0);
    }

    // 5. Seed realistic radiology orders across workflow stages
    const existingReportsCount = await RadiologyReport.countDocuments();
    if (existingReportsCount < 6) {
      logger.info('Seeding diagnostic imaging workflow orders...');
      const now = new Date();

      // Study 1: Pending Request (Routine Chest X-Ray)
      await RadiologyReport.create({
        requestId: 'RAD-2026-101',
        examinationName: 'Chest X-Ray (PA & Lateral)',
        studyType: 'Chest X-Ray (PA & Lateral)',
        patient: patientA._id,
        doctor: doctor._id,
        modality: 'X-Ray',
        bodyPart: 'Chest / Thorax',
        priority: 'Routine',
        clinicalIndication: 'Chronic cough for 3 weeks, evaluate for infiltrates or consolidation.',
        status: 'Pending',
        equipment: equipmentDocs[2]._id,
        room: 'X-Ray Room 1 (Outpatient Wing)',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      });

      // Study 2: Scheduled & Awaiting Preparation (Abdomen CT with IV Contrast)
      await RadiologyReport.create({
        requestId: 'RAD-2026-202',
        examinationName: 'CT Abdomen and Pelvis with IV Contrast',
        studyType: 'CT Abdomen and Pelvis with IV Contrast',
        patient: patientB ? patientB._id : patientA._id,
        doctor: doctor._id,
        modality: 'CT Scan',
        bodyPart: 'Abdomen & Pelvis',
        priority: 'Urgent',
        clinicalIndication: 'Right lower quadrant abdominal pain, evaluate for acute appendicitis or diverticulitis.',
        status: 'Scheduled',
        scheduledDate: now,
        scheduledTime: '11:30 AM',
        preparationStatus: 'In Progress',
        equipment: equipmentDocs[1]._id,
        room: 'CT Suite 1 (Radiology West)',
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      });

      // Study 3: In Active Queue / Ready for Scan (Brain MRI without Contrast)
      await RadiologyReport.create({
        requestId: 'RAD-2026-303',
        examinationName: 'MRI Brain without Contrast',
        studyType: 'MRI Brain without Contrast',
        patient: patientA._id,
        doctor: doctor._id,
        modality: 'MRI',
        bodyPart: 'Head / Brain',
        priority: 'Routine',
        clinicalIndication: 'Persistent unilateral headache and visual aura. Evaluate for demyelinating disease.',
        status: 'In Queue',
        queuePosition: 1,
        scheduledDate: now,
        scheduledTime: '10:00 AM',
        preparationStatus: 'Ready',
        consentObtained: true,
        patientVerified: true,
        equipment: equipmentDocs[0]._id,
        room: 'MRI Suite A (Ground Floor)',
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      });

      // Study 4: Acquired / Awaiting Radiologist Report Entry (Right Knee MRI)
      await RadiologyReport.create({
        requestId: 'RAD-2026-404',
        examinationName: 'MRI Right Knee without Contrast',
        studyType: 'MRI Right Knee without Contrast',
        patient: patientB ? patientB._id : patientA._id,
        doctor: doctor._id,
        modality: 'MRI',
        bodyPart: 'Right Knee',
        priority: 'Routine',
        clinicalIndication: 'Twisting sports injury with joint line tenderness. Assess for meniscal tear or ACL rupture.',
        status: 'Completed',
        scheduledDate: now,
        scheduledTime: '09:00 AM',
        preparationStatus: 'Ready',
        performedBy: radUser._id,
        studyNotes: 'Sagittal PD, Coronal T2, Axial PD Fat-Sat acquired. No motion artifacts.',
        equipment: equipmentDocs[0]._id,
        room: 'MRI Suite A (Ground Floor)',
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      });

      // Study 5: Pending Senior Radiologist Verification (Normal Chest Radiograph)
      await RadiologyReport.create({
        requestId: 'RAD-2026-505',
        examinationName: 'Chest X-Ray (PA & Lateral)',
        studyType: 'Chest X-Ray (PA & Lateral)',
        patient: patientA._id,
        doctor: doctor._id,
        modality: 'X-Ray',
        bodyPart: 'Chest / Thorax',
        priority: 'Routine',
        clinicalIndication: 'Pre-operative clearance for elective surgery.',
        findings: 'The lungs are well-expanded and clear bilaterally. There is no focal consolidation, pleural effusion, or pneumothorax. Cardiomediastinal contour is normal. Bony thorax and soft tissues are unremarkable.',
        impression: '1. Clear lungs bilaterally.\n2. Normal cardiomediastinal silhouette.\n3. No acute cardiopulmonary disease.',
        status: 'Report Pending Verification',
        reportSubmittedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        reportSubmittedBy: radUser._id,
        equipment: equipmentDocs[2]._id,
        room: 'X-Ray Room 1 (Outpatient Wing)',
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      });

      // Study 6: STAT Critical Finding (Acute Left Subdural Hematoma / Mass Effect)
      await RadiologyReport.create({
        requestId: 'RAD-2026-606',
        examinationName: 'Non-Contrast Head CT',
        studyType: 'Non-Contrast Head CT',
        patient: patientB ? patientB._id : patientA._id,
        doctor: doctor._id,
        modality: 'CT Scan',
        bodyPart: 'Head / Brain',
        priority: 'STAT',
        clinicalIndication: 'Ground-level fall with head trauma, acute altered mental status and GCS 12.',
        findings: 'There is a crescent-shaped extra-axial hyperdense fluid collection along the left frontoparietal convexities measuring up to 11 mm in maximum thickness, consistent with acute subdural hematoma (SDH). There is associated effacement of the left lateral ventricle and approximately 6 mm of rightward midline shift.',
        impression: '1. Acute left frontoparietal subdural hematoma with 6 mm midline shift.\n2. Significant mass effect on adjacent parenchyma.\n3. Immediate neurosurgical consultation indicated.',
        isCritical: true,
        criticalSeverity: 'Critical',
        criticalNotes: 'Acute 11mm subdural hematoma with 6mm midline shift. Verbally notified ED Attending Dr. Sarah Jenkins at 13:45 hrs with read-back confirmation.',
        criticalNotified: true,
        criticalNotifiedAt: new Date(),
        criticalAcknowledged: false,
        status: 'Report Pending Verification',
        equipment: equipmentDocs[1]._id,
        room: 'CT Suite 1 (Radiology West)',
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      });

      // Study 7: Finalized / Verified Diagnostic Report Archive Item (Abdominal US)
      await RadiologyReport.create({
        requestId: 'RAD-2026-707',
        examinationName: 'Complete Abdominal Ultrasound',
        studyType: 'Complete Abdominal Ultrasound',
        patient: patientA._id,
        doctor: doctor._id,
        verifiedBy: doctor._id,
        verifiedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        modality: 'Ultrasound',
        bodyPart: 'Abdomen',
        priority: 'Routine',
        clinicalIndication: 'Postprandial fullness and upper abdominal discomfort.',
        findings: 'The liver is homogeneous without focal lesions. Gallbladder is well-distended without gallstones, wall thickening, or sonographic Murphy sign. Common bile duct measures 4 mm, within normal limits. Spleen, pancreas, and kidneys are normal in size and echotexture.',
        impression: '1. Normal complete abdominal sonogram.\n2. No evidence of cholelithiasis, biliary dilatation, or focal hepatic masses.',
        status: 'Verified',
        equipment: equipmentDocs[3]._id,
        room: 'US Room 2 (Radiology Floor 2)',
        createdAt: new Date(now.getTime() - 28 * 60 * 60 * 1000),
      });

      logger.info('Successfully seeded 7 realistic radiology workflow orders.');

      // Also create an in-app notification for the demo user
      await Notification.create({
        recipient: radUser._id,
        type: 'radiology',
        title: 'STAT Alert: Acute Subdural Hematoma',
        message: 'Critical finding reported for RAD-2026-606 requiring verbal physician notification and closed-loop log.',
        isRead: false,
        read: false,
        category: 'critical',
      });
      logger.info('Created STAT notification alert for radiology staff.');
    }

    logger.info('Radiology database seeding completed successfully! ✨');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding radiology data:', error);
    process.exit(1);
  }
}

seedRadiologyData();
