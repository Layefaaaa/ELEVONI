import { ELEVONI_WHATSAPP_PHONE } from "../../config/contact.js";
import React, { useState, useContext, useEffect, useCallback } from "react";
import "./MyOrders.css";
import { StoreContext } from "../../context/StoreContext";
import { isUnauthorizedResponse } from "../../utils/authSession";
import axios from "axios";
import { assets } from "../../assets/assets";

const MyOrders = () => {
  const { url, token, invalidateSession } = useContext(StoreContext);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [loadError, setLoadError] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await axios.post(
        url + "/api/order/userorders",
        {},
        { headers: { token } },
      );

      if (response.data.success) {
        setData(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        setData([]);
        setLoadError(response.data?.message || "Your orders could not be loaded.");
      }
    } catch (error) {
      setData([]);
      if (isUnauthorizedResponse(error)) {
        invalidateSession();
        return;
      }
      setLoadError(error.response?.data?.message || "Your orders could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [url, token, invalidateSession]);

  useEffect(() => {
    const timer = setTimeout(() => { if (token) fetchOrders(); else { setData([]); setLoading(false); setLoadError(""); } }, 0);
    return () => clearTimeout(timer);
  }, [token, fetchOrders]);

  const handleTrackOnWhatsApp = (order) => {
    const phoneNumber = ELEVONI_WHATSAPP_PHONE;

    const itemsText = Array.isArray(order.items)
      ? order.items.map((item) => `${item.name} x ${item.quantity}`).join(", ")
      : "";

    const firstName = order.address?.firstName || "";
    const lastName = order.address?.lastName || "";

    const message =
      `Hello, I'd like to check the status of my order!\n\n` +
      `Name: ${firstName} ${lastName}\n` +
      `Items: ${itemsText}\n` +
      `Total Amount: ₦${order.amount || 0}.00\n` +
      `Current Status: ${order.status || "Processing"}`;

    const encodedMessage = encodeURIComponent(message);

    window.open(
      `https://wa.me/${phoneNumber}?text=${encodedMessage}`,
      "_blank",
    );
  };

  return (
    <div className="my-orders">
      <h2>My Orders</h2>

      <div className="container">
        {loading ? (
          <p role="status">Loading your orders…</p>
        ) : loadError ? (
          <div className="orders-state" role="alert"><p>{loadError}</p><button type="button" onClick={fetchOrders}>Try again</button></div>
        ) : data.length === 0 ? (
          <p>You haven't placed any direct-catalogue orders yet.</p>
        ) : (
          data.map((order, index) => {
            const items = Array.isArray(order.items) ? order.items : [];

            return (
              <div key={order._id || index} className="my-orders-order">
                <img src={assets.parcel_icon} alt="" />

                <p>
                  {items.map((item, itemIndex) => (
                    <React.Fragment key={itemIndex}>
                      {item.name} x {item.quantity}
                      {itemIndex !== items.length - 1 ? ", " : ""}
                    </React.Fragment>
                  ))}
                </p>

                <p>₦{Number(order.amount || 0).toLocaleString()}.00</p>

                <p>Items: {items.length}</p>

                <p><span>&#x25cf;</span> <b>{order.orderStatus || order.status || "Processing"}</b></p><p>Payment: {order.paymentStatus || (order.payment ? "successful" : "unpaid")}</p>

                <button
                  className="whatsapp-track-btn"
                  onClick={() => handleTrackOnWhatsApp(order)}
                >
                  Track on WhatsApp
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyOrders;
