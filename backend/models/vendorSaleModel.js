import mongoose from "mongoose";
import Product from "./Product.js";

const PRODUCT_UNITS = Object.freeze([
    ...(Product.schema.path("unitOfMeasure").enumValues || [])
]);

const VENDOR_SALE_CHANNELS = Object.freeze([
    "phone",
    "whatsapp",
    "in_person",
    "other"
]);

const VENDOR_SALE_PAYMENT_STATUSES = Object.freeze([
    "paid",
    "partial",
    "unpaid"
]);

const VENDOR_SALE_FULFILMENT_STATUSES = Object.freeze([
    "pending",
    "fulfilled",
    "cancelled"
]);

const VENDOR_SALE_RECORD_SOURCES = Object.freeze(["farmer_reported"]);
const VENDOR_SALE_VERIFICATION_STATUSES = Object.freeze(["unverified", "verified"]);

const vendorSaleSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "vendorProfile",
        required: true,
        index: true
    },
    submissionReference: {
        type: String,
        required: true,
        trim: true,
        minlength: 8,
        maxlength: 128
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        default: null
    },
    productName: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 160
    },
    unit: {
        type: String,
        required: true,
        enum: PRODUCT_UNITS
    },
    quantity: {
        type: Number,
        required: true,
        validate: {
            validator: (value) => Number.isFinite(value) && value > 0,
            message: "Quantity must be a positive finite number"
        }
    },
    unitPrice: {
        type: Number,
        required: true,
        validate: {
            validator: (value) => Number.isFinite(value) && value > 0,
            message: "Unit price must be a positive finite number"
        }
    },
    totalAmount: {
        type: Number,
        required: true,
        validate: {
            validator: (value) => Number.isFinite(value) && value > 0,
            message: "Total amount must be a positive finite number"
        }
    },
    currency: {
        type: String,
        required: true,
        enum: ["NGN"],
        default: "NGN"
    },
    saleDate: {
        type: Date,
        required: true
    },
    salesChannel: {
        type: String,
        required: true,
        enum: VENDOR_SALE_CHANNELS
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: VENDOR_SALE_PAYMENT_STATUSES
    },
    amountReceived: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator: (value) => Number.isFinite(value) && value >= 0,
            message: "Amount received must be a non-negative finite number"
        }
    },
    fulfilmentStatus: {
        type: String,
        required: true,
        enum: VENDOR_SALE_FULFILMENT_STATUSES,
        default: "pending"
    },
    buyerName: {
        type: String,
        trim: true,
        maxlength: 120,
        default: ""
    },
    buyerContact: {
        type: String,
        trim: true,
        maxlength: 120,
        default: ""
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ""
    },
    recordSource: {
        type: String,
        required: true,
        enum: VENDOR_SALE_RECORD_SOURCES,
        default: "farmer_reported",
        immutable: true
    },
    verificationStatus: {
        type: String,
        required: true,
        enum: VENDOR_SALE_VERIFICATION_STATUSES,
        default: "unverified"
    }
}, { timestamps: true });

vendorSaleSchema.index(
    { vendorId: 1, submissionReference: 1 },
    { unique: true }
);
vendorSaleSchema.index({ vendorId: 1, saleDate: -1, createdAt: -1 });

const vendorSaleModel = mongoose.models.vendorSale ||
    mongoose.model("vendorSale", vendorSaleSchema);

export {
    PRODUCT_UNITS as VENDOR_SALE_UNITS,
    VENDOR_SALE_CHANNELS,
    VENDOR_SALE_PAYMENT_STATUSES,
    VENDOR_SALE_FULFILMENT_STATUSES,
    VENDOR_SALE_RECORD_SOURCES,
    VENDOR_SALE_VERIFICATION_STATUSES
};

export default vendorSaleModel;
