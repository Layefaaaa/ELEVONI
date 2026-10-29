import express from "express";
import { recordMarketplaceEnquiry } from "../controllers/marketplaceEnquiryController.js";

import {
    getPublicProducts,
    getProductById,
    createVendorProduct,
    getMyVendorProducts,
    updateVendorProduct,
    deleteVendorProduct,
    adminGetAllProducts,
    adminModerateProduct,
    getVendorMediaUploadSignature,
} from "../controllers/productController.js";

import {
    verifyToken,
    requireRole,
    requireApprovedVendor,
} from "../middleware/auth.js";

const router = express.Router();

// Public product routes
router.get("/", getPublicProducts);
// Logs enquiry intent only; it is not a completed order or sale.
router.post("/enquiry", recordMarketplaceEnquiry);

// Vendor media upload signature
// The actual media file is uploaded directly to Cloudinary.
router.post(
    "/vendor/media/signature",
    verifyToken,
    ...requireApprovedVendor,
    getVendorMediaUploadSignature
);

// Vendor product management
// Vendor access is determined by the authenticated user's approved vendor
// profile, not by requiring the user's general account role to be "vendor".
router.post(
    "/vendor",
    verifyToken,
    ...requireApprovedVendor,
    createVendorProduct
);

router.get(
    "/vendor/me",
    verifyToken,
    ...requireApprovedVendor,
    getMyVendorProducts
);

router.put(
    "/vendor/:id",
    verifyToken,
    ...requireApprovedVendor,
    updateVendorProduct
);

router.delete(
    "/vendor/:id",
    verifyToken,
    ...requireApprovedVendor,
    deleteVendorProduct
);

// Admin product management
router.get(
    "/admin/all",
    verifyToken,
    requireRole("admin"),
    adminGetAllProducts
);

router.patch(
    "/admin/:id/status",
    verifyToken,
    requireRole("admin"),
    adminModerateProduct
);

// Keep the generic ID route after specific routes so it cannot intercept
// requests intended for vendor or admin endpoints.
router.get("/:id", getProductById);

export default router;