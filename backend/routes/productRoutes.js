import express from "express";

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
router.get("/:id", getProductById);

// Vendor media upload signature
// The actual media file will be uploaded directly to Cloudinary.
router.post(
    "/vendor/media/signature",
    verifyToken,
    requireRole("vendor"),
    ...requireApprovedVendor,
    getVendorMediaUploadSignature
);

// Vendor product management
router.post(
    "/vendor",
    verifyToken,
    requireRole("vendor"),
    ...requireApprovedVendor,
    createVendorProduct
);

router.get(
    "/vendor/me",
    verifyToken,
    requireRole("vendor"),
    ...requireApprovedVendor,
    getMyVendorProducts
);

router.put(
    "/vendor/:id",
    verifyToken,
    requireRole("vendor"),
    ...requireApprovedVendor,
    updateVendorProduct
);

router.delete(
    "/vendor/:id",
    verifyToken,
    requireRole("vendor"),
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

export default router;