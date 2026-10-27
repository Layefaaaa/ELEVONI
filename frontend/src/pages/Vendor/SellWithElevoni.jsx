import { useCallback, useContext, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import vendorIllustration from "../../assets/elevoni-vendor-illustration.svg";
import axios from "axios";
import { toast } from "react-toastify";
import { StoreContext } from "../../context/StoreContext";
import VendorApplicationForm from "../../components/VendorApplicationForm/VendorApplicationForm";
import VendorStatusCard from "../../components/VendorStatusCard/VendorStatusCard";
import { isUnauthorizedResponse, persistStoredToken } from "../../utils/authSession";
import {
  readApiError,
  readApplicationResult,
  readOwnApplication,
  readRegistrationResult,
  toApplicationPayload,
  toRegistrationPayload,
  validateApplication,
  validateRegistration,
} from "../../utils/vendorApplication";
import "./SellWithElevoni.css";

const emptyRegistration = {
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

const emptyApplication = {
  businessName: "",
  contactName: "",
  phone: "",
  location: "",
  productFocus: [],
  description: "",
};

const withoutKey = (errors, key) => {
  if (!errors[key]) return errors;
  const next = { ...errors };
  delete next[key];
  return next;
};

const SellWithElevoni = () => {
  const { url, token, setToken, invalidateSession } = useContext(StoreContext);
  const [user, setUser] = useState(null);
  const [application, setApplication] = useState(undefined);
  const [sessionLoading, setSessionLoading] = useState(Boolean(token));
  const [sessionError, setSessionError] = useState("");
  const [registration, setRegistration] = useState(emptyRegistration);
  const [applicationForm, setApplicationForm] = useState(emptyApplication);
  const [errors, setErrors] = useState({});
  const [formNotice, setFormNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadSession = useCallback(async () => {
    if (!token) {
      setUser(null);
      setApplication(undefined);
      setSessionError("");
      setSessionLoading(false);
      return;
    }

    setSessionLoading(true);
    setSessionError("");

    const config = { headers: { token } };
    try {
      const meResponse = await axios.get(url + "/api/user/me", config);
      if (meResponse.data?.success !== true || !meResponse.data.user) {
        throw new Error(meResponse.data?.message || "Unable to load your account");
      }
      setUser(meResponse.data.user);
      setApplicationForm((current) =>
        current.contactName ? current : { ...current, contactName: meResponse.data.user.name || "" },
      );
    } catch (error) {
      if (isUnauthorizedResponse(error)) {
        invalidateSession();
        setUser(null);
        setApplication(undefined);
      } else {
        setSessionError(readApiError(error, "Unable to load your account"));
      }
      setSessionLoading(false);
      return;
    }

    try {
      const applicationResponse = await axios.get(url + "/api/vendor/me", config);
      setApplication(readOwnApplication(applicationResponse.data));
    } catch (error) {
      if (isUnauthorizedResponse(error)) {
        invalidateSession();
        setUser(null);
        setApplication(undefined);
      } else {
        setSessionError(readApiError(error, "Unable to load your vendor application"));
      }
    } finally {
      setSessionLoading(false);
    }
  }, [invalidateSession, token, url]);

  // The current session owns the account and application lookup.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSession();
  }, [loadSession]);

  const updateRegistration = (event) => {
    const { name, value } = event.target;
    setRegistration((current) => ({ ...current, [name]: value }));
    setErrors((current) => withoutKey(current, name));
    setFormNotice("");
  };

  const updateApplication = (event) => {
    const { name, value } = event.target;
    setApplicationForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => withoutKey(current, name));
    setFormNotice("");
  };

  const toggleFocus = (setter) => (value) => {
    setter((current) => {
      const focus = Array.isArray(current.productFocus) ? current.productFocus : [];
      const productFocus = focus.includes(value)
        ? focus.filter((item) => item !== value)
        : [...focus, value];
      return { ...current, productFocus };
    });
    setErrors((current) => withoutKey(current, "productFocus"));
    setFormNotice("");
  };

  const submitRegistration = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const validation = validateRegistration(registration);
    setErrors(validation.errors);
    setFormNotice("");
    if (!validation.valid) {
      setFormNotice("Please fix the highlighted fields and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(url + "/api/vendor/register", toRegistrationPayload(registration));
      const result = readRegistrationResult(response.data);
      persistStoredToken(localStorage, result.token);
      setToken(result.token);
      setUser(result.user);
      setApplication(result.application);
      setRegistration(emptyRegistration);
      toast.success("Application submitted. We will review your details.");
    } catch (error) {
      if (error?.response?.status === 409) {
        setErrors((current) => ({
          ...current,
          email: "An account with this email already exists. Sign in, then apply from your account.",
        }));
      }
      setFormNotice(readApiError(error, "Unable to submit your vendor application"));
    } finally {
      setSubmitting(false);
    }
  };

  const submitApplication = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const validation = validateApplication(applicationForm);
    setErrors(validation.errors);
    setFormNotice("");
    if (!validation.valid) {
      setFormNotice("Please fix the highlighted fields and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        url + "/api/vendor/apply",
        toApplicationPayload(applicationForm),
        { headers: { token } },
      );
      setApplication(readApplicationResult(response.data));
      setApplicationForm(emptyApplication);
      toast.success("Application submitted. We will review your details.");
    } catch (error) {
      const existing = error?.response?.data?.application;
      if (error?.response?.status === 409 && existing) {
        setApplication(readOwnApplication({ success: true, application: existing }));
        toast.info("You already have a vendor application with this account.");
      } else if (isUnauthorizedResponse(error)) {
        invalidateSession();
        setFormNotice("Your session expired. Please sign in again from the navigation.");
      } else {
        setFormNotice(readApiError(error, "Unable to submit your vendor application"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const refreshApplication = async () => {
    if (!token) return;
    setSessionError("");
    try {
      const response = await axios.get(url + "/api/vendor/me", { headers: { token } });
      setApplication(readOwnApplication(response.data));
    } catch (error) {
      if (isUnauthorizedResponse(error)) {
        invalidateSession();
      } else {
        setSessionError(readApiError(error, "Unable to refresh your vendor application"));
      }
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="sell-page">
      <Helmet>
        <title>Sell with Elevoni | Elevoni Farms</title>
        <meta
          name="description"
          content="Apply to sell poultry, cattle, sheep or goats with Elevoni Farms. Applications are reviewed before any selling tools are enabled."
        />
      </Helmet>

      <nav className="sell-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Sell with Elevoni</span>
      </nav>

      <header className="sell-hero">
        <p className="sell-eyebrow">Partner with Elevoni</p>
        <h1>Sell with Elevoni</h1>
        <p className="sell-summary">
          Elevoni Farms is preparing its livestock category and inviting poultry, cattle, sheep and
          goat businesses to apply. Tell us about your farm or business and our team will review
          your application.
        </p>
        <p className="sell-summary-note">
          Applications are reviewed by a person. Applying does not create a listing, verify stock or
          enable checkout.
        </p>
        <img className="sell-hero-illustration" src={vendorIllustration} alt="" loading="lazy" />
      </header>

      <section className="sell-panel" aria-label="Vendor application">
        {sessionLoading && (
          <p className="sell-state" role="status">
            Checking your account&hellip;
          </p>
        )}

        {!sessionLoading && sessionError && (
          <div className="sell-state sell-error" role="alert">
            <p>{sessionError}</p>
            <button type="button" className="sell-secondary" onClick={loadSession}>
              Try again
            </button>
          </div>
        )}

        {!sessionLoading && !sessionError && !token && (
          <>
            <VendorApplicationForm
              mode="register"
              values={registration}
              errors={errors}
              busy={submitting}
              notice={formNotice}
              onSubmit={submitRegistration}
              onChange={updateRegistration}
              onToggleFocus={toggleFocus(setRegistration)}
            />
            <p className="sell-signin-hint">
              Already have an Elevoni account? Sign in from the navigation and come back to apply
              with your existing account instead of creating a new one.
            </p>
          </>
        )}

        {!sessionLoading && !sessionError && token && isAdmin && (
          <div className="sell-state">
            <h2>Administrator accounts cannot apply</h2>
            <p>
              Vendor applications are made from customer accounts. Sign in with a customer account
              to apply, or use the admin app to review applications.
            </p>
          </div>
        )}

        {!sessionLoading &&
          !sessionError &&
          token &&
          !isAdmin &&
          application === undefined && (
            <p className="sell-state" role="status">
              Loading your application&hellip;
            </p>
          )}

        {!sessionLoading && !sessionError && token && !isAdmin && application && (
          <div className="sell-status">
            <VendorStatusCard application={application} />
            <button type="button" className="sell-secondary" onClick={refreshApplication}>
              Refresh status
            </button>
          </div>
        )}

        {!sessionLoading &&
          !sessionError &&
          token &&
          !isAdmin &&
          application === null && (
            <VendorApplicationForm
              mode="apply"
              values={applicationForm}
              errors={errors}
              busy={submitting}
              notice={formNotice}
              accountEmail={user?.email}
              onSubmit={submitApplication}
              onChange={updateApplication}
              onToggleFocus={toggleFocus(setApplicationForm)}
            />
          )}
      </section>

      <section className="sell-expectations" aria-labelledby="sell-expectations-title">
        <h2 id="sell-expectations-title">What happens next</h2>
        <ol>
          <li>
            <strong>You apply.</strong> We receive your business details and livestock focus.
          </li>
          <li>
            <strong>We review.</strong> An Elevoni administrator reviews the application. Your
            application status is available on this page whenever you are signed in.
          </li>
          <li>
            <strong>We decide.</strong> If approved, your account stays a customer account. You can
            submit individual product listings, which are reviewed separately before appearing publicly.
          </li>
        </ol>
        <p>
          Vendor approval does not verify stock or automatically publish products. Checkout is not
          enabled for marketplace listings yet. We do not ask for NIN, CAC documents, bank details or
          identity documents at this stage.
        </p>
      </section>
    </div>
  );
};

export default SellWithElevoni;
