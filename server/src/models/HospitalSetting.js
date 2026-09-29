/**
 * Hospital Setting Model
 * 
 * Stores global hospital and branch configuration parameters.
 */

const mongoose = require('mongoose');

const hospitalSettingSchema = new mongoose.Schema(
  {
    hospitalName: {
      type: String,
      default: 'Hospital Management System (HMS) Medical Center',
    },
    registrationNumber: {
      type: String,
      default: 'HMS-HOSP-2026-001',
    },
    tagline: {
      type: String,
      default: 'Advanced Clinical Care & Diagnostic Excellence',
    },
    contactEmail: {
      type: String,
      default: 'admin@hms.com',
    },
    contactPhone: {
      type: String,
      default: '+1 (800) 555-0199',
    },
    emergencyHotline: {
      type: String,
      default: '911 / 108',
    },
    address: {
      street: { type: String, default: '100 Medical Center Drive' },
      city: { type: String, default: 'Metropolis' },
      state: { type: String, default: 'NY' },
      postalCode: { type: String, default: '10001' },
      country: { type: String, default: 'United States' },
    },
    currency: {
      type: String,
      default: 'USD',
    },
    currencySymbol: {
      type: String,
      default: '$',
    },
    timezone: {
      type: String,
      default: 'America/New_York',
    },
    taxId: {
      type: String,
      default: 'TAX-HMS-99201',
    },
    allowPublicRegistration: {
      type: Boolean,
      default: true,
    },
    requireStaffVerification: {
      type: Boolean,
      default: true,
    },
    branches: [
      {
        name: { type: String, required: true, trim: true },
        code: { type: String, required: true, uppercase: true, trim: true },
        isMain: { type: Boolean, default: false },
        address: {
          street: { type: String, default: '' },
          city: { type: String, default: '' },
          state: { type: String, default: '' },
          postalCode: { type: String, default: '' },
          country: { type: String, default: '' },
        },
        phone: { type: String, default: '' },
        email: { type: String, default: '' },
        capacity: { type: Number, default: 50 },
        isActive: { type: Boolean, default: true },
      },
    ],
    services: [
      {
        code: { type: String, required: true, uppercase: true, trim: true },
        name: { type: String, required: true, trim: true },
        category: { type: String, default: 'General', trim: true },
        department: { type: String, default: '', trim: true },
        charge: { type: Number, required: true, min: 0 },
        description: { type: String, default: '', trim: true },
        isActive: { type: Boolean, default: true },
      },
    ],
    operatingHours: [
      {
        day: { type: String, required: true },
        openTime: { type: String, default: '08:00 AM' },
        closeTime: { type: String, default: '08:00 PM' },
        isClosed: { type: Boolean, default: false },
      },
    ],
    holidays: [
      {
        name: { type: String, required: true, trim: true },
        date: { type: String, required: true },
        description: { type: String, default: '', trim: true },
      },
    ],
    branding: {
      logoUrl: { type: String, default: '' },
      faviconUrl: { type: String, default: '' },
      primaryColor: { type: String, default: '#0891B2' },
      accentColor: { type: String, default: '#0F172A' },
      headerText: { type: String, default: 'Hospital Management System' },
      footerText: { type: String, default: '© 2026 HMS Medical Center. All rights reserved.' },
    },
    systemConfig: {
      appointmentBufferMinutes: { type: Number, default: 15 },
      maxAppointmentsPerSlot: { type: Number, default: 3 },
      emergencyContactNumber: { type: String, default: '+1 (800) 555-0199' },
      enableEmailNotifications: { type: Boolean, default: true },
      maintenanceMode: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('HospitalSetting', hospitalSettingSchema);

