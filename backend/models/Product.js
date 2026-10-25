import mongoose from 'mongoose';

/**
 * Elevoni Farms Enhanced Product Model Schema
 * Supports multi-vendor attribution, approval workflow states,
 * stock control, and origin tracking.
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price must be greater than or equal to 0']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Catfish & Aquaculture',
        'Poultry & Eggs',
        'Grains & Cereals',
        'Vegetables & Fruits',
        'Tubers & Starch',
        'Livestock & Meat',
        'Processed Agro-Goods'
      ],
      default: 'Catfish & Aquaculture'
    },
    unitOfMeasure: {
      type: String,
      default: 'kg',
      enum: ['kg', 'gram', 'piece', 'crate', 'ton', 'bag', 'carton', 'litre'],
      trim: true
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Stock quantity cannot be negative']
    },
    images: {
      type: [String],
      default: []
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'vendorProfile',
      default: null // Null indicates official Elevoni Farms house products
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    originLocation: {
      state: { type: String, trim: true, default: 'FCT Abuja' },
      lga: { type: String, trim: true, default: '' }
    }
  },
  {
    timestamps: true
  }
);

// Indexing for high-performance public marketplace queries
productSchema.index({ status: 1, isAvailable: 1, category: 1 });
productSchema.index({ vendorId: 1, status: 1 });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;
