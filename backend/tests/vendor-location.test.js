import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import vendorProfileModel from "../models/vendorProfileModel.js";
import { getAllApprovedVendors, getApprovedVendorById } from "../controllers/vendorController.js";
import { adminVendorSummary, publicVendorApplication } from "../services/vendorApplication.js";

const newId = () => new mongoose.Types.ObjectId().toString();

const legacyProfile = () => ({
    _id: newId(),
    businessName: "Legacy Farm",
    contactName: "Ada Okoye",
    email: "ada@example.com",
    phone: "+2348135738991",
    location: "Enugu town",
    productFocus: ["poultry"],
    description: "",
    status: "approved",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z")
});

const structuredProfile = () => ({
    ...legacyProfile(),
    businessName: "Green Acres",
    location: "Enugu town",
    state: "Enugu",
    lga: "Enugu North"
});

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

test("legacy vendor profiles remain valid without State or LGA", async () => {
    assert.ok(!vendorProfileModel.schema.path("state").isRequired);
    assert.ok(!vendorProfileModel.schema.path("lga").isRequired);

    const profile = new vendorProfileModel({
        userId: new mongoose.Types.ObjectId(),
        businessName: "Legacy Farm",
        contactName: "Ada Okoye",
        email: "ada@example.com",
        phone: "+2348135738991",
        location: "Enugu town",
        productFocus: ["poultry"],
        status: "pending"
    });

    assert.equal(await profile.validate(), undefined);
});

test("legacy profiles serialize State and LGA as empty strings", () => {
    const profile = legacyProfile();
    const publicView = publicVendorApplication(profile);
    const adminSummary = adminVendorSummary(profile);

    assert.equal(publicView.location, "Enugu town");
    assert.equal(publicView.state, "");
    assert.equal(publicView.lga, "");
    assert.equal(adminSummary.location, "Enugu town");
    assert.equal(adminSummary.state, "");
    assert.equal(adminSummary.lga, "");
});

test("public directory searches State and LGA and preserves legacy fallback", async () => {
    const originalFind = vendorProfileModel.find;
    let captured = null;

    try {
        vendorProfileModel.find = async (filter, projection, options) => {
            captured = { filter, projection, options };
            return [structuredProfile(), legacyProfile()];
        };

        const res = response();
        await getAllApprovedVendors({ query: { search: "Enugu", state: "Enugu" } }, res);

        assert.equal(res.statusCode, 200);
        assert.equal(captured.filter.status, "approved");
        assert.ok(captured.filter.$or.some((clause) => clause.state instanceof RegExp && clause.state.test("Enugu")));
        assert.ok(captured.filter.$or.some((clause) => clause.lga instanceof RegExp && clause.lga.test("Enugu North")));
        assert.ok(captured.filter.$and[0].$or.some((clause) => clause.state instanceof RegExp && clause.state.test("Enugu")));
        assert.ok(captured.filter.$and[0].$or.some((clause) => clause.state?.$exists === false));
        assert.ok(captured.filter.$and[0].$or.some((clause) => clause.state === ""));

        assert.equal(res.body.data[0].state, "Enugu");
        assert.equal(res.body.data[0].lga, "Enugu North");
        assert.equal(res.body.data[1].location, "Enugu town");
        assert.equal(res.body.data[1].state, "");
        assert.equal(res.body.data[1].lga, "");
    } finally {
        vendorProfileModel.find = originalFind;
    }
});

test("public vendor detail preserves legacy location fallback", async () => {
    const originalFindOne = vendorProfileModel.findOne;
    const profile = legacyProfile();

    try {
        vendorProfileModel.findOne = async() => profile;

        const res = response();
        await getApprovedVendorById({ params: { id: profile._id } }, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.data.location, "Enugu town");
        assert.equal(res.body.data.state, "");
        assert.equal(res.body.data.lga, "");
    } finally {
        vendorProfileModel.findOne = originalFindOne;
    }
});
