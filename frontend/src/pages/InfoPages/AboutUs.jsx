import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import "./InfoPages.css";

const AboutUs = () => (
  <main className="info-page-container">
    <Helmet>
      <title>About Elevoni Farms</title>
      <meta name="description" content="Learn about Elevoni Farms, its smoked-catfish business and its developing agricultural marketplace." />
    </Helmet>
    <p className="info-page-eyebrow">About us</p>
    <h1>Building more structure into agricultural commerce.</h1>
    <p className="info-page-subtitle">
      Elevoni Farms began with a real agricultural supply business in smoked catfish. We are using that experience to build clearer ways for buyers to discover products and communicate with agricultural businesses.
    </p>

    <div className="info-callout-box">
      <h3>What exists today</h3>
      <p>
        Elevoni Direct offers smoked catfish through its existing catalogue and order flow. Separately, the agricultural marketplace is being developed to display reviewed vendor listings and support enquiries. A marketplace enquiry is not a confirmed sale or delivery.
      </p>
    </div>

    <h2>How we approach the work</h2>
    <ul>
      <li><strong>Clarity:</strong> show what is available and distinguish current services from planned categories.</li>
      <li><strong>Careful review:</strong> vendor applications and individual product listings are reviewed separately before publication.</li>
      <li><strong>Practical service:</strong> confirm product details, quantities, price and fulfilment arrangements with the team before an order is treated as agreed.</li>
      <li><strong>Learning from real activity:</strong> build better records and workflows from genuine enquiries, orders and feedback rather than assumed results.</li>
    </ul>

    <h2>Where we are going</h2>
    <p>
      Our longer-term direction is an agricultural commerce platform that can support more product categories and help businesses make better-informed decisions. These are development goals, not a claim that every category, vendor or analytics capability is live today.
    </p>
    <p><Link to="/marketplace">Explore marketplace listings</Link> or <Link to="/sell-with-elevoni">apply to sell with Elevoni</Link>.</p>
  </main>
);

export default AboutUs;
