const CHANNELS = ["phone", "whatsapp", "in_person", "other"];
const PAYMENT = ["paid", "partial", "unpaid"];
const FULFILMENT = ["pending", "fulfilled", "cancelled"];
const UNITS = ["kg", "gram", "piece", "crate", "ton", "bag", "carton", "litre"];
const text = (v) => typeof v === "string" ? v.trim() : "";
const money = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
const optional = (v, max, label) => {
    if (v == null || v === "") return { value: "" };
    if (typeof v !== "string") return { error: `${label} must be text` };
    const value = v.trim();
    return value.length > max ? { error: `${label} must not exceed ${max} characters` } : { value };
};

const prepareHouseSale = (body = {}, { now = new Date() } = {}) => {
    if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Invalid sale payload" };
    const submissionReference = text(body.submissionReference);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(submissionReference)) return { error: "A valid unique submission reference is required" };
    const productName = text(body.productName);
    if (productName.length < 2 || productName.length > 160) return { error: "Product name must be between 2 and 160 characters" };
    const unit = text(body.unit);
    if (!UNITS.includes(unit)) return { error: "Choose a valid unit" };
    const quantity = Number(body.quantity);
    const unitPrice = Number(body.unitPrice);
    if (!Number.isFinite(quantity) || quantity <= 0) return { error: "Quantity must be greater than zero" };
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return { error: "Unit price must be greater than zero" };
    const totalAmount = money(quantity * unitPrice);
    const salesChannel = text(body.salesChannel);
    const paymentStatus = text(body.paymentStatus);
    const fulfilmentStatus = text(body.fulfilmentStatus || "pending");
    if (!CHANNELS.includes(salesChannel)) return { error: "Choose a valid sales channel" };
    if (!PAYMENT.includes(paymentStatus)) return { error: "Choose a valid payment status" };
    if (!FULFILMENT.includes(fulfilmentStatus)) return { error: "Choose a valid fulfilment status" };
    const amountReceived = body.amountReceived === "" || body.amountReceived == null ? (paymentStatus === "unpaid" ? 0 : NaN) : Number(body.amountReceived);
    if (!Number.isFinite(amountReceived) || amountReceived < 0 || amountReceived > totalAmount) return { error: "Amount received must be between zero and the sale total" };
    if (paymentStatus === "paid" && amountReceived !== totalAmount) return { error: "A paid sale must have the full amount received" };
    if (paymentStatus === "partial" && !(amountReceived > 0 && amountReceived < totalAmount)) return { error: "A partial payment must be greater than zero and less than the sale total" };
    if (paymentStatus === "unpaid" && amountReceived !== 0) return { error: "An unpaid sale must have zero amount received" };
    if (typeof body.saleDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.saleDate)) return { error: "Enter a valid sale date" };
    const saleDate = new Date(`${body.saleDate}T00:00:00.000Z`);
    if (Number.isNaN(saleDate.getTime()) || saleDate.toISOString().slice(0, 10) !== body.saleDate) return { error: "Enter a valid sale date" };
    if (saleDate.getTime() > Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) return { error: "Sale date cannot be in the future" };
    const saleTime = text(body.saleTime);
    if (saleTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(saleTime)) return { error: "Enter sale time in HH:MM format" };
    const identity = text(body.buyerIdentityStatus || (text(body.buyerName) || text(body.buyerContact) ? "identified" : "unknown"));
    if (!["identified", "anonymous", "unknown"].includes(identity)) return { error: "Choose a valid buyer identification option" };
    const buyerName = optional(body.buyerName, 120, "Buyer name");
    const buyerContact = optional(body.buyerContact, 120, "Buyer contact");
    const buyerState = optional(body.buyerState, 100, "Buyer state");
    const buyerArea = optional(body.buyerArea, 120, "Buyer area or town");
    const notes = optional(body.notes, 1000, "Notes");
    for (const result of [buyerName, buyerContact, buyerState, buyerArea, notes]) if (result.error) return { error: result.error };
    if (identity === "identified" && !buyerName.value && !buyerContact.value) return { error: "For an identified buyer, enter a name or contact detail" };
    if (identity === "anonymous" && (buyerName.value || buyerContact.value)) return { error: "Anonymous buyer records must not include a name or contact detail" };
    return { sale: {
        submissionReference, productName, unit, quantity, unitPrice: money(unitPrice), totalAmount,
        currency: "NGN", saleDate, saleTime, salesChannel, paymentStatus, amountReceived: money(amountReceived),
        fulfilmentStatus, buyerIdentityStatus: identity, buyerName: buyerName.value, buyerContact: buyerContact.value,
        buyerState: buyerState.value, buyerArea: buyerArea.value, notes: notes.value,
        recordSource: body.recordSource === "historical_import" ? "historical_import" : "business_reported",
        sellerType: "house", sellerBusinessName: "Elevoni Farms", verificationStatus: "unverified"
    } };
};

export { prepareHouseSale };
