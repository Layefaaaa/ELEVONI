import test from "node:test";
import assert from "node:assert/strict";
import { buildOrderBuyerSnapshot } from "../services/orderBuyerSnapshot.js";

test("order buyer snapshot records name, contact, state, and area from the submitted address", () => {
    assert.deepEqual(buildOrderBuyerSnapshot({ firstName: "Ada", lastName: "Okoye", phone: "+2348000000000", state: "FCT", city: "Gwarinpa" }), {
        buyerIdentityStatus: "identified", buyerName: "Ada Okoye", buyerContact: "+2348000000000", buyerState: "FCT", buyerArea: "Gwarinpa"
    });
});

test("missing buyer details remain unknown instead of being fabricated", () => {
    assert.deepEqual(buildOrderBuyerSnapshot({ street: "Road 1" }), {
        buyerIdentityStatus: "unknown", buyerName: "", buyerContact: "", buyerState: "", buyerArea: ""
    });
});
