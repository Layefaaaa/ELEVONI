import test from "node:test";
import assert from "node:assert/strict";
import { getProductUnitPrice, parsePricingTiers, validatePricingTiers, validateProductPricing } from "../services/productPricing.js";
import { buildOrderSnapshot } from "../controllers/orderPricing.js";
import fishModel from "../models/fishModel.js";

const tiers = [
    { minQuantity: 1, maxQuantity: 4, unitPrice: 25000 },
    { minQuantity: 5, maxQuantity: 9, unitPrice: 24000 },
    { minQuantity: 10, maxQuantity: 19, unitPrice: 22500 },
    { minQuantity: 20, maxQuantity: null, unitPrice: 21000 }
];

test("tiered products select the tier matching the quantity", () => {
    const product = { name: "Smoked Catfish (1kg)", price: 25000, pricingMode: "tiered", pricingTiers: tiers };
    for (const [quantity, expected] of [[1, 25000], [4, 25000], [5, 24000], [9, 24000], [10, 22500], [19, 22500], [20, 21000], [100, 21000]]) {
        assert.equal(getProductUnitPrice(product, quantity), expected, "quantity " + quantity);
    }
});

test("tiered products without priced tiers fail closed instead of falling back", () => {
    assert.throws(
        () => getProductUnitPrice({ name: "Smoked Catfish (1kg)", price: 25000, pricingMode: "tiered", pricingTiers: [] }, 5),
        /not configured/
    );
    assert.throws(
        () => getProductUnitPrice({ name: "Smoked Catfish (1kg)", price: 25000, pricingMode: "tiered" }, 5),
        /not configured/
    );
});

test("single-priced products use their base price regardless of tier quantity", () => {
    assert.equal(getProductUnitPrice({ name: "Other product", price: 1700, pricingMode: "single", pricingTiers: [] }, 3), 1700);
    assert.equal(getProductUnitPrice({ name: "Smoked Catfish (1kg)", price: 25000, pricingMode: "single", pricingTiers: [] }, 40), 25000);
    assert.equal(getProductUnitPrice({ name: "Smoked Catfish (1kg)", price: 25000 }, 40), 25000);
});

test("pricing behaviour is driven by pricingMode, not by the product name", () => {
    const tieredByName = { name: "Fresh Tilapia", price: 25000, pricingMode: "tiered", pricingTiers: tiers };
    const singleByName = { name: "Smoked Catfish (1kg)", price: 25000, pricingMode: "single", pricingTiers: [] };
    assert.equal(getProductUnitPrice(tieredByName, 5), 24000);
    assert.equal(getProductUnitPrice(singleByName, 5), 25000);
});

test("tier validation rejects gaps, overlaps, wrong ordering, and missing final open tier", () => {
    assert.match(validatePricingTiers([tiers[0], { ...tiers[1], minQuantity: 6 }, ...tiers.slice(2)]), /gaps or overlaps/);
    assert.match(validatePricingTiers([tiers[0], { ...tiers[1], minQuantity: 4 }, ...tiers.slice(2)]), /gaps or overlaps/);
    assert.match(validatePricingTiers([tiers[1], tiers[0], ...tiers.slice(2)]), /start at 1/);
    assert.match(validatePricingTiers(tiers.slice(0, 3)), /final pricing tier must be open-ended/);
    assert.match(validatePricingTiers([{ ...tiers[0], maxQuantity: null }, tiers[1]]), /Only the final pricing tier may be open-ended/);
});

test("tier validation rejects invalid quantities and prices", () => {
    assert.match(validatePricingTiers([{ minQuantity: 1.5, maxQuantity: null, unitPrice: 100 }]), /whole numbers/);
    assert.match(validatePricingTiers([{ minQuantity: 1, maxQuantity: null, unitPrice: 0 }]), /positive finite/);
    assert.match(validatePricingTiers([{ minQuantity: 1, maxQuantity: null, unitPrice: Infinity }]), /positive finite/);
});

test("tier parsing accepts multipart JSON and rejects malformed JSON", () => {
    assert.deepEqual(parsePricingTiers(JSON.stringify(tiers)), tiers);
    assert.throws(() => parsePricingTiers("{"), /valid JSON/);
});

test("order snapshots preserve the database tier price and line total", async () => {
    const product = { _id: "fish-1", name: "Smoked Catfish", price: 25000, pricingMode: "tiered", pricingTiers: tiers };
    const snapshot = await buildOrderSnapshot([{ productId: product._id, quantity: 5 }], { find: async () => [product] });
    assert.equal(snapshot.items[0].unitPrice, 24000);
    assert.equal(snapshot.items[0].lineTotal, 120000);
    assert.equal(snapshot.subtotal, 120000);
    assert.equal(snapshot.totalAmount, 122500);
});

test("order snapshots preserve the base price for single-priced products", async () => {
    const product = { _id: "fish-2", name: "Smoked Catfish", price: 25000, pricingMode: "single", pricingTiers: [] };
    const snapshot = await buildOrderSnapshot([{ productId: product._id, quantity: 5 }], { find: async () => [product] });
    assert.equal(snapshot.items[0].unitPrice, 25000);
    assert.equal(snapshot.items[0].lineTotal, 125000);
    assert.equal(snapshot.totalAmount, 127500);
});

test("validateProductPricing enforces the explicit pricing mode", () => {
    assert.equal(validateProductPricing({ pricingMode: "single", price: 25000, pricingTiers: [] }), null);
    assert.equal(validateProductPricing({ pricingMode: "tiered", price: 25000, pricingTiers: tiers }), null);
    assert.match(validateProductPricing({ pricingMode: "tiered", price: 25000, pricingTiers: [] }), /Tiered products require configured pricing tiers/);
    assert.match(validateProductPricing({ pricingMode: "single", price: 25000, pricingTiers: tiers }), /Single-priced products must not define pricing tiers/);
    assert.match(validateProductPricing({ pricingMode: "wholesale", price: 25000, pricingTiers: [] }), /pricingMode must be either single or tiered/);
    assert.match(validateProductPricing({ pricingMode: "single", price: 0, pricingTiers: [] }), /positive finite/);
});

test("Mongoose product validation is driven by pricingMode and rejects a missing tier schedule", async () => {
    const base = { name: "Smoked Catfish", description: "Fish", price: 25000, image: "image.jpg", category: "Smoked" };
    await new fishModel({ ...base, pricingMode: "single", pricingTiers: [] }).validate();
    await new fishModel({ ...base, pricingMode: "tiered", pricingTiers: tiers }).validate();
    await assert.rejects(
        () => new fishModel({ ...base, pricingMode: "tiered" }).validate(),
        (error) => Boolean(error.errors.pricingTiers)
    );
    await assert.rejects(
        () => new fishModel({ ...base, pricingMode: "single", pricingTiers: tiers }).validate(),
        (error) => Boolean(error.errors.pricingTiers)
    );
});