import "./Sidebar.css";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/add", label: "Add direct product", icon: "+" },
  { to: "/list", label: "Direct catalogue", icon: "▦" },
  { to: "/orders", label: "Orders", icon: "↗" },
  { to: "/house-sales", label: "Elevoni Sales Log", icon: "₦" },
  { to: "/reviews", label: "Reviews", icon: "☆" },
  { to: "/marketplace-products", label: "Marketplace listings", icon: "◈" },
  { to: "/vendors", label: "Vendor applications", icon: "♙" },
];

const Sidebar = () => (
  <aside className="sidebar">
    <p className="sidebar-heading">Operations</p>
    <nav className="sidebar-options" aria-label="Admin navigation">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-option${isActive ? " active" : ""}`}>
          <span className="sidebar-icon-glyph" aria-hidden="true">{item.icon}</span>
          <span className="sidebar-option-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  </aside>
);

export default Sidebar;
