const clean = (value) => typeof value === "string" ? value.trim().slice(0, 160) : "";

const buildOrderBuyerSnapshot = (address = {}) => {
    const buyerName = clean([address.firstName, address.lastName].filter(Boolean).join(" ") || address.name || address.businessName);
    const buyerContact = clean(address.phone || address.email || address.contact || "").slice(0, 120);
    const buyerState = clean(address.state || "").slice(0, 100);
    const buyerArea = clean(address.area || address.city || address.town || "").slice(0, 120);
    return {
        buyerIdentityStatus: buyerName || buyerContact ? "identified" : "unknown",
        buyerName,
        buyerContact,
        buyerState,
        buyerArea
    };
};

export { buildOrderBuyerSnapshot };
