import { useCallback, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api";
import { AuthContext } from "../../context/auth-context";
import "./Dashboard.css";

const CATEGORIES = ["Poultry & Eggs", "Livestock & Meat"];
const UNITS = ["kg", "gram", "piece", "crate", "ton", "bag", "carton", "litre"];
const blankForm = { name: "", description: "", price: "", category: "Livestock & Meat", subcategory: "Poultry", unitOfMeasure: "kg", stockQuantity: "", images: "", media: [] };
const categoriesForFocus = (focus = []) => {
  const categories = [];
  if (focus.includes("poultry")) categories.push("Poultry & Eggs");
  if (["cattle", "sheep", "goats"].some((item) => focus.includes(item))) categories.push("Livestock & Meat");
  return categories;
};
const formatMoney = (value) => `₦${Number(value || 0).toLocaleString("en-NG")}`;
const statusLabel = (status) => ({ pending: "Under review", approved: "Approved", rejected: "Rejected" }[status] || status || "Unknown");

const Dashboard = () => {
  const { isAuthenticated, user, application, loading: sessionLoading } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [mediaProgress, setMediaProgress] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const allowedCategories = categoriesForFocus(application?.productFocus);

  useEffect(() => {
    if (!allowedCategories.length || allowedCategories.includes(form.category)) return;
    setForm((current) => ({ ...current, category: allowedCategories[0] }));
  }, [application?.status, application?.productFocus?.join(","), form.category]);

  const loadProducts = useCallback(async () => {
    if (!isAuthenticated || application?.status !== "approved") {
      setProducts([]);
      return;
    }
    setProductsLoading(true);
    setProductsError("");
    try {
      const response = await api.get("/api/products/vendor/me");
      setProducts(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      setProductsError(error.response?.data?.message || "Unable to load your product listings.");
    } finally {
      setProductsLoading(false);
    }
  }, [isAuthenticated, application?.status]);

  useEffect(() => { loadProducts(); }, [loadProducts, refresh]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const resetForm = () => { setForm(blankForm); setEditingId(""); };

  const startEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name || "", description: product.description || "", price: String(product.price ?? ""),
      category: product.category || allowedCategories[0] || CATEGORIES[0], subcategory: product.subcategory || "Poultry", unitOfMeasure: product.unitOfMeasure || "kg",
      stockQuantity: String(product.stockQuantity ?? ""), images: Array.isArray(product.images) ? product.images.join("\n") : "", media: Array.isArray(product.media) ? product.media : (product.images || []).map((url) => ({ url, type: "image", alt: "" }))
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uploadMedia = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const valid = files.filter((file) => {
      const okType = file.type.startsWith("image/") || file.type.startsWith("video/");
      const maxBytes = file.type.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (!okType || file.size > maxBytes) {
        setMediaError(`${file.name}: ${!okType ? "choose an image or video file" : `file exceeds ${file.type.startsWith("video/") ? "50 MB" : "10 MB"}`}.`);
        return false;
      }
      return true;
    });
    if (!valid.length) return;
    if (form.media.length + valid.length > 10) { setMediaError("A listing can contain up to 10 media files."); return; }
    setMediaError(""); setUploadingMedia(true); setMediaProgress(0);
    try {
      const body = new FormData(); valid.forEach((file) => body.append("media", file));
      const response = await api.post("/api/products/vendor/media", body, {
        onUploadProgress: (event) => { if (event.total) setMediaProgress(Math.round(event.loaded / event.total * 100)); }
      });
      const uploaded = Array.isArray(response.data?.data) ? response.data.data : [];
      setForm((current) => {
        const media = [...current.media, ...uploaded].slice(0, 10);
        if (!current.media.some((item) => item.type === "image")) {
          const firstImageIndex = media.findIndex((item) => item.type === "image");
          if (firstImageIndex > 0) { const [primary] = media.splice(firstImageIndex, 1); media.unshift(primary); }
        }
        return { ...current, media };
      });
    } catch (error) { setMediaError(error.response?.data?.message || "Media upload failed. Please try again."); }
    finally { setUploadingMedia(false); setMediaProgress(0); }
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    if (saving) return;
    const price = Number(form.price);
    const stockQuantity = Number(form.stockQuantity || 0);
    if (!form.name.trim() || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stockQuantity) || stockQuantity < 0) {
      toast.error("Enter a product name, a price above zero, and a valid stock quantity.");
      return;
    }
    if (!allowedCategories.includes(form.category)) {
      toast.error("Choose a category that matches the product focus in your vendor application.");
      return;
    }
    const payload = {
      name: form.name.trim(), description: form.description.trim(), price, category: form.category, subcategory: form.subcategory,
      unitOfMeasure: form.unitOfMeasure, stockQuantity,
      images: form.media.filter((item) => item.type === "image").map((item) => item.url), media: form.media.slice(0, 10)
    };
    setSaving(true);
    try {
      if (editingId) await api.put(`/api/products/vendor/${editingId}`, payload);
      else await api.post("/api/products/vendor", payload);
      toast.success(editingId ? "Listing updated. Changes may need review before they appear publicly." : "Listing submitted. It will appear publicly after approval.");
      resetForm();
      setRefresh((value) => value + 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save this listing.");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete the listing “${product.name}”? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/products/vendor/${product._id}`);
      toast.success("Listing deleted.");
      setProducts((current) => current.filter((item) => item._id !== product._id));
      if (editingId === product._id) resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete this listing.");
    }
  };

  if (sessionLoading) return <section className="vendor-page"><p role="status">Checking your account…</p></section>;

  return (
    <section className="vendor-page">
      <header className="vendor-page-header">
        <p className="vendor-page-eyebrow">Vendor workspace</p>
        <h1>{user?.name ? `Welcome, ${user.name}` : "Your Elevoni workspace"}</h1>
        <p className="vendor-page-summary">Manage your application and product listings. A listing is not a completed order; confirm supply and fulfilment arrangements with Elevoni before promising delivery.</p>
      </header>

      {!isAuthenticated && <div className="vendor-notice"><h2>Sign in to continue</h2><p>Use your Elevoni customer account to check your application or manage an approved vendor profile.</p><Link className="vendor-link" to="/login">Sign in →</Link><span> or </span><Link className="vendor-link" to="/apply">Apply to sell →</Link></div>}

      {isAuthenticated && (!application || application.status !== "approved") && (
        <div className="vendor-notice">
          <p className="vendor-page-eyebrow">Application status</p>
          <h2>{application ? statusLabel(application.status) : "No vendor application found"}</h2>
          <p>{application?.status === "pending" ? "Your application is awaiting review. Product publishing becomes available after approval." : application?.status === "rejected" ? "Your application was not approved. Review the application page for the current status and next steps." : application?.status === "suspended" ? "Vendor tools are paused while this profile is suspended. Contact Elevoni for clarification." : "Submit your business details to start the vendor review process."}</p>
          <Link className="vendor-link" to="/apply">View application →</Link>
        </div>
      )}

      {isAuthenticated && application?.status === "approved" && (
        <>
          <div className="vendor-workspace-grid">
            <article className="vendor-stat-card"><span>Vendor status</span><strong>Approved</strong><p>Your vendor profile is active.</p></article>
            <article className="vendor-stat-card"><span>Your listings</span><strong>{products.length}</strong><p>Includes pending, approved and rejected listings.</p></article>
            <article className="vendor-stat-card"><span>Public visibility</span><strong>{products.filter((item) => item.status === "approved" && item.isAvailable).length}</strong><p>Approved listings marked available.</p></article>
          </div>

          <div className="vendor-manage-layout">
            <section className="vendor-card vendor-listing-form-card">
              <div className="vendor-card-heading"><div><p className="vendor-page-eyebrow">Product management</p><h2>{editingId ? "Edit listing" : "Add a product"}</h2></div>{editingId && <button type="button" className="vendor-button-secondary" onClick={resetForm}>Cancel edit</button>}</div>
              <form className="vendor-product-form" onSubmit={submitProduct}>
                <label>Product name<input name="name" value={form.name} onChange={updateField} required maxLength={160} placeholder="e.g. Fresh eggs" /></label>
                <label>Description<textarea name="description" value={form.description} onChange={updateField} rows="3" maxLength={1500} placeholder="Describe the product, quality and packaging" /></label>
                <div className="vendor-form-row"><label>Price (₦)<input name="price" type="number" min="1" step="0.01" value={form.price} onChange={updateField} required /></label><label>Unit<select name="unitOfMeasure" value={form.unitOfMeasure} onChange={updateField}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label></div>
                <div className="vendor-form-row"><label>Sector<select name="category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{allowedCategories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Livestock type<select name="subcategory" value={form.subcategory} onChange={updateField}>{["Poultry", "Cattle", "Sheep", "Goats"].filter((item) => application?.productFocus?.includes(item.toLowerCase())).map((item) => <option key={item}>{item}</option>)}</select></label></div>
                <label>Available stock<input name="stockQuantity" type="number" min="0" step="any" value={form.stockQuantity} onChange={updateField} /></label>
                <div className="vendor-media-field">
                  <label htmlFor="vendor-product-media">Product photos and videos <span className="vendor-label-note">(up to 10 files; images 10 MB, videos 50 MB each)</span></label>
                  <input id="vendor-product-media" type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime" multiple onChange={uploadMedia} disabled={uploadingMedia || form.media.length >= 10} />
                  {uploadingMedia && <p role="status">Uploading media… {mediaProgress}%</p>}
                  {mediaError && <p className="vendor-media-error" role="alert">{mediaError}</p>}
                  {form.media.length > 0 && <div className="vendor-media-previews">{form.media.map((item, index) => <div className="vendor-media-preview" key={`${item.url}-${index}`}>{item.type === "video" ? <video src={item.url} controls playsInline preload="metadata" /> : <img src={item.url} alt={item.alt || `Product media ${index + 1}`} />}{item.type === "image" && form.media.findIndex((mediaItem) => mediaItem.type === "image") === index && <span>Primary image</span>}<div>{item.type === "image" && <button type="button" disabled={index === 0} onClick={() => setForm((current) => { const media = [...current.media]; const [primary] = media.splice(index, 1); media.unshift(primary); return { ...current, media }; })}>Make primary</button>}<button type="button" disabled={index === 0} onClick={() => setForm((current) => { const media = [...current.media]; [media[index - 1], media[index]] = [media[index], media[index - 1]]; return { ...current, media }; })}>Move up</button><button type="button" disabled={index === current.media.length - 1} onClick={() => setForm((current) => { const media = [...current.media]; [media[index + 1], media[index]] = [media[index], media[index + 1]]; return { ...current, media }; })}>Move down</button><button type="button" onClick={() => setForm((current) => ({ ...current, media: current.media.filter((_, mediaIndex) => mediaIndex !== index) }))}>Remove</button></div></div>)}</div>}
                </div>
                <button className="vendor-button-primary" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Submit for review"}</button>
                <p className="vendor-form-note">New listings start as pending. Product approval is separate from vendor approval. Do not list stock you cannot reasonably supply.</p>
              </form>
            </section>

            <section className="vendor-card vendor-listings-card">
              <div className="vendor-card-heading"><div><p className="vendor-page-eyebrow">Your catalogue</p><h2>Product listings</h2></div><button type="button" className="vendor-button-secondary" onClick={() => setRefresh((value) => value + 1)}>Refresh</button></div>
              {productsLoading && <p role="status" className="vendor-inline-state">Loading your listings…</p>}
              {!productsLoading && productsError && <div className="vendor-inline-state vendor-inline-error"><p>{productsError}</p><button type="button" className="vendor-button-secondary" onClick={() => setRefresh((value) => value + 1)}>Try again</button></div>}
              {!productsLoading && !productsError && products.length === 0 && <div className="vendor-inline-state"><h3>No listings yet</h3><p>Add your first product. It will stay private until the product review is complete.</p></div>}
              {!productsLoading && !productsError && products.length > 0 && <div className="vendor-listings">{products.map((product) => <article className="vendor-listing-row" key={product._id}><button type="button" className="vendor-listing-thumb" onClick={() => startEdit(product)} aria-label={`Edit ${product.name}`}>{product.media?.find((item) => item.type === "image")?.url || product.images?.[0] ? <img src={product.media?.find((item) => item.type === "image")?.url || product.images?.[0]} alt="" loading="lazy" /> : <span aria-hidden="true">✳</span>}</button><div className="vendor-listing-main"><h3>{product.name}</h3><p>{formatMoney(product.price)} / {product.unitOfMeasure || "unit"} · Stock: {product.stockQuantity ?? 0}</p><span className={`vendor-product-status vendor-product-status-${product.status}`}>{statusLabel(product.status)}</span></div><div className="vendor-listing-actions"><button type="button" onClick={() => startEdit(product)}>Edit</button><button type="button" className="vendor-delete-action" onClick={() => deleteProduct(product)}>Delete</button></div></article>)}</div>}
            </section>
          </div>
        </>
      )}
    </section>
  );
};

export default Dashboard;
