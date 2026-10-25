// Presentation and request helpers for the "Sell with Elevoni" experience.

const VENDOR_PRODUCT_FOCUS = Object.freeze([
  { value: "poultry", label: "Poultry" },
  { value: "cattle", label: "Cattle" },
  { value: "sheep", label: "Sheep" },
  { value: "goats", label: "Goats" },
]);

const VENDOR_STATUS_COPY = Object.freeze({
  pending: {
    title: "Application under review",
    body:
      "Thanks for applying to sell with Elevoni. Our team is reviewing your details. We'll keep you updated through the account you're signed in with.",
    nextSteps:
      "No changes are needed right now. Approval does not verify stock, publish products or enable checkout yet.",
  },
  approved: {
    title: "Application approved",
    body:
      "Your application has been approved. Your account remains a customer account for now.",
    nextSteps:
      "Approval does not verify stock or automatically publish products. Approved vendors can submit listings for separate review; checkout is not enabled yet.",
  },
  rejected: {
    title: "Application not approved",
    body:
      "We weren't able to approve this application at this time.",
    nextSteps:
      "This decision is not something you can change from this page. If you think there's been a misunderstanding, please contact Elevoni directly using the details on our site.",
  },
  suspended: {
    title: "Application suspended",
    body:
      "Selling access for this application is currently suspended.",
    nextSteps:
      "Please contact Elevoni if you need clarification about reinstatement. Products cannot be published until reinstated.",
  },
});

const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_BUSINESS_NAME = 120;
const MAX_CONTACT_NAME = 120;
const MAX_LOCATION = 120;
const PHONE_PATTERN = /^[+0-9()\-\s.]+$/;

const trimmed = (value) => (typeof value === "string" ? value.trim() : "");

const emailValid = (value) => {
  const email = trimmed(value);
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const phoneDigits = (value) => trimmed(value).replace(/\D/g, "");

const phoneValid = (value) => {
  const phone = trimmed(value);
  if (!PHONE_PATTERN.test(phone)) return false;
  const digits = phoneDigits(phone);
  return digits.length >= 7 && digits.length <= 15;
};

const validateRegistration = (data = {}) => {
  const errors = {};
  if (!trimmed(data.name)) {
    errors.name = "Enter your full name";
  }
  if (!emailValid(data.email)) errors.email = "Enter a valid email address";
  const password = typeof data.password === "string" ? data.password : "";
  if (password.length < 8) errors.password = "Password must be at least 8 characters";
  if (trimmed(data.businessName).length < 2 || trimmed(data.businessName).length > MAX_BUSINESS_NAME) {
    errors.businessName = "Enter a business or farm name between 2 and 120 characters";
  }
  if (trimmed(data.contactName).length < 2 || trimmed(data.contactName).length > MAX_CONTACT_NAME) {
    errors.contactName = "Enter a contact name between 2 and 120 characters";
  }
  if (!phoneValid(data.phone)) errors.phone = "Enter a valid phone number";
  if (trimmed(data.location).length < 2 || trimmed(data.location).length > MAX_LOCATION) {
    errors.location = "Enter a location between 2 and 120 characters";
  }
  if (!Array.isArray(data.productFocus) || data.productFocus.length === 0) {
    errors.productFocus = "Select at least one livestock product focus";
  }
  const description = trimmed(data.description);
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Keep the business description under ${MAX_DESCRIPTION_LENGTH} characters`;
  }
  return { errors, valid: Object.keys(errors).length === 0 };
};

const validateApplication = (data = {}) => {
  const errors = {};
  if (trimmed(data.businessName).length < 2 || trimmed(data.businessName).length > MAX_BUSINESS_NAME) {
    errors.businessName = "Enter a business or farm name between 2 and 120 characters";
  }
  if (trimmed(data.contactName).length < 2 || trimmed(data.contactName).length > MAX_CONTACT_NAME) {
    errors.contactName = "Enter a contact name between 2 and 120 characters";
  }
  if (!phoneValid(data.phone)) errors.phone = "Enter a valid phone number";
  if (trimmed(data.location).length < 2 || trimmed(data.location).length > MAX_LOCATION) {
    errors.location = "Enter a location between 2 and 120 characters";
  }
  if (!Array.isArray(data.productFocus) || data.productFocus.length === 0) {
    errors.productFocus = "Select at least one livestock product focus";
  }
  const description = trimmed(data.description);
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Keep the business description under ${MAX_DESCRIPTION_LENGTH} characters`;
  }
  return { errors, valid: Object.keys(errors).length === 0 };
};

const toRegistrationPayload = (data = {}) => ({
  name: trimmed(data.name),
  email: trimmed(data.email).toLowerCase(),
  password: typeof data.password === "string" ? data.password : "",
  businessName: trimmed(data.businessName),
  contactName: trimmed(data.contactName),
  phone: trimmed(data.phone),
  location: trimmed(data.location),
  productFocus: Array.isArray(data.productFocus)
    ? data.productFocus
        .filter((item) => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    : [],
  description: trimmed(data.description),
});

const toApplicationPayload = (data = {}) => ({
  businessName: trimmed(data.businessName),
  contactName: trimmed(data.contactName),
  phone: trimmed(data.phone),
  location: trimmed(data.location),
  productFocus: Array.isArray(data.productFocus)
    ? data.productFocus
        .filter((item) => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    : [],
  description: trimmed(data.description),
});

const readApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const readOwnApplication = (payload) => {
  if (!payload) throw new Error("Unable to load your application");
  if (payload.success === true && payload.application === null) return null;
  if (payload.success === true && payload.application) {
    if (Object.prototype.hasOwnProperty.call(payload.application, "decisionNote")) {
      throw new Error("Internal review data was returned to an applicant");
    }
    if (Object.prototype.hasOwnProperty.call(payload.application, "reviewedBy")) {
      throw new Error("Internal review data was returned to an applicant");
    }
    return payload.application;
  }
  throw new Error(payload?.message || "Unable to load your application");
};

const readRegistrationResult = (payload) => {
  if (!payload || payload.success !== true) {
    throw new Error(payload?.message || "Unable to submit your vendor application");
  }
  if (!payload.token) throw new Error("The server did not return a session token");
  if (!payload.user) {
    throw new Error("The server did not return a session for the new account");
  }
  if (payload.application && Object.prototype.hasOwnProperty.call(payload.application, "decisionNote")) {
    throw new Error("Internal review data was returned to an applicant");
  }
  return {
    token: payload.token,
    user: payload.user,
    application: payload.application || null,
  };
};

const readApplicationResult = (payload) => {
  if (!payload || payload.success !== true) {
    throw new Error(payload?.message || "Unable to submit your vendor application");
  }
  if (payload.application && Object.prototype.hasOwnProperty.call(payload.application, "decisionNote")) {
    throw new Error("Internal review data was returned to an applicant");
  }
  if (payload.application && Object.prototype.hasOwnProperty.call(payload.application, "reviewedBy")) {
    throw new Error("Internal review data was returned to an applicant");
  }
  return payload.application || null;
};

const statusCopy = (status) => VENDOR_STATUS_COPY[status] || null;

const formatSubmittedAt = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const containsInternalNotes = (application) => {
  if (!application || typeof application !== "object") return false;
  return (
    Object.prototype.hasOwnProperty.call(application, "decisionNote") ||
    Object.prototype.hasOwnProperty.call(application, "reviewedBy") ||
    Object.prototype.hasOwnProperty.call(application, "statusHistory")
  );
};

export {
  MAX_DESCRIPTION_LENGTH,
  VENDOR_PRODUCT_FOCUS,
  containsInternalNotes,
  emailValid,
  formatSubmittedAt,
  phoneDigits,
  phoneValid,
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
};
