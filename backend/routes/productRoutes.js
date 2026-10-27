import express from "express";
import {
  getPublicProducts, getProductById, createVendorProduct, getMyVendorProducts,
  updateVendorProduct, deleteVendorProduct, adminGetAllProducts, adminModerateProduct, uploadVendorMedia
} from "../controllers/productController.js";
import { verifyToken, requireRole, requireApprovedVendor } from "../middleware/auth.js";
import upload from "../middleware/multer.js";

const router = express.Router();
router.get("/", getPublicProducts);
router.post("/vendor/media", ...requireApprovedVendor, upload.array("media", 10), uploadVendorMedia);
router.post("/vendor", ...requireApprovedVendor, createVendorProduct);
router.get("/vendor/me", ...requireApprovedVendor, getMyVendorProducts);
router.put("/vendor/:id", ...requireApprovedVendor, updateVendorProduct);
router.delete("/vendor/:id", ...requireApprovedVendor, deleteVendorProduct);
router.get("/admin/all", verifyToken, requireRole("admin"), adminGetAllProducts);
router.patch("/admin/:id/status", verifyToken, requireRole("admin"), adminModerateProduct);
router.get("/:id", getProductById);
export default router;
