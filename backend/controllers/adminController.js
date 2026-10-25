import mongoose from "mongoose";
import userModel from "../models/userModel.js";
import vendorProfileModel from "../models/vendorProfileModel.js";
import Product from "../models/Product.js";
import { statusAfterDecision, validateDecisionNote } from "../services/vendorApplication.js";

const idIsValid = (id) => mongoose.Types.ObjectId.isValid(id);

export const getAllVendors = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      if (!["pending", "approved", "rejected", "suspended"].includes(req.query.status)) {
        return res.status(400).json({ success: false, message: "Invalid vendor status" });
      }
      filter.status = req.query.status;
    }
    const vendors = await vendorProfileModel.find(filter, "businessName contactName email phone location productFocus description status reviewedAt createdAt", { sort: { createdAt: -1 } });
    return res.status(200).json({ success: true, count: vendors.length, data: vendors });
  } catch (error) { return next(error); }
};

export const updateVendorStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, decisionNote = "" } = req.body || {};
    if (!idIsValid(id) || !["approved", "rejected", "suspended", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Provide a valid vendor ID and status" });
    }
    const profile = await vendorProfileModel.findById(id);
    if (!profile) return res.status(404).json({ success: false, message: "Vendor profile not found" });
    const decisions = {
      pending: { approved: "approve", rejected: "reject" },
      approved: { suspended: "suspend" },
      suspended: { approved: "reinstate" },
      rejected: { pending: "reopen" }
    };
    const decision = decisions[profile.status]?.[status];
    if (!decision || statusAfterDecision(profile.status, decision) !== status) {
      return res.status(409).json({ success: false, message: `Cannot change vendor status from ${profile.status} to ${status}`, vendorStatus: profile.status });
    }
    const note = validateDecisionNote(decisionNote);
    if (note === null) return res.status(400).json({ success: false, message: "Decision note must be text no longer than 500 characters" });
    const reviewedAt = new Date();
    const updated = await vendorProfileModel.findOneAndUpdate(
      { _id: profile._id, status: profile.status },
      { $set: { status, reviewedBy: req.auth.userId || req.auth.id, reviewedAt, decisionNote: note }, $push: { statusHistory: { status, at: reviewedAt, by: req.auth.userId || req.auth.id, note } } },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(409).json({ success: false, message: "Vendor status changed while you were updating it. Reload and try again." });
    return res.status(200).json({ success: true, message: `Vendor status updated to '${status}'`, data: updated });
  } catch (error) { return next(error); }
};

export const getSystemStats = async (req, res, next) => {
  try {
    const [totalUsers, totalVendors, pendingVendors, approvedVendors, totalProducts] = await Promise.all([
      userModel.countDocuments(),
      vendorProfileModel.countDocuments(),
      vendorProfileModel.countDocuments({ status: "pending" }),
      vendorProfileModel.countDocuments({ status: "approved" }),
      Product.countDocuments()
    ]);
    return res.status(200).json({ success: true, data: { totalUsers, totalVendors, pendingVendors, approvedVendors, totalProducts, timestamp: new Date().toISOString() } });
  } catch (error) { return next(error); }
};
