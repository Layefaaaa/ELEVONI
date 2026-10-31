import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import { buildOrderSnapshot } from "./orderPricing.js";
import { buildOrderBuyerSnapshot } from "../services/orderBuyerSnapshot.js";
import { buildPaginationMeta, countMatching, parsePagination } from "../services/pagination.js";

const ORDER_STATUSES = ["pending confirmation", "confirmed", "processing", "out_for_delivery", "delivered", "cancelled"];

const createOrderHandlers = ({ OrderModel = orderModel, UserModel = userModel, snapshotOrder = buildOrderSnapshot } = {}) => {
    const quoteOrder = async (req, res) => {
        try {
            const summary = await snapshotOrder(req.body.items);
            return res.json({ success: true, data: summary });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message || "Invalid order items" });
        }
    };

    const placeOrder = async (req, res) => {
        try {
            if (!req.auth?.userId) return res.status(401).json({ success: false, message: "Authentication required" });
            const { items, address } = req.body;
            if (!address || typeof address !== "object" || Array.isArray(address)) {
                return res.status(400).json({ success: false, message: "Delivery address is required" });
            }
            const summary = await snapshotOrder(items);
            const order = await new OrderModel({
                userId: req.auth.userId,
                ...summary,
                amount: summary.totalAmount,
                address,
                ...buildOrderBuyerSnapshot(address),
                orderStatus: "pending confirmation",
                status: "pending confirmation",
                paymentStatus: "unpaid",
                paymentMethod: "whatsapp_manual",
                source: "whatsapp_manual",
                payment: false,
                paymentReference: null
            }).save();
            await UserModel.findByIdAndUpdate(req.auth.userId, { cartData: {} }).catch(() => {});
            return res.status(201).json({ success: true, message: "Manual order recorded for confirmation", orderId: order._id, data: order });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message || "Unable to create order" });
        }
    };

    const userOrders = async (req, res) => {
        try {
            const orders = await OrderModel.find({ userId: req.auth.userId }).sort({ date: -1 });
            return res.json({ success: true, data: orders });
        } catch (error) {
            return res.status(500).json({ success: false, message: "Error retrieving orders" });
        }
    };

    const listOrders = async (req, res) => {
        try {
            const { page, limit, skip } = parsePagination(req.query);
            const orders = await OrderModel.find({}, { paymentReference: 0 }, { skip, limit, sort: { date: -1 } });
            const returned = Array.isArray(orders) ? orders.length : 0;
            const total = await countMatching(OrderModel, {});
            return res.json({
                success: true,
                data: orders,
                pagination: buildPaginationMeta({ page, limit, total: total ?? returned })
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: "Error retrieving orders" });
        }
    };

    const updateStatus = async (req, res) => {
        try {
            const { orderId, status } = req.body;
            if (!ORDER_STATUSES.includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid order status" });
            }
            const currentOrder = await OrderModel.findById(orderId);
            if (!currentOrder) return res.status(404).json({ success: false, message: "Order not found" });
            if (currentOrder.paymentMethod === "paystack" && currentOrder.paymentStatus !== "successful" && status !== "cancelled") {
                return res.status(409).json({ success: false, message: "An unpaid online order cannot be advanced" });
            }
            const order = await OrderModel.findByIdAndUpdate(
                orderId,
                { orderStatus: status, status },
                { new: true, runValidators: true }
            );
            return res.json({ success: true, message: "Order status updated", data: order });
        } catch (error) {
            return res.status(400).json({ success: false, message: "Unable to update order status" });
        }
    };

    return { quoteOrder, placeOrder, userOrders, listOrders, updateStatus };
};

const handlers = createOrderHandlers();
export const { quoteOrder, placeOrder, userOrders, listOrders, updateStatus } = handlers;
export { createOrderHandlers, ORDER_STATUSES };
