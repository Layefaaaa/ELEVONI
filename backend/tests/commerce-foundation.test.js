import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { CATALOGUE_QUERY, isCatalogueVisible } from "../services/catalogue.js";
import { createListFish, listFish } from "../controllers/fishController.js";
import { buildOrderSnapshot } from "../controllers/orderPricing.js";
import { createOrderHandlers } from "../controllers/orderController.js";
import fishModel from "../models/fishModel.js";

const tiers = [
    { minQuantity: 1, maxQuantity: 4, unitPrice: 25000 },
    { minQuantity: 5, maxQuantity: 9, unitPrice: 24000 },
    { minQuantity: 10, maxQuantity: 19, unitPrice: 22500 },
    { minQuantity: 20, maxQuantity: null, unitPrice: 21000 }
];

const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

const serverSummary = {
    items: [{ productId: "product-A", quantity: 2, unit: "kg", unitPrice: 1000, lineTotal: 2000 }],
    subtotal: 2000, deliveryFee: 2500, totalAmount: 4500, currency: "NGN"
};

test("the server quote stays authoritative for the delivery fee and total", async () => {
    const product = { _id: "fish-1", name: "Smoked Catfish", price: 25000, pricingMode: "tiered", pricingTiers: tiers };
    const snapshot = await buildOrderSnapshot([{ productId: product._id, quantity: 5 }], { find: async () => [product] });
    assert.equal(snapshot.subtotal, 120000);
    assert.equal(snapshot.deliveryFee, 2500);
    assert.equal(snapshot.totalAmount, snapshot.subtotal + snapshot.deliveryFee);
    assert.equal(snapshot.totalAmount, 122500);
});

test("cart quote endpoint returns the server summary and ignores client-provided money fields", async () => {
    const handlers = createOrderHandlers({ OrderModel: { findById: async () => null }, UserModel: {}, snapshotOrder: async () => serverSummary });
    const res = response();
    const req = {
        body: {
            items: [{ productId: "product-A", quantity: 2 }],
            deliveryFee: 0,
            totalAmount: 1,
            subtotal: 999
        }
    };
    await handlers.quoteOrder(req, res);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.deliveryFee, 2500);
    assert.equal(res.body.data.totalAmount, 4500);
    assert.equal(res.body.data.subtotal, 2000);
});

test("storefront listing uses the shared catalogue query", async () => {
    const fish = [{ _id: "fish-1", name: "Smoked Catfish (1kg)", price: 25000 }];
    let usedQuery = null;
    const FakeModel = { find: async (query) => { usedQuery = query; return fish; } };
    const res = response();
    await createListFish({ Model: FakeModel })({}, res);
    assert.deepEqual(usedQuery, CATALOGUE_QUERY);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 1);
});

test("catalogue filtering is name-independent and driven by the visible flag", () => {
    assert.equal(isCatalogueVisible({ _id: "current", name: "Smoked Catfish (1kg)" }), true);
    assert.equal(isCatalogueVisible({ _id: "current", name: "Smoked Catfish (1kg)", visible: true }), true);
    assert.equal(isCatalogueVisible({ _id: "hidden", name: "Smoked Catfish (1kg)", visible: false }), false);
    assert.equal(isCatalogueVisible(null), false);
    assert.deepEqual(CATALOGUE_QUERY, { visible: { $ne: false } });
    assert.equal(Object.hasOwn(CATALOGUE_QUERY, "name"), false);
});

test("the current product remains visible in the storefront catalogue", async () => {
    const currentProduct = { _id: "6a3e80dcf694a22f26c15f65", name: "Smoked Catfish (1kg)", price: 25000 };
    const hiddenProduct = { _id: "hidden-1", name: "Smoked Catfish (1kg)", price: 25000, visible: false };
    let usedQuery = null;
    const FakeModel = { find: async (query) => { usedQuery = query; return [currentProduct, hiddenProduct].filter((item) => isCatalogueVisible(item)); } };
    const res = response();
    await createListFish({ Model: FakeModel })({}, res);
    assert.deepEqual(usedQuery, CATALOGUE_QUERY);
    assert.deepEqual(res.body.data.map((item) => item._id), ["6a3e80dcf694a22f26c15f65"]);
});

test("production-style listFish invocation ignores Express's trailing next argument", async () => {
    const currentProduct = { _id: "6a3e80dcf694a22f26c15f65", name: "Smoked Catfish (1kg)", price: 25000 };
    const FakeModel = { find: async () => [currentProduct] };
    const res = response();
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    await createListFish({ Model: FakeModel })({}, res, next);
    assert.equal(nextCalled, false);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 1);
});

test("production-style Express route invocation of listFish ignores Express's next argument", async () => {
    const originalFind = fishModel.find;
    const visibleProduct = { _id: "6a3e80dcf694a22f26c15f65", name: "Smoked Catfish (1kg)", price: 25000 };
    let usedQuery = null;
    fishModel.find = async (query) => { usedQuery = query; return [visibleProduct]; };
    try {
        const app = express();
        app.get("/api/fish/list", listFish);
        const server = app.listen(0);
        await new Promise((resolve) => server.once("listening", resolve));
        try {
            const address = server.address();
            const port = typeof address === "object" && address ? address.port : 0;
            const res = await fetch(`http://127.0.0.1:${port}/api/fish/list`);
            const body = await res.json();
            assert.equal(res.status, 200);
            assert.equal(body.success, true);
            assert.deepEqual(body.data.map((item) => item._id), ["6a3e80dcf694a22f26c15f65"]);
            assert.deepEqual(usedQuery, CATALOGUE_QUERY);
        } finally {
            await new Promise((resolve) => server.close(resolve));
        }
    } finally {
        fishModel.find = originalFind;
    }
});

test("new products default to visible in the product model", async () => {
    const product = new fishModel({
        name: "Smoked Catfish (1kg)",
        description: "Fish",
        price: 25000,
        image: "image.jpg",
        category: "Smoked",
        pricingMode: "single",
        pricingTiers: []
    });
    assert.equal(product.visible, true);
    await product.validate();
});