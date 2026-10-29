import mongoose from "mongoose";

const marketplaceEnquirySchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productName: { type: String, required: true, trim: true, maxlength: 160 },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "vendorProfile", required: true, index: true },
    vendorBusinessName: { type: String, required: true, trim: true, maxlength: 120 },
    enquiryChannel: { type: String, enum: ["whatsapp"], default: "whatsapp", required: true },
    eventType: { type: String, enum: ["enquiry_link_clicked"], default: "enquiry_link_clicked", required: true },
    recordSource: { type: String, enum: ["platform_recorded"], default: "platform_recorded", immutable: true },
    buyerIdentityStatus: { type: String, enum: ["unknown"], default: "unknown", immutable: true },
    buyerState: { type: String, trim: true, maxlength: 100, default: "" },
    buyerArea: { type: String, trim: true, maxlength: 120, default: "" }
}, { timestamps: true });

marketplaceEnquirySchema.index({ vendorId: 1, createdAt: -1 });
marketplaceEnquirySchema.index({ productId: 1, createdAt: -1 });

const marketplaceEnquiryModel = mongoose.models.marketplaceEnquiry || mongoose.model("marketplaceEnquiry", marketplaceEnquirySchema);
export default marketplaceEnquiryModel;
