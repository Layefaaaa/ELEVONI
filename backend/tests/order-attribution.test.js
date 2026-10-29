import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import orderModel from "../models/orderModel.js";

const baseOrder = (items) => new orderModel({
    userId: "customer-1",
    items,
    amount: 2000,
    address: { street: "1 Market Road" }
});

test("existing order items remain valid without seller attribution", async () => {
    const order = baseOrder([{
        productId: new mongoose.Types.ObjectId(),
        name: "Smoked Catfish",
        quantity: 1,
        unit: "kg",
        unitPrice: 2000,
        lineTotal: 2000
    }]);

    assert.equal(await order.validate(), undefined);
    assert.equal(order.items[0].vendorId, undefined);
    assert.equal(order.items[0].vendorBusinessName, undefined);
});

test("order items can preserve a marketplace seller snapshot", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    const order = baseOrder([{
        productId: new mongoose.Types.ObjectId(),
        vendorId,
        vendorBusinessName: "Green Acres",
        name: "Broiler Chicken",
        quantity: 2,
        unit: "kg",
        unitPrice: 1000,
        lineTotal: 2000
    }]);

    assert.equal(await order.validate(), undefined);
    assert.equal(String(order.items[0].vendorId), String(vendorId));
    assert.equal(order.items[0].vendorBusinessName, "Green Acres");
});
