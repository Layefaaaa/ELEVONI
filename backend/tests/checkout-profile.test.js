import test from "node:test";
import assert from "node:assert/strict";
import { buildCheckoutProfile } from "../services/checkoutProfile.js";

const validProfile = {
    firstName: " Ada ",
    lastName: " Lovelace ",
    email: "ADA@example.com",
    phone: "08012345678",
    street: " 12 Farm Road ",
    city: "Abuja",
    state: "FCT",
    country: "Nigeria"
};

test("checkout profile trims fields and keeps only approved profile properties", () => {
    const result = buildCheckoutProfile({ ...validProfile, userId: "attacker-id" });
    assert.equal(result.error, undefined);
    assert.equal(result.value.firstName, "Ada");
    assert.equal(result.value.street, "12 Farm Road");
    assert.equal("userId" in result.value, false);
});

test("checkout profile requires first name, phone and street address", () => {
    const result = buildCheckoutProfile({ ...validProfile, phone: " " });
    assert.match(result.error, /phone number/);
});

test("checkout profile rejects non-string and overlong values", () => {
    assert.match(buildCheckoutProfile({ ...validProfile, city: 123 }).error, /city/);
    assert.match(buildCheckoutProfile({ ...validProfile, street: "x".repeat(301) }).error, /street/);
});

test("checkout profile accepts omitted optional fields and rejects invalid email", () => {
    const minimal = buildCheckoutProfile({ firstName: "Ada", phone: "0801", street: "Road" });
    assert.equal(minimal.error, undefined);
    assert.equal(minimal.value.city, "");
    assert.match(buildCheckoutProfile({ ...validProfile, email: "not-an-email" }).error, /email/);
});
