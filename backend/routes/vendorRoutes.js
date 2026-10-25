import express from "express";
import { getAllApprovedVendors, getApprovedVendorById, getOwnVendorApplication, applyAsVendor } from "../controllers/vendorController.js";
import { verifyToken } from "../middleware/auth.js";
const router = express.Router();
router.get("/", getAllApprovedVendors);
router.get("/profile/me", verifyToken, getOwnVendorApplication);
router.post("/apply", verifyToken, applyAsVendor);
router.get("/:id", getApprovedVendorById);
export default router;
