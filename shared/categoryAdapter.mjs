import {
  CATEGORY_CHANNELS,
  CATEGORY_LAUNCH_STATUSES,
  CATEGORY_TYPES,
  getCategoryById,
} from "./categories.mjs";

export const CATEGORY_ADAPTER_KINDS = Object.freeze({
  MAPPED: "mapped",
  LEGACY_REVIEW: "legacy_review",
  NON_LISTING: "non_listing",
  UNKNOWN: "unknown",
});

export const NON_LISTING_TYPES = Object.freeze({
  FILTER: "filter",
  FISH_ATTRIBUTE: "fish_attribute",
});

const MAPPINGS = Object.freeze([
  Object.freeze({ value: "Smoked Catfish", categoryId: "smoked-catfish" }),
  Object.freeze({ value: "Aquaculture & Fishery", categoryId: "aquaculture-fishery" }),
  Object.freeze({ value: "Catfish & Aquaculture", categoryId: "other-fish-aquaculture" }),
  Object.freeze({ value: "Livestock", categoryId: "livestock" }),
  Object.freeze({ value: "Poultry & Eggs", categoryId: "poultry-eggs" }),
  Object.freeze({ value: "Cattle", categoryId: "cattle" }),
  Object.freeze({ value: "Sheep", categoryId: "sheep" }),
  Object.freeze({ value: "Goats", categoryId: "goats" }),
  Object.freeze({ value: "Grains & Cereals", categoryId: "grains-cereals" }),
  Object.freeze({ value: "Vegetables & Fruits", categoryId: "vegetables-fruits" }),
  Object.freeze({ value: "Tubers & Starch", categoryId: "tubers-starch" }),
  Object.freeze({ value: "Processed Agro-Goods", categoryId: "processed-agro-goods" }),
  Object.freeze({ value: "Other Farm Products", categoryId: "other-farm-products" }),
]);

const LEGACY_REVIEWS = Object.freeze([
  Object.freeze({
    value: "Livestock & Meat",
    candidateCategoryId: null,
    reason: "aggregate_legacy_category_requires_review",
  }),
  Object.freeze({
    value: "Poultry",
    candidateCategoryId: "poultry-eggs",
    reason: "legacy_label_requires_review",
  }),
]);

const NON_LISTING_VALUES = Object.freeze([
  Object.freeze({
    value: "All categories",
    nonListingType: NON_LISTING_TYPES.FILTER,
    reason: "marketplace_filter",
  }),
  Object.freeze({
    value: "Smoked",
    nonListingType: NON_LISTING_TYPES.FISH_ATTRIBUTE,
    reason: "fish_product_attribute",
  }),
  Object.freeze({
    value: "Fresh",
    nonListingType: NON_LISTING_TYPES.FISH_ATTRIBUTE,
    reason: "fish_product_attribute",
  }),
]);

const normalize = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const indexByValue = (entries) =>
  new Map(entries.map((entry) => [normalize(entry.value), entry]));

const MAPPINGS_BY_VALUE = indexByValue(MAPPINGS);
const LEGACY_REVIEWS_BY_VALUE = indexByValue(LEGACY_REVIEWS);
const NON_LISTING_BY_VALUE = indexByValue(NON_LISTING_VALUES);

const isSellable = (category) =>
  category?.type === CATEGORY_TYPES.LISTING &&
  category?.channel !== CATEGORY_CHANNELS.NONE &&
  category?.launchStatus === CATEGORY_LAUNCH_STATUSES.LIVE;

const baseResult = (input, kind, reason) => ({
  kind,
  input,
  normalizedValue: normalize(input),
  reason,
  categoryId: null,
  category: null,
  candidateCategoryId: null,
  candidateCategory: null,
  nonListingType: null,
  isListing: false,
  isSellable: false,
});

export const lookupCategory = (value) => {
  const normalizedValue = normalize(value);

  if (!normalizedValue) {
    return Object.freeze(
      baseResult(value, CATEGORY_ADAPTER_KINDS.UNKNOWN, "unknown_category_value"),
    );
  }

  const mapping = MAPPINGS_BY_VALUE.get(normalizedValue);
  if (mapping) {
    const category = getCategoryById(mapping.categoryId);
    if (!category) {
      return Object.freeze(
        baseResult(value, CATEGORY_ADAPTER_KINDS.UNKNOWN, "canonical_category_missing"),
      );
    }

    return Object.freeze({
      ...baseResult(value, CATEGORY_ADAPTER_KINDS.MAPPED, "canonical_category"),
      categoryId: category.id,
      category,
      isListing: category.type === CATEGORY_TYPES.LISTING,
      isSellable: isSellable(category),
    });
  }

  const review = LEGACY_REVIEWS_BY_VALUE.get(normalizedValue);
  if (review) {
    const candidateCategory = review.candidateCategoryId
      ? getCategoryById(review.candidateCategoryId)
      : null;

    return Object.freeze({
      ...baseResult(value, CATEGORY_ADAPTER_KINDS.LEGACY_REVIEW, review.reason),
      candidateCategoryId: candidateCategory?.id ?? null,
      candidateCategory,
    });
  }

  const nonListing = NON_LISTING_BY_VALUE.get(normalizedValue);
  if (nonListing) {
    return Object.freeze({
      ...baseResult(value, CATEGORY_ADAPTER_KINDS.NON_LISTING, nonListing.reason),
      nonListingType: nonListing.nonListingType,
    });
  }

  return Object.freeze(
    baseResult(value, CATEGORY_ADAPTER_KINDS.UNKNOWN, "unknown_category_value"),
  );
};
