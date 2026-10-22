import express from "express";
import {
    addFish,
    updateFish,
    listFish,
    listAllFish,
    getFishById,
    getFishForAdmin,
    removeFish,
    addFishMedia
} from "../controllers/fishController.js";
import authMiddleware, { requireRole } from "../middleware/auth.js";
import upload from "../middleware/multer.js";

const fishRouter = express.Router();

fishRouter.post("/add", authMiddleware, requireRole("admin"), upload.single("image"), addFish);
fishRouter.get("/list", listFish);
fishRouter.get("/admin-list", authMiddleware, requireRole("admin"), listAllFish);
fishRouter.get("/admin/:id", authMiddleware, requireRole("admin"), getFishForAdmin);
fishRouter.get("/:id", getFishById);
fishRouter.put("/:id", authMiddleware, requireRole("admin"), updateFish);
fishRouter.post("/remove", authMiddleware, requireRole("admin"), removeFish);
fishRouter.post("/add-media", authMiddleware, requireRole("admin"), upload.array("media", 10), addFishMedia);

fishRouter.use((error, req, res, next) => {
    if (error?.name === "MulterError") {
        return res.status(400).json({ success: false, message: error.message });
    }
    if (typeof error?.message === "string" && error.message.includes("Unsupported file format")) {
        return res.status(400).json({ success: false, message: error.message });
    }
    return next(error);
});

export default fishRouter;
