import { CATEGORY_STATUS, categoryPath } from "../config/categories.js";

const AVAILABILITY_TONE = Object.freeze({
    LIVE: "live",
    EMPTY: "empty",
    COMING_SOON: "coming-soon",
    RESERVED: "reserved",
    UNKNOWN: "unknown",
});

const COUNT_STATUS = Object.freeze({
    LOADING: "loading",
    READY: "ready",
    ERROR: "error",
});

const pluralise = (count, singular, plural) =>
    `${count} ${count === 1 ? singular : plural}`;

const normaliseCount = (value) => {
    const count = Number(value);
    return Number.isFinite(count) && count > 0 ? count : 0;
};

// Describes what a customer can do in a category right now.
const describeAvailability = ({
    status,
    productCount = 0,
    countStatus = COUNT_STATUS.READY,
} = {}) => {
    if (status === CATEGORY_STATUS.CATALOGUE) {
        if (countStatus === COUNT_STATUS.LOADING) {
            return {
                tone: AVAILABILITY_TONE.UNKNOWN,
                label: "Checking availability…",
                orderable: false,
                countKnown: false,
            };
        }

        if (countStatus === COUNT_STATUS.ERROR) {
            return {
                tone: AVAILABILITY_TONE.UNKNOWN,
                label: "Availability unavailable",
                orderable: false,
                countKnown: false,
            };
        }

        const count = normaliseCount(productCount);

        if (count > 0) {
            return {
                tone: AVAILABILITY_TONE.LIVE,
                label: `${pluralise(count, "product", "products")} available`,
                orderable: true,
                countKnown: true,
                count,
            };
        }

        return {
            tone: AVAILABILITY_TONE.EMPTY,
            label: "No products listed right now",
            orderable: false,
            countKnown: true,
            count: 0,
        };
    }

    if (status === CATEGORY_STATUS.COMING_SOON) {
        return {
            tone: AVAILABILITY_TONE.COMING_SOON,
            label: "Coming soon",
            orderable: false,
            countKnown: true,
        };
    }

    return {
        tone: AVAILABILITY_TONE.RESERVED,
        label: "Reserved for future expansion",
        orderable: false,
        countKnown: true,
    };
};

// Copy shown when a category has nothing to sell.
const describeEmptyState = ({ status, name = "this category" } = {}) => {
    if (status === CATEGORY_STATUS.RESERVED) {
        return {
            tone: AVAILABILITY_TONE.RESERVED,
            title: `${name} is reserved for future expansion`,
            body: "We are not listing products in this category yet, so there is nothing to order here.",
        };
    }

    if (status === CATEGORY_STATUS.COMING_SOON) {
        return {
            tone: AVAILABILITY_TONE.COMING_SOON,
            title: `${name} is coming soon`,
            body: "No products are listed in this category yet, so there is nothing to order here right now.",
        };
    }

    return {
        tone: AVAILABILITY_TONE.EMPTY,
        title: `No products listed in ${name} right now`,
        body: "There are no products available to order in this category at the moment.",
    };
};

const childNames = (category) => {
    if (!category || !Array.isArray(category.children)) {
        return [];
    }

    return category.children.map((child) => child.name);
};

// Builds cards for the homepage category section.
const buildCategoryCards = ({
    categories = [],
    catalogueCount = 0,
    livestockCount = 0,
    livestockCountStatus = COUNT_STATUS.READY,
} = {}) => {
    return categories.map((category) => {
        let productCount = 0;
        let countStatus = COUNT_STATUS.READY;

        if (category.slug === "aquaculture-fishery") {
            productCount = catalogueCount;
        } else if (category.slug === "livestock") {
            productCount = livestockCount;
            countStatus = livestockCountStatus;
        }

        return {
            slug: category.slug,
            name: category.name,
            eyebrow: category.eyebrow || "",
            summary: category.summary || "",
            status: category.status,
            path: categoryPath(category.slug),
            media: category.media || null,
            childNames: childNames(category),
            availability: describeAvailability({
                status: category.status,
                productCount,
                countStatus,
            }),
        };
    });
};

// Builds subcategory cards on a category landing page.
const buildSubcategoryCards = ({
    category,
    catalogueCount = 0,
    subcategoryCounts = {},
    subcategoryCountsStatus = COUNT_STATUS.READY,
} = {}) => {
    if (!category || !Array.isArray(category.children)) {
        return [];
    }

    return category.children.map((child) => {
        let productCount = 0;
        let countStatus = COUNT_STATUS.READY;

        if (
            child.status === CATEGORY_STATUS.CATALOGUE &&
            child.catalogue === "fish"
        ) {
            productCount = catalogueCount;
        } else if (child.status === CATEGORY_STATUS.CATALOGUE) {
            productCount = subcategoryCounts[child.slug] || 0;
            countStatus = subcategoryCountsStatus;
        }

        return {
            slug: child.slug,
            name: child.name,
            eyebrow: category.name || "",
            summary: child.summary || "",
            status: child.status,
            path: categoryPath(category.slug, child.slug),
            media: child.media || null,
            childNames: [],
            availability: describeAvailability({
                status: child.status,
                productCount,
                countStatus,
            }),
        };
    });
};

// Hero copy for a category landing page.
const describeCategoryEntry = (
    entry,
    {
        catalogueCount = 0,
        livestockCount = 0,
        livestockCountStatus = COUNT_STATUS.READY,
        subcategoryProductCount = 0,
        subcategoryProductCountStatus = COUNT_STATUS.READY,
    } = {}
) => {
    if (!entry) {
        return {
            eyebrow: "",
            name: "Category not found",
            summary: "We could not find that category.",
            availability: describeAvailability({
                status: CATEGORY_STATUS.RESERVED,
            }),
            emptyState: null,
        };
    }

    let productCount = 0;
    let countStatus = COUNT_STATUS.READY;

    if (entry.status === CATEGORY_STATUS.CATALOGUE) {
        if (entry.slug === "aquaculture-fishery" || entry.catalogue === "fish") {
            productCount = catalogueCount;
        } else if (entry.slug === "livestock") {
            productCount = livestockCount;
            countStatus = livestockCountStatus;
        } else if (entry.marketplace) {
            productCount = subcategoryProductCount;
            countStatus = subcategoryProductCountStatus;
        }
    }

    const availability = describeAvailability({
        status: entry.status,
        productCount,
        countStatus,
    });

    let eyebrow = entry.eyebrow || "";

    if (entry.level === "subcategory") {
        eyebrow =
            entry.parent && entry.parent.name ?
            entry.parent.name :
            "";
    }

    return {
        eyebrow,
        name: entry.name,
        summary: entry.summary || "",
        availability,
        emptyState: availability.orderable || !availability.countKnown ?
            null :
            describeEmptyState({
                status: entry.status,
                name: entry.name,
            }),
    };
};

export {
    AVAILABILITY_TONE,
    COUNT_STATUS,
    buildCategoryCards,
    buildSubcategoryCards,
    describeAvailability,
    describeCategoryEntry,
    describeEmptyState,
};