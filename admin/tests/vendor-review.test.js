import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_REVIEW_NOTE_LENGTH,
  VENDOR_PAGE_SIZE,
  VENDOR_STATUS_FILTERS,
  buildVendorListParams,
  canDecide,
  confirmationMessage,
  decisionsForStatus,
  emptyListMessage,
  formatSubmittedAt,
  readApiError,
  readReviewResult,
  readVendorDetail,
  readVendorList,
  statusLabel,
  statusNote,
  validateReviewNote,
  vendorFocusLabel,
} from "../src/utils/vendorReview.js";

test("the review screen defaults to pending applications", () => {
  assert.equal(VENDOR_STATUS_FILTERS[0].value, "pending");
  assert.deepEqual(buildVendorListParams({}), {
    status: "pending",
    page: 1,
    limit: VENDOR_PAGE_SIZE,
  });
});

test("only the four supported statuses can be requested", () => {
  assert.deepEqual(
    VENDOR_STATUS_FILTERS.map((filter) => filter.value),
    ["pending", "approved", "rejected", "suspended"]
  );
  for (const filter of VENDOR_STATUS_FILTERS) {
    assert.equal(buildVendorListParams({ status: filter.value }).status, filter.value);
  }
});

test("an unknown or missing status falls back to pending", () => {
  assert.equal(buildVendorListParams({ status: "all" }).status, "pending");
  assert.equal(buildVendorListParams({ status: "vendor" }).status, "pending");
  assert.equal(buildVendorListParams({ status: undefined }).status, "pending");
});

test("pagination parameters are positive integers", () => {
  assert.deepEqual(buildVendorListParams({ status: "approved", page: "3", limit: "10" }), {
    status: "approved",
    page: 3,
    limit: 10,
  });
  assert.deepEqual(buildVendorListParams({ page: 0, limit: -5 }), {
    status: "pending",
    page: 1,
    limit: VENDOR_PAGE_SIZE,
  });
  assert.equal(buildVendorListParams({ page: "not-a-number" }).page, 1);
});

test("pending applications offer approve and reject only", () => {
  assert.deepEqual(
    decisionsForStatus("pending").map((action) => action.decision),
    ["approve", "reject"]
  );
  assert.equal(canDecide("pending", "approve"), true);
  assert.equal(canDecide("pending", "reject"), true);
  assert.equal(canDecide("pending", "suspend"), false);
  assert.equal(canDecide("pending", "reinstate"), false);
});

test("approved applications offer suspension only", () => {
  assert.deepEqual(
    decisionsForStatus("approved").map((action) => action.decision),
    ["suspend"]
  );
  assert.equal(canDecide("approved", "suspend"), true);
  assert.equal(canDecide("approved", "approve"), false);
});

test("suspended applications offer reinstatement only", () => {
  assert.deepEqual(
    decisionsForStatus("suspended").map((action) => action.decision),
    ["reinstate"]
  );
  assert.equal(canDecide("suspended", "reinstate"), true);
  assert.equal(canDecide("suspended", "reject"), false);
});

test("rejected applications expose no review action", () => {
  assert.deepEqual(decisionsForStatus("rejected"), []);
  assert.equal(canDecide("rejected", "approve"), false);
  assert.equal(canDecide("rejected", "reopen"), false);
  assert.deepEqual(decisionsForStatus("unknown"), []);
});

test("every consequential decision asks for confirmation naming the business", () => {
  for (const status of ["pending", "approved", "suspended"]) {
    for (const action of decisionsForStatus(status)) {
      const message = confirmationMessage(action.decision, { businessName: "Ada Farms" });
      assert.match(message, /Ada Farms/);
      assert.ok(message.length > 20);
      assert.ok(action.success.length > 0);
    }
  }
  assert.equal(confirmationMessage("reopen", { businessName: "Ada Farms" }), "");
  assert.match(confirmationMessage("approve", {}), /this business/);
});

test("statuses are labelled for display", () => {
  assert.equal(statusLabel("pending"), "Pending review");
  assert.equal(statusLabel("approved"), "Approved");
  assert.equal(statusLabel("rejected"), "Rejected");
  assert.equal(statusLabel("suspended"), "Suspended");
  assert.equal(statusLabel("mystery"), "Unknown status");
});

test("status guidance never implies approval publishes products", () => {
  assert.match(statusNote("approved"), /does not verify the business/);
  assert.match(statusNote("approved"), /available for sale/);
  assert.match(statusNote("rejected"), /reopen/);
  assert.match(statusNote("suspended"), /reinstate/);
  assert.equal(statusNote("mystery"), "");
});

test("an application list response is read with its pagination", () => {
  const pagination = { page: 1, limit: 20, total: 2, totalPages: 1, hasNext: false, hasPrevious: false };
  const result = readVendorList({
    success: true,
    data: [{ id: "a" }, { id: "b" }],
    pagination,
  });
  assert.deepEqual(result.items, [{ id: "a" }, { id: "b" }]);
  assert.deepEqual(result.pagination, pagination);
});

test("an empty application list is not treated as an error", () => {
  const result = readVendorList({ success: true, data: [], pagination: null });
  assert.deepEqual(result.items, []);
  assert.equal(result.pagination, null);
});

test("a failed list response surfaces the server message", () => {
  assert.throws(
    () => readVendorList({ success: false, message: "Unknown application status filter" }),
    /Unknown application status filter/
  );
  assert.throws(() => readVendorList({ success: true }), /could not be read/);
  assert.throws(() => readVendorList(null), /Unable to load vendor applications/);
});

test("an application detail response is read", () => {
  const application = { id: "a", businessName: "Ada Farms", status: "pending" };
  assert.equal(readVendorDetail({ success: true, application }), application);
});

test("a detail response without a record is an error", () => {
  assert.throws(() => readVendorDetail({ success: true, application: null }), /could not be read/);
  assert.throws(
    () => readVendorDetail({ success: false, message: "Vendor application not found" }),
    /Vendor application not found/
  );
});

test("a review response returns the updated application", () => {
  const application = { id: "a", status: "approved" };
  assert.equal(readReviewResult({ success: true, application }), application);
});

test("a rejected transition keeps the server explanation", () => {
  assert.throws(
    () =>
      readReviewResult({
        success: false,
        message: "That decision is not available for this application",
        vendorStatus: "approved",
      }),
    /That decision is not available for this application/
  );
  assert.throws(() => readReviewResult({ success: true }), /not confirmed/);
});

test("API errors prefer the server message and fall back safely", () => {
  assert.equal(
    readApiError({ response: { data: { message: "You cannot review your own vendor application" } } }, "fallback"),
    "You cannot review your own vendor application"
  );
  assert.equal(readApiError(new Error("Network Error"), "fallback"), "Network Error");
  assert.equal(readApiError({}, "fallback"), "fallback");
  assert.equal(readApiError(undefined, "fallback"), "fallback");
});

test("review notes are optional, trimmed and length-limited", () => {
  assert.deepEqual(validateReviewNote(undefined), { value: "" });
  assert.deepEqual(validateReviewNote("   "), { value: "" });
  assert.deepEqual(validateReviewNote("  Verified by phone  "), { value: "Verified by phone" });
  assert.match(
    validateReviewNote("a".repeat(MAX_REVIEW_NOTE_LENGTH + 1)).error,
    /500 characters or fewer/
  );
  assert.equal(validateReviewNote("a".repeat(MAX_REVIEW_NOTE_LENGTH)).value.length, MAX_REVIEW_NOTE_LENGTH);
  assert.match(validateReviewNote({ note: "x" }).error, /must be text/);
});

test("livestock focus is human readable", () => {
  assert.equal(vendorFocusLabel(["poultry", "goats"]), "Poultry, Goats");
  assert.equal(vendorFocusLabel(["cattle"]), "Cattle");
  assert.equal(vendorFocusLabel([]), "Not specified");
  assert.equal(vendorFocusLabel(undefined), "Not specified");
});

test("submission dates are formatted or clearly unknown", () => {
  assert.equal(formatSubmittedAt(null), "Unknown");
  assert.equal(formatSubmittedAt("not-a-date"), "Unknown");
  assert.match(formatSubmittedAt("2026-10-01T09:30:00.000Z"), /2026/);
});

test("empty states match the selected filter", () => {
  assert.match(emptyListMessage("pending"), /waiting for review/);
  assert.match(emptyListMessage("approved"), /approved/);
  assert.match(emptyListMessage("rejected"), /rejected/);
  assert.match(emptyListMessage("suspended"), /suspended/);
  assert.match(emptyListMessage("mystery"), /No vendor applications/);
});
