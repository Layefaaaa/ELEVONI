import test from "node:test";
import assert from "node:assert/strict";
import { prepareHouseSale } from "../services/houseSales.js";

const base = (overrides = {}) => ({
    submissionReference: "house-sale-test-001",
    productName: "Smoked Catfish",
    unit: "kg",
    quantity: 2,
    unitPrice: 25000,
    saleDate: "2026-10-20",
    saleTime: "14:30",
    salesChannel: "whatsapp",
    paymentStatus: "paid",
    amountReceived: 50000,
    fulfilmentStatus: "fulfilled",
    buyerIdentityStatus: "identified",
    buyerName: "Example Hotel",
    buyerContact: "+2348000000000",
    buyerState: "Kano",
    buyerArea: "Nassarawa",
    notes: "Historical receipt checked",
    ...overrides
});

test("house sales are attributed to Elevoni and buyer/time data is retained", () => {
    const result = prepareHouseSale(base(), { now: new Date("2026-10-29T12:00:00Z") });
    assert.equal(result.error, undefined);
    assert.equal(result.sale.sellerType, "house");
    assert.equal(result.sale.sellerBusinessName, "Elevoni Farms");
    assert.equal(result.sale.buyerName, "Example Hotel");
    assert.equal(result.sale.buyerState, "Kano");
    assert.equal(result.sale.buyerArea, "Nassarawa");
    assert.equal(result.sale.saleTime, "14:30");
    assert.equal(result.sale.totalAmount, 50000);
    assert.equal(result.sale.verificationStatus, "unverified");
});

test("anonymous house sales cannot include buyer details", () => {
    const result = prepareHouseSale(base({ buyerIdentityStatus: "anonymous", buyerName: "Example Hotel", buyerContact: "" }));
    assert.match(result.error, /Anonymous buyer records/);
});

test("identified house sales require a name or contact", () => {
    const result = prepareHouseSale(base({ buyerName: "", buyerContact: "" }));
    assert.match(result.error, /identified buyer/);
});

test("partial payment must be greater than zero and less than total", () => {
    const result = prepareHouseSale(base({ paymentStatus: "partial", amountReceived: 50000 }));
    assert.match(result.error, /partial payment/);
});

test("historical sales are marked separately from current entries", () => {
    const result = prepareHouseSale(base({ recordSource: "historical_import", saleDate: "2024-02-01" }), { now: new Date("2026-10-29T12:00:00Z") });
    assert.equal(result.sale.recordSource, "historical_import");
});

test("future sale dates and invalid times are rejected", () => {
    assert.match(prepareHouseSale(base({ saleDate: "2026-10-30" }), { now: new Date("2026-10-29T12:00:00Z") }).error, /future/);
    assert.match(prepareHouseSale(base({ saleTime: "25:99" })).error, /HH:MM/);
});
