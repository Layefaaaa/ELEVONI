import { useCallback, useEffect, useState } from "react";
import "./Order.css";
import { toast } from "react-toastify";
import api from "../../api";
import { assets } from "../../assets/assets";
import Pagination from "../../components/Pagination/Pagination";

const PAGE_SIZE = 20;
const statuses = ["pending confirmation", "confirmed", "processing", "out_for_delivery", "delivered", "cancelled"];
const label = (value) => ({ pending_confirmation: "Pending confirmation", confirmed: "Confirmed", processing: "Processing", out_for_delivery: "Out for delivery", delivered: "Delivered", cancelled: "Cancelled", pending: "Awaiting payment", failed: "Failed" }[value] || value || "Unknown");
const legacyStatus = (value) => ({ "Fish Processing": "processing", "Out for delivery": "out_for_delivery", Delivered: "delivered" }[value] || "pending confirmation");

const Order = ({ url }) => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const fetchAllOrders = useCallback(async (targetPage = 1) => {
    try {
      const response = await api.get(url + "/api/order/list", { params: { page: targetPage, limit: PAGE_SIZE } });
      if (response.data.success) {
        setOrders(response.data.data);
        setPagination(response.data.pagination || null);
        setPage(targetPage);
      } else toast.error(response.data.message || "Unable to load orders");
    } catch (error) { toast.error(error.response?.data?.message || "Unable to load orders"); }
  }, [url]);
  const statusHandler = async (event, orderId) => {
    try {
      const response = await api.post(url + "/api/order/status", { orderId, status: event.target.value });
      if (response.data.success) await fetchAllOrders(page);
      else toast.error(response.data.message || "Unable to update status");
    } catch (error) { toast.error(error.response?.data?.message || "Unable to update status"); }
  };
  // The request updates state asynchronously after it resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchAllOrders(1); }, [fetchAllOrders]);
  return <div className="order add"><h3>Order Page</h3><div className="order-list">
    {orders.map((order) => {
      const currentStatus = order.orderStatus || legacyStatus(order.status);
      const paymentStatus = order.paymentStatus || (order.payment ? "successful" : "unpaid");
      return <div key={order._id} className="order-item">
        <img src={assets.parcel_icon} alt="" />
        <div>
          <p className="order-item-food">{(order.items || []).map((item) => (item.name || item.productName || "Product") + " x " + item.quantity).join(", ")}</p>
          <p className="order-item-name">{order.address?.firstName} {order.address?.lastName}</p>
          <div className="order-item-address"><p>{order.address?.street},</p><p>{order.address?.city}, {order.address?.state}, {order.address?.country}</p></div>
          <p className="order-item-phone">{order.address?.phone}</p>
        </div>
        <div><p>Items: {(order.items || []).length}</p><p>NGN {Number(order.amount || 0).toLocaleString()}</p><p>Payment: {label(paymentStatus)}</p><p>Channel: {label(order.source || (order.payment ? "online" : "whatsapp_manual"))}</p></div>
        <select aria-label="Order status" onChange={(event) => statusHandler(event, order._id)} value={statuses.includes(currentStatus) ? currentStatus : "pending confirmation"}>
          {statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
        </select>
      </div>;
    })}
  </div>
  <Pagination pagination={pagination} onPageChange={(nextPage) => fetchAllOrders(nextPage)} />
  </div>;
};
export default Order;
