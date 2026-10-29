// Presentation rules for the administrator vendor review screen.
//
// The API remains authoritative for status changes; these helpers only decide
// which controls to show and how to read the responses.

const DEFAULT_VENDOR_STATUS_FILTER = "pending";
const MAX_REVIEW_NOTE_LENGTH = 500;
const VENDOR_PAGE_SIZE = 20;

const VENDOR_STATUS_FILTERS = Object.freeze([
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
]);

const STATUS_LABELS = Object.freeze({
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
});

const STATUS_NOTES = Object.freeze({
  pending: "This application is waiting for an administrator decision.",
  approved:
    "Approved applications stay customer accounts. Approval does not verify the business or make any products available for sale.",
  rejected:
    "This decision is final unless an administrator reopens the application. The applicant cannot reapply publicly.",
  suspended:
    "Suspended applications cannot trade until an administrator reinstates them.",
});

const DECISIONS = Object.freeze({
  approve: {
    decision: "approve",
    label: "Approve",
    tone: "primary",
    success: "Vendor application approved",
    confirmation: (businessName) =>
      `Approve ${businessName} as a vendor? Approval lets the business be reviewed for future vendor features but does not publish any products.`,
  },
  reject: {
    decision: "reject",
    label: "Reject",
    tone: "danger",
    success: "Vendor application rejected",
    confirmation: (businessName) =>
      `Reject ${businessName}? The applicant cannot reapply publicly and will need an administrator to reopen the application.`,
  },
  suspend: {
    decision: "suspend",
    label: "Suspend",
    tone: "danger",
    success: "Vendor application suspended",
    confirmation: (businessName) =>
      `Suspend ${businessName}? The business will lose vendor access until it is reinstated.`,
  },
  reinstate: {
    decision: "reinstate",
    label: "Reinstate",
    tone: "primary",
    success: "Vendor application reinstated",
    confirmation: (businessName) =>
      `Reinstate ${businessName}? The business will regain vendor access immediately.`,
  },
});

const DECISIONS_BY_STATUS = Object.freeze({
  pending: ["approve", "reject"],
  approved: ["suspend"],
  suspended: ["reinstate"],
  rejected: [],
});

const statusLabel = (status) => STATUS_LABELS[status] || "Unknown status";

const statusNote = (status) => STATUS_NOTES[status] || "";

const decisionsForStatus = (status) =>
  (DECISIONS_BY_STATUS[status] || []).map((decision) => DECISIONS[decision]);

const canDecide = (status, decision) => (DECISIONS_BY_STATUS[status] || []).includes(decision);

const confirmationMessage = (decision, application) => {
  const action = DECISIONS[decision];
  if (!action) return "";
  return action.confirmation(application?.businessName || "this business");
};

const buildVendorListParams = ({ status, page = 1, limit = VENDOR_PAGE_SIZE } = {}) => {
  const isKnownStatus = VENDOR_STATUS_FILTERS.some((filter) => filter.value === status);
  const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Math.floor(Number(page)) : 1;
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.floor(Number(limit)) : VENDOR_PAGE_SIZE;
  return {
    status: isKnownStatus ? status : DEFAULT_VENDOR_STATUS_FILTER,
    page: safePage,
    limit: safeLimit,
  };
};

const validateReviewNote = (note) => {
  if (note === undefined || note === null) return { value: "" };
  if (typeof note !== "string") return { error: "Review notes must be text" };
  const value = note.trim();
  if (value.length > MAX_REVIEW_NOTE_LENGTH) {
    return { error: `Keep review notes to ${MAX_REVIEW_NOTE_LENGTH} characters or fewer` };
  }
  return { value };
};

const readApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const readVendorList = (payload) => {
  if (!payload || payload.success !== true) {
    throw new Error(payload?.message || "Unable to load vendor applications");
  }
  if (!Array.isArray(payload.data)) {
    throw new Error("The vendor application list could not be read");
  }
  return { items: payload.data, pagination: payload.pagination || null };
};

const readVendorDetail = (payload) => {
  if (!payload || payload.success !== true) {
    throw new Error(payload?.message || "Unable to load the vendor application");
  }
  if (!payload.application) {
    throw new Error("The vendor application could not be read");
  }
  return payload.application;
};

const readReviewResult = (payload) => {
  if (!payload || payload.success !== true) {
    throw new Error(payload?.message || "Unable to record the review decision");
  }
  if (!payload.application) {
    throw new Error("The review decision was not confirmed by the server");
  }
  return payload.application;
};

const FOCUS_LABELS = Object.freeze({
  poultry: "Poultry",
  cattle: "Cattle",
  sheep: "Sheep",
  goats: "Goats",
});

const vendorFocusLabel = (focus) => {
  if (!Array.isArray(focus) || focus.length === 0) return "Not specified";
  return focus
    .map((item) => FOCUS_LABELS[item] || String(item))
    .join(", ");
};

const formatVendorLocation = (vendor) => {
  const structured = [vendor?.lga, vendor?.state].filter(Boolean).join(", ");
  const location = vendor?.location || "";
  if (!structured) return location;
  return location ? `${structured} · ${location}` : structured;
};

const formatSubmittedAt = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const emptyListMessage = (status) => {
  if (status === "pending") return "No vendor applications are waiting for review.";
  if (status === "approved") return "No approved vendor applications yet.";
  if (status === "rejected") return "No rejected vendor applications.";
  if (status === "suspended") return "No suspended vendor applications.";
  return "No vendor applications found.";
};

export {
  DEFAULT_VENDOR_STATUS_FILTER,
  DECISIONS,
  MAX_REVIEW_NOTE_LENGTH,
  VENDOR_PAGE_SIZE,
  VENDOR_STATUS_FILTERS,
  buildVendorListParams,
  canDecide,
  confirmationMessage,
  decisionsForStatus,
  emptyListMessage,
  formatSubmittedAt,
  formatVendorLocation,
  readApiError,
  readReviewResult,
  readVendorDetail,
  readVendorList,
  statusLabel,
  statusNote,
  validateReviewNote,
  vendorFocusLabel,
};
