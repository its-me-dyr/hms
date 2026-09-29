/**
 * Laboratory Test Catalog Model
 * 
 * Standardized diagnostic test definitions, normal reference ranges,
 * critical thresholds, specimen tube requirements, and pricing.
 */

const mongoose = require('mongoose');

const testParameterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      default: '',
      trim: true,
    },
    referenceRange: {
      type: String,
      default: '',
      trim: true,
    },
    minValue: {
      type: Number,
      default: null,
    },
    maxValue: {
      type: Number,
      default: null,
    },
    criticalLow: {
      type: Number,
      default: null,
    },
    criticalHigh: {
      type: Number,
      default: null,
    },
  },
  { _id: true }
);

const labTestSchema = new mongoose.Schema(
  {
    testCode: {
      type: String,
      required: [true, 'Test code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    testName: {
      type: String,
      required: [true, 'Test name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['Hematology', 'Biochemistry', 'Microbiology', 'Immunology', 'Pathology', 'Urinalysis', 'General'],
      default: 'General',
      index: true,
    },
    department: {
      type: String,
      default: 'Central Diagnostic Laboratory',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    sampleType: {
      type: String,
      required: [true, 'Sample type is required'],
      trim: true,
    },
    sampleContainer: {
      type: String,
      default: 'Standard Container',
      trim: true,
    },
    requiredQuantity: {
      type: String,
      default: '2 mL',
      trim: true,
    },
    fastingRequired: {
      type: Boolean,
      default: false,
    },
    turnaroundTimeHours: {
      type: Number,
      default: 4,
      min: 1,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    parameters: [testParameterSchema],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('LabTest', labTestSchema);
