import {
    CATEGORIES,
    CATEGORY_LAUNCH_STATUSES,
    CATEGORY_TYPES,
    getCategoryById,
} from "../../shared/categories.mjs";
import {
    CATEGORY_ADAPTER_KINDS,
    NON_LISTING_TYPES,
    lookupCategory,
} from "../../shared/categoryAdapter.mjs";

// Marketplace Product.category still stores these display-name values. Keep
// this list authoritative for product writes until a schema migration is
// explicitly approved.
const PRODUCT_CATEGORIES = Object.freeze([
    "Catfish & Aquaculture",
    "Poultry & Eggs",
    "Grains & Cereals",
    "Vegetables & Fruits",
    "Tubers & Starch",
    "Livestock & Meat",
    "Processed Agro-Goods",
]);

const PRODUCT_CATEGORY_SET = new Set(PRODUCT_CATEGORIES);

const PUBLIC_CATEGORY_FILTER_KINDS = Object.freeze({
    ALL: "all",
    FILTER: "filter",
    UNSUPPORTED: "unsupported",
});

// Cattle, sheep and goats have no standalone legacy Product.category. Existing
// vendor permissions use the aggregate Livestock & Meat bucket for all three.
const LEGACY_AGGREGATE_PRODUCT_CATEGORY_BY_GROUP = Object.freeze({
    livestock: "Livestock & Meat",
});

const interpretationOf = (value) => lookupCategory(value);

const isProductCategory = (value) =>
    typeof value === "string" && PRODUCT_CATEGORY_SET.has(value);

const legacyProductCategoryFor = (category) => {
    if (!category || category.type !== CATEGORY_TYPES.LISTING) return null;
    if (category.launchStatus === CATEGORY_LAUNCH_STATUSES.RESERVED) return null;
    return category.legacyNames.find((name) => PRODUCT_CATEGORY_SET.has(name)) || null;
};

const productCategoryForTaxonomyCategory = (category) => {
    const direct = legacyProductCategoryFor(category);
    if (direct) return direct;
    if (!category || category.type !== CATEGORY_TYPES.LISTING) return null;
    return LEGACY_AGGREGATE_PRODUCT_CATEGORY_BY_GROUP[category.parentId] || null;
};

const filterResult = (kind, category, interpretation) =>
    Object.freeze({ kind, category, interpretation });

// Resolves a public marketplace category filter without changing the stored
// display-name value used by Product.category.
const resolveProductCategoryFilter = (value) => {
    if (value === undefined || value === null || value === "") {
        return filterResult(PUBLIC_CATEGORY_FILTER_KINDS.ALL, null, null);
    }

    if (typeof value !== "string") {
        return filterResult(PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED, null, interpretationOf(value));
    }

    const canonicalCategory = getCategoryById(value.trim().toLowerCase());
    if (canonicalCategory) {
        if (canonicalCategory.launchStatus !== CATEGORY_LAUNCH_STATUSES.LIVE) {
            return filterResult(PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED, null, null);
        }
        const category = legacyProductCategoryFor(canonicalCategory);
        return category
            ? filterResult(PUBLIC_CATEGORY_FILTER_KINDS.FILTER, category, null)
            : filterResult(PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED, null, null);
    }

    const interpretation = interpretationOf(value);

    if (interpretation.kind === CATEGORY_ADAPTER_KINDS.MAPPED) {
        const category = legacyProductCategoryFor(interpretation.category);
        return category
            ? filterResult(PUBLIC_CATEGORY_FILTER_KINDS.FILTER, category, interpretation)
            : filterResult(PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED, null, interpretation);
    }

    if (interpretation.kind === CATEGORY_ADAPTER_KINDS.LEGACY_REVIEW) {
        // Livestock & Meat is still a valid stored Product.category and must
        // remain filterable. Its canonical meaning stays unresolved.
        return isProductCategory(value)
            ? filterResult(PUBLIC_CATEGORY_FILTER_KINDS.FILTER, value, interpretation)
            : filterResult(PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED, null, interpretation);
    }

    if (interpretation.kind === CATEGORY_ADAPTER_KINDS.NON_LISTING) {
        return interpretation.nonListingType === NON_LISTING_TYPES.FILTER
            ? filterResult(PUBLIC_CATEGORY_FILTER_KINDS.ALL, null, interpretation)
            : filterResult(PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED, null, interpretation);
    }

    return filterResult(PUBLIC_CATEGORY_FILTER_KINDS.UNSUPPORTED, null, interpretation);
};

const productCategoryForVendorFocus = (focus) => {
    const category = CATEGORIES.find((candidate) => candidate.vendorFocus.includes(focus));
    return category ? productCategoryForTaxonomyCategory(category) : null;
};

// Preserves the existing vendor permission buckets: poultry maps to Poultry &
// Eggs, while cattle, sheep and goats map to the Livestock & Meat aggregate.
const categoriesForVendor = (profile) => {
    const focus = Array.isArray(profile?.productFocus) ? profile.productFocus : [];
    const allowed = new Set();

    for (const value of focus) {
        const category = productCategoryForVendorFocus(value);
        if (category) allowed.add(category);
    }

    return PRODUCT_CATEGORIES.filter((category) => allowed.has(category));
};

export {
    PRODUCT_CATEGORIES,
    PUBLIC_CATEGORY_FILTER_KINDS,
    categoriesForVendor,
    interpretationOf as interpretCategory,
    isProductCategory,
    productCategoryForVendorFocus,
    resolveProductCategoryFilter,
};
