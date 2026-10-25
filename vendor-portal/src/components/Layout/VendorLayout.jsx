import { Link, NavLink, Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/auth-context";
import "./VendorLayout.css";

const VendorLayout = () => {
  const { isAuthenticated, signOut } = useContext(AuthContext);

  return (
    <div className="vendor-app">
      <header className="vendor-header">
        <div className="vendor-header-inner">
          <Link to="/" className="vendor-brand">
            <span className="vendor-brand-mark">Elevoni</span>
            <span className="vendor-brand-sub">Vendor Portal</span>
          </Link>
          <nav className="vendor-nav" aria-label="Vendor portal navigation">
            <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>
              Dashboard
            </NavLink>
            <NavLink to="/apply" className={({ isActive }) => (isActive ? "active" : undefined)}>
              Apply to Sell
            </NavLink>
            <NavLink to="/login" className={({ isActive }) => (isActive ? "active" : undefined)}>
              {isAuthenticated ? "Account" : "Sign in"}
            </NavLink>
          </nav>
          {isAuthenticated && (
            <button type="button" className="vendor-signout" onClick={signOut}>
              Sign out
            </button>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="vendor-footer">
        <div className="vendor-footer-inner">
          <p>Elevoni Vendor Portal — separate from the public storefront and admin dashboard.</p>
          <p className="vendor-footer-note">Browser storage is isolated per origin. No vendor data is pre-loaded in this scaffold.</p>
        </div>
      </footer>
    </div>
  );
};

export default VendorLayout;
