import { Link, NavLink, Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/auth-context";
import logo from "../../assets/elevoni-logo.png";
import "./VendorLayout.css";

const VendorLayout = () => {
  const { isAuthenticated, signOut } = useContext(AuthContext);

  return (
    <div className="vendor-app">
      <header className="vendor-header">
        <div className="vendor-header-inner">
          <Link to="/" className="vendor-brand" aria-label="Elevoni Vendor Portal home">
            <img src={logo} alt="Elevoni Farms" className="vendor-brand-logo" />
            <span className="vendor-brand-divider" aria-hidden="true" />
            <span className="vendor-brand-sub">Vendor portal</span>
          </Link>
          <nav className="vendor-nav" aria-label="Vendor portal navigation">
            <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>Workspace</NavLink>
            <NavLink to="/sales" className={({ isActive }) => (isActive ? "active" : undefined)}>Sales log</NavLink>
            <NavLink to="/apply" className={({ isActive }) => (isActive ? "active" : undefined)}>Application</NavLink>
            <NavLink to="/login" className={({ isActive }) => (isActive ? "active" : undefined)}>{isAuthenticated ? "Account" : "Sign in"}</NavLink>
          </nav>
          <div className="vendor-header-actions">
            <a className="vendor-storefront-link" href="https://elevonifarms.vercel.app/marketplace" target="_blank" rel="noopener noreferrer">View marketplace <span aria-hidden="true">↗</span></a>
            {isAuthenticated && <button type="button" className="vendor-signout" onClick={signOut}>Sign out</button>}
          </div>
        </div>
      </header>
      <main className="vendor-main"><Outlet /></main>
      <footer className="vendor-footer">
        <div className="vendor-footer-inner">
          <p>Elevoni Farms <span aria-hidden="true">·</span> Vendor workspace</p>
          <p className="vendor-footer-note">Vendor approval and product-listing approval are separate. A listing is not a completed order.</p>
        </div>
      </footer>
    </div>
  );
};

export default VendorLayout;
