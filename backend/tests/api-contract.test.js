import test from "node:test";
import assert from "node:assert/strict";
import { createListFish } from "../controllers/fishController.js";
import { addToCart, getCart, setCartQuantity } from "../controllers/cartController.js";
import { approveReview } from "../controllers/reviewController.js";
import { buildOrderSnapshot } from "../controllers/orderPricing.js";
import { fileFilter } from "../middleware/multer.js";
import { parsePagination, buildPaginationMeta } from "../services/pagination.js";
import fishModel from "../models/fishModel.js";
import userModel from "../models/userModel.js";
import reviewModel from "../models/reviewModel.js";

const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const authedRequest = (body = {}) => ({ auth: { userId: "customer-A", role: "customer" }, body });

const withStubbedUser = async (stub, run) => {
    const originalFindById = userModel.findById;
    const originalUpdate = userModel.findByIdAndUpdate;
    userModel.findById = stub;
    userModel.findByIdAndUpdate = async () => null;
    try {
        return await run();
    } finally {
        userModel.findById = originalFindById;
        userModel.findByIdAndUpdate = originalUpdate;
    }
};

test("a cart operation for a missing account reports the account, not a silent failure", async () => {
    await withStubbedUser(async () => null, async () => {
        const res = response();
        await addToCart(authedRequest({ itemId: "fish-1" }), res);
        assert.equal(res.statusCode, 404);
        assert.equal(res.body.success, false);
    });
});

test("a cart operation without a product id is rejected as invalid input", async () => {
    await withStubbedUser(async () => ({ cartData: {} }), async () => {
        const res = response();
        await addToCart(authedRequest({}), res);
        assert.equal(res.statusCode, 400);
        const cart = response();
        await getCart(authedRequest(), cart);
        assert.equal(cart.statusCode, 200);
    });
});

test("an invalid cart quantity is rejected with a bad request", async () => {
    await withStubbedUser(async () => ({ cartData: {} }), async () => {
        const res = response();
        await setCartQuantity(authedRequest({ itemId: "fish-1", quantity: -2 }), res);
        assert.equal(res.statusCode, 400);
    });
});

test("a catalogue failure is reported as a server error instead of a successful empty list", async () => {
    const FailingModel = { find: async () => { throw new Error("database unavailable"); } };
    const res = response();
    await createListFish({ Model: FailingModel })({}, res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
});

test("moderating a review that no longer exists reports a missing review", async () => {
    const original = reviewModel.findByIdAndUpdate;
    reviewModel.findByIdAndUpdate = async () => null;
    try {
        const res = response();
        await approveReview({ body: { id: "review-1" } }, res);
        assert.equal(res.statusCode, 404);
    } finally {
        reviewModel.findByIdAndUpdate = original;
    }
});

test("the catalogue listing supports paging without changing the default result", async () => {
    let usedOptions = null;
    const FakeModel = { find: async (query, projection, options) => { usedOptions = options; return [{ _id: "fish-1" }]; } };
    const res = response();
    await createListFish({ Model: FakeModel })({ query: { page: "2", limit: "10" } }, res);
    assert.deepEqual(usedOptions, { skip: 10, limit: 10, sort: { _id: 1 } });
    assert.equal(res.body.pagination.page, 2);
    assert.equal(res.body.pagination.limit, 10);
    assert.equal(res.body.data.length, 1);
});

test("the catalogue listing returns every product when no page size is requested", async () => {
    let usedOptions = "not-called";
    const FakeModel = { find: async (query, projection, options) => { usedOptions = options; return [{ _id: "fish-1" }]; } };
    const res = response();
    await createListFish({ Model: FakeModel })({ query: {} }, res);
    assert.equal(usedOptions, undefined);
    assert.equal(res.body.pagination.limit, 0);
    assert.equal(res.body.pagination.total, 1);
});

test("the admin product listing is bounded and reports paging metadata", async () => {
    const originalFind = fishModel.find;
    const originalCount = fishModel.countDocuments;
    let usedOptions = null;
    fishModel.find = async (query, projection, options) => { usedOptions = options; return [{ _id: "fish-1" }]; };
    fishModel.countDocuments = async () => 73;
    try {
        const { listAllFish } = await import("../controllers/fishController.js");
        const res = response();
        await listAllFish({ query: {} }, res);
        assert.equal(usedOptions.limit, 50);
        assert.equal(usedOptions.skip, 0);
        assert.equal(res.body.pagination.total, 73);
        assert.equal(res.body.pagination.totalPages, 2);
        assert.equal(res.body.pagination.hasNext, true);
    } finally {
        fishModel.find = originalFind;
        fishModel.countDocuments = originalCount;
    }
});

test("pagination inputs are clamped to a safe range", () => {
    assert.deepEqual(parsePagination({ page: "0", limit: "0" }), { page: 1, limit: 50, skip: 0 });
    assert.deepEqual(parsePagination({ page: "3", limit: "5000" }), { page: 3, limit: 200, skip: 400 });
    assert.deepEqual(parsePagination({}, { defaultLimit: 0 }), { page: 1, limit: 0, skip: 0 });
    assert.deepEqual(buildPaginationMeta({ page: 2, limit: 20, total: 45 }), {
        page: 2, limit: 20, total: 45, totalPages: 3, hasPrevious: true, hasNext: true
    });
});

test("the upload filter accepts images and videos and rejects everything else", async () => {
    const runFilter = (mimetype) => new Promise((resolve) => {
        fileFilter({}, { mimetype }, (error, accepted) => resolve({ error, accepted }));
    });
    const image = await runFilter("image/png");
    assert.equal(image.error, null);
    assert.equal(image.accepted, true);
    const video = await runFilter("video/mp4");
    assert.equal(video.accepted, true);
    const document = await runFilter("application/pdf");
    assert.equal(document.accepted, false);
    assert.match(document.error.message, /Unsupported file format/);
});

test("an order snapshot reads every product in a single query", async () => {
    let findCalls = 0;
    const products = [
        { _id: "fish-1", name: "Smoked Catfish", price: 25000, pricingMode: "single", pricingTiers: [] },
        { _id: "fish-2", name: "Fresh Tilapia", price: 1700, pricingMode: "single", pricingTiers: [] }
    ];
    const snapshot = await buildOrderSnapshot(
        [{ productId: "fish-1", quantity: 2 }, { productId: "fish-2", quantity: 1 }, { productId: "fish-1", quantity: 1 }],
        { find: async () => { findCalls += 1; return products; } }
    );
    assert.equal(findCalls, 1);
    assert.equal(snapshot.items.length, 3);
    assert.equal(snapshot.subtotal, 76700);
    assert.equal(snapshot.totalAmount, 79200);
});

test("a product that is no longer listed cannot be quoted or ordered", async () => {
    const hidden = { _id: "fish-3", name: "Hidden product", price: 1000, pricingMode: "single", pricingTiers: [], visible: false };
    await assert.rejects(
        () => buildOrderSnapshot([{ productId: "fish-3", quantity: 1 }], { find: async () => [hidden] }),
        /no longer available/
    );
});

test("a product that cannot be found cannot be quoted or ordered", async () => {
    await assert.rejects(
        () => buildOrderSnapshot([{ productId: "fish-4", quantity: 1 }], { find: async () => [] }),
        /no longer available/
    );
});
