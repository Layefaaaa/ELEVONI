// View models for the category-first storefront.
//
// These helpers turn the category configuration plus the real catalogue count
// into the exact copy the storefront shows. Keeping the copy here means the
// honesty rules live in one testable place: a category is only ever described
// as order-ready when it is served by the live catalogue.

import { CATEGORY_STATUS, categoryPath } from "../config/categories.js";

const AVAILABILITY_TONE = Object.freeze({
  LIVE: "live",
  EMPTY: "empty",
  COMING_SOON: "coming-soon",
  RESERVED: "reserved",
});

const pluralise = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

// Describes what a customer can actually do in a category right now.
// `productCount` is the number of live products returned by the catalogue API.
const describeAvailability = ({ status, productCount = 0 } = {}) => {
  if (status === CATEGORY_STATUS.CATALOGUE) {
    const count = Number.isFinite(Number(productCount)) ? Number(productCount) : 0;
    if (count > 0) {
      return {
        tone: AVAILABILITY_TONE.LIVE,
        label: `${pluralise(count, "product")} available`,
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

// Copy shown when a category has nothing to sell. It never implies that an
// order can be placed.
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

const childNames = (category) =>
  (category?.children ?? []).map((child) => child.name);

// Builds the cards used by the homepage category section and by the
// subcategory list on a category landing page.
const buildCategoryCards = ({ categories = [], catalogueCount = 0 } = {}) =>
  categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    eyebrow: category.eyebrow ?? "",
    summary: category.summary ?? "",
    status: category.status,
    path: categoryPath(category.slug),
    media: category.media ?? null,
    childNames: childNames(category),
    availability: describeAvailability({
      status: category.status,
      productCount: category.status === CATEGORY_STATUS.CATALOGUE ? catalogueCount : 0,
    }),
  }));

const buildSubcategoryCards = ({ category, catalogueCount = 0 } = {}) =>
  (category?.children ?? []).map((child) => ({
    slug: child.slug,
    name: child.name,
    eyebrow: category?.name ?? "",
    summary: child.summary ?? "",
    status: child.status,
    path: categoryPath(category.slug, child.slug),
    media: child.media ?? null,
    childNames: [],
    availability: describeAvailability({
      status: child.status,
      productCount: child.status === CATEGORY_STATUS.CATALOGUE ? catalogueCount : 0,
    }),
  }));

// Hero copy for a category landing page.
const describeCategoryEntry = (entry, { catalogueCount = 0 } = {}) => {
  if (!entry) {
    return {
      eyebrow: "",
      name: "Category not found",
      summary: "We could not find that category.",
      availability: describeAvailability({ status: CATEGORY_STATUS.RESERVED }),
      emptyState: null,
    };
  }

  const availability = describeAvailability({
    status: entry.status,
    productCount: entry.status === CATEGORY_STATUS.CATALOGUE ? catalogueCount : 0,
  });

  return {
    eyebrow: entry.level === "subcategory" ? entry.parent?.name ?? "" : entry.eyebrow ?? "",
    name: entry.name,
    summary: entry.summary ?? "",
    availability,
    emptyState: availability.orderable
      ? null
      : describeEmptyState({ status: entry.status, name: entry.name }),
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
