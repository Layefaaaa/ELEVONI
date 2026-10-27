import jwt from "jsonwebtoken";
import requireApprovedVendorProfile from "./vendor.js";

const readToken = (req) => {
    const authorization = req.get ? .("authorization") || req.headers ? .authorization;
    const bearerToken = authorization ? .match(/^Bearer\s+(.+)$/i) ? .[1];

    return bearerToken || req.get ? .("token") || req.headers ? .token || null;
};

const authMiddleware = (req, res, next) => {
    const token = readToken(req);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({
            success: false,
            message: "Authentication is not configured"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ["HS256"]
        });

        const allowedRoles = ["customer", "vendor", "admin"];

        if (
            typeof decoded.id !== "string" ||
            !decoded.id ||
            !allowedRoles.includes(decoded.role)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token"
            });
        }

        req.auth = Object.freeze({
            id: decoded.id,
            userId: decoded.id,
            email: typeof decoded.email === "string" ? decoded.email : undefined,
            role: decoded.role
        });

        return next();
    } catch (error) {
        const expired = error ? .name === "TokenExpiredError";

        return res.status(401).json({
            success: false,
            message: expired ?
                "Session expired. Please log in again." :
                "Invalid or expired authentication token"
        });
    }
};

export const verifyToken = authMiddleware;

export const requireAuth = [authMiddleware];

export const requireRole = (...roles) => (req, res, next) => {
    if (!req.auth) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    if (!roles.includes(req.auth.role)) {
        return res.status(403).json({
            success: false,
            message: "Insufficient permissions"
        });
    }

    return next();
};

const approvedVendorGuard = requireApprovedVendorProfile();

const approvedVendorOrAdmin = (req, res, next) => {
    if (req.auth ? .role === "admin") {
        return next();
    }

    return approvedVendorGuard(req, res, next);
};

export const requireApprovedVendor = [approvedVendorOrAdmin];

export const verifyOwnership = (fetchResourceFn, ownerField = "vendorId") => async(req, res, next) => {
    try {
        const resource = await fetchResourceFn(req);

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Requested resource not found"
            });
        }

        if (req.auth ? .role === "admin") {
            req.resource = resource;
            return next();
        }

        const ownerId = resource[ownerField] ?
            String(resource[ownerField]._id || resource[ownerField]) :
            null;

        const ownVendorId = req.vendor ? .profileId ?
            String(req.vendor.profileId) :
            null;

        if (!ownerId || !ownVendorId || ownerId !== ownVendorId) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not own this resource."
            });
        }

        req.resource = resource;

        return next();
    } catch (error) {
        return next(error);
    }
};

export default authMiddleware;