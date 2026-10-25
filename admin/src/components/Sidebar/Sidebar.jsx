import React from "react";
import "./Sidebar.css";
import { assets } from "../../assets/assets";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-options">
        <NavLink to="/add" className="sidebar-option">
          <img src={assets.add_icon} alt="Add" className="sidebar-icon" />
          <p>Add Items</p>
        </NavLink>

        <NavLink to="/list" className="sidebar-option">
          <img src={assets.order_icon} alt="List" className="sidebar-icon" />
          <p>List Items</p>
        </NavLink>

        <NavLink to="/orders" className="sidebar-option">
          <img src={assets.order_icon} alt="Orders" className="sidebar-icon" />
          <p>Orders</p>
        </NavLink>

        <NavLink to="/reviews" className="sidebar-option">
          <img src={assets.order_icon} alt="Reviews" className="sidebar-icon" />
          <p>Reviews</p>
        </NavLink>

        <NavLink to="/marketplace-products" className="sidebar-option">
          <img src={assets.order_icon} alt="" className="sidebar-icon" />
          <p>Marketplace Products</p>
        </NavLink>

        <NavLink to="/vendors" className="sidebar-option">
          <img src={assets.order_icon} alt="Vendors" className="sidebar-icon" />
          <p>Vendors</p>
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
