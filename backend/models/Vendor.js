// LEGACY / NOT USED BY ACTIVE API ROUTES. Canonical vendor data lives in vendorProfileModel.js.
// Retained temporarily for compatibility until deployed database and external imports are audited.
import mongoose from 'mongoose';

/**
 * Elevoni Farms Vendor Model Schema
 * Manages partner farm details, legal registration (CAC),
 * payout account configurations, and administrative approval state.
 */
const vendorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vendor must be linked to a valid user account'],
      unique: true
    },
    businessName: {
      type: String,
      required: [true, 'Business/Farm name is required'],
      trim: true
    },
    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Business email is required'],
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    cacNumber: {
      type: String,
      trim: true,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    farmAddress: {
      street: { type: String, trim: true, default: '' },
      lga: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: 'Nigeria' },
      country: { type: String, default: 'Nigeria' }
    },
    bankDetails: {
      bankName: { type: String, trim: true, default: '' },
      bankCode: { type: String, trim: true, default: '' },
      accountNumber: { type: String, trim: true, default: '' },
      accountName: { type: String, trim: true, default: '' },
      paystackRecipientCode: { type: String, trim: true, default: '' }
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending'
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    verificationNotes: {
      type: String,
      default: ''
    },
    logoUrl: {
      type: String,
      default: ''
    },
    bannerUrl: {
      type: String,
      default: ''
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5
    }
  },
  {
    timestamps: true
  }
);

// Prevent Mongoose OverwriteModelError
const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);

export default Vendor;
