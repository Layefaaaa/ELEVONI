import { useContext } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { FaHome, FaCompass, FaStore, FaUserCircle } from "react-icons/fa";
import { StoreContext } from "../context/StoreContext";
import "./MobileBottomNav.css";

const MobileBottomNav = ({ setShowLogin }) => {
  const { token } = useContext(StoreContext);
  const location = useLocation();
  const navigate = useNavigate();

  const accountActive = ["/myorders", "/order", "/cart"].some((path) =>
    location.pathname.startsWith(path),
  );

  const openAccount = () => {
    if (token) navigate("/myorders");
    else setShowLogin(true);
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      <NavLink to="/" end className={({ isActive }) => `mobile-bottom-nav__item${isActive ? " is-active" : ""}`}>
        <FaHome aria-hidden="true" />
        <span>Home</span>
      </NavLink>
      <NavLink to="/marketplace" className={({ isActive }) => `mobile-bottom-nav__item${isActive ? " is-active" : ""}`}>
        <FaCompass aria-hidden="true" />
        <span>Explore</span>
      </NavLink>
      <NavLink to="/sell-with-elevoni" className={({ isActive }) => `mobile-bottom-nav__item${isActive ? " is-active" : ""}`}>
        <FaStore aria-hidden="true" />
        <span>Sell</span>
      </NavLink>
      <button type="button" className={`mobile-bottom-nav__item${accountActive ? " is-active" : ""}`} onClick={openAccount}>
        <FaUserCircle aria-hidden="true" />
        <span>Account</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
