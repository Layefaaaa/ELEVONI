import express from "express";
import {
    loginUser,
    registerUser,
    googleLogin,
    completeGoogleSignup,
    currentUser,
    updateCheckoutProfile
} from "../controllers/userController.js";
import authMiddleware, { requireRole } from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/google", express.urlencoded({ extended: false }), googleLogin);
userRouter.post("/google/complete-signup", completeGoogleSignup);
userRouter.get("/me", authMiddleware, currentUser);
userRouter.put("/checkout-profile", authMiddleware, requireRole("customer"), updateCheckoutProfile);

export default userRouter;