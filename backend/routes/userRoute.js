import express from "express";
import {
    loginUser,
    registerUser,
    googleLogin,
    completeGoogleSignup,
    currentUser
} from "../controllers/userController.js";
import authMiddleware from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/google", express.urlencoded({ extended: false }), googleLogin);
userRouter.post("/google/complete-signup", completeGoogleSignup);
userRouter.get("/me", authMiddleware, currentUser);

export default userRouter;