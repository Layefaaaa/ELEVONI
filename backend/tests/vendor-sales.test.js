import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import vendorSaleModel from "../models/vendorSaleModel.js";
import requireApprovedVendorProfile from "../middleware/vendor.js";
import {
    createVendorSale,
    listVendorSales
} from "../controllers/vendorSalesController.js";
import { prepareVendorSale } from "../services/vendorSales.js";

const response = () => ({
    statusCode: 200,
    body: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    }
});

const failOnNext = (error) => {
    if (error) throw error;
};

const request = ({
    body = {},
    query = {},
    vendorId = "vendor-1",
    role = "customer",
    userId = "user-1"
} = {}) => ({
    body,
    query,
    auth: { userId, role },
    ...(vendorId
        ? {
              vendor: {
                  profileId: vendorId,
                  userId,
                  status: "approved"
              }
          }
        : {})
});

const baseBody = (overrides = {}) => ({
    submissionReference: "sale-ref-0001",
    productName: "Local Maize",
    unit: "kg",
    quantity: 2,
    unitPrice: 1000,
    salesChannel: "phone",
    paymentStatus: "paid",
    amountReceived: 2000,
    saleDate: "2026-01-15",
    ...overrides
});

const stubModels = ({ product = null, sales = [], create } = {}) => {
    const original = {
        productFindOne: Product.findOne,
        saleCreate: vendorSaleModel.create,
        saleFind: vendorSaleModel.find,
        saleCount: vendorSaleModel.countDocuments
    };
    const calls = {
        productFindOne: [],
        create: [],
        find: [],
        count: [],
        skip: [],
        limit: []
    };

    Product.findOne = async (query) => {
        calls.productFindOne.push(query);
        return typeof product === "function" ? product(query) : product;
    };

    vendorSaleModel.create = async (document) => {
        calls.create.push(document);

        if (typeof create === "function") {
            return create(document);
        }

        return { ...document, _id: "sale-1" };
    };

    vendorSaleModel.find = (filter) => {
        calls.find.push(filter);
        const query = {
            sort() {
                return query;
            },
            skip(value) {
                calls.skip.push(value);
                return query;
            },
            limit(value) {
                calls.limit.push(value);
                return query;
            },
            then(resolve, reject) {
                return Promise.resolve(
                    typeof sales === "function" ? sales(filter) : sales
                ).then(resolve, reject);
            }
        };
        return query;
    };

    vendorSaleModel.countDocuments = async (filter) => {
        calls.count.push(filter);
        const rows = typeof sales === "function" ? await sales(filter) : sales;
        return rows.length;
    };

    return {
        calls,
        restore() {
            Product.findOne = original.productFindOne;
            vendorSaleModel.create = original.saleCreate;
            vendorSaleModel.find = original.saleFind;
            vendorSaleModel.countDocuments = original.saleCount;
        }
    };
};

test("vendor sale model defaults provenance, currency and fulfilment state", async () => {
    const sale = new vendorSaleModel({
        vendorId: new mongoose.Types.ObjectId(),
        submissionReference: "sale-ref-0001",
        productName: "Local Maize",
        unit: "kg",
        quantity: 2,
        unitPrice: 1000,
        totalAmount: 2000,
        saleDate: new Date("2026-01-15"),
        salesChannel: "phone",
        paymentStatus: "paid",
        amountReceived: 2000
    });

    assert.equal(await sale.validate(), undefined);
    assert.equal(sale.currency, "NGN");
    assert.equal(sale.recordSource, "farmer_reported");
    assert.equal(sale.verificationStatus, "unverified");
    assert.equal(sale.fulfilmentStatus, "pending");
    assert.equal(sale.productId, null);
});

test("vendor sale model has a vendor-scoped unique submission reference", () => {
    const uniqueIndex = vendorSaleModel.schema.indexes().find(([fields, options]) =>
        fields.vendorId === 1 &&
        fields.submissionReference === 1 &&
        options.unique === true
    );

    assert.ok(uniqueIndex);
});

test("listed products are ownership-checked and snapshotted", async () => {
    const productId = new mongoose.Types.ObjectId();
    const product = {
        _id: productId,
        name: "Broiler Chicken",
        unitOfMeasure: "kg",
        price: 9999
    };
    const stubs = stubModels({ product });

    try {
        const result = await prepareVendorSale(baseBody({
            productId,
            productName: "Ignored client name",
            unit: "ton",
            unitPrice: 1000
        }), { vendorId: "vendor-1" });

        assert.equal(result.error, undefined);
        assert.equal(String(result.sale.productId), String(productId));
        assert.equal(result.sale.productName, "Broiler Chicken");
        assert.equal(result.sale.unit, "kg");
        assert.equal(result.sale.unitPrice, 1000);
        assert.equal(result.sale.totalAmount, 2000);
        assert.equal(stubs.calls.productFindOne[0].vendorId, "vendor-1");

        product.name = "Changed after sale";
        product.unitOfMeasure = "ton";

        assert.equal(result.sale.productName, "Broiler Chicken");
        assert.equal(result.sale.unit, "kg");
    } finally {
        stubs.restore();
    }
});

test("listed products owned by another vendor are rejected", async () => {
    const stubs = stubModels({ product: null });

    try {
        const result = await prepareVendorSale(baseBody({
            productId: new mongoose.Types.ObjectId()
        }), { vendorId: "vendor-1" });

        assert.equal(result.status, 400);
        assert.match(result.error, /not found for this vendor/i);
        assert.equal(stubs.calls.productFindOne[0].vendorId, "vendor-1");
    } finally {
        stubs.restore();
    }
});

test("unlisted products require name and unit and store no catalogue reference", async () => {
    const stubs = stubModels();

    try {
        const result = await prepareVendorSale(baseBody({
            productId: null,
            productName: "  Local Maize  ",
            unit: "bag",
            buyerName: "Ada",
            buyerContact: "+2348000000000",
            notes: "Paid at the farm gate"
        }), { vendorId: "vendor-1" });

        assert.equal(result.error, undefined);
        assert.equal(result.sale.productId, null);
        assert.equal(result.sale.productName, "Local Maize");
        assert.equal(result.sale.unit, "bag");
        assert.equal(result.sale.buyerName, "Ada");
        assert.equal(result.sale.buyerContact, "+2348000000000");
        assert.equal(result.sale.notes, "Paid at the farm gate");
        assert.equal(stubs.calls.productFindOne.length, 0);
        assert.equal(result.sale.saleDate.toISOString().startsWith("2026-01-15"), true);
    } finally {
        stubs.restore();
    }
});

test("buyer state and area are trimmed, persisted and returned", async () => {
    const stubs = stubModels();

    try {
        const req = request({
            body: baseBody({
                buyerState: "  FCT  ",
                buyerArea: "  Gwarinpa  ",
                vendorId: "other-vendor"
            })
        });
        const res = response();

        await createVendorSale(req, res, failOnNext);

        assert.equal(res.statusCode, 201);
        const created = stubs.calls.create[0];
        assert.equal(created.buyerState, "FCT");
        assert.equal(created.buyerArea, "Gwarinpa");
        assert.equal(String(created.vendorId), "vendor-1");
        assert.equal(res.body.data.buyerState, "FCT");
        assert.equal(res.body.data.buyerArea, "Gwarinpa");
        assert.equal(String(res.body.data.vendorId), "vendor-1");
    } finally {
        stubs.restore();
    }
});

test("buyer location is optional and older records remain valid", async () => {
    const stubs = stubModels();

    try {
        const res = response();

        await createVendorSale(
            request({ body: baseBody() }),
            res,
            failOnNext
        );

        assert.equal(res.statusCode, 201);
        assert.equal(stubs.calls.create[0].buyerState, "");
        assert.equal(stubs.calls.create[0].buyerArea, "");
        assert.equal(res.body.data.buyerState, "");
        assert.equal(res.body.data.buyerArea, "");

        const oldSale = new vendorSaleModel({
            vendorId: new mongoose.Types.ObjectId(),
            submissionReference: "old-sale-ref-0001",
            productName: "Old sale",
            unit: "kg",
            quantity: 1,
            unitPrice: 100,
            totalAmount: 100,
            saleDate: new Date("2025-01-01"),
            salesChannel: "phone",
            paymentStatus: "paid",
            amountReceived: 100
        });

        assert.equal(await oldSale.validate(), undefined);
        assert.equal(oldSale.buyerState, "");
        assert.equal(oldSale.buyerArea, "");
    } finally {
        stubs.restore();
    }
});

test("buyer state and area reject invalid types and overlong values", async () => {
    for (const value of [123, {}, [], true]) {
        const result = await prepareVendorSale(
            baseBody({ buyerState: value }),
            { vendorId: "vendor-1" }
        );
        assert.match(result.error, /Buyer state must be text/);
    }

    const invalidArea = await prepareVendorSale(
        baseBody({ buyerArea: 123 }),
        { vendorId: "vendor-1" }
    );
    assert.match(invalidArea.error, /Buyer area or town must be text/);

    const longState = await prepareVendorSale(
        baseBody({ buyerState: "x".repeat(101) }),
        { vendorId: "vendor-1" }
    );
    assert.match(
        longState.error,
        /Buyer state must not exceed 100 characters/
    );

    const longArea = await prepareVendorSale(
        baseBody({ buyerArea: "x".repeat(121) }),
        { vendorId: "vendor-1" }
    );
    assert.match(
        longArea.error,
        /Buyer area or town must not exceed 120 characters/
    );

    const whitespace = await prepareVendorSale(
        baseBody({ buyerState: "   ", buyerArea: "\t" }),
        { vendorId: "vendor-1" }
    );
    assert.equal(whitespace.error, undefined);
    assert.equal(whitespace.sale.buyerState, "");
    assert.equal(whitespace.sale.buyerArea, "");
});

test("buyer location does not weaken vendor isolation", async () => {
    const stubs = stubModels({
        sales: [
            {
                _id: "sale-1",
                vendorId: "vendor-1",
                buyerState: "FCT",
                buyerArea: "Gwarinpa"
            }
        ]
    });

    try {
        const res = response();

        await listVendorSales(
            request({
                vendorId: "vendor-1",
                query: { vendorId: "vendor-2" }
            }),
            res,
            failOnNext
        );

        assert.equal(res.statusCode, 200);
        assert.deepEqual(stubs.calls.find[0], { vendorId: "vendor-1" });
        assert.deepEqual(stubs.calls.count[0], { vendorId: "vendor-1" });
        assert.equal(res.body.data[0].buyerState, "FCT");
        assert.equal(res.body.data[0].buyerArea, "Gwarinpa");
    } finally {
        stubs.restore();
    }
});

test("create ignores client vendor, totals, currency and provenance", async () => {
    const stubs = stubModels();

    try {
        const req = request({
            body: baseBody({
                productId: null,
                vendorId: "other-vendor",
                totalAmount: 1,
                currency: "USD",
                recordSource: "platform",
                verificationStatus: "verified"
            })
        });
        const res = response();

        await createVendorSale(req, res, failOnNext);

        assert.equal(res.statusCode, 201);
        const created = stubs.calls.create[0];
        assert.equal(String(created.vendorId), "vendor-1");
        assert.equal(created.totalAmount, 2000);
        assert.equal(created.currency, "NGN");
        assert.equal(created.recordSource, "farmer_reported");
        assert.equal(created.verificationStatus, "unverified");
    } finally {
        stubs.restore();
    }
});

test("list is scoped to the authenticated vendor and ignores vendorId query input", async () => {
    const stubs = stubModels({
        sales: [{ _id: "sale-1", vendorId: "vendor-1" }]
    });

    try {
        const req = request({
            vendorId: "vendor-1",
            query: { vendorId: "vendor-2", page: "2", limit: "10" }
        });
        const res = response();

        await listVendorSales(req, res, failOnNext);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(stubs.calls.find[0], { vendorId: "vendor-1" });
        assert.deepEqual(stubs.calls.count[0], { vendorId: "vendor-1" });
        assert.equal(stubs.calls.skip[0], 10);
        assert.equal(stubs.calls.limit[0], 10);
        assert.equal(res.body.data.length, 1);
        assert.equal(res.body.pagination.page, 2);
    } finally {
        stubs.restore();
    }
});

test("admin requests without a vendor profile are rejected", async () => {
    const stubs = stubModels();

    try {
        const createRes = response();
        await createVendorSale(
            request({ body: baseBody(), vendorId: null, role: "admin" }),
            createRes,
            failOnNext
        );

        const listRes = response();
        await listVendorSales(
            request({ vendorId: null, role: "admin" }),
            listRes,
            failOnNext
        );

        assert.equal(createRes.statusCode, 403);
        assert.equal(listRes.statusCode, 403);
    } finally {
        stubs.restore();
    }
});

test("the vendor-only middleware rejects an admin without a vendor profile", async () => {
    const guard = requireApprovedVendorProfile({
        ProfileModel: {
            findOne: async () => null
        }
    });
    const res = response();
    let nextCalled = false;

    await guard(
        { auth: { userId: "admin-1", role: "admin" } },
        res,
        () => {
            nextCalled = true;
        }
    );

    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});

test("the vendor-only middleware sets the authenticated vendor profile", async () => {
    const profileId = new mongoose.Types.ObjectId();
    const guard = requireApprovedVendorProfile({
        ProfileModel: {
            findOne: async () => ({
                _id: profileId,
                userId: "user-1",
                status: "approved"
            })
        }
    });
    const req = { auth: { userId: "user-1", role: "customer" } };
    let nextCalled = false;

    await guard(req, response(), () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(String(req.vendor.profileId), String(profileId));
});

test("payment status and amount received must be consistent", async () => {
    const paid = await prepareVendorSale(baseBody({
        paymentStatus: "paid",
        amountReceived: 2000
    }), { vendorId: "vendor-1" });
    assert.equal(paid.error, undefined);

    const paidLess = await prepareVendorSale(baseBody({
        paymentStatus: "paid",
        amountReceived: 1999
    }), { vendorId: "vendor-1" });
    assert.match(paidLess.error, /equal the sale total/i);

    const paidMore = await prepareVendorSale(baseBody({
        paymentStatus: "paid",
        amountReceived: 2001
    }), { vendorId: "vendor-1" });
    assert.match(paidMore.error, /cannot exceed/i);

    const partial = await prepareVendorSale(baseBody({
        paymentStatus: "partial",
        amountReceived: 500
    }), { vendorId: "vendor-1" });
    assert.equal(partial.error, undefined);

    const partialZero = await prepareVendorSale(baseBody({
        paymentStatus: "partial",
        amountReceived: 0
    }), { vendorId: "vendor-1" });
    assert.match(partialZero.error, /greater than zero/i);

    const partialFull = await prepareVendorSale(baseBody({
        paymentStatus: "partial",
        amountReceived: 2000
    }), { vendorId: "vendor-1" });
    assert.match(partialFull.error, /less than the sale total/i);

    const unpaid = await prepareVendorSale(baseBody({
        paymentStatus: "unpaid",
        amountReceived: 0
    }), { vendorId: "vendor-1" });
    assert.equal(unpaid.error, undefined);

    const unpaidWithMoney = await prepareVendorSale(baseBody({
        paymentStatus: "unpaid",
        amountReceived: 1
    }), { vendorId: "vendor-1" });
    assert.match(unpaidWithMoney.error, /amount received to be zero/i);

    const paidWithoutAmount = await prepareVendorSale(baseBody({
        paymentStatus: "paid",
        amountReceived: undefined
    }), { vendorId: "vendor-1" });
    assert.match(paidWithoutAmount.error, /required/i);

    const negative = await prepareVendorSale(baseBody({
        paymentStatus: "partial",
        amountReceived: -1
    }), { vendorId: "vendor-1" });
    assert.match(negative.error, /non-negative/i);
});

test("unit, quantity, price, channel, date, reference and text limits are validated", async () => {
    const invalidUnit = await prepareVendorSale(baseBody({ unit: "bucket" }), {
        vendorId: "vendor-1"
    });
    assert.match(invalidUnit.error, /valid unit/i);

    for (const quantity of [0, -1, "not-a-number"]) {
        const result = await prepareVendorSale(baseBody({ quantity }), {
            vendorId: "vendor-1"
        });
        assert.match(result.error, /Quantity must be a positive finite number/i);
    }

    for (const unitPrice of [0, -1, "not-a-number"]) {
        const result = await prepareVendorSale(baseBody({ unitPrice }), {
            vendorId: "vendor-1"
        });
        assert.match(result.error, /Unit price must be a positive finite number/i);
    }

    const invalidChannel = await prepareVendorSale(baseBody({
        salesChannel: "email"
    }), { vendorId: "vendor-1" });
    assert.match(invalidChannel.error, /valid sales channel/i);

    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const future = await prepareVendorSale(baseBody({
        saleDate: futureDate.toISOString()
    }), { vendorId: "vendor-1" });
    assert.match(future.error, /future/i);

    const invalidDate = await prepareVendorSale(baseBody({
        saleDate: "not-a-date"
    }), { vendorId: "vendor-1" });
    assert.match(invalidDate.error, /valid sale date/i);

    const invalidReference = await prepareVendorSale(baseBody({
        submissionReference: "short"
    }), { vendorId: "vendor-1" });
    assert.match(invalidReference.error, /Submission reference/i);

    const longNotes = await prepareVendorSale(baseBody({
        notes: "x".repeat(1001)
    }), { vendorId: "vendor-1" });
    assert.match(longNotes.error, /Notes/i);

    const longBuyerName = await prepareVendorSale(baseBody({
        buyerName: "x".repeat(121)
    }), { vendorId: "vendor-1" });
    assert.match(longBuyerName.error, /Buyer name/i);

    const invalidFulfilment = await prepareVendorSale(baseBody({
        fulfilmentStatus: "lost"
    }), { vendorId: "vendor-1" });
    assert.match(invalidFulfilment.error, /valid fulfilment status/i);
});

test("duplicate submission references return a conflict", async () => {
    const stubs = stubModels({
        create: async () => {
            const error = new Error("duplicate key");
            error.code = 11000;
            throw error;
        }
    });

    try {
        const res = response();

        await createVendorSale(
            request({ body: baseBody() }),
            res,
            failOnNext
        );

        assert.equal(res.statusCode, 409);
        assert.equal(res.body.success, false);
        assert.equal(res.body.duplicate, true);
        assert.match(res.body.message, /already been submitted/i);
    } finally {
        stubs.restore();
    }
});
