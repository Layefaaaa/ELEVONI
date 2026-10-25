// Compatibility alias for deployments that prefer the plural /api/payments path.
// The active storefront continues to use /api/payment. Both paths require an
// authenticated customer/admin and use the same order-bound verification flow.
import express from "express";
import { initializePayment, verifyPayment } from "../controllers/paymentController.js";
import authMiddleware, { requireRole } from "../middleware/auth.js";
const router = express.Router();
router.post("/initialize", authMiddleware, requireRole("customer", "admin"), initializePayment);
router.post("/verify", authMiddleware, requireRole("customer", "admin"), verifyPayment);
export default router;
