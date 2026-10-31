import test from "node:test";
import assert from "node:assert/strict";
import { createOrderHandlers } from "../controllers/orderController.js";
import { createPaymentHandlers } from "../controllers/paymentController.js";

const customerId = "customer-A";
const otherCustomerId = "customer-B";
const adminId = "admin-A";
const address = { firstName: "A", street: "Road", phone: "0800" };
const quote = {
  items: [{ productId: "product-A", name: "Fresh Catfish", quantity: 2, unit: "kg", unitPrice: 1000, lineTotal: 2000 }],
  subtotal: 2000, deliveryFee: 2500, totalAmount: 4500, currency: "NGN"
};
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

class FakeOrder {
  static records = [];
  constructor(fields) { Object.assign(this, fields); this._id = "order-" + (FakeOrder.records.length + 1); }
  async save() { FakeOrder.records.push(this); return this; }
  static async findById(id) { return FakeOrder.records.find((record) => record._id === id) || null; }
  static async findOne(filter) {
    return FakeOrder.records.find((record) => {
      if (filter._id && typeof filter._id === "object" && filter._id.$ne) return record.paymentReference === filter.paymentReference && record._id !== filter._id.$ne;
      return (!filter._id || record._id === filter._id) && (!filter.userId || record.userId === filter.userId) && (!filter.paymentReference || record.paymentReference === filter.paymentReference);
    }) || null;
  }
  static async findOneAndUpdate(filter, update) {
    const record = await FakeOrder.findOne(filter);
    if (!record) return null;
    if (filter.paymentStatus && record.paymentStatus !== filter.paymentStatus) return null;
    if (filter.paymentReference && record.paymentReference !== filter.paymentReference) return null;
    Object.assign(record, update);
    return record;
  }
  static reset() { FakeOrder.records = []; }
}
const fakeUserModel = { findById: async (id) => id === customerId ? { email: "customer@example.com" } : null, findByIdAndUpdate: async () => null };
const snapshotOrder = async (items) => {
  if (!Array.isArray(items) || !items.length) throw new Error("Order must contain between 1 and 50 items");
  return structuredClone(quote);
};
const initRequest = (body = {}) => ({ auth: { userId: customerId, role: "customer" }, body: { items: [{ productId: "product-A", quantity: 2 }], address, userId: adminId, payment: true, amount: 1, ...body } });

 test("manual order uses authenticated identity, server snapshot, and unpaid confirmation state", async () => {
  FakeOrder.reset();
  const handlers = createOrderHandlers({ OrderModel: FakeOrder, UserModel: fakeUserModel, snapshotOrder });
  const res = response();
  await handlers.placeOrder(initRequest(), res);
  assert.equal(res.statusCode, 201);
  const saved = FakeOrder.records[0];
  assert.equal(saved.userId, customerId);
  assert.equal(saved.amount, 4500);
  assert.equal(saved.payment, false);
  assert.equal(saved.paymentReference, null);
  assert.equal(saved.paymentStatus, "unpaid");
  assert.equal(saved.orderStatus, "pending confirmation");
  assert.equal(saved.paymentMethod, "whatsapp_manual");
  assert.equal(saved.items[0].unitPrice, 1000);
});

test("customers can read only their own order history", async () => {
  FakeOrder.reset();
  FakeOrder.records.push({ userId: customerId, _id: "mine" }, { userId: otherCustomerId, _id: "other" });
  FakeOrder.find = ({ userId }) => ({ sort: async () => FakeOrder.records.filter((order) => order.userId === userId) });
  const handlers = createOrderHandlers({ OrderModel: FakeOrder, UserModel: fakeUserModel, snapshotOrder });
  const res = response();
  await handlers.userOrders({ auth: { userId: customerId }, body: { userId: otherCustomerId } }, res);
  assert.deepEqual(res.body.data.map((order) => order._id), ["mine"]);
});

test("admin order status handler ignores client payment fields and rejects unknown statuses", async () => {
  FakeOrder.reset();
  FakeOrder.records.push({ _id: "order-1", paymentStatus: "unpaid", payment: false, status: "pending confirmation" });
  FakeOrder.findByIdAndUpdate = async (id, update) => { const record = FakeOrder.records.find((entry) => entry._id === id); Object.assign(record, update); return record; };
  const handlers = createOrderHandlers({ OrderModel: FakeOrder, UserModel: fakeUserModel, snapshotOrder });
  const res = response();
  await handlers.updateStatus({ body: { orderId: "order-1", status: "processing", payment: true, paymentStatus: "successful" } }, res);
  assert.equal(res.body.data.orderStatus, "processing");
  assert.equal(res.body.data.paymentStatus, "unpaid");
  const invalid = response();
  await handlers.updateStatus({ body: { orderId: "order-1", status: "paid" } }, invalid);
  assert.equal(invalid.statusCode, 400);
});

test("an unpaid online order cannot be advanced by admin", async () => {
  FakeOrder.reset();
  FakeOrder.records.push({ _id: "pending-online", paymentMethod: "paystack", paymentStatus: "pending", orderStatus: "pending" });
  FakeOrder.findByIdAndUpdate = async () => { throw new Error("must not update unpaid online order"); };
  const handlers = createOrderHandlers({ OrderModel: FakeOrder, UserModel: fakeUserModel, snapshotOrder });
  const res = response();
  await handlers.updateStatus({ body: { orderId: "pending-online", status: "out_for_delivery" } }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(FakeOrder.records[0].orderStatus, "pending");
});
test("payment initialization creates an owner-bound order and uses its server amount", async () => {
  FakeOrder.reset();
  let initialized;
  const paymentClient = { transaction: { initialize: async (input) => { initialized = input; return { data: { authorization_url: "https://pay.example/auth", reference: input.reference } }; } } };
  const handlers = createPaymentHandlers({ paymentClient, OrderModel: FakeOrder, UserModel: fakeUserModel, snapshotOrder });
  const res = response();
  await handlers.initializePayment(initRequest(), res);
  assert.equal(res.statusCode, 201);
  assert.equal(FakeOrder.records[0].userId, customerId);
  assert.equal(FakeOrder.records[0].amount, 4500);
  assert.equal(FakeOrder.records[0].paymentStatus, "pending");
  assert.equal(FakeOrder.records[0].payment, false);
  assert.equal(initialized.amount, 450000);
  assert.equal(initialized.email, "customer@example.com");
  assert.equal(res.body.orderId, FakeOrder.records[0]._id);
});

test("valid payment verification confirms the matching pending order", async () => {
  FakeOrder.reset();
  FakeOrder.records.push({ _id: "order-1", userId: customerId, amount: 4500, currency: "NGN", paymentMethod: "paystack", paymentReference: "ref-1", paymentStatus: "pending", payment: false, orderStatus: "pending" });
  const paymentClient = { transaction: { verify: async () => ({ data: { reference: "ref-1", status: "success", amount: 450000, currency: "NGN" } }) } };
  const handlers = createPaymentHandlers({ paymentClient, OrderModel: FakeOrder, UserModel: fakeUserModel, snapshotOrder });
  const res = response();
  await handlers.verifyPayment({ auth: { userId: customerId }, body: { orderId: "order-1", reference: "ref-1" } }, res);
  assert.equal(res.body.success, true);
  assert.equal(FakeOrder.records[0].paymentStatus, "successful");
  assert.equal(FakeOrder.records[0].payment, true);
  assert.equal(FakeOrder.records[0].orderStatus, "confirmed");
});

test("invalid order and payment references are rejected before provider verification", async () => {
  FakeOrder.reset();
  FakeOrder.records.push({ _id: "order-1", userId: customerId, paymentMethod: "paystack", paymentReference: "ref-1", paymentStatus: "pending" });
  let verifyCalls = 0;
  const paymentClient = { transaction: { verify: async () => { verifyCalls += 1; return { data: {} }; } } };
  const handlers = createPaymentHandlers({ paymentClient, OrderModel: FakeOrder, UserModel: fakeUserModel, snapshotOrder });
  const wrongOrder = response();
  await handlers.verifyPayment({ auth: { userId: otherCustomerId }, body: { orderId: "order-1", reference: "ref-1" } }, wrongOrder);
  assert.equal(wrongOrder.statusCode, 404);
  const wrongRef = response();
  await handlers.verifyPayment({ auth: { userId: customerId }, body: { orderId: "order-1", reference: "wrong" } }, wrongRef);
  assert.equal(wrongRef.statusCode, 400);
  assert.equal(verifyCalls, 0);
});

test("payment amount mismatch does not mark the order paid", async () => {
  FakeOrder.reset();
  FakeOrder.records.push({ _id: "order-1", userId: customerId, amount: 4500, currency: "NGN", paymentMethod: "paystack", paymentReference: "ref-1", paymentStatus: "pending", payment: false });
  const paymentClient = { transaction: { verify: async () => ({ data: { reference: "ref-1", status: "success", amount: 449900, currency: "NGN" } }) } };
  const handlers = createPaymentHandlers({ paymentClient, OrderModel: FakeOrder, UserModel: fakeUserModel, snapshotOrder });
  const res = response();
  await handlers.verifyPayment({ auth: { userId: customerId }, body: { orderId: "order-1", reference: "ref-1" } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(FakeOrder.records[0].paymentStatus, "pending");
  assert.equal(FakeOrder.records[0].payment, false);
});

test("duplicate successful verification is idempotent", async () => {
  FakeOrder.reset();
  FakeOrder.records.push({ _id: "order-1", userId: customerId, amount: 4500, currency: "NGN", paymentMethod: "paystack", paymentReference: "ref-1", paymentStatus: "pending", payment: false });
  let verifyCalls = 0;
  const paymentClient = { transaction: { verify: async () => { verifyCalls += 1; return { data: { reference: "ref-1", status: "success", amount: 450000, currency: "NGN" } }; } } };
  const handlers = createPaymentHandlers({ paymentClient, OrderModel: FakeOrder, UserModel: fakeUserModel, snapshotOrder });
  const req = { auth: { userId: customerId }, body: { orderId: "order-1", reference: "ref-1" } };
  const first = response(); await handlers.verifyPayment(req, first);
  const second = response(); await handlers.verifyPayment(req, second);
  assert.equal(first.body.success, true);
  assert.equal(second.body.success, true);
  assert.equal(second.body.idempotent, true);
  assert.equal(verifyCalls, 1);
});

test("failed Paystack verification is recorded as failed, not paid", async () => {
  FakeOrder.reset();
  FakeOrder.records.push({ _id: "order-1", userId: customerId, paymentMethod: "paystack", paymentReference: "ref-1", paymentStatus: "pending", payment: false });
  const paymentClient = { transaction: { verify: async () => ({ data: { reference: "ref-1", status: "failed", amount: 0, currency: "NGN" } }) } };
  const handlers = createPaymentHandlers({ paymentClient, OrderModel: FakeOrder, UserModel: fakeUserModel, snapshotOrder });
  const res = response();
  await handlers.verifyPayment({ auth: { userId: customerId }, body: { orderId: "order-1", reference: "ref-1" } }, res);
  assert.equal(res.statusCode, 402);
  assert.equal(FakeOrder.records[0].paymentStatus, "failed");
  assert.equal(FakeOrder.records[0].payment, false);
});
