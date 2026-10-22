import test from "node:test";
import assert from "node:assert/strict";
import { parseVisibilityFlag } from "../services/catalogue.js";
import { updateFish } from "../controllers/fishController.js";
import fishModel from "../models/fishModel.js";

const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

const stubProduct = (overrides = {}) => ({
    _id: "fish-1",
    name: "Smoked Catfish (1kg)",
    description: "Fish",
    price: 25000,
    category: "Smoked",
    visible: true,
    pricingMode: "single",
    pricingTiers: [],
    save: async function () { return this; },
    ...overrides
});

const withStubbedProduct = async (product, run) => {
    const originalFindById = fishModel.findById;
    fishModel.findById = async () => product;
    try {
        return await run();
    } finally {
        fishModel.findById = originalFindById;
    }
};

test("the visibility flag accepts the shapes an admin form can send", () => {
    assert.equal(parseVisibilityFlag(true), true);
    assert.equal(parseVisibilityFlag(false), false);
    assert.equal(parseVisibilityFlag("true"), true);
    assert.equal(parseVisibilityFlag("false"), false);
    assert.equal(parseVisibilityFlag("FALSE"), false);
    assert.equal(parseVisibilityFlag(undefined), null);
    assert.equal(parseVisibilityFlag(null), null);
    assert.equal(parseVisibilityFlag(""), null);
    assert.equal(parseVisibilityFlag("maybe"), null);
});

test("an admin can hide a product from the storefront", async () => {
    const product = stubProduct();
    await withStubbedProduct(product, async () => {
        const res = response();
        await updateFish({ params: { id: "fish-1" }, body: { visible: false } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.equal(product.visible, false);
    });
});

test("an admin can bring a hidden product back into the storefront", async () => {
    const product = stubProduct({ visible: false });
    await withStubbedProduct(product, async () => {
        const res = response();
        await updateFish({ params: { id: "fish-1" }, body: { visible: true } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(product.visible, true);
    });
});

test("a product update without a visibility value leaves the listing state untouched", async () => {
    const product = stubProduct({ visible: false });
    await withStubbedProduct(product, async () => {
        const res = response();
        await updateFish({ params: { id: "fish-1" }, body: { price: 26000 } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(product.visible, false);
    });
});

test("an unrecognised visibility value is rejected instead of guessing", async () => {
    const product = stubProduct();
    await withStubbedProduct(product, async () => {
        const res = response();
        await updateFish({ params: { id: "fish-1" }, body: { visible: "maybe" } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(product.visible, true);
    });
});

test("updating a product that does not exist reports a missing product", async () => {
    const originalFindById = fishModel.findById;
    fishModel.findById = async () => null;
    try {
        const res = response();
        await updateFish({ params: { id: "missing" }, body: { visible: false } }, res);
        assert.equal(res.statusCode, 404);
    } finally {
        fishModel.findById = originalFindById;
    }
});
