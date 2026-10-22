import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import authMiddleware, { requireRole } from "../middleware/auth.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import { addToCart } from "../controllers/cartController.js";
import { userOrders } from "../controllers/orderController.js";

const secret = "phase-one-test-secret";
process.env.JWT_SECRET = secret;
const customerId = "64b000000000000000000001";
const adminId = "64b000000000000000000002";
const makeRequest = (headers = {}, body = {}) => ({
  headers: Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])),
  body,
  get(name) { return this.headers[name.toLowerCase()]; }
});
const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});
const tokenFor = (id, role, options = {}) => jwt.sign({ id, role }, secret, { algorithm: "HS256", ...options });
const runAuth = (req) => {
  const res = makeResponse(); let continued = false;
  authMiddleware(req, res, () => { continued = true; });
  return { res, continued };
};

test("missing token is rejected", () => {
  const { res, continued } = runAuth(makeRequest());
  assert.equal(res.statusCode, 401); assert.equal(continued, false);
});

test("invalid token is rejected", () => {
  const { res } = runAuth(makeRequest({ token: "not-a-jwt" }));
  assert.equal(res.statusCode, 401);
});

test("expired token is rejected", () => {
  const token = tokenFor(customerId, "customer", { expiresIn: -1 });
  const { res } = runAuth(makeRequest({ authorization: "Bearer " + token }));
  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /expired/);
});

test("a token signed with a different secret is rejected", () => {
  const foreignToken = jwt.sign({ id: customerId, role: "customer" }, "a-different-signing-secret", { algorithm: "HS256" });
  const { res, continued } = runAuth(makeRequest({ token: foreignToken }));
  assert.equal(res.statusCode, 401);
  assert.equal(continued, false);
  assert.match(res.body.message, /Invalid or expired authentication token/);
});

test("customer identity comes from the signed token, not request body", () => {
  const req = makeRequest({ token: tokenFor(customerId, "customer") }, { userId: adminId });
  const { continued } = runAuth(req);
  assert.equal(continued, true);
  assert.equal(req.auth.userId, customerId);
  assert.equal(req.auth.role, "customer");
  assert.equal(req.body.userId, adminId);
});

test("valid admin token passes admin authorization", () => {
  const req = makeRequest({ token: tokenFor(adminId, "admin") });
  runAuth(req);
  let continued = false; const res = makeResponse();
  requireRole("admin")(req, res, () => { continued = true; });
  assert.equal(continued, true);
});

test("customer token is forbidden from admin authorization", () => {
  const req = makeRequest({ token: tokenFor(customerId, "customer") });
  runAuth(req);
  let continued = false; const res = makeResponse();
  requireRole("admin")(req, res, () => { continued = true; });
  assert.equal(res.statusCode, 403); assert.equal(continued, false);
});

test("new user documents default to customer and reject unknown roles", async () => {
  const user = new userModel({ name: "Test", email: "test@example.com", password: "hashed" });
  assert.equal(user.role, "customer");
  user.role = "superuser";
  await assert.rejects(user.validate(), /superuser.*not a valid enum value/);
});


test("cart mutations target the authenticated customer despite a forged body userId", async () => {
  const originalFind = userModel.findById;
  const originalUpdate = userModel.findByIdAndUpdate;
  let findId; let updateId;
  userModel.findById = async (id) => { findId = id; return { cartData: {} }; };
  userModel.findByIdAndUpdate = async (id) => { updateId = id; };
  const res = makeResponse();
  try {
    await addToCart({ auth: { userId: customerId }, body: { userId: adminId, itemId: "product-id" } }, res);
    assert.equal(findId, customerId);
    assert.equal(updateId, customerId);
    assert.equal(res.body.success, true);
  } finally {
    userModel.findById = originalFind;
    userModel.findByIdAndUpdate = originalUpdate;
  }
});

test("order history is queried only for the authenticated customer", async () => {
  const originalFind = orderModel.find;
  let query;
  orderModel.find = (filter) => { query = filter; return { sort: async () => [] }; };
  const res = makeResponse();
  try {
    await userOrders({ auth: { userId: customerId }, body: { userId: adminId } }, res);
    assert.deepEqual(query, { userId: customerId });
    assert.deepEqual(res.body.data, []);
  } finally {
    orderModel.find = originalFind;
  }
});
