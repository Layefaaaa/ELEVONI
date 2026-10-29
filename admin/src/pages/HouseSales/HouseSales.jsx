import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api";
import "./HouseSales.css";

const today = () => new Date().toISOString().slice(0, 10);
const reference = () => `house-sale-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
const blank = () => ({ productName: "Smoked Catfish", unit: "kg", quantity: "", unitPrice: "", saleDate: today(), saleTime: "", salesChannel: "whatsapp", paymentStatus: "unpaid", amountReceived: "", fulfilmentStatus: "pending", buyerIdentityStatus: "identified", buyerName: "", buyerContact: "", buyerState: "", buyerArea: "", notes: "", recordSource: "business_reported" });
const money = (value) => `₦${Number(value || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" }) : "Date not recorded";

const HouseSales = ({ url }) => {
  const [form, setForm] = useState(blank);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const total = useMemo(() => Math.round((Number(form.quantity || 0) * Number(form.unitPrice || 0) + Number.EPSILON) * 100) / 100, [form.quantity, form.unitPrice]);
  const received = form.paymentStatus === "paid" ? total : form.paymentStatus === "unpaid" ? 0 : Number(form.amountReceived || 0);

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`${url}/api/admin/house-sales`, { params: { page: 1, limit: 50 } });
      setSales(response.data?.data || []);
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load Elevoni sales.");
    } finally { setLoading(false); }
  }, [url]);

  useEffect(() => { void loadSales(); }, [loadSales]);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value, ...(name === "buyerIdentityStatus" && value === "anonymous" ? { buyerName: "", buyerContact: "" } : {}) }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (form.buyerIdentityStatus === "identified" && !form.buyerName.trim() && !form.buyerContact.trim()) {
      toast.error("For an identified buyer, enter a name or contact detail."); return;
    }
    if (form.buyerIdentityStatus === "anonymous" && (form.buyerName.trim() || form.buyerContact.trim())) {
      toast.error("Clear buyer name and contact for anonymous sales."); return;
    }
    if (form.paymentStatus === "partial" && !(Number(form.amountReceived) > 0 && Number(form.amountReceived) < total)) {
      toast.error("Part payment must be greater than zero and less than the sale total."); return;
    }
    const submissionReference = reference();
    setSaving(true);
    try {
      const payload = { ...form, submissionReference, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice), amountReceived: received };
      const response = await api.post(`${url}/api/admin/house-sales`, payload);
      toast.success(response.data?.message || "Sale recorded.");
      setForm(blank());
      await loadSales();
    } catch (e) { toast.error(e.response?.data?.message || "Unable to record sale."); }
    finally { setSaving(false); }
  };

  return <main className="house-sales-page">
    <header className="house-sales-header"><div><p className="house-sales-eyebrow">Elevoni house business</p><h1>Offline Sales Log</h1><p>Record Elevoni's own offline sales, including historical smoked-catfish sales. These are separate from external-vendor sales and platform orders.</p></div></header>
    <section className="house-sales-panel">
      <h2>Record a sale</h2>
      <form className="house-sales-form" onSubmit={submit}>
        <label>Product name<input name="productName" required minLength={2} maxLength={160} value={form.productName} onChange={update} /></label>
        <label>Unit<select name="unit" value={form.unit} onChange={update}>{["kg", "gram", "piece", "crate", "ton", "bag", "carton", "litre"].map((unit) => <option key={unit}>{unit}</option>)}</select></label>
        <label>Quantity<input name="quantity" type="number" min="0.000001" step="any" required value={form.quantity} onChange={update} /></label>
        <label>Actual unit price (₦)<input name="unitPrice" type="number" min="0.01" step="0.01" required value={form.unitPrice} onChange={update} /></label>
        <label>Sale date<input name="saleDate" type="date" max={today()} required value={form.saleDate} onChange={update} /></label>
        <label>Sale time (optional)<input name="saleTime" type="time" value={form.saleTime} onChange={update} /></label>
        <label>Sales channel<select name="salesChannel" value={form.salesChannel} onChange={update}>{[["phone", "Phone call"], ["whatsapp", "WhatsApp"], ["in_person", "In person"], ["other", "Other"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Payment status<select name="paymentStatus" value={form.paymentStatus} onChange={update}>{[["paid", "Paid in full"], ["partial", "Part payment"], ["unpaid", "Unpaid"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {form.paymentStatus === "partial" && <label>Amount received (₦)<input name="amountReceived" type="number" min="0.01" step="0.01" required value={form.amountReceived} onChange={update} /></label>}
        <label>Fulfilment status<select name="fulfilmentStatus" value={form.fulfilmentStatus} onChange={update}>{[["pending", "Pending"], ["fulfilled", "Fulfilled"], ["cancelled", "Cancelled"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Record type<select name="recordSource" value={form.recordSource} onChange={update}><option value="business_reported">New business-reported sale</option><option value="historical_import">Historical record entry</option></select></label>
        <label>Buyer identification<select name="buyerIdentityStatus" value={form.buyerIdentityStatus} onChange={update}><option value="identified">Identified buyer</option><option value="anonymous">Anonymous buyer</option><option value="unknown">Identity unknown</option></select></label>
        <label>Buyer / business name<input name="buyerName" maxLength={120} value={form.buyerName} onChange={update} /></label>
        <label>Buyer contact<input name="buyerContact" maxLength={120} value={form.buyerContact} onChange={update} /></label>
        <label>Buyer state<input name="buyerState" maxLength={100} value={form.buyerState} onChange={update} /></label>
        <label>Buyer town / area<input name="buyerArea" maxLength={120} value={form.buyerArea} onChange={update} /></label>
        <label className="house-sales-wide">Notes<textarea name="notes" rows="3" maxLength={1000} value={form.notes} onChange={update} placeholder="Optional context about the transaction" /></label>
        <div className="house-sales-total"><span>Sale total</span><strong>{money(total)}</strong><span>Amount received</span><strong>{money(received)}</strong><span>Balance due</span><strong>{money(Math.max(0, total - received))}</strong></div>
        <p className="house-sales-note house-sales-wide">Offline entries are marked unverified by default. Do not invent missing buyer details or exact sale times. Payment and fulfilment are tracked separately.</p>
        <button className="house-sales-submit" type="submit" disabled={saving}>{saving ? "Saving…" : "Record sale"}</button>
      </form>
    </section>
    <section className="house-sales-panel"><div className="house-sales-list-header"><h2>Recent Elevoni sales</h2><button type="button" onClick={() => void loadSales()} disabled={loading}>Refresh</button></div>
      {loading ? <p role="status">Loading sales…</p> : error ? <p role="alert">{error}</p> : sales.length === 0 ? <p>No sales recorded yet.</p> : <div className="house-sales-table-wrap"><table><thead><tr><th>Date</th><th>Product</th><th>Quantity</th><th>Total</th><th>Buyer</th><th>Location</th><th>Payment</th><th>Source</th></tr></thead><tbody>{sales.map((sale) => <tr key={sale._id}><td>{dateLabel(sale.saleDate)}{sale.saleTime ? ` · ${sale.saleTime}` : ""}</td><td>{sale.productName}</td><td>{sale.quantity} {sale.unit}</td><td>{money(sale.totalAmount)}</td><td>{sale.buyerName || sale.buyerContact || (sale.buyerIdentityStatus === "anonymous" ? "Anonymous" : "Unknown")}</td><td>{[sale.buyerArea, sale.buyerState].filter(Boolean).join(", ") || "Unknown"}</td><td>{sale.paymentStatus}</td><td>{sale.recordSource === "historical_import" ? "Historical" : "Business-reported"} · {sale.verificationStatus}</td></tr>)}</tbody></table></div>}
    </section>
  </main>;
};

export default HouseSales;
