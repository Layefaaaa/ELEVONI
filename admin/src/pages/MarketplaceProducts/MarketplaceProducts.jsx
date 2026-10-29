import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api";
import Pagination from "../../components/Pagination/Pagination";
import "./MarketplaceProducts.css";

const FILTERS = ["pending", "approved", "rejected", "all"];
const label = (status) => ({ pending: "Pending review", approved: "Approved", rejected: "Rejected", all: "All listings" }[status] || status);
const formatMoney = (value) => `₦${Number(value || 0).toLocaleString("en-NG")}`;
const vendorLocation = (vendor) => {
  const structured = [vendor?.lga, vendor?.state].filter(Boolean).join(", ");
  if (!structured) return vendor?.location || "";
  return vendor?.location ? `${structured} · ${vendor.location}` : structured;
};

const MarketplaceProducts = ({ url }) => {
  const [status, setStatus] = useState("pending");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState("");
  const [notes, setNotes] = useState({});
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = status === "all" ? {} : { status };
      const response = await api.get(`${url}/api/products/admin/all`, { params });
      if (!response.data?.success || !Array.isArray(response.data.data)) throw new Error("Unexpected response from the product moderation API");
      setProducts(response.data.data);
      setPage(1);
    } catch (loadError) {
      setProducts([]);
      setError(loadError.response?.data?.message || loadError.message || "Unable to load marketplace listings");
    } finally { setLoading(false); }
  }, [url, status]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const moderate = async (product, nextStatus) => {
    if (submitting) return;
    if (nextStatus === "approved" && product.vendorId?.status && product.vendorId.status !== "approved") {
      toast.error("Approve the vendor application before approving this product.");
      return;
    }
    const action = nextStatus === "approved" ? "approve" : nextStatus === "rejected" ? "reject" : "return to pending";
    if (!window.confirm(`${action[0].toUpperCase()}${action.slice(1)} “${product.name}”?`)) return;
    setSubmitting(product._id);
    try {
      await api.patch(`${url}/api/products/admin/${product._id}/status`, {
        status: nextStatus,
        rejectionReason: notes[product._id] || "",
      });
      toast.success(`Listing ${nextStatus}.`);
      setProducts((current) => status === "all" ? current.map((item) => item._id === product._id ? { ...item, status: nextStatus, rejectionReason: notes[product._id] || "" } : item) : current.filter((item) => item._id !== product._id));
    } catch (moderationError) {
      toast.error(moderationError.response?.data?.message || "Unable to update this listing");
    } finally { setSubmitting(""); }
  };

  const pages = Math.max(1, Math.ceil(products.length / pageSize));
  const visible = products.slice((page - 1) * pageSize, page * pageSize);

  return (
    <main className="marketplace-moderation">
      <header className="marketplace-moderation-header"><div><p className="moderation-eyebrow">Marketplace governance</p><h1>Product listings</h1><p>Review vendor submissions separately from vendor applications. Approval publishes a listing only while its vendor remains approved.</p></div><button type="button" className="moderation-refresh" onClick={loadProducts}>Refresh</button></header>
      <div className="moderation-filters" role="group" aria-label="Filter listings by status">{FILTERS.map((filter) => <button type="button" key={filter} className={status === filter ? "active" : ""} aria-pressed={status === filter} onClick={() => setStatus(filter)}>{label(filter)}</button>)}</div>
      {loading && <p className="moderation-state" role="status">Loading listings…</p>}
      {!loading && error && <div className="moderation-state moderation-error" role="alert"><p>{error}</p><button type="button" onClick={loadProducts}>Try again</button></div>}
      {!loading && !error && products.length === 0 && <div className="moderation-state"><h2>No {status === "all" ? "" : `${status} `}listings</h2><p>Vendor product submissions will appear here after they are saved.</p></div>}
      {!loading && !error && products.length > 0 && <>
        <p className="moderation-result-count">{products.length} {products.length === 1 ? "listing" : "listings"}</p>
        <div className="moderation-product-list">{visible.map((product) => <article className="moderation-product" key={product._id}>
          <div className="moderation-product-image">{product.images?.[0] ? <img src={product.images[0]} alt="" loading="lazy" /> : <span aria-hidden="true">✳</span>}</div>
          <div className="moderation-product-info"><div className="moderation-product-top"><h2>{product.name}</h2><span className={`moderation-status moderation-status-${product.status}`}>{label(product.status)}</span></div><p className="moderation-product-vendor">{product.vendorId?.businessName || "No vendor profile linked"} {vendorLocation(product.vendorId) ? `· ${vendorLocation(product.vendorId)}` : ""}</p><p className="moderation-product-description">{product.description || "No description provided."}</p><div className="moderation-product-meta"><strong>{formatMoney(product.price)} / {product.unitOfMeasure || "unit"}</strong><span>Stock: {product.stockQuantity ?? 0}</span><span>{product.category}</span><span>Vendor: {label(product.vendorId?.status || "unknown")}</span></div>{product.status === "rejected" && product.rejectionReason && <p className="moderation-reason">Previous reason: {product.rejectionReason}</p>}
            {product.status !== "approved" && <label className="moderation-note-label">Review note / rejection reason<textarea rows="2" value={notes[product._id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [product._id]: event.target.value.slice(0, 500) }))} placeholder="Explain what needs to be fixed, if applicable" /></label>}
            <div className="moderation-actions">{product.status !== "approved" && <button type="button" className="moderation-approve" disabled={Boolean(submitting)} onClick={() => moderate(product, "approved")}>{submitting === product._id ? "Saving…" : "Approve listing"}</button>}{product.status !== "rejected" && <button type="button" className="moderation-reject" disabled={Boolean(submitting)} onClick={() => moderate(product, "rejected")}>Reject</button>}{product.status !== "pending" && <button type="button" className="moderation-secondary" disabled={Boolean(submitting)} onClick={() => moderate(product, "pending")}>Return to pending</button>}</div>
          </div>
        </article>)}</div>
        <Pagination pagination={{ page, limit: pageSize, total: products.length, totalPages: pages, hasPrevious: page > 1, hasNext: page < pages }} onPageChange={setPage} />
      </>}
    </main>
  );
};

export default MarketplaceProducts;
