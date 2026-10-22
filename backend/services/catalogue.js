const CATALOGUE_QUERY = Object.freeze({ visible: { $ne: false } });

const isCatalogueVisible = (product) => Boolean(product) && product?.visible !== false;

// Accepts the shapes an admin form or a JSON client can realistically send and
// returns true, false, or null when the value carries no decision.
const parseVisibilityFlag = (value) => {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
    }
    return null;
};

export { CATALOGUE_QUERY, isCatalogueVisible, parseVisibilityFlag };
