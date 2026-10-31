import mongoose from "mongoose";

const checkoutProfileSchema = new mongoose.Schema({
    firstName: { type: String, trim: true, maxlength: 100 },
    lastName: { type: String, trim: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 40 },
    street: { type: String, trim: true, maxlength: 300 },
    city: { type: String, trim: true, maxlength: 120 },
    state: { type: String, trim: true, maxlength: 120 },
    country: { type: String, trim: true, maxlength: 120 }
}, { _id: false });

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: function () { return !this.googleId; } },
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer", required: true },
    cartData: { type: Object, default: {} },
    checkoutProfile: { type: checkoutProfileSchema, default: undefined }
}, { minimize: false });

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
