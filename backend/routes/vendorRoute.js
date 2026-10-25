import express from "express";
import authMiddleware, { requireRole } from "../middleware/auth.js";
import {
    applyAsVendor,
    getOwnVendorApplication,
    getVendorApplication,
    listVendorApplications,
    registerVendor,
    reviewVendorApplication
} from "../controllers/vendorController.js";

const vendorRouter = express.Router();
vendorRouter.post("/register", registerVendor);
vendorRouter.post("/apply", authMiddleware, requireRole("customer"), applyAsVendor);
vendorRouter.get("/me", authMiddleware, getOwnVendorApplication);
vendorRouter.get("/admin-list", authMiddleware, requireRole("admin"), listVendorApplications);
vendorRouter.get("/admin/:id", authMiddleware, requireRole("admin"), getVendorApplication);
vendorRouter.post("/:id/review", authMiddleware, requireRole("admin"), reviewVendorApplication);
export default vendorRouter;
