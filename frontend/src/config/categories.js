// Configuration-driven category information architecture.
//
// Every category and subcategory the storefront shows is declared here, so a
// new category can be added without rewriting the homepage, the category page
// or any component. Components read this file; they never hard-code a
// category name, slug or route.
//
// Availability rules encoded in this file:
//   - status "catalogue"  : the category is served by the live product
//                           catalogue. Its listings come from the API, never
//                           from this file.
//   - status "coming-soon": the category is planned but has no listings yet.
//   - status "reserved"   : the category is reserved for future expansion.
//
// A category is never presented as order-ready unless it is served by the
// live catalogue. Images are referenced by asset key so this module stays free
// of binary imports.

const CATEGORY_STATUS = Object.freeze({
    CATALOGUE: "catalogue",
    COMING_SOON: "coming-soon",
    RESERVED: "reserved",
});

const CATEGORIES = Object.freeze([
    Object.freeze({
        slug: "aquaculture-fishery",
        name: "Aquaculture & Fishery",
        eyebrow: "Category 01",
        summary: "Farm-prepared fish delivered with clear per-kilogram wholesale pricing.",
        status: CATEGORY_STATUS.CATALOGUE,
        media: Object.freeze({ key: "smoked_catfish_img4", alt: "Elevoni smoked catfish" }),
        children: Object.freeze([
            Object.freeze({
                slug: "smoked-catfish",
                name: "Smoked Catfish",
                summary: "Our signature product. Oven-smoked and sold per kilogram.",
                status: CATEGORY_STATUS.CATALOGUE,
                catalogue: "fish",
                media: Object.freeze({
                    key: "smoked_catfish_img4",
                    alt: "Elevoni smoked catfish",
                }),
            }),
        ]),
    }),
    Object.freeze({
        slug: "livestock",
        name: "Livestock",
        eyebrow: "Category 02",
        summary: "Poultry, cattle, sheep and goats. These categories are being prepared and are not open for orders yet.",
        status: CATEGORY_STATUS.COMING_SOON,
        media: {
            key: "livestockCategory",
            alt: "Cattle and goats grazing on a Nigerian farm",
        },
        children: Object.freeze([
            Object.freeze({
                slug: "poultry",
                name: "Poultry",
                summary: "Chicken and other table birds.",
                status: CATEGORY_STATUS.COMING_SOON,
                media: null,
            }),
            Object.freeze({
                slug: "cattle",
                name: "Cattle",
                summary: "Beef and other cattle products.",
                status: CATEGORY_STATUS.COMING_SOON,
                media: null,
            }),
            Object.freeze({
                slug: "sheep",
                name: "Sheep",
                summary: "Mutton and other sheep products.",
                status: CATEGORY_STATUS.COMING_SOON,
                media: null,
            }),
            Object.freeze({
                slug: "goats",
                name: "Goats",
                summary: "Goat meat and other goat products.",
                status: CATEGORY_STATUS.COMING_SOON,
                media: null,
            }),
        ]),
    }),
    Object.freeze({
        slug: "other-farm-products",
        name: "Other Farm Products",
        eyebrow: "Category 03",
        summary: "Reserved for the farm products we will add as our supply grows.",
        status: CATEGORY_STATUS.RESERVED,
        media: {
            key: "other",
            alt: "other farm products",
        },
        children: Object.freeze([]),
    }),
]);

const CATEGORY_PATH_PREFIX = "/category";

const listCategories = () => CATEGORIES;

const getCategory = (slug) =>
    CATEGORIES.find((category) => category.slug === slug) || null;


const listSubcategories = (categorySlug) =>
    getCategory(categorySlug) ?
    getCategory(categorySlug).children || [] : [];



const getSubcategory = (categorySlug, childSlug) =>
    listSubcategories(categorySlug).find((child) => child.slug === childSlug) || null;

const categoryPath = (categorySlug, childSlug) =>
    childSlug ?
    `${CATEGORY_PATH_PREFIX}/${categorySlug}/${childSlug}` :
    `${CATEGORY_PATH_PREFIX}/${categorySlug}`;

// Resolves a storefront path into a single normalised entry. Returns null for
// unknown paths so the caller can render an honest "not found" state instead
// of an empty page.
const resolveCategoryEntry = (categorySlug, childSlug) => {
    const category = getCategory(categorySlug);
    if (!category) return null;

    if (!childSlug) {
        return {
            ...category,
            level: "category",
            parent: null,
            path: categoryPath(category.slug),
        };
    }

    const child = getSubcategory(category.slug, childSlug);
    if (!child) return null;

    return {
        ...child,
        level: "subcategory",
        parent: category,
        path: categoryPath(category.slug, child.slug),
    };
};

export {
    CATEGORIES,
    CATEGORY_PATH_PREFIX,
    CATEGORY_STATUS,
    categoryPath,
    getCategory,
    getSubcategory,
    listCategories,
    listSubcategories,
    resolveCategoryEntry,
};