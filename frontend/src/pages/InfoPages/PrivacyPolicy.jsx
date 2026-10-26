import React from "react";
import { Helmet } from "react-helmet-async";
import "./InfoPages.css";

const PrivacyPolicy = () => (
  <main className="info-page-container">
    <Helmet>
      <title>Privacy Policy | Elevoni Farms</title>
      <meta name="description" content="How Elevoni Farms handles account, order, application and website information." />
    </Helmet>
    <p className="info-page-eyebrow">Privacy</p>
    <h1>Privacy Policy</h1>
    <p className="info-page-subtitle">Last updated: October 2026</p>
    <p>
      This policy explains the kinds of information Elevoni Farms may handle when you use the website, contact the team, place a direct order or submit a vendor application. Information handled depends on the feature you use.
    </p>

    <h2>1. Information we may collect</h2>
    <ul>
      <li><strong>Account details:</strong> name, email address and information needed to manage your account.</li>
      <li><strong>Order details:</strong> products, quantities, order totals, delivery information, payment references and order status.</li>
      <li><strong>Vendor application details:</strong> business name, contact person, phone number, location, product focus and any description you submit.</li>
      <li><strong>Website information:</strong> technical and usage information that may be collected by analytics tools configured on the site.</li>
      <li><strong>Messages:</strong> information you choose to provide when contacting Elevoni or making an enquiry.</li>
    </ul>

    <h2>2. How information is used</h2>
    <p>Information may be used to manage accounts, respond to enquiries, process and verify direct orders and payments, review vendor applications and listings, communicate about fulfilment, maintain security, and improve the website and its workflows.</p>

    <h2>3. Payments and service providers</h2>
    <p>
      Where Paystack is used, payment processing is handled through its payment service. Elevoni's system may retain order records, payment references and payment status so the transaction can be reconciled. Never share a card PIN, banking password or one-time passcode with Elevoni staff or another user.
    </p>
    <p>
      The website may use hosting, analytics, image storage, authentication or communication providers to operate its features. Those providers may process information needed to deliver their services under their own terms and policies.
    </p>

    <h2>4. Sharing and retention</h2>
    <p>
      Information may be accessed by authorised people who operate Elevoni and by service providers where needed for the purposes described above. We aim to limit access to information needed for the relevant task and retain records for operational, security or legal needs. The exact retention period can depend on the type of record.
    </p>

    <h2>5. Your choices and requests</h2>
    <p>
      Do not submit information that is not requested or needed for your enquiry or application. To ask about your account information or request a correction, contact Elevoni using the contact details on the website. We may need to verify your request before making changes.
    </p>

    <h2>6. Contact</h2>
    <p>For privacy questions, contact <strong>ahashimbala01@gmail.com</strong>.</p>
    <p>This page is a practical summary and should be reviewed by the business for completeness and compliance before being treated as legal advice.</p>
  </main>
);

export default PrivacyPolicy;
