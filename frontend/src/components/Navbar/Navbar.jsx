import React, { useContext, useState, useEffect, useRef } from "react";
import "./Navbar.css";
import { assets } from "../../assets/assets";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { StoreContext } from "../../context/StoreContext";
import { isUnauthorizedResponse } from "../../utils/authSession";
import { FaShoppingCart, FaBars, FaTimes } from "react-icons/fa";
import axios from "axios";

const Navbar = ({ setShowLogin }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [userName, setUserName] = useState("");

  const { getTotalCartAmount, token, url, invalidateSession } = useContext(StoreContext);

  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get logged-in user's name from the authenticated profile response.
  useEffect(() => {
    let isCurrentRequest = true;
    setUserName("");

    const fetchUser = async () => {
      if (!token) return;

      try {
        const response = await axios.get(`${url}/api/user/me`, {
          headers: { token },
        });
        const name =
          response.data?.success === true &&
          typeof response.data.user?.name === "string"
            ? response.data.user.name.trim()
            : "";

        if (isCurrentRequest) setUserName(name);
      } catch (error) {
        if (isCurrentRequest) {
          if (isUnauthorizedResponse(error)) {
            invalidateSession();
            return;
          }
          console.error("Failed to fetch user profile:", error.message);
        }
      }
    };

    fetchUser();
    return () => {
      isCurrentRequest = false;
    };
  }, [token, url, invalidateSession]);

  const getInitial = () => {
    if (!userName) return "?";

    return userName.trim().charAt(0).toUpperCase();
  };

  const logout = () => {
    invalidateSession();
    setUserName("");
    setProfileDropdownOpen(false);
    navigate("/");
  };

  const handleNavClick = () => setMobileMenuOpen(false);

  return (
    <nav
      className={`navbar ${isScrolled ? "scrolled" : ""}`}
      aria-label="Main Navigation"
    >
      <Link to="/" className="navbar-logo-link">
        <img src={assets.logo} alt="Elevoni Logo" className="logo" />
      </Link>

      <ul className={`navbar-menu ${mobileMenuOpen ? "mobile-active" : ""}`}>
        <li className="mobile-menu-close">
          <button
            className="close-drawer-btn"
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </li>
        <li><Link to="/" onClick={handleNavClick} className={location.pathname === "/" ? "active" : ""}>Home</Link></li>
        <li><Link to="/#categories" onClick={handleNavClick} className={location.pathname.startsWith("/category/") ? "active" : ""}>Categories</Link></li>
        <li><Link to="/marketplace" onClick={handleNavClick} className={location.pathname === "/marketplace" ? "active" : ""}>Marketplace</Link></li>
        <li><Link to="/#fish-display" onClick={handleNavClick}>Smoked catfish</Link></li>
        <li><Link to="/sell-with-elevoni" onClick={handleNavClick} className={`navbar-sell-link ${location.pathname === "/sell-with-elevoni" ? "active" : ""}`}>Sell with Elevoni <span aria-hidden="true">→</span></Link></li>
        <li><Link to="/about" onClick={handleNavClick} className={location.pathname === "/about" ? "active" : ""}>About</Link></li>
        <li className="mobile-policy-link"><Link to="/delivery" onClick={handleNavClick} className={location.pathname === "/delivery" ? "active" : ""}>Delivery policy</Link></li>
        <li className="mobile-policy-link"><Link to="/privacy" onClick={handleNavClick} className={location.pathname === "/privacy" ? "active" : ""}>Privacy policy</Link></li>
      </ul>

      <div className="navbar-right">
        <div className="navbar-search-icon">
          <Link to="/cart" aria-label="Shopping Cart">
            <FaShoppingCart />
          </Link>

          <div className={getTotalCartAmount() === 0 ? "" : "dot"}></div>
        </div>

        {!token ? (
          <button onClick={() => setShowLogin(true)}>sign in</button>
        ) : (
          <div className="navbar-profile" ref={dropdownRef}>
            <button
              className="navbar-avatar"
              type="button"
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              aria-label={`Open ${userName || "user"} profile menu`}
              aria-haspopup="true"
              aria-expanded={profileDropdownOpen}
              aria-controls="nav-profile-dropdown"
            >
              {getInitial()}
            </button>

            <ul
              id="nav-profile-dropdown"
              className={`nav-profile-dropdown ${
                profileDropdownOpen ? "show" : ""
              }`}
            >
              <li
                onClick={() => {
                  navigate("/myorders");
                  setProfileDropdownOpen(false);
                }}
              >
                <img src={assets.bag_icon} alt="" />
                <p>Orders</p>
              </li>

              <hr />

              <li onClick={logout}>
                <img src={assets.logout_icon} alt="" />
                <p>Logout</p>
              </li>

              <hr />
            </ul>
          </div>
        )}

        <button
          className="mobile-toggle-btn"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
        >
          <FaBars />
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          className="navbar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;
