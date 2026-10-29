import { Link } from "react-router-dom";
import { useState } from "react";
import {
  MAX_DESCRIPTION_LENGTH,
  VENDOR_PRODUCT_FOCUS,
} from "../../utils/vendorApplication";
import "./VendorApplicationForm.css";

const Field = ({ name, label, type = "text", value, error, onChange, autoComplete, hint }) => {
  const [visible, setVisible] = useState(false);
  const inputType = type === "password" && visible ? "text" : type;
  return (
  <div className="vendor-field">
    <label htmlFor={`vendor-${name}`}>{label}</label>
    <input
      id={`vendor-${name}`}
      name={name}
      type={inputType}
      value={value}
      autoComplete={autoComplete}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `vendor-${name}-error` : undefined}
      onChange={onChange}
    />
    {type === "password" && <button type="button" className="password-visibility-toggle" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible((value) => !value)}>{visible ? "Hide" : "Show"}</button>}
    {hint && <p className="vendor-field-hint">{hint}</p>}
    {error && (
      <p className="vendor-field-error" id={`vendor-${name}-error`} role="alert">
        {error}
      </p>
    )}
  </div>
  );
};

const VendorApplicationForm = ({
  mode,
  values,
  errors,
  busy,
  notice,
  accountEmail,
  onSubmit,
  onChange,
  onToggleFocus,
}) => {
  const isRegister = mode === "register";
  const focus = Array.isArray(values.productFocus) ? values.productFocus : [];

  return (
    <form className="vendor-form" onSubmit={onSubmit} noValidate>
      <h2>{isRegister ? "Apply to sell with Elevoni" : "Apply with your Elevoni account"}</h2>
      <p className="vendor-form-intro">
        {isRegister
          ? "Create an Elevoni account and tell us about your farm or business. We review every application before any selling tools are enabled."
          : "Your application will be linked to your existing account. You will keep using the same account."}
      </p>

      {notice && (
        <p className="vendor-form-notice" role="status" aria-live="polite">
          {notice}
        </p>
      )}

      {Object.keys(errors).length > 0 && (
        <div className="vendor-form-error-summary" role="alert" aria-labelledby="vendor-form-error-title">
          <h3 id="vendor-form-error-title">Please review these fields</h3>
          <p>{Object.keys(errors).length} {Object.keys(errors).length === 1 ? "issue needs" : "issues need"} your attention before you can continue:</p>
          <ul>
            {Object.entries(errors).map(([key, message]) => {
              const labels = { name: "Your full name", email: "Email address", password: "Password", businessName: "Business or farm name", contactName: "Contact name", phone: "Phone number", location: "Location", state: "State", lga: "Local government area", productFocus: "Livestock focus", description: "Business description" };
              const target = key === "productFocus" ? "vendor-productFocus-poultry" : `vendor-${key}`;
              return <li key={key}><a href={`#${target}`} onClick={(event) => { event.preventDefault(); document.getElementById(target)?.focus(); document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>{labels[key] || key}: {message}</a></li>;
            })}
          </ul>
        </div>
      )}

      {!isRegister && accountEmail && (
        <p className="vendor-form-account">
          Applying with your existing account <strong>{accountEmail}</strong>
        </p>
      )}

      <div className={isRegister ? "vendor-form-grid" : "vendor-form-grid single"}>
        {isRegister && (
          <>
            <Field
              name="name"
              label="Your full name"
              value={values.name}
              error={errors.name}
              autoComplete="name"
              onChange={onChange}
            />
            <Field
              name="email"
              label="Email address"
              type="email"
              value={values.email}
              error={errors.email}
              autoComplete="email"
              onChange={onChange}
            />
            <Field
              name="password"
              label="Password"
              type="password"
              value={values.password}
              error={errors.password}
              autoComplete="new-password"
              hint="At least 8 characters"
              onChange={onChange}
            />
          </>
        )}
        <Field
          name="businessName"
          label="Business or farm name"
          value={values.businessName}
          error={errors.businessName}
          autoComplete="organization"
          onChange={onChange}
        />
        <Field
          name="contactName"
          label="Contact name"
          value={values.contactName}
          error={errors.contactName}
          autoComplete="name"
          onChange={onChange}
        />
        <Field
          name="phone"
          label="Phone number"
          type="tel"
          value={values.phone}
          error={errors.phone}
          autoComplete="tel"
          onChange={onChange}
        />
        <Field
          name="state"
          label="State"
          value={values.state}
          error={errors.state}
          autoComplete="address-level1"
          onChange={onChange}
        />
        <Field
          name="lga"
          label="Local government area (LGA)"
          value={values.lga}
          error={errors.lga}
          autoComplete="address-level2"
          onChange={onChange}
        />
        <Field
          name="location"
          label="Location"
          value={values.location}
          error={errors.location}
          autoComplete="address-level2"
          hint="Town, city or state where the business operates"
          onChange={onChange}
        />
      </div>

      <fieldset className="vendor-focus" aria-describedby={errors.productFocus ? "vendor-productFocus-error" : undefined}>
        <legend>Livestock focus</legend>
        <p className="vendor-field-hint">Select all the livestock you work with.</p>
        <div className="vendor-focus-options">
          {VENDOR_PRODUCT_FOCUS.map((option) => (
            <label
              key={option.value}
              className={`vendor-focus-option ${focus.includes(option.value) ? "selected" : ""}`}
            >
              <input
                id={`vendor-productFocus-${option.value}`}
                type="checkbox"
                name="productFocus"
                aria-invalid={Boolean(errors.productFocus)}
                aria-describedby={errors.productFocus ? "vendor-productFocus-error" : undefined}
                value={option.value}
                checked={focus.includes(option.value)}
                onChange={() => onToggleFocus(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {errors.productFocus && (
          <p className="vendor-field-error" id="vendor-productFocus-error" role="alert">
            {errors.productFocus}
          </p>
        )}
      </fieldset>

      <div className="vendor-field">
        <label htmlFor="vendor-description">
          Business description <span className="vendor-field-optional">(optional)</span>
        </label>
        <textarea
          id="vendor-description"
          name="description"
          rows={4}
          value={values.description}
          maxLength={MAX_DESCRIPTION_LENGTH}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "vendor-description-error" : undefined}
          onChange={onChange}
        />
        <p className="vendor-field-hint">
          {values.description.length}/{MAX_DESCRIPTION_LENGTH} characters
        </p>
        {errors.description && (
          <p className="vendor-field-error" id="vendor-description-error" role="alert">
            {errors.description}
          </p>
        )}
      </div>

      <button type="submit" className="vendor-submit" disabled={busy}>
        {busy
          ? "Submitting application…"
          : isRegister
            ? "Create account and apply"
            : "Submit application"}
      </button>

      <p className="vendor-form-note">
        Applying does not publish products, verify stock or enable checkout. We do not ask for NIN,
        CAC documents, bank details or identity documents at this stage.
      </p>
      <p className="vendor-form-privacy">
        By applying you agree to our <Link to="/privacy">Privacy Policy</Link>.
      </p>
    </form>
  );
};

export default VendorApplicationForm;
