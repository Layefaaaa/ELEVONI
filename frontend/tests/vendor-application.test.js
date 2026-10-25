import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_DESCRIPTION_LENGTH,
  VENDOR_PRODUCT_FOCUS,
  containsInternalNotes,
  formatSubmittedAt,
  readApiError,
  readApplicationResult,
  readOwnApplication,
  readRegistrationResult,
  statusCopy,
  toApplicationPayload,
  toRegistrationPayload,
  trimmed,
  validateApplication,
  validateRegistration,
} from "../src/utils/vendorApplication.js";

test("registration validation requires full name, email, password and business details", () => {
  const result = validateRegistration({});
  assert.equal(result.valid, false);
  assert.ok(result.errors.name);
  assert.ok(result.errors.email);
  assert.ok(result.errors.password);
  assert.ok(result.errors.businessName);
  assert.ok(result.errors.contactName);
  assert.ok(result.errors.phone);
  assert.ok(result.errors.location);
  assert.ok(result.errors.productFocus);
});

test("registration validation requires a strong password of at least eight characters", () => {
  const short = validateRegistration({ password: "1234567" });
  assert.match(short.errors.password, /8 characters/);
  const ok = validateRegistration({ password: "12345678" });
  assert.equal(ok.errors.password, undefined);
});

test("registration validation requires at least one livestock focus", () => {
  const empty = validateRegistration({ productFocus: [] });
  const none = validateRegistration({ productFocus: null });
  const multiple = validateRegistration({ productFocus: ["poultry"] });
  assert.ok(empty.errors.productFocus);
  assert.ok(none.errors.productFocus);
  assert.equal(multiple.errors.productFocus, undefined);
});

test("registration validation caps the optional description at 1000 characters", () => {
  const tooLong = validateRegistration({ description: "a".repeat(MAX_DESCRIPTION_LENGTH + 1) });
  const exact = validateRegistration({ description: "a".repeat(MAX_DESCRIPTION_LENGTH) });
  assert.match(tooLong.errors.description, /1000/);
  assert.equal(exact.errors.description, undefined);
  assert.equal(MAX_DESCRIPTION_LENGTH, 1000);
});

test("application validation does not require account credentials", () => {
  const result = validateApplication({});
  assert.ok(result.errors.businessName);
  assert.ok(result.errors.productFocus);
  assert.equal(result.errors.name, undefined);
  assert.equal(result.errors.email, undefined);
  assert.equal(result.errors.password, undefined);
});

test("application validation accepts a valid payload", () => {
  const result = validateApplication({
    businessName: "Ada Farms",
    contactName: "Ada Okoye",
    phone: "+2348012345678",
    location: "Abuja",
    productFocus: ["poultry", "goats"],
    description: "Free-range birds",
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test("registration payload trims values and lowercases email and focus", () => {
  const payload = toRegistrationPayload({
    name: "  Ada Okoye  ",
    email: "  ADA@Example.COM  ",
    password: "secret1234",
    businessName: "  Ada Farms  ",
    contactName: "  Ada  ",
    phone: "  +234 801 234 5678  ",
    location: "  Abuja  ",
    productFocus: ["  Poultry ", "GOATS"],
    description: "  Healthy birds  ",
  });
  assert.equal(payload.name, "Ada Okoye");
  assert.equal(payload.email, "ada@example.com");
  assert.equal(payload.businessName, "Ada Farms");
  assert.equal(payload.contactName, "Ada");
  assert.deepEqual(payload.productFocus, ["poultry", "goats"]);
  assert.equal(payload.description, "Healthy birds");
});

test("application payload trims and normalises focus", () => {
  const payload = toApplicationPayload({
    businessName: "  Green Acres  ",
    contactName: "  Tunde  ",
    phone: "+2340000000000",
    location: "Lagos",
    productFocus: ["CATTLE"],
    description: "   ",
  });
  assert.equal(payload.businessName, "Green Acres");
  assert.deepEqual(payload.productFocus, ["cattle"]);
  assert.equal(payload.description, "");
});

test("the storefront supports all required livestock focus options", () => {
  assert.deepEqual(
    VENDOR_PRODUCT_FOCUS.map((option) => option.value),
    ["poultry", "cattle", "sheep", "goats"],
  );
});

test("trimmed helper ignores non-strings", () => {
  assert.equal(trimmed(null), "");
  assert.equal(trimmed(undefined), "");
  assert.equal(trimmed(123), "");
  assert.equal(trimmed("  ok  "), "ok");
});

test("status copy exists for all four states and includes approval disclaimer guidance", () => {
  assert.match(statusCopy("pending").title, /review/i);
  assert.match(statusCopy("approved").nextSteps, /does not.*verify|verify stock/i);
  assert.match(statusCopy("approved").nextSteps, /available for sale|enable checkout|publish/i);
  assert.match(statusCopy("rejected").nextSteps, /contact/i);
  assert.match(statusCopy("suspended").nextSteps, /reinstate/i);
  assert.equal(statusCopy("unknown"), null);
});

test("a vendor application is only rendered from the applicant-facing view without internal notes", () => {
  const application = {
    id: "v1",
    businessName: "Ada Farms",
    contactName: "Ada Okoye",
    email: "ada@example.com",
    phone: "+2348012345678",
    location: "Abuja",
    productFocus: ["poultry"],
    description: "Free-range",
    status: "pending",
    submittedAt: "2026-10-01T09:30:00.000Z",
    updatedAt: "2026-10-01T09:30:00.000Z",
  };
  const result = readOwnApplication({ success: true, application });
  assert.equal(result, application);
});

test("readOwnApplication throws when payload missing", () => {
  assert.throws(() => readOwnApplication(null), /Unable to load your application/);
  assert.throws(() => readOwnApplication(undefined), /Unable to load your application/);
});

test("readOwnApplication returns null when there is no application", () => {
  assert.equal(readOwnApplication({ success: true, application: null }), null);
});

test("readOwnApplication rejects responses that leak decision notes or reviewer identity", () => {
  assert.throws(
    () => readOwnApplication({ success: true, application: { id: "v1", decisionNote: "bad" } }),
    /Internal review data/,
  );
  assert.throws(
    () => readOwnApplication({ success: true, application: { id: "v1", reviewedBy: "admin1" } }),
    /Internal review data/,
  );
});

test("readOwnApplication surfaces server errors", () => {
  assert.throws(() => readOwnApplication({ success: false, message: "Unable to load" }), /Unable to load/);
  assert.throws(() => readOwnApplication(null), /Unable to load your application/);
});

test("registration result requires token and user and rejects internal notes", () => {
  const result = readRegistrationResult({
    success: true,
    token: "abc123",
    user: { id: "u1", name: "Ada", email: "ada@example.com", role: "customer" },
    application: { id: "v1", status: "pending" },
  });
  assert.equal(result.token, "abc123");
  assert.equal(result.user.name, "Ada");
  assert.equal(result.application.status, "pending");
});

test("registration result fails without token or user", () => {
  assert.throws(
    () => readRegistrationResult({ success: true, user: { id: "u1" }, application: null }),
    /session token/,
  );
  assert.throws(
    () => readRegistrationResult({ success: true, token: "abc", application: null }),
    /session for the new account/,
  );
  assert.throws(
    () => readRegistrationResult({ success: false, message: "User already exists" }),
    /User already exists/,
  );
});

test("registration result rejects internal review data", () => {
  assert.throws(
    () =>
      readRegistrationResult({
        success: true,
        token: "abc",
        user: { id: "u1" },
        application: { id: "v1", decisionNote: "x" },
      }),
    /Internal review data/,
  );
});

test("application submission result returns the application or throws", () => {
  assert.deepEqual(
    readApplicationResult({ success: true, application: { id: "v1", status: "pending" } }),
    { id: "v1", status: "pending" },
  );
  assert.equal(readApplicationResult({ success: true }), null);
  assert.throws(() => readApplicationResult({ success: false, message: "Already exists" }), /Already exists/);
  assert.throws(() => readApplicationResult(null), /Unable to submit/);
  assert.throws(() => readApplicationResult(undefined), /Unable to submit/);
});

test("application submission result rejects internal review data", () => {
  assert.throws(
    () => readApplicationResult({ success: true, application: { id: "v1", reviewedBy: "a" } }),
    /Internal review data/,
  );
  assert.throws(
    () => readApplicationResult({ success: true, application: { id: "v1", decisionNote: "x" } }),
    /Internal review data/,
  );
});

test("API errors prefer server messages", () => {
  assert.equal(readApiError({ response: { data: { message: "bad" } } }, "fallback"), "bad");
  assert.equal(readApiError(new Error("network"), "fallback"), "network");
  assert.equal(readApiError({}, "fallback"), "fallback");
});

test("submission dates format as readable dates or unknown", () => {
  assert.equal(formatSubmittedAt(null), "Unknown");
  assert.equal(formatSubmittedAt("nope"), "Unknown");
  assert.match(formatSubmittedAt("2026-10-01T09:30:00.000Z"), /October|2026/);
});

test("internal notes detection never flags applicant-safe fields", () => {
  assert.equal(containsInternalNotes({ status: "pending", businessName: "x" }), false);
  assert.equal(containsInternalNotes({ decisionNote: "" }), true);
  assert.equal(containsInternalNotes({ reviewedBy: null }), true);
  assert.equal(containsInternalNotes({ statusHistory: [] }), true);
  assert.equal(containsInternalNotes(null), false);
});
