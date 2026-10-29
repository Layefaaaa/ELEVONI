import mongoose from "mongoose";
import Product from "../models/Product.js";
import marketplaceEnquiryModel from "../models/marketplaceEnquiryModel.js";
import { buildPaginationMeta, countMatching, parsePagination } from "../services/pagination.js";

export const recordMarketplaceEnquiry = async (req, res, next) => {
    try {
        const productId = req.body?.productId;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "A valid product ID is required" });
        }
        const product = await Product.findOne({ _id: productId, status: "approved", isAvailable: true })
            .populate("vendorId", "businessName status");
        if (!product || !product.vendorId || product.vendorId.status !== "approved") {
            return res.status(404).json({ success: false, message: "This marketplace listing is no longer available" });
        }
        const enquiry = await marketplaceEnquiryModel.create({
            productId: product._id,
            productName: product.name,
            vendorId: product.vendorId._id,
            vendorBusinessName: product.vendorId.businessName,
            enquiryChannel: "whatsapp",
            eventType: "enquiry_link_clicked",
            recordSource: "platform_recorded",
            buyerIdentityStatus: "unknown"
        });
        return res.status(201).json({ success: true, message: "Marketplace enquiry intent recorded", data: { id: enquiry._id } });
    } catch (error) { return next(error); }
};

export const listVendorMarketplaceEnquiries = async (req, res, next) => {
    try {
        const vendorId = req.vendor?.profileId;
        if (!vendorId) return res.status(403).json({ success: false, message: "An approved vendor profile is required" });
        const { page, limit, skip } = parsePagination(req.query);
        const filter = { vendorId };
        const records = await marketplaceEnquiryModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const returned = Array.isArray(records) ? records.length : 0;
        const total = await countMatching(marketplaceEnquiryModel, filter);
        return res.status(200).json({ success: true, count: returned, data: records, pagination: buildPaginationMeta({ page, limit, total: total ?? returned }) });
    } catch (error) { return next(error); }
};
