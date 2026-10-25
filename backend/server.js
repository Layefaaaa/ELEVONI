import express from "express";
import "dotenv/config";
import apiCorsGate from "./middleware/apiCors.js";
import connectDB from "./config/db.js";

import fishRouter from "./routes/fishRoute.js";
import userRouter from "./routes/userRoute.js";
import cartRouter from "./routes/cartRoute.js";
import reviewRouter from "./routes/reviewRoute.js";
import orderRouter from "./routes/orderRoute.js";
import paymentRouter from "./routes/paymentRoute.js";
import vendorRouter from "./routes/vendorRoute.js";
import vendorDirectoryRoutes from "./routes/vendorRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
app.use(apiCorsGate);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => res.status(200).json({
    status: "ok",
    service: "Elevoni Farms API Engine",
    timestamp: new Date().toISOString()
}));
app.get("/", (req, res) => res.send("API Working"));
app.use("/images", express.static("uploads"));

// Existing storefront APIs: keep these paths stable for the current React app.
app.use("/api/fish", fishRouter);
app.use("/api/user", userRouter);
app.use("/api/cart", cartRouter);
app.use("/api/review", reviewRouter);
app.use("/api/order", orderRouter);
app.use("/api/payment", paymentRouter);

// Marketplace and vendor application APIs use vendorProfileModel as the canonical profile.
app.use("/api/vendor", vendorRouter);
app.use("/api/vendors", vendorDirectoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res, next) => {
    const error = new Error(`Resource not found - ${req.originalUrl}`);
    error.status = 404;
    next(error);
});
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`Elevoni Farms API server running on port ${PORT}`);
        });
    });
}

export default app;