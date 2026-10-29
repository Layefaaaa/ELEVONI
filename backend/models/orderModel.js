import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "fish" },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "vendorProfile" },
    vendorBusinessName: { type: String, trim: true, maxlength: 120 },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: "kg" },
    unitPrice: { type: Number, min: 0 },
    lineTotal: { type: Number, min: 0 },
    // Keep unrecognized legacy item fields when older orders are hydrated.
}, { _id: false, strict: false });

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, min: 0 },
    deliveryFee: { type: Number, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN" },
    address: { type: Object, required: true },
    // Keep status/payment fields for compatibility with existing records and clients.
    status: { type: String, default: "Fish Processing" },
    orderStatus: {
        type: String,
        enum: ["pending", "pending_confirmation", "confirmed", "processing", "out_for_delivery", "delivered", "cancelled", "failed"]
    },
    paymentStatus: { type: String, enum: ["pending", "successful", "failed", "unpaid"] },
    paymentMethod: { type: String, enum: ["paystack", "whatsapp_manual"] },
    source: { type: String, enum: ["online", "whatsapp_manual"] },
    date: { type: Date, default: Date.now },
    payment: { type: Boolean, default: false },
    paymentReference: { type: String, default: null },
    paidAt: { type: Date }
}, { timestamps: true });

orderSchema.index(
    { paymentReference: 1 },
    { unique: true, partialFilterExpression: { paymentReference: { $type: "string" } } }
);

const orderModel = mongoose.models.order || mongoose.model("order", orderSchema);
export default orderModel;
