import { randomUUID } from "node:crypto";
import PaystackJS from "paystack-api";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import { buildOrderSnapshot } from "./orderPricing.js";
import { buildOrderBuyerSnapshot } from "../services/orderBuyerSnapshot.js";

const paystack = PaystackJS(process.env.PAYSTACK_SECRET_KEY);
const orderResponse = (order) => ({
    orderId: order._id,
    amount: order.amount,
    currency: order.currency || "NGN",
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus
});

const createPaymentHandlers = ({
    paymentClient = paystack,
    OrderModel = orderModel,
    UserModel = userModel,
    snapshotOrder = buildOrderSnapshot
} = {}) => {
    const initializePayment = async (req, res) => {
        let order;
        try {
            if (!req.auth?.userId) return res.status(401).json({ success: false, message: "Authentication required" });
            const { items, address } = req.body;
            if (!address || typeof address !== "object" || Array.isArray(address)) {
                return res.status(400).json({ success: false, message: "Delivery address is required" });
            }
            const customer = await UserModel.findById(req.auth.userId);
            if (!customer) return res.status(401).json({ success: false, message: "Customer account not found" });
            const summary = await snapshotOrder(items);
            const reference = "ELV" + randomUUID().replaceAll("-", "");
            order = await new OrderModel({
                userId: req.auth.userId,
                ...summary,
                amount: summary.totalAmount,
                address,
                ...buildOrderBuyerSnapshot(address),
                orderStatus: "pending",
                status: "pending_payment",
                paymentStatus: "pending",
                paymentMethod: "paystack",
                source: "online",
                payment: false,
                paymentReference: reference
            }).save();

            const initialized = await paymentClient.transaction.initialize({
                email: customer.email,
                amount: summary.totalAmount * 100,
                currency: "NGN",
                reference,
                metadata: { orderId: order._id.toString(), userId: req.auth.userId }
            });
            const data = initialized?.data;
            if (!data?.authorization_url || data.reference !== reference) {
                throw new Error("Payment provider returned an invalid initialization response");
            }
            return res.status(201).json({ success: true, authorization_url: data.authorization_url, reference, email: customer.email, ...orderResponse(order) });
        } catch (error) {
            if (order) {
                await OrderModel.findOneAndUpdate(
                    { _id: order._id, paymentStatus: "pending" },
                    { paymentStatus: "failed", orderStatus: "failed", status: "failed" }
                ).catch(() => {});
            }
            const status = error.message?.includes("Order must") || error.message?.includes("Each item") || error.message?.includes("Product") || error.message?.includes("Delivery") ? 400 : 502;
            return res.status(status).json({ success: false, message: status === 400 ? error.message : "Payment initialization failed" });
        }
    };

    const verifyPayment = async (req, res) => {
        try {
            const { reference, orderId } = req.body;
            if (!reference || !orderId) return res.status(400).json({ success: false, message: "Order and payment reference are required" });
            const order = await OrderModel.findOne({ _id: orderId, userId: req.auth.userId });
            if (!order) return res.status(404).json({ success: false, message: "Order not found" });
            if (order.paymentMethod !== "paystack" || order.paymentReference !== reference) {
                return res.status(400).json({ success: false, message: "Payment reference does not match this order" });
            }
            if (order.paymentStatus === "successful") {
                return res.json({ success: true, message: "Payment already verified", idempotent: true, data: orderResponse(order) });
            }
            if (order.paymentStatus !== "pending") {
                return res.status(409).json({ success: false, message: "This order is not awaiting payment" });
            }
            const reusedReference = await OrderModel.findOne({ paymentReference: reference, _id: { $ne: order._id } });
            if (reusedReference) return res.status(409).json({ success: false, message: "Payment reference is already associated with another order" });

            const verification = await paymentClient.transaction.verify({ reference });
            const data = verification?.data;
            if (!data || data.reference !== reference) {
                return res.status(400).json({ success: false, message: "Payment provider reference did not match" });
            }
            if (data.status === "failed") {
                await OrderModel.findOneAndUpdate(
                    { _id: order._id, userId: req.auth.userId, paymentStatus: "pending" },
                    { paymentStatus: "failed", orderStatus: "failed", status: "failed", payment: false }
                );
                return res.status(402).json({ success: false, message: "Payment was not successful" });
            }
            if (data.status !== "success") return res.status(409).json({ success: false, message: "Payment is not complete yet" });
            if (String(data.currency || "").toUpperCase() !== "NGN" || Number(data.amount) !== order.amount * 100) {
                return res.status(400).json({ success: false, message: "Verified payment amount or currency does not match the order" });
            }

            const updated = await OrderModel.findOneAndUpdate(
                { _id: order._id, userId: req.auth.userId, paymentStatus: "pending", paymentReference: reference },
                { paymentStatus: "successful", payment: true, orderStatus: "confirmed", status: "confirmed", paidAt: new Date() },
                { new: true }
            );
            if (updated) {
                await UserModel.findByIdAndUpdate(req.auth.userId, { cartData: {} }).catch(() => {});
                return res.json({ success: true, message: "Payment verified", data: orderResponse(updated) });
            }

            const current = await OrderModel.findOne({ _id: order._id, userId: req.auth.userId });
            if (current?.paymentStatus === "successful" && current.paymentReference === reference) {
                return res.json({ success: true, message: "Payment already verified", idempotent: true, data: orderResponse(current) });
            }
            return res.status(409).json({ success: false, message: "Order payment state changed; reload order status" });
        } catch (error) {
            return res.status(400).json({ success: false, message: "Unable to verify payment" });
        }
    };

    return { initializePayment, verifyPayment };
};

const handlers = createPaymentHandlers();
export const { initializePayment, verifyPayment } = handlers;
export { createPaymentHandlers };
