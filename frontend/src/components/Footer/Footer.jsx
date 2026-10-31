import React from "react";
import "./Footer.css";
import { assets } from "../../assets/assets";
import { Link } from "react-router-dom";
import { ELEVONI_ENQUIRY_PHONE_DISPLAY } from "../../config/contact.js";

const Footer = () => {
  return (
    <div className="footer" id="footer">
      <div className="footer-content">
        <div className="footer-content-left">
          <img id="logo" src={assets.logo} alt="Elevoni Farms" />
          <p>
            Elevoni brings its smoked-catfish business online while building a reviewed marketplace for agricultural products. Marketplace listings are enquiries, not completed orders; availability and delivery arrangements must be confirmed.
          </p>
          <div className="footer-social-icons">
            <a
              href="https://x.com/feedoh_bala"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img id="twitter" src={assets.twitter_icon} alt="X" />
            </a>

            <a
              href="https://www.instagram.com/elevoni_farm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img id="insta" src={assets.insta} alt="Instagram" />
            </a>
          </div>
        </div>
        <div className="footer-content-center">
          <h2>COMPANY</h2>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/about">About us</Link>
            </li>
            <li>
              <Link to="/delivery">Delivery</Link>
            </li>
            <li>
              <Link to="/privacy">Privacy policy</Link>
            </li>
            <li>
              <Link to="/sell-with-elevoni">Sell with Elevoni</Link>
            </li>
          </ul>
        </div>
        <div className="footer-content-right">
          <h2>GET IN TOUCH</h2>
          <ul>
            <li>08135738991</li>
            <li>Feedoh001@gmail.com</li>
            <li>Abuja, Nigeria</li>
          </ul>
        </div>
      </div>
      <hr />
      <p className="footer-copyright">
        Copyright 2026 &copy; ELEVONI - All Rights Reserved.
      </p>
    </div>
  );
};

export default Footer;
