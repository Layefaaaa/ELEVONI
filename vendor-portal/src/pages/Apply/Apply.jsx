import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/auth-context";
import api from "../../api";
import "./Apply.css";

const PRODUCT_OPTIONS = [
  { value: "poultry", label: "Poultry" },
  { value: "cattle", label: "Cattle" },
  { value: "sheep", label: "Sheep" },
  { value: "goats", label: "Goats" },
];

const STATUS_DETAILS = {
  pending: {
    title: "Application under review",
    message:
      "Thank you for applying. Elevoni's team is reviewing your details.",
  },
  approved: {
    title: "Application approved",
    message:
      "Your application is approved. You can submit product listings for separate review; checkout is not enabled for marketplace listings yet.",
  },
  rejected: {
    title: "Application not approved",
    message:
      "Your application was not approved at this time. Please contact Elevoni if you need clarification.",
  },
  suspended: {
    title: "Application suspended",
    message:
      "This application is currently suspended. Please contact Elevoni for clarification.",
  },
};

const INITIAL_FORM = {
  name: "",
  email: "",
  password: "",
  businessName: "",
  contactName: "",
  phone: "",
  location: "",
  productFocus: [],
  description: "",
};

const validateForm = (form, isAuthenticated) => {
  const errors = {};

  if (!isAuthenticated && !form.name.trim()) {
    errors.name = "Enter your full name.";
  }

  if (!isAuthenticated) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    if (form.password.length < 8) {
      errors.password = "Password must contain at least 8 characters.";
    }
  }

  if (
    form.businessName.trim().length < 2 ||
    form.businessName.trim().length > 120
  ) {
    errors.businessName = "Enter a business name between 2 and 120 characters.";
  }

  if (
    form.contactName.trim().length < 2 ||
    form.contactName.trim().length > 120
  ) {
    errors.contactName = "Enter a contact name between 2 and 120 characters.";
  }

  const phone = form.phone.trim();
  const digits = phone.replace(/\D/g, "");

  if (
    !/^[+0-9()\-\s.]+$/.test(phone) ||
    digits.length < 7 ||
    digits.length > 15
  ) {
    errors.phone = "Enter a valid phone number.";
  }

  if (form.location.trim().length < 2 || form.location.trim().length > 120) {
    errors.location = "Enter a location between 2 and 120 characters.";
  }

  if (!form.productFocus.length) {
    errors.productFocus = "Select at least one product category.";
  }

  if (form.description.trim().length > 1000) {
    errors.description = "Description must not exceed 1,000 characters.";
  }

  return errors;
};

const Apply = () => {
  const {
    isAuthenticated,
    loading,
    user,
    application,
    setApplication,
    signIn,
  } = useContext(AuthContext);

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setMessage("");
  };

  const toggleProduct = (value) => {
    setForm((current) => ({
      ...current,
      productFocus: current.productFocus.includes(value)
        ? current.productFocus.filter((item) => item !== value)
        : [...current.productFocus, value],
    }));

    setErrors((current) => ({ ...current, productFocus: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    const validationErrors = validateForm(form, isAuthenticated);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setMessage("Please correct the highlighted fields.");
      return;
    }

    setSubmitting(true);

    const businessDetails = {
      businessName: form.businessName.trim(),
      contactName: form.contactName.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      productFocus: form.productFocus,
      description: form.description.trim(),
    };

    try {
      if (isAuthenticated) {
        const response = await api.post("/api/vendor/apply", businessDetails);

        if (!response.data?.success || !response.data?.application) {
          throw new Error(
            response.data?.message || "Unable to submit your application.",
          );
        }

        setApplication(response.data.application);
        setMessage("Your application has been submitted successfully.");
      } else {
        const response = await api.post("/api/vendor/register", {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          ...businessDetails,
        });

        const result = response.data;

        if (!result?.success || !result?.token || !result?.user) {
          throw new Error(
            result?.message || "Unable to create your account and application.",
          );
        }

        const session = await signIn(result.token, result.user);

        setApplication(session?.application ?? result.application ?? null);

        setMessage("Your account and vendor application have been created.");
      }
    } catch (error) {
      const status = error.response?.status;

      if (status === 409 && error.response?.data?.application) {
        setApplication(error.response.data.application);
        setMessage(
          "An application already exists for this account. Its current status is shown below.",
        );
      } else if (status === 409) {
        setMessage(
          error.response?.data?.message ||
            "An account or application already exists. Try signing in.",
        );
      } else if (status === 400) {
        setMessage(
          error.response?.data?.message ||
            "Some submitted details were rejected. Please review them.",
        );
      } else {
        setMessage(
          error.response?.data?.message ||
            error.message ||
            "We couldn't complete the request. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="vendor-page">
        <p role="status">Checking your account and application…</p>
      </section>
    );
  }

  if (application) {
    const details = STATUS_DETAILS[application.status];

    return (
      <section className="vendor-page">
        <header className="vendor-page-header">
          <p className="vendor-page-eyebrow">Your application</p>
          <h1>{details?.title || "Application status"}</h1>
          <p className="vendor-page-summary">
            {details?.message ||
              "Your application has been received. Contact Elevoni if you need help confirming its status."}
          </p>
        </header>

        <article className="vendor-card">
          <h2>{application.businessName}</h2>
          <p>
            <strong>Status:</strong> {application.status || "Unknown"}
          </p>
          <p>
            <strong>Product focus:</strong>{" "}
            {Array.isArray(application.productFocus)
              ? application.productFocus.join(", ")
              : "Not specified"}
          </p>
          <p>
            <strong>Location:</strong> {application.location || "Not specified"}
          </p>
          <p className="vendor-note">
            Application approval does not itself publish products or enable
            orders, checkout, or seller earnings.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="vendor-page">
      <header className="vendor-page-header">
        <p className="vendor-page-eyebrow">Vendor application</p>
        <h1>Apply to sell with Elevoni</h1>
        <p className="vendor-page-summary">
          Tell us about your business or farm. Our team will review your
          application before making a decision.
        </p>
      </header>

      <article className="vendor-card">
        <form onSubmit={handleSubmit} noValidate>
          {!isAuthenticated && (
            <>
              <h2>Create your account</h2>

              <div className="vendor-form-field">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={updateField}
                  required
                />
                {errors.name && (
                  <p className="vendor-form-error">{errors.name}</p>
                )}
              </div>

              <div className="vendor-form-field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={updateField}
                  required
                />
                {errors.email && (
                  <p className="vendor-form-error">{errors.email}</p>
                )}
              </div>

              <div className="vendor-form-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={form.password}
                  onChange={updateField}
                  required
                />
                {errors.password && (
                  <p className="vendor-form-error">{errors.password}</p>
                )}
              </div>

              <p className="vendor-note">
                Already have an account? <Link to="/login">Sign in</Link> before
                applying.
              </p>
            </>
          )}

          <h2>Business details</h2>

          {isAuthenticated && user?.email && (
            <p className="vendor-note">
              Applying as <strong>{user.email}</strong>
            </p>
          )}

          <div className="vendor-form-field">
            <label htmlFor="businessName">Business or farm name</label>
            <input
              id="businessName"
              name="businessName"
              autoComplete="organization"
              value={form.businessName}
              onChange={updateField}
              required
            />
            {errors.businessName && (
              <p className="vendor-form-error">{errors.businessName}</p>
            )}
          </div>

          <div className="vendor-form-field">
            <label htmlFor="contactName">Contact person's name</label>
            <input
              id="contactName"
              name="contactName"
              autoComplete="name"
              value={form.contactName}
              onChange={updateField}
              required
            />
            {errors.contactName && (
              <p className="vendor-form-error">{errors.contactName}</p>
            )}
          </div>

          <div className="vendor-form-field">
            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={updateField}
              required
            />
            {errors.phone && (
              <p className="vendor-form-error">{errors.phone}</p>
            )}
          </div>

          <div className="vendor-form-field">
            <label htmlFor="location">Business location</label>
            <input
              id="location"
              name="location"
              autoComplete="street-address"
              value={form.location}
              onChange={updateField}
              required
            />
            {errors.location && (
              <p className="vendor-form-error">{errors.location}</p>
            )}
          </div>

          <fieldset className="vendor-form-field vendor-product-options">
            <legend>What products does your business focus on?</legend>
            {PRODUCT_OPTIONS.map((option) => (
              <label key={option.value} className="vendor-checkbox-option">
                <input
                  type="checkbox"
                  checked={form.productFocus.includes(option.value)}
                  onChange={() => toggleProduct(option.value)}
                />
                {option.label}
              </label>
            ))}
            {errors.productFocus && (
              <p className="vendor-form-error">{errors.productFocus}</p>
            )}
          </fieldset>

          <div className="vendor-form-field">
            <label htmlFor="description">Business description (optional)</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              maxLength={1000}
              value={form.description}
              onChange={updateField}
            />
            <p className="vendor-meta">
              {form.description.length}/1000 characters
            </p>
            {errors.description && (
              <p className="vendor-form-error">{errors.description}</p>
            )}
          </div>

          {message && (
            <p className="vendor-form-message" role="status" aria-live="polite">
              {message}
            </p>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit application"}
          </button>

          <p className="vendor-note">
            Applications are reviewed by Elevoni. Submission does not
            automatically grant selling access.
          </p>
        </form>
      </article>
    </section>
  );
};

export default Apply;
