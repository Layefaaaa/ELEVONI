import mongoose from "mongoose";
import { VENDOR_PRODUCT_FOCUS, VENDOR_STATUSES } from "../services/vendorApplication.js";

const statusHistorySchema = new mongoose.Schema({
    status: { type: String, enum: VENDOR_STATUSES, required: true },
    at: { type: Date, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    note: { type: String, default: "", maxlength: 500 }
}, { _id: false });

const vendorProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        unique: true
    },
    businessName: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    contactName: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    state: { type: String, trim: true, minlength: 2, maxlength: 100 },
    lga: { type: String, trim: true, minlength: 2, maxlength: 100 },
    // Canonical structured farm address. Top-level state/lga and location stay
    // for compatibility with existing applications and API clients.
    farmAddress: {
        street: { type: String, trim: true, maxlength: 160, default: "" },
        area: { type: String, trim: true, maxlength: 120, default: "" },
        lga: { type: String, trim: true, maxlength: 100, default: "" },
        state: { type: String, trim: true, maxlength: 100, default: "" },
        country: { type: String, trim: true, maxlength: 80, default: "Nigeria" }
    },
    productFocus: {
        type: [String],
        enum: VENDOR_PRODUCT_FOCUS,
        required: true,
        validate: {
            validator: (value) => Array.isArray(value) && value.length > 0,
            message: "At least one livestock product focus is required"
        }
    },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    status: { type: String, enum: VENDOR_STATUSES, default: "pending", required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    reviewedAt: { type: Date, default: null },
    decisionNote: { type: String, default: "", maxlength: 500 },
    statusHistory: { type: [statusHistorySchema], default: [] }
}, { timestamps: true });

vendorProfileSchema.pre("validate", function syncFarmAddress() {
    this.farmAddress = this.farmAddress || {};
    if (!this.state && this.farmAddress.state) this.state = this.farmAddress.state;
    if (!this.lga && this.farmAddress.lga) this.lga = this.farmAddress.lga;
    if (!this.farmAddress.state && this.state) this.farmAddress.state = this.state;
    if (!this.farmAddress.lga && this.lga) this.farmAddress.lga = this.lga;
    if (!this.farmAddress.area && this.location) this.farmAddress.area = this.location;
    if (!this.location && this.farmAddress.area) this.location = this.farmAddress.area;
    if (!this.farmAddress.country) this.farmAddress.country = "Nigeria";
});

vendorProfileSchema.index({ status: 1, createdAt: -1 });
vendorProfileSchema.index({ state: 1, lga: 1, status: 1 });

const vendorProfileModel = mongoose.models.vendorProfile ||
    mongoose.model("vendorProfile", vendorProfileSchema);

export default vendorProfileModel;
