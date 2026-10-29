import express from "express";
import { verifyToken } from "../middleware/auth.js";
import requireApprovedVendorProfile from "../middleware/vendor.js";
import {
    createVendorSale,
    listVendorSales
} from "../controllers/vendorSalesController.js";

const router = express.Router();
const requireApprovedVendor = requireApprovedVendorProfile();

router.use(verifyToken, requireApprovedVendor);
router.post("/", createVendorSale);
router.get("/", listVendorSales);

export default router;
