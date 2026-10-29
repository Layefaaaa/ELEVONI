import mongoose from "mongoose";
import { VENDOR_SALE_CHANNELS, VENDOR_SALE_PAYMENT_STATUSES, VENDOR_SALE_FULFILMENT_STATUSES, VENDOR_SALE_UNITS } from "./vendorSaleModel.js";

const houseSaleSchema = new mongoose.Schema({
    sellerType: { type: String, enum: ["house"], default: "house", immutable: true },
    sellerBusinessName: { type: String, required: true, default: "Elevoni Farms", immutable: true },
    submissionReference: { type: String, required: true, trim: true, minlength: 8, maxlength: 128 },
    productName: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
    unit: { type: String, required: true, enum: VENDOR_SALE_UNITS },
    quantity: { type: Number, required: true, min: 0.000001 },
    unitPrice: { type: Number, required: true, min: 0.01 },
    totalAmount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, enum: ["NGN"], default: "NGN", required: true },
    saleDate: { type: Date, required: true },
    saleTime: { type: String, trim: true, validate: { validator: (value) => !value || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value), message: "Sale time must use HH:MM format" }, default: "" },
    salesChannel: { type: String, enum: VENDOR_SALE_CHANNELS, required: true },
    paymentStatus: { type: String, enum: VENDOR_SALE_PAYMENT_STATUSES, required: true },
    amountReceived: { type: Number, required: true, min: 0 },
    fulfilmentStatus: { type: String, enum: VENDOR_SALE_FULFILMENT_STATUSES, default: "pending", required: true },
    buyerIdentityStatus: { type: String, enum: ["identified", "anonymous", "unknown"], default: "unknown" },
    buyerName: { type: String, trim: true, maxlength: 120, default: "" },
    buyerContact: { type: String, trim: true, maxlength: 120, default: "" },
    buyerState: { type: String, trim: true, maxlength: 100, default: "" },
    buyerArea: { type: String, trim: true, maxlength: 120, default: "" },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
    recordSource: { type: String, enum: ["business_reported", "historical_import"], default: "business_reported", required: true, immutable: true },
    verificationStatus: { type: String, enum: ["unverified", "verified"], default: "unverified", required: true }
}, { timestamps: true });

houseSaleSchema.index({ submissionReference: 1 }, { unique: true });
houseSaleSchema.index({ saleDate: -1, createdAt: -1 });
houseSaleSchema.index({ buyerContact: 1, saleDate: -1 });

const houseSaleModel = mongoose.models.houseSale || mongoose.model("houseSale", houseSaleSchema);
export default houseSaleModel;
