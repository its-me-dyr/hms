/**
 * Bill / Invoice Model
 * 
 * Invoices, breakdown of consultation, lab, radiology, pharmacy charges, and payment records.
 */

const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Consultation', 'Laboratory', 'Radiology', 'Pharmacy', 'Nursing', 'Bed Charge', 'Other'],
      default: 'Other',
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const paymentRecordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Credit/Debit Card', 'UPI', 'Net Banking', 'Insurance Claim', 'Cash at Desk'],
      default: 'Credit/Debit Card',
    },
    transactionId: {
      type: String,
      required: true,
      trim: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const billSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient reference is required'],
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true,
    },
    billDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    items: [billItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Partially Paid', 'Paid', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    paymentHistory: [paymentRecordSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for pending balance
billSchema.virtual('pendingAmount').get(function () {
  const pending = this.netAmount - this.paidAmount;
  return pending > 0 ? pending : 0;
});

module.exports = mongoose.model('Bill', billSchema);
