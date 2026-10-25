import React from "react";
import "./Footer.css";
import { assets } from "../../assets/assets";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <div className="footer" id="footer">
      <div className="footer-content">
        <div className="footer-content-left">
          <img id="logo" src={assets.logo} alt="" />
          <p>
            Elevoni brings premium smoked catfish to homes, restaurants and businesses. We carefully prepare and smoke our catfish, then deliver it with the quality and service our customers expect. Thank you for choosing Elevoni Farms.
          </p>
          <div className="footer-social-icons">
            <a
              href="https://www.facebook.com/YourPageName"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={assets.facebook_icon} alt="Facebook" />
            </a>

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
            <li>+234 813 573 8991</li>
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
