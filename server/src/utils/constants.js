/**
 * Application Constants
 * 
 * Centralized enums, status values, and configuration constants
 * used across the application. Add new constants here as modules
 * are implemented.
 */

// Patient status values
const PATIENT_STATUS = {
  ACTIVE: 'active',
  ADMITTED: 'admitted',
  DISCHARGED: 'discharged',
  TRANSFERRED: 'transferred',
  REFERRED: 'referred',
  ARCHIVED: 'archived',
};

// User/account status
const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
};

// Appointment status
const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  RESCHEDULED: 'rescheduled',
};

// Bed status
const BED_STATUS = {
  VACANT: 'vacant',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
  CLEANING: 'cleaning',
  MAINTENANCE: 'maintenance',
};

// Gender options
const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
  PREFER_NOT_TO_SAY: 'prefer_not_to_say',
};

// Blood groups
const BLOOD_GROUP = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-',
};

// Default pagination
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Sort directions
const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
};

module.exports = {
  PATIENT_STATUS,
  USER_STATUS,
  APPOINTMENT_STATUS,
  BED_STATUS,
  GENDER,
  BLOOD_GROUP,
  PAGINATION,
  SORT_ORDER,
};
