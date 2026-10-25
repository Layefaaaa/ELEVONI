// Vendor application rules shared by the API and its tests.
//
// Approval status is deliberately separate from the account role: a vendor
// account remains a normal "customer" account. Only an administrator can move
// an application between states, and only through the transitions declared
// here.

const VENDOR_STATUSES = Object.freeze(["pending", "approved", "rejected", "suspended"]);

const VENDOR_PRODUCT_FOCUS = Object.freeze(["poultry", "cattle", "sheep", "goats"]);

const VENDOR_DECISIONS = Object.freeze({
    approve: { from: "pending", to: "approved" },
    reject: { from: "pending", to: "rejected" },
    suspend: { from: "approved", to: "suspended" },
    reinstate: { from: "suspended", to: "approved" },
    reopen: { from: "rejected", to: "pending" }
});

const VENDOR_DECISION_NAMES = Object.freeze(Object.keys(VENDOR_DECISIONS));

const MAX_DECISION_NOTE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 1000;

const isPlainText = (value) => typeof value === "string";

const trimmedText = (value) => (isPlainText(value) ? value.trim() : "");

const statusAfterDecision = (status, decision) => {
    const transition = VENDOR_DECISIONS[decision];
    if (!transition || transition.from !== status) return null;
    return transition.to;
};

const parseProductFocus = (value) => {
    if (!Array.isArray(value)) return null;
    const unique = [...new Set(value.map((item) => trimmedText(item).toLowerCase()).filter(Boolean))];
    if (unique.length === 0) return null;
    if (unique.some((item) => !VENDOR_PRODUCT_FOCUS.includes(item))) return null;
    return unique;
};

// Validates the business fields a vendor submits. Account fields (name, email,
// password) are validated by the account-registration service instead.
const validateVendorApplicationFields = (body = {}) => {
    const businessName = trimmedText(body.businessName);
    if (businessName.length < 2 || businessName.length > 120) {
        return { error: "Enter a business or farm name between 2 and 120 characters" };
    }

    const contactName = trimmedText(body.contactName);
    if (contactName.length < 2 || contactName.length > 120) {
        return { error: "Enter a contact name between 2 and 120 characters" };
    }

    const phone = trimmedText(body.phone);
    const phoneDigits = phone.replace(/\D/g, "");
    if (!/^[+0-9()\-\s.]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
        return { error: "Enter a valid phone number" };
    }

    const location = trimmedText(body.location);
    if (location.length < 2 || location.length > 120) {
        return { error: "Enter a location between 2 and 120 characters" };
    }

    const productFocus = parseProductFocus(body.productFocus);
    if (!productFocus) {
        return { error: "Select at least one livestock product focus" };
    }

    const description = isPlainText(body.description) ? body.description.trim() : "";
    if (description.length > MAX_DESCRIPTION_LENGTH) {
        return { error: `Keep the business description under ${MAX_DESCRIPTION_LENGTH} characters` };
    }

    return {
        fields: { businessName, contactName, phone, location, productFocus, description }
    };
};

const validateDecisionNote = (note) => {
    if (note === undefined || note === null) return "";
    if (!isPlainText(note)) return null;
    const trimmed = note.trim();
    if (trimmed.length > MAX_DECISION_NOTE_LENGTH) return null;
    return trimmed;
};

// The applicant-facing view. Internal review notes, reviewer identity and the
// audit trail are intentionally excluded.
const publicVendorApplication = (profile) => ({
    id: profile._id,
    businessName: profile.businessName,
    contactName: profile.contactName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    productFocus: profile.productFocus || [],
    description: profile.description || "",
    status: profile.status,
    submittedAt: profile.createdAt,
    updatedAt: profile.updatedAt
});

// The administrator view. This is only ever returned by admin-only endpoints.
const adminVendorApplication = (profile) => ({
    ...publicVendorApplication(profile),
    userId: profile.userId,
    reviewedBy: profile.reviewedBy || null,
    reviewedAt: profile.reviewedAt || null,
    decisionNote: profile.decisionNote || "",
    statusHistory: (profile.statusHistory || []).map((entry) => ({
        status: entry.status,
        at: entry.at,
        by: entry.by || null,
        note: entry.note || ""
    }))
});

// Compact row for the administrator list.
const adminVendorSummary = (profile) => ({
    id: profile._id,
    businessName: profile.businessName,
    contactName: profile.contactName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    productFocus: profile.productFocus || [],
    status: profile.status,
    submittedAt: profile.createdAt,
    reviewedAt: profile.reviewedAt || null
});

export {
    MAX_DECISION_NOTE_LENGTH,
    MAX_DESCRIPTION_LENGTH,
    VENDOR_DECISIONS,
    VENDOR_DECISION_NAMES,
    VENDOR_PRODUCT_FOCUS,
    VENDOR_STATUSES,
    adminVendorApplication,
    adminVendorSummary,
    parseProductFocus,
    publicVendorApplication,
    statusAfterDecision,
    validateDecisionNote,
    validateVendorApplicationFields
};
