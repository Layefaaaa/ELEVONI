import { CATEGORY_STATUS, categoryPath } from "../config/categories.js";

const AVAILABILITY_TONE = Object.freeze({
    LIVE: "live",
    EMPTY: "empty",
    COMING_SOON: "coming-soon",
    RESERVED: "reserved",
});

const pluralise = (count, singular, plural) =>
    `${count} ${count === 1 ? singular : plural}`;

const normaliseCount = (value) => {
    const count = Number(value);
    return Number.isFinite(count) && count > 0 ? count : 0;
};

// Describes what a customer can do in a category right now.
const describeAvailability = ({ status, productCount = 0 } = {}) => {
    if (status === CATEGORY_STATUS.CATALOGUE) {
        const count = normaliseCount(productCount);

        if (count > 0) {
            return {
                tone: AVAILABILITY_TONE.LIVE,
                label: `${pluralise(count, "product", "products")} available`,
                orderable: true,
            };
        }

        return {
            tone: AVAILABILITY_TONE.EMPTY,
            label: "No products listed right now",
            orderable: false,
        };
    }

    if (status === CATEGORY_STATUS.COMING_SOON) {
        return {
            tone: AVAILABILITY_TONE.COMING_SOON,
            label: "Coming soon",
            orderable: false,
        };
    }

    return {
        tone: AVAILABILITY_TONE.RESERVED,
        label: "Reserved for future expansion",
        orderable: false,
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
} = {}) => {
    return categories.map((category) => {
        let productCount = 0;

        if (category.slug === "aquaculture-fishery") {
            productCount = catalogueCount;
        } else if (category.slug === "livestock") {
            productCount = livestockCount;
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
            }),
        };
    });
};

// Builds subcategory cards on a category landing page.
const buildSubcategoryCards = ({
    category,
    catalogueCount = 0,
    subcategoryCounts = {},
} = {}) => {
    if (!category || !Array.isArray(category.children)) {
        return [];
    }

    return category.children.map((child) => {
        let productCount = 0;

        if (
            child.status === CATEGORY_STATUS.CATALOGUE &&
            child.catalogue === "fish"
        ) {
            productCount = catalogueCount;
        } else if (child.status === CATEGORY_STATUS.CATALOGUE) {
            productCount = subcategoryCounts[child.slug] || 0;
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
            }),
        };
    });
};

// Hero copy for a category landing page.
const describeCategoryEntry = (
    entry, { catalogueCount = 0, livestockCount = 0 } = {}
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

    if (entry.status === CATEGORY_STATUS.CATALOGUE) {
        if (entry.slug === "aquaculture-fishery") {
            productCount = catalogueCount;
        } else if (entry.slug === "livestock") {
            productCount = livestockCount;
        } else if (entry.catalogue === "fish") {
            productCount = catalogueCount;
        }
    }

    const availability = describeAvailability({
        status: entry.status,
        productCount,
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
        emptyState: availability.orderable ?
            null :
            describeEmptyState({
                status: entry.status,
                name: entry.name,
            }),
    };
};

export {
    AVAILABILITY_TONE,
    buildCategoryCards,
    buildSubcategoryCards,
    describeAvailability,
    describeCategoryEntry,
    describeEmptyState,
};