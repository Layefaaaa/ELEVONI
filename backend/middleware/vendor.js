import vendorProfileModel from "../models/vendorProfileModel.js";

// Guards vendor-only operations. The approval status is read from MongoDB on
// every request instead of being trusted from the 24h token, so suspending a
// vendor takes effect immediately.
const requireApprovedVendor = ({ ProfileModel = vendorProfileModel } = {}) => async (req, res, next) => {
    if (!req.auth) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    try {
        const profile = await ProfileModel.findOne({ userId: req.auth.userId });
        if (!profile) {
            return res.status(403).json({ success: false, message: "A vendor application is required" });
        }
        if (profile.status !== "approved") {
            return res.status(403).json({
                success: false,
                message: "This vendor application is not approved",
                vendorStatus: profile.status
            });
        }
        req.vendor = Object.freeze({
            profileId: profile._id,
            userId: profile.userId,
            status: profile.status
        });
        return next();
    } catch (error) {
        console.error("Vendor authorization error:", error);
        return res.status(500).json({ success: false, message: "Unable to verify vendor access" });
    }
};

export default requireApprovedVendor;
export { requireApprovedVendor };
