import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import vendorRouter from "../routes/vendorRoute.js";
import vendorProfileModel from "../models/vendorProfileModel.js";
import userModel from "../models/userModel.js";
import requireApprovedVendor from "../middleware/vendor.js";

// Route-level tests for the vendor registration and review workflow. The
// persistence layer is stubbed in-process so no live database is required.
// Every assertion still travels through the real router, middleware,
// controller, validation and serialisation code.

const secret = "phase-two-stage-five-secret";
process.env.JWT_SECRET = secret;

const objectIdPattern = /^[a-f\d]{24}$/i;

let accounts = [];
let profiles = [];
let nextProfileError = null;
let nextReviewMiss = false;

const original = {
    userFindOne: userModel.findOne,
    userFindById: userModel.findById,
    userFindByIdAndDelete: userModel.findByIdAndDelete,
    userSave: userModel.prototype.save,
    profileCreate: vendorProfileModel.create,
    profileFindOne: vendorProfileModel.findOne,
    profileFindById: vendorProfileModel.findById,
    profileFind: vendorProfileModel.find,
    profileFindOneAndUpdate: vendorProfileModel.findOneAndUpdate,
    profileCountDocuments: vendorProfileModel.countDocuments
};

const app = express();
app.use(express.json());
app.use("/api/vendor", vendorRouter);

let server;
let base;

before(async() => {
    userModel.findOne = async(query = {}) => {
        if (query.email instanceof RegExp) {
            return accounts.find((account) => query.email.test(account.email)) || null;
        }
        return null;
    };
    userModel.findById = async(id) => accounts.find((account) => String(account._id) === String(id)) || null;
    userModel.findByIdAndDelete = async(id) => {
        const index = accounts.findIndex((account) => String(account._id) === String(id));
        if (index === -1) return null;
        return accounts.splice(index, 1)[0];
    };
    userModel.prototype.save = async function save() {
        if (!this._id) this._id = new mongoose.Types.ObjectId();
        accounts.push(this);
        return this;
    };

    vendorProfileModel.create = async(doc) => {
        if (nextProfileError) {
            const error = nextProfileError;
            nextProfileError = null;
            throw error;
        }
        const now = new Date();
        const profile = {
            ...doc,
            _id: new mongoose.Types.ObjectId(),
            status: "pending",
            reviewedBy: null,
            reviewedAt: null,
            decisionNote: "",
            statusHistory: doc.statusHistory || [],
            createdAt: now,
            updatedAt: now
        };
        profiles.push(profile);
        return profile;
    };

    vendorProfileModel.findOne = async(query = {}) => {
        if (query.userId !== undefined) {
            return profiles.find((profile) => String(profile.userId) === String(query.userId)) || null;
        }
        return null;
    };

    vendorProfileModel.findById = async(id) => {
        if (typeof id !== "string" || !objectIdPattern.test(id)) {
            const error = new Error("Cast to ObjectId failed");
            error.name = "CastError";
            throw error;
        }
        return profiles.find((profile) => String(profile._id) === id) || null;
    };

    vendorProfileModel.find = async(filter = {}, projection, options = {}) => {
        const matches = profiles.filter((profile) =>
            Object.entries(filter).every(([key, value]) => String(profile[key]) === String(value)));
        const sorted = matches
            .slice()
            .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
        const skip = Number(options.skip) || 0;
        const limit = Number(options.limit) || 0;
        return limit > 0 ? sorted.slice(skip, skip + limit) : sorted.slice(skip);
    };

    vendorProfileModel.countDocuments = async(filter = {}) =>
        profiles.filter((profile) =>
            Object.entries(filter).every(([key, value]) => String(profile[key]) === String(value))).length;

    vendorProfileModel.findOneAndUpdate = async(filter, update = {}) => {
        if (nextReviewMiss) {
            nextReviewMiss = false;
            return null;
        }
        const profile = profiles.find((candidate) =>
            String(candidate._id) === String(filter._id) && candidate.status === filter.status);
        if (!profile) return null;
        Object.assign(profile, update.$set || {});
        if (update.$push && update.$push.statusHistory) {
            profile.statusHistory = [...(profile.statusHistory || []), update.$push.statusHistory];
        }
        profile.updatedAt = new Date();
        return profile;
    };

    await new Promise((resolve) => {
        server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
});

after(async() => {
    userModel.findOne = original.userFindOne;
    userModel.findById = original.userFindById;
    userModel.findByIdAndDelete = original.userFindByIdAndDelete;
    userModel.prototype.save = original.userSave;
    vendorProfileModel.create = original.profileCreate;
    vendorProfileModel.findOne = original.profileFindOne;
    vendorProfileModel.findById = original.profileFindById;
    vendorProfileModel.find = original.profileFind;
    vendorProfileModel.findOneAndUpdate = original.profileFindOneAndUpdate;
    vendorProfileModel.countDocuments = original.profileCountDocuments;
    await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
    accounts = [];
    profiles = [];
    nextProfileError = null;
    nextReviewMiss = false;
});

const newId = () => new mongoose.Types.ObjectId().toString();

const tokenFor = (id, role = "customer", options = {}) =>
    jwt.sign({ id, role }, secret, { algorithm: "HS256", expiresIn: "1h", ...options });

const addAccount = (overrides = {}) => {
    const account = {
        _id: new mongoose.Types.ObjectId(),
        name: "Ada Okoye",
        email: "ada@example.com",
        role: "customer",
        password: "hashed",
        ...overrides
    };
    accounts.push(account);
    return account;
};

const addProfile = (overrides = {}) => {
    const now = new Date();
    const profile = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId().toString(),
        businessName: "Green Acres Farm",
        contactName: "Ada Okoye",
        email: "ada@example.com",
        phone: "+2348135738991",
        location: "Enugu town",
        state: "Enugu",
        lga: "Enugu North",
        productFocus: ["poultry"],
        description: "",
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        decisionNote: "",
        statusHistory: [{ status: "pending", at: now, by: null, note: "" }],
        createdAt: now,
        updatedAt: now,
        ...overrides
    };
    profiles.push(profile);
    return profile;
};

const validRegistration = (overrides = {}) => ({
    name: "Ada Okoye",
    email: "Ada@Example.com",
    password: "Password123",
    businessName: "Green Acres Farm",
    contactName: "Ada Okoye",
    phone: "+2348135738991",
    location: "Enugu town",
    state: "Enugu",
    lga: "Enugu North",
    productFocus: ["poultry", "goats"],
    description: "We raise poultry and goats.",
    ...overrides
});

const validApplication = (overrides = {}) => ({
    businessName: "Green Acres Farm",
    contactName: "Ada Okoye",
    phone: "+2348135738991",
    location: "Enugu town",
    state: "Enugu",
    lga: "Enugu North",
    productFocus: ["poultry", "goats"],
    description: "We raise poultry and goats.",
    ...overrides
});

const request = async(path, { method = "GET", token, body, rawBody } = {}) => {
    const headers = {};
    let payload;
    if (rawBody !== undefined) {
        headers["content-type"] = "application/json";
        payload = rawBody;
    } else if (body !== undefined) {
        headers["content-type"] = "application/json";
        payload = JSON.stringify(body);
    }
    if (token) headers.authorization = `Bearer ${token}`;

    const response = await fetch(base + path, { method, headers, body: payload });
    const text = await response.text();
    let parsed = null;
    try {
        parsed = JSON.parse(text);
    } catch {
        parsed = null;
    }
    return {
        status: response.status,
        body: parsed,
        text,
        contentType: response.headers.get("content-type") || ""
    };
};

const assertPublicShape = (application) => {
    for (const key of["decisionNote", "reviewedBy", "statusHistory"]) {
        assert.equal(Object.hasOwn(application, key), false, `applicant view leaked ${key}`);
    }
};

// ---------------------------------------------------------------------------
// Public registration
// ---------------------------------------------------------------------------

test("a new applicant registers, receives a session, and starts pending", async() => {
    const res = await request("/api/vendor/register", { method: "POST", body: validRegistration() });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.role, "customer");
    assert.equal(res.body.user.email, "ada@example.com");
    assert.equal(res.body.application.status, "pending");
    assert.equal(res.body.application.businessName, "Green Acres Farm");
    assert.deepEqual(res.body.application.productFocus, ["poultry", "goats"]);
    assertPublicShape(res.body.application);

    const decoded = jwt.verify(res.body.token, secret);
    assert.equal(decoded.role, "customer");
    assert.equal(decoded.id, String(accounts[0]._id));
    assert.equal(accounts.length, 1);
    assert.equal(profiles.length, 1);
    assert.equal(String(profiles[0].userId), String(accounts[0]._id));
    assert.equal(profiles[0].status, "pending");
});

test("public registration ignores attempted role, status and review metadata injection", async() => {
    const res = await request("/api/vendor/register", {
        method: "POST",
        body: validRegistration({
            role: "admin",
            status: "approved",
            userId: newId(),
            reviewedBy: newId(),
            reviewedAt: "2000-01-01T00:00:00.000Z",
            decisionNote: "approved by injection"
        })
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, "customer");
    assert.equal(res.body.application.status, "pending");
    assert.equal(res.body.application.state, "Enugu");
    assert.equal(res.body.application.lga, "Enugu North");
    assert.equal(profiles[0].state, "Enugu");
    assert.equal(profiles[0].lga, "Enugu North");
    assert.equal(profiles[0].status, "pending");
    assert.equal(profiles[0].reviewedBy, null);
    assert.equal(profiles[0].decisionNote, "");
});

test("duplicate email casing is rejected without creating another account or profile", async() => {
    const first = await request("/api/vendor/register", {
        method: "POST",
        body: validRegistration({ email: "ada@example.com" })
    });
    assert.equal(first.status, 201);

    const second = await request("/api/vendor/register", {
        method: "POST",
        body: validRegistration({ email: "ADA@Example.COM" })
    });

    assert.equal(second.status, 409);
    assert.equal(second.body.success, false);
    assert.equal(accounts.length, 1);
    assert.equal(profiles.length, 1);
});

test("invalid business fields are rejected before any account is created", async() => {
    const cases = [
        validRegistration({ productFocus: [] }),
        validRegistration({ phone: "abc" }),
        validRegistration({ businessName: "A" }),
        validRegistration({ location: "" }),
        validRegistration({ state: "" }),
        validRegistration({ lga: "" }),
        validRegistration({ description: "x".repeat(1001) })
    ];

    for (const body of cases) {
        const res = await request("/api/vendor/register", { method: "POST", body });
        assert.equal(res.status, 400);
        assert.equal(res.body.success, false);
    }
    assert.equal(accounts.length, 0);
    assert.equal(profiles.length, 0);
});

test("invalid account fields are rejected without a partial account", async() => {
    const cases = [
        validRegistration({ password: "short" }),
        validRegistration({ email: "not-an-email" }),
        validRegistration({ name: "" })
    ];

    for (const body of cases) {
        const res = await request("/api/vendor/register", { method: "POST", body });
        assert.equal(res.status, 400);
        assert.equal(res.body.success, false);
    }
    assert.equal(accounts.length, 0);
    assert.equal(profiles.length, 0);
});

test("a failed profile write removes the newly created account", async() => {
    nextProfileError = new Error("simulated profile failure");

    const res = await request("/api/vendor/register", { method: "POST", body: validRegistration() });

    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
    assert.equal(
        res.body.message,
        "Unable to create your account and vendor application"
    );
    assert.equal(accounts.length, 0);
    assert.equal(profiles.length, 0);
});

test("registration responses never expose internal review fields", async() => {
    const res = await request("/api/vendor/register", { method: "POST", body: validRegistration() });

    assert.equal(res.status, 201);
    assert.doesNotMatch(res.text, /decisionNote|reviewedBy|statusHistory/);
});

// ---------------------------------------------------------------------------
// Existing-customer application
// ---------------------------------------------------------------------------

test("an existing customer applies without creating another account", async() => {
    const account = addAccount({ email: "ada@example.com" });
    const res = await request("/api/vendor/apply", {
        method: "POST",
        token: tokenFor(String(account._id)),
        body: validApplication()
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.application.status, "pending");
    assert.equal(accounts.length, 1);
    assert.equal(profiles.length, 1);
    assert.equal(String(profiles[0].userId), String(account._id));
    assertPublicShape(res.body.application);
});

test("a duplicate application returns the existing application without creating a second profile", async() => {
    const account = addAccount();
    addProfile({ userId: String(account._id), status: "rejected", decisionNote: "internal reason" });

    const res = await request("/api/vendor/apply", {
        method: "POST",
        token: tokenFor(String(account._id)),
        body: validApplication()
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.application.status, "rejected");
    assertPublicShape(res.body.application);
    assert.equal(profiles.length, 1);
});

test("the public application ignores attempted account, status and review injection", async() => {
    const account = addAccount();
    const otherUser = newId();

    const res = await request("/api/vendor/apply", {
        method: "POST",
        token: tokenFor(String(account._id)),
        body: validApplication({
            userId: otherUser,
            email: "attacker@example.com",
            role: "admin",
            status: "approved",
            reviewedBy: newId(),
            decisionNote: "injected"
        })
    });

    assert.equal(res.status, 201);
    assert.equal(profiles[0].status, "pending");
    assert.equal(profiles[0].email, "ada@example.com");
    assert.equal(String(profiles[0].userId), String(account._id));
    assert.equal(profiles[0].reviewedBy, null);
});

test("application requires a customer session", async() => {
    const account = addAccount();

    const missing = await request("/api/vendor/apply", { method: "POST", body: validApplication() });
    assert.equal(missing.status, 401);

    const admin = await request("/api/vendor/apply", {
        method: "POST",
        token: tokenFor(newId(), "admin"),
        body: validApplication()
    });
    assert.equal(admin.status, 403);

    const vendorRole = await request("/api/vendor/apply", {
        method: "POST",
        token: tokenFor(String(account._id), "vendor"),
        body: validApplication()
    });
    assert.equal(vendorRole.status, 403);

    const expired = await request("/api/vendor/apply", {
        method: "POST",
        token: tokenFor(String(account._id), "customer", { expiresIn: -1 }),
        body: validApplication()
    });
    assert.equal(expired.status, 401);

    assert.equal(profiles.length, 0);
});

test("a token for a deleted account cannot create an application", async() => {
    const res = await request("/api/vendor/apply", {
        method: "POST",
        token: tokenFor(newId()),
        body: validApplication()
    });

    assert.equal(res.status, 401);
    assert.equal(profiles.length, 0);
});

test("an application with missing business fields is rejected", async() => {
    const account = addAccount();
    const res = await request("/api/vendor/apply", {
        method: "POST",
        token: tokenFor(String(account._id)),
        body: validApplication({ productFocus: [] })
    });

    assert.equal(res.status, 400);
    assert.equal(profiles.length, 0);
});

// ---------------------------------------------------------------------------
// Applicant status
// ---------------------------------------------------------------------------

test("applicant status requires a session and returns null when no application exists", async() => {
    const account = addAccount();

    const missing = await request("/api/vendor/me");
    assert.equal(missing.status, 401);

    const res = await request("/api/vendor/me", { token: tokenFor(String(account._id)) });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.application, null);
});

test("applicant status never exposes review notes, reviewers or history", async() => {
    const account = addAccount();
    addProfile({
        userId: String(account._id),
        status: "rejected",
        reviewedBy: newId(),
        reviewedAt: new Date(),
        decisionNote: "Very private internal note",
        statusHistory: [
            { status: "pending", at: new Date(), by: null, note: "" },
            { status: "rejected", at: new Date(), by: newId(), note: "Very private internal note" }
        ]
    });

    const res = await request("/api/vendor/me", { token: tokenFor(String(account._id)) });

    assert.equal(res.status, 200);
    assert.equal(res.body.application.status, "rejected");
    assertPublicShape(res.body.application);
    assert.doesNotMatch(res.text, /Very private internal note/);
});

test("an applicant can only read their own application", async() => {
    const first = addAccount({ email: "ada@example.com" });
    const second = addAccount({ email: "grace@example.com" });
    addProfile({ userId: String(second._id), businessName: "Second Farm" });

    const res = await request("/api/vendor/me", { token: tokenFor(String(first._id)) });

    assert.equal(res.status, 200);
    assert.equal(res.body.application, null);
    assert.doesNotMatch(res.text, /Second Farm/);
});

// ---------------------------------------------------------------------------
// Admin listing and detail
// ---------------------------------------------------------------------------

test("vendor administration requires an admin token", async() => {
    const account = addAccount();
    const customerToken = tokenFor(String(account._id));
    const profile = addProfile({ userId: String(account._id) });

    for (const [method, path] of[
            ["GET", "/api/vendor/admin-list"], ["GET", `/api/vendor/admin/${profile._id}`], ["POST", `/api/vendor/${profile._id}/review`]
        ]) {
        const body = method === "POST" ? { decision: "approve" } : undefined;
        const missing = await request(path, { method, body });
        assert.equal(missing.status, 401, `${path} allowed a missing token`);

        const forbidden = await request(path, { method, token: customerToken, body });
        assert.equal(forbidden.status, 403, `${path} allowed a customer token`);
    }

    assert.equal(profiles[0].status, "pending");
});

test("the admin list defaults to pending applications and paginates", async() => {
    addProfile({ businessName: "Oldest", createdAt: new Date("2026-01-01") });
    addProfile({ businessName: "Newest", createdAt: new Date("2026-03-01") });
    addProfile({ businessName: "Approved Farm", status: "approved", createdAt: new Date("2026-02-01") });

    const adminToken = tokenFor(newId(), "admin");
    const res = await request("/api/vendor/admin-list", { token: adminToken });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
    assert.equal(res.body.data[0].businessName, "Newest");
    assert.equal(res.body.pagination.total, 2);
    assert.equal(res.body.pagination.page, 1);
    assert.equal(res.body.data[0].status, "pending");

    const paged = await request("/api/vendor/admin-list?status=all&page=2&limit=1", { token: adminToken });
    assert.equal(paged.status, 200);
    assert.equal(paged.body.data.length, 1);
    assert.equal(paged.body.pagination.total, 3);
    assert.equal(paged.body.pagination.totalPages, 3);
});

test("an unknown status filter is rejected", async() => {
    const res = await request("/api/vendor/admin-list?status=ready", { token: tokenFor(newId(), "admin") });
    assert.equal(res.status, 400);
});

test("admin list rows do not leak internal notes", async() => {
    addProfile({ decisionNote: "very private", reviewedBy: newId(), status: "approved" });
    const res = await request("/api/vendor/admin-list?status=approved", { token: tokenFor(newId(), "admin") });

    assert.equal(res.status, 200);
    assert.doesNotMatch(res.text, /very private|decisionNote|statusHistory/);
});

test("admin detail returns the full application and handles bad ids", async() => {
    const profile = addProfile({ decisionNote: "internal", reviewedBy: newId(), status: "approved" });
    const adminToken = tokenFor(newId(), "admin");

    const res = await request(`/api/vendor/admin/${profile._id}`, { token: adminToken });
    assert.equal(res.status, 200);
    assert.equal(res.body.application.decisionNote, "internal");
    assert.ok(Array.isArray(res.body.application.statusHistory));

    const missing = await request(`/api/vendor/admin/${newId()}`, { token: adminToken });
    assert.equal(missing.status, 404);

    const malformed = await request("/api/vendor/admin/not-an-id", { token: adminToken });
    assert.equal(malformed.status, 400);
});

// ---------------------------------------------------------------------------
// Review decisions
// ---------------------------------------------------------------------------

test("an admin approves a pending application and the decision persists", async() => {
    const applicant = addAccount();
    const profile = addProfile({ userId: String(applicant._id) });
    const reviewer = newId();

    const res = await request(`/api/vendor/${profile._id}/review`, {
        method: "POST",
        token: tokenFor(reviewer, "admin"),
        body: { decision: "approve", note: "Documents checked" }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.application.status, "approved");
    assert.equal(res.body.application.reviewedBy, reviewer);
    assert.equal(res.body.application.decisionNote, "Documents checked");
    assert.equal(profiles[0].status, "approved");
    assert.equal(profiles[0].statusHistory.length, 2);
    assert.equal(profiles[0].statusHistory[1].status, "approved");

    const own = await request("/api/vendor/me", { token: tokenFor(String(applicant._id)) });
    assert.equal(own.body.application.status, "approved");
    assertPublicShape(own.body.application);
});

test("reject, suspend and reinstate follow the declared transitions", async() => {
    const profile = addProfile();
    const adminToken = tokenFor(newId(), "admin");

    const rejected = await request(`/api/vendor/${profile._id}/review`, {
        method: "POST",
        token: adminToken,
        body: { decision: "reject" }
    });
    assert.equal(rejected.status, 200);
    assert.equal(rejected.body.application.status, "rejected");

    const reopen = await request(`/api/vendor/${profile._id}/review`, {
        method: "POST",
        token: adminToken,
        body: { decision: "reopen" }
    });
    assert.equal(reopen.status, 200);
    assert.equal(reopen.body.application.status, "pending");

    const approved = await request(`/api/vendor/${profile._id}/review`, {
        method: "POST",
        token: adminToken,
        body: { decision: "approve" }
    });
    assert.equal(approved.status, 200);

    const suspended = await request(`/api/vendor/${profile._id}/review`, {
        method: "POST",
        token: adminToken,
        body: { decision: "suspend" }
    });
    assert.equal(suspended.status, 200);
    assert.equal(suspended.body.application.status, "suspended");

    const reinstated = await request(`/api/vendor/${profile._id}/review`, {
        method: "POST",
        token: adminToken,
        body: { decision: "reinstate" }
    });
    assert.equal(reinstated.status, 200);
    assert.equal(reinstated.body.application.status, "approved");
});

test("invalid transitions and malformed review payloads are rejected", async() => {
    const profile = addProfile();
    const adminToken = tokenFor(newId(), "admin");

    const wrongTransition = await request(`/api/vendor/${profile._id}/review`, {
        method: "POST",
        token: adminToken,
        body: { decision: "suspend" }
    });
    assert.equal(wrongTransition.status, 409);
    assert.equal(wrongTransition.body.vendorStatus, "pending");

    for (const body of[{}, { decision: "promote" }, { decision: ["approve"] }, { decision: "approve", note: 42 }]) {
        const res = await request(`/api/vendor/${profile._id}/review`, {
            method: "POST",
            token: adminToken,
            body
        });
        assert.equal(res.status, 400, `payload ${JSON.stringify(body)} was not rejected`);
    }

    const longNote = await request(`/api/vendor/${profile._id}/review`, {
        method: "POST",
        token: adminToken,
        body: { decision: "approve", note: "x".repeat(501) }
    });
    assert.equal(longNote.status, 400);
    assert.equal(profiles[0].status, "pending");
});

test("an administrator cannot review their own vendor application", async() => {
    const reviewer = newId();
    const profile = addProfile({ userId: reviewer });

    const res = await request(`/api/vendor/${profile._id}/review`, {
        method: "POST",
        token: tokenFor(reviewer, "admin"),
        body: { decision: "approve" }
    });

    assert.equal(res.status, 403);
    assert.equal(profiles[0].status, "pending");
});

test("a review cannot overwrite review metadata through the payload", async() => {
    const profile = addProfile();
    const reviewer = newId();

    const res = await request(`/api/vendor/${profile._id}/review`, {
        method: "POST",
        token: tokenFor(reviewer, "admin"),
        body: {
            decision: "approve",
            note: "  checked  ",
            status: "suspended",
            reviewedBy: newId(),
            reviewedAt: "2000-01-01T00:00:00.000Z",
            decisionNote: "injected note"
        }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.application.status, "approved");
    assert.equal(res.body.application.reviewedBy, reviewer);
    assert.equal(res.body.application.decisionNote, "checked");
    assert.notEqual(profiles[0].reviewedAt.getFullYear(), 2000);
});

test("a conflicting review is rejected instead of overwriting a newer decision", async() => {
    const profile = addProfile();
    nextReviewMiss = true;

    const res = await request(`/api/vendor/${profile._id}/review`, {
        method: "POST",
        token: tokenFor(newId(), "admin"),
        body: { decision: "approve" }
    });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /changed while you were reviewing/i);
    assert.equal(profiles[0].status, "pending");
});

test("reviewing a missing application returns not found", async() => {
    const res = await request(`/api/vendor/${newId()}/review`, {
        method: "POST",
        token: tokenFor(newId(), "admin"),
        body: { decision: "approve" }
    });
    assert.equal(res.status, 404);
});

// ---------------------------------------------------------------------------
// Approved-vendor guard
// ---------------------------------------------------------------------------

const runVendorGuard = async(auth, ProfileModel) => {
    const req = { auth };
    let nextCalled = false;
    const res = {
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
    };
    await requireApprovedVendor({ ProfileModel })(req, res, () => {
        nextCalled = true;
    });
    return { req, res, nextCalled };
};

test("approved-vendor access requires authentication", async() => {
    const { res, nextCalled } = await runVendorGuard(undefined, { findOne: async() => null });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test("approved-vendor access is denied without an application", async() => {
    const { res, nextCalled } = await runVendorGuard({ userId: newId(), role: "customer" }, { findOne: async() => null });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});

test("approved-vendor access is denied for pending, rejected and suspended applications", async() => {
    for (const status of["pending", "rejected", "suspended"]) {
        const { res, nextCalled } = await runVendorGuard({ userId: newId(), role: "customer" }, { findOne: async() => ({ _id: newId(), userId: newId(), status }) });
        assert.equal(res.statusCode, 403, `${status} was allowed`);
        assert.equal(res.body.vendorStatus, status);
        assert.equal(nextCalled, false);
    }
});

test("approved-vendor access is granted and attached from persisted status", async() => {
    const userId = newId();
    const profile = { _id: newId(), userId, status: "approved" };

    const { req, nextCalled } = await runVendorGuard({ userId, role: "customer" }, { findOne: async() => profile });

    assert.equal(nextCalled, true);
    assert.deepEqual(req.vendor, { profileId: profile._id, userId, status: "approved" });
    assert.equal(Object.isFrozen(req.vendor), true);

    profile.status = "suspended";
    const afterSuspension = await runVendorGuard({ userId, role: "customer" }, { findOne: async() => profile });
    assert.equal(afterSuspension.res.statusCode, 403);
    assert.equal(afterSuspension.nextCalled, false);

    profile.status = "approved";
    const afterReinstatement = await runVendorGuard({ userId, role: "customer" }, { findOne: async() => profile });
    assert.equal(afterReinstatement.nextCalled, true);
});

test("vendor authorization failures do not leak database details", async() => {
    const { res, nextCalled } = await runVendorGuard({ userId: newId(), role: "customer" }, { findOne: async() => { throw new Error("connection string secret"); } });

    assert.equal(res.statusCode, 500);
    assert.equal(nextCalled, false);
    assert.doesNotMatch(JSON.stringify(res.body), /connection string secret/);
});

// ---------------------------------------------------------------------------
// Failure handling
// ---------------------------------------------------------------------------

test("listing failures return a generic error without database details", async() => {
    const originalFind = vendorProfileModel.find;
    vendorProfileModel.find = async() => {
        throw new Error("internal database details");
    };

    try {
        const res = await request("/api/vendor/admin-list", { token: tokenFor(newId(), "admin") });
        assert.equal(res.status, 500);
        assert.equal(res.body.message, "Unable to load vendor applications");
        assert.doesNotMatch(res.text, /internal database details/);
    } finally {
        vendorProfileModel.find = originalFind;
    }
});

test("malformed JSON does not create a partial account", async() => {
    const res = await request("/api/vendor/register", { method: "POST", rawBody: "{not json" });

    assert.equal(res.status, 400);
    assert.equal(accounts.length, 0);
    assert.equal(profiles.length, 0);
});

test("an applicant response cannot be widened by an unknown request body", async() => {
    const res = await request("/api/vendor/register", {
        method: "POST",
        body: validRegistration({ extra: "ignored", statusHistory: [{ status: "approved" }] })
    });

    assert.equal(res.status, 201);
    assertPublicShape(res.body.application);
    assert.equal(profiles[0].status, "pending");
});