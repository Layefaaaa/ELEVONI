import {
  formatSubmittedAt,
  statusCopy,
  VENDOR_PRODUCT_FOCUS,
} from "../../utils/vendorApplication";
import "./VendorStatusCard.css";

const FOCUS_LABELS = new Map(VENDOR_PRODUCT_FOCUS.map((option) => [option.value, option.label]));

const focusLabel = (focus) => {
  if (!Array.isArray(focus) || focus.length === 0) return "Not specified";
  return focus.map((item) => FOCUS_LABELS.get(item) || item).join(", ");
};

const CONTACT_HREF =
  "https://wa.me/2348135738991?text=" +
  encodeURIComponent("Hello Elevoni Farms, I have a question about my vendor application.");

const FALLBACK_COPY = {
  title: "Application status unavailable",
  body: "We could not read the current status of this application.",
  nextSteps: "Refresh the page or contact Elevoni if the problem continues.",
};

const VendorStatusCard = ({ application, contactHref = CONTACT_HREF }) => {
  if (!application) return null;
  const copy = statusCopy(application.status) || FALLBACK_COPY;
  const showsContact = application.status === "rejected" || application.status === "suspended";

  return (
    <section
      className={`vendor-status vendor-status-${application.status || "unknown"}`}
      aria-labelledby="vendor-status-title"
    >
      <p className="vendor-status-eyebrow">Your vendor application</p>
      <h2 id="vendor-status-title">{copy.title}</h2>
      <p className="vendor-status-body">{copy.body}</p>
      <p className="vendor-status-next">{copy.nextSteps}</p>

      <dl className="vendor-status-details">
        <div>
          <dt>Business or farm</dt>
          <dd>{application.businessName}</dd>
        </div>
        <div>
          <dt>Contact name</dt>
          <dd>{application.contactName}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{application.phone}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{application.location}</dd>
        </div>
        <div>
          <dt>Livestock focus</dt>
          <dd>{focusLabel(application.productFocus)}</dd>
        </div>
        <div>
          <dt>Submitted</dt>
          <dd>{formatSubmittedAt(application.submittedAt)}</dd>
        </div>
        {application.description && (
          <div className="wide">
            <dt>Business description</dt>
            <dd>{application.description}</dd>
          </div>
        )}
      </dl>

      <p className="vendor-status-disclaimer">
        Approval does not verify stock, publish products or enable checkout.
      </p>

      {showsContact && (
        <a className="vendor-status-contact" href={contactHref} target="_blank" rel="noopener noreferrer">
          Contact Elevoni about this application
        </a>
      )}
    </section>
  );
};

export default VendorStatusCard;
