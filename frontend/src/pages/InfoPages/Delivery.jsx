import React from "react";
import { Helmet } from "react-helmet-async";
import "./InfoPages.css";

const Delivery = () => (
  <main className="info-page-container">
    <Helmet>
      <title>Delivery & Fulfilment | Elevoni Farms</title>
      <meta name="description" content="Learn how to confirm availability, price and delivery arrangements with Elevoni before ordering." />
    </Helmet>
    <p className="info-page-eyebrow">Delivery & fulfilment</p>
    <h1>Confirm the details before you order.</h1>
    <p className="info-page-subtitle">
      Delivery availability, timing and cost depend on the product, quantity and destination. Contact Elevoni to confirm the arrangements for your specific request before making payment.
    </p>

    <div className="info-callout-box">
      <h3>Marketplace enquiries are not completed orders</h3>
      <p>
        A listing does not by itself confirm stock, a final price, payment terms or delivery. Elevoni and the buyer must confirm these details before treating a marketplace enquiry as an order.
      </p>
    </div>

    <h2>For smoked catfish orders</h2>
    <ol>
      <li>Choose the quantity you need from the direct catalogue.</li>
      <li>Provide the destination and any timing requirements when contacting Elevoni.</li>
      <li>Confirm availability, final price, delivery cost and expected timing with the team.</li>
      <li>At handover, check the product and quantity against the agreed order and report any concern promptly.</li>
    </ol>

    <h2>For marketplace listings</h2>
    <p>
      Use the listing enquiry option to ask about current stock and fulfilment. Do not assume that an advertised stock quantity means the item has been independently checked or reserved for you. Do not pay a vendor based solely on a listing; confirm the agreed process with Elevoni first.
    </p>

    <h2>Need to confirm an arrangement?</h2>
    <p>Contact Elevoni with the product, quantity and delivery location so the team can respond to your specific request.</p>
  </main>
);

export default Delivery;
