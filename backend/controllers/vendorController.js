import bcrypt from "bcrypt";
import mongoose from "mongoose";
import userModel from "../models/userModel.js";
import vendorProfileModel from "../models/vendorProfileModel.js";
import {
    VENDOR_DECISIONS,
    VENDOR_DECISION_NAMES,
    VENDOR_STATUSES,
    adminVendorApplication,
    adminVendorSummary,
    publicVendorApplication,
    statusAfterDecision,
    validateDecisionNote,
    validateVendorApplicationFields
} from "../services/vendorApplication.js";
import { createSessionToken, publicUser } from "../services/session.js";

const sendServerError = (res, message) => res.status(500).json({ success: false, message });
const currentUserId = (req) => req.auth?.userId || req.auth?.id;
const normaliseEmail = (value) => typeof value === "string" ? value.trim().toLowerCase() : "";
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidId = (value) => mongoose.Types.ObjectId.isValid(value) && String(new mongoose.Types.ObjectId(value)) === String(value);
const initialHistory = () => [{ status: "pending", at: new Date(), by: null, note: "" }];

const loadUser = async (id) => userModel.findById(id);
const findApplication = async (userId) => vendorProfileModel.findOne({ userId });

export const registerVendor = async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = normaliseEmail(req.body?.email);
    const password = req.body?.password;
    if (name.length < 2 || name.length > 100 || !isValidEmail(email) || typeof password !== "string" || password.length < 8 || password.length > 128) {
        return res.status(400).json({ success: false, message: "Enter a valid name and email, and a password of at least 8 characters" });
    }
    const validation = validateVendorApplicationFields(req.body);
    if (validation.error) return res.status(400).json({ success: false, message: validation.error });

    let user;
    try {
        const existing = await userModel.findOne({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
        if (existing) return res.status(409).json({ success: false, message: "An account with this email already exists. Sign in, then apply from your account." });
        user = new userModel({ name, email, password: await bcrypt.hash(password, 12), role: "customer" });
        await user.save();
        const fields = validation.fields;
        const profile = await vendorProfileModel.create({
            userId: user._id,
            businessName: fields.businessName,
            contactName: fields.contactName,
            email,
            phone: fields.phone,
            location: fields.location,
            state: fields.state,
            lga: fields.lga,
            productFocus: fields.productFocus,
            description: fields.description,
            status: "pending",
            reviewedBy: null,
            reviewedAt: null,
            decisionNote: "",
            statusHistory: initialHistory()
        });
        return res.status(201).json({
            success: true,
            message: "Account created and vendor application submitted for review",
            token: createSessionToken(user),
            user: publicUser(user),
            application: publicVendorApplication(profile)
        });
    } catch (error) {
        if (user?._id) await userModel.findByIdAndDelete(user._id).catch(() => {});
        if (error?.code === 11000) return res.status(409).json({ success: false, message: "An account with this email already exists" });
        return sendServerError(res, "Unable to create your account and vendor application");
    }
};

export const applyAsVendor = async (req, res) => {
    const userId = currentUserId(req);
    if (!userId || req.auth?.role !== "customer") return res.status(req.auth ? 403 : 401).json({ success: false, message: "A customer account is required" });
    try {
        const user = await loadUser(userId);
        if (!user || user.role !== "customer") return res.status(401).json({ success: false, message: "Your account could not be verified. Please sign in again." });
        const existing = await findApplication(userId);
        if (existing) return res.status(409).json({ success: false, message: "A vendor application already exists for this account", application: publicVendorApplication(existing) });
        const validation = validateVendorApplicationFields(req.body);
        if (validation.error) return res.status(400).json({ success: false, message: validation.error });
        const fields = validation.fields;
        const profile = await vendorProfileModel.create({
            userId: user._id,
            businessName: fields.businessName,
            contactName: fields.contactName,
            email: user.email,
            phone: fields.phone,
            location: fields.location,
            state: fields.state,
            lga: fields.lga,
            productFocus: fields.productFocus,
            description: fields.description,
            status: "pending",
            reviewedBy: null,
            reviewedAt: null,
            decisionNote: "",
            statusHistory: initialHistory()
        });
        return res.status(201).json({ success: true, message: "Vendor application submitted for review", application: publicVendorApplication(profile) });
    } catch (error) {
        if (error?.code === 11000) {
            const existing = await findApplication(userId).catch(() => null);
            return res.status(409).json({ success: false, message: "A vendor application already exists for this account", ...(existing ? { application: publicVendorApplication(existing) } : {}) });
        }
        return sendServerError(res, "Unable to submit your vendor application");
    }
};

export const getOwnVendorApplication = async (req, res) => {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
    try {
        const user = await loadUser(userId);
        if (!user) return res.status(401).json({ success: false, message: "Your account could not be verified. Please sign in again." });
        const profile = await findApplication(userId);
        return res.status(200).json({ success: true, application: profile ? publicVendorApplication(profile) : null });
    } catch {
        return sendServerError(res, "Unable to load your vendor application");
    }
};

export const listVendorApplications = async (req, res) => {
    const allowedStatuses = [...VENDOR_STATUSES, "all"];
    const status = req.query.status || "pending";
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    if (!allowedStatuses.includes(status) || !Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ success: false, message: "Invalid status or pagination parameters" });
    }
    const filter = status === "all" ? {} : { status };
    try {
        const [profiles, total] = await Promise.all([
            vendorProfileModel.find(filter, null, { sort: { createdAt: -1 }, skip: (page - 1) * limit, limit }),
            vendorProfileModel.countDocuments(filter)
        ]);
        return res.status(200).json({
            success: true,
            data: profiles.map(adminVendorSummary),
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch {
        return sendServerError(res, "Unable to load vendor applications");
    }
};

export const getVendorApplication = async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid vendor application ID" });
    try {
        const profile = await vendorProfileModel.findById(req.params.id);
        if (!profile) return res.status(404).json({ success: false, message: "Vendor application not found" });
        return res.status(200).json({ success: true, application: adminVendorApplication(profile) });
    } catch {
        return sendServerError(res, "Unable to load vendor application");
    }
};

export const reviewVendorApplication = async (req, res) => {
    const { decision, note } = req.body || {};
    if (typeof decision !== "string" || !VENDOR_DECISION_NAMES.includes(decision)) {
        return res.status(400).json({ success: false, message: "Choose a valid vendor review decision" });
    }
    const cleanNote = validateDecisionNote(note);
    if (cleanNote === null) return res.status(400).json({ success: false, message: "Review note must be text no longer than 500 characters" });
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid vendor application ID" });
    try {
        const profile = await vendorProfileModel.findById(req.params.id);
        if (!profile) return res.status(404).json({ success: false, message: "Vendor application not found" });
        const reviewerId = currentUserId(req);
        if (String(profile.userId) === String(reviewerId)) return res.status(403).json({ success: false, message: "You cannot review your own vendor application" });
        const nextStatus = statusAfterDecision(profile.status, decision);
        if (!nextStatus) return res.status(409).json({ success: false, message: `Cannot apply '${decision}' to a ${profile.status} application`, vendorStatus: profile.status });
        const reviewedAt = new Date();
        const updated = await vendorProfileModel.findOneAndUpdate(
            { _id: profile._id, status: profile.status },
            {
                $set: { status: nextStatus, reviewedBy: reviewerId, reviewedAt, decisionNote: cleanNote },
                $push: { statusHistory: { status: nextStatus, at: reviewedAt, by: reviewerId, note: cleanNote } }
            },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(409).json({ success: false, message: "The application changed while you were reviewing it. Reload and try again.", vendorStatus: profile.status });
        return res.status(200).json({ success: true, message: `Vendor application ${nextStatus}`, application: adminVendorApplication(updated) });
    } catch {
        return sendServerError(res, "Unable to review vendor application");
    }
};

// Public directory is limited to approved profiles and deliberately omits user IDs and review metadata.
export const getAllApprovedVendors = async (req, res) => {
    try {
        const filter = { status: "approved" };
        if (req.query.search) {
            const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.$or = [
                { businessName: new RegExp(escaped, "i") },
                { description: new RegExp(escaped, "i") },
                { location: new RegExp(escaped, "i") },
                { state: new RegExp(escaped, "i") },
                { lga: new RegExp(escaped, "i") }
            ];
        }
        if (req.query.state) {
            const escapedState = String(req.query.state).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.$and = [
                ...(filter.$and || []),
                { $or: [
                    { state: new RegExp(`^${escapedState}$`, "i") },
                    { state: { $exists: false }, location: new RegExp(escapedState, "i") },
                    { state: "", location: new RegExp(escapedState, "i") }
                ] }
            ];
        }
        const profiles = await vendorProfileModel.find(filter, "businessName location state lga productFocus description status createdAt", { sort: { createdAt: -1 } });
        return res.status(200).json({ success: true, count: profiles.length, data: profiles.map((profile) => ({
            id: profile._id, businessName: profile.businessName,
            location: profile.location, state: profile.state || "", lga: profile.lga || "", productFocus: profile.productFocus || [], description: profile.description || "", status: profile.status
        })) });
    } catch {
        return sendServerError(res, "Unable to load approved vendors");
    }
};

export const getApprovedVendorById = async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid vendor ID" });
    try {
        const profile = await vendorProfileModel.findOne({ _id: req.params.id, status: "approved" });
        if (!profile) return res.status(404).json({ success: false, message: "Approved farm/vendor profile not found" });
        return res.status(200).json({ success: true, data: {
            id: profile._id, businessName: profile.businessName,
            location: profile.location, state: profile.state || "", lga: profile.lga || "", productFocus: profile.productFocus || [], description: profile.description || "", status: profile.status
        } });
    } catch {
        return sendServerError(res, "Unable to load approved vendor");
    }
};

// Legacy exports retained as aliases so older imports fail safely during migration.
export const applyVendor = applyAsVendor;
export const getVendorProfile = async (req, res) => getOwnVendorApplication(req, res);
export const updateVendorProfile = async (req, res) => res.status(405).json({ success: false, message: "Vendor profile editing is not available yet" });
