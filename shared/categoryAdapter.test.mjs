import test from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORY_CHANNELS,
  CATEGORY_LAUNCH_STATUSES,
  CATEGORY_TYPES,
  getCategoryById,
} from "./categories.mjs";
import {
  CATEGORY_ADAPTER_KINDS,
  NON_LISTING_TYPES,
  lookupCategory,
} from "./categoryAdapter.mjs";

const EXPLICIT_MAPPINGS = Object.freeze([
  ["Smoked Catfish", "smoked-catfish"],
  ["Aquaculture & Fishery", "aquaculture-fishery"],
  ["Catfish & Aquaculture", "other-fish-aquaculture"],
  ["Livestock", "livestock"],
  ["Poultry & Eggs", "poultry-eggs"],
  ["Cattle", "cattle"],
  ["Sheep", "sheep"],
  ["Goats", "goats"],
  ["Grains & Cereals", "grains-cereals"],
  ["Vegetables & Fruits", "vegetables-fruits"],
  ["Tubers & Starch", "tubers-starch"],
  ["Processed Agro-Goods", "processed-agro-goods"],
  ["Other Farm Products", "other-farm-products"],
]);

test("every explicit mapping resolves to a stable canonical ID", () => {
  for (const [value, categoryId] of EXPLICIT_MAPPINGS) {
    const result = lookupCategory(value);

    assert.equal(result.kind, CATEGORY_ADAPTER_KINDS.MAPPED, value);
    assert.equal(result.categoryId, categoryId, value);
    assert.equal(result.category, getCategoryById(categoryId), value);
    assert.equal(result.input, value, value);
  }
});

test("mapped results expose the canonical record instead of a display-name lookup", () => {
  const result = lookupCategory("Poultry & Eggs");

  assert.equal(result.categoryId, "poultry-eggs");
  assert.notEqual(result.categoryId, result.category.name);
  assert.equal(result.category.name, "Poultry & Eggs");
  assert.equal(result.categoryId, getCategoryById(result.categoryId).id);
});

test("Livestock & Meat remains a legacy value requiring review", () => {
  const result = lookupCategory("Livestock & Meat");

  assert.equal(result.kind, CATEGORY_ADAPTER_KINDS.LEGACY_REVIEW);
  assert.equal(result.categoryId, null);
  assert.equal(result.category, null);
  assert.equal(result.candidateCategoryId, null);
  assert.equal(result.isListing, false);
  assert.equal(result.isSellable, false);
  assert.equal(result.reason, "aggregate_legacy_category_requires_review");
});

test("Livestock & Meat never maps to a specific animal category", () => {
  const result = lookupCategory("Livestock & Meat");
  const animalCategoryIds = ["cattle", "sheep", "goats", "poultry-eggs"];

  for (const categoryId of animalCategoryIds) {
    assert.notEqual(result.categoryId, categoryId);
    assert.notEqual(result.candidateCategoryId, categoryId);
  }
});

test("Poultry remains a review case because it is narrower than Poultry & Eggs", () => {
  const result = lookupCategory("Poultry");

  assert.equal(result.kind, CATEGORY_ADAPTER_KINDS.LEGACY_REVIEW);
  assert.equal(result.categoryId, null);
  assert.equal(result.candidateCategoryId, "poultry-eggs");
  assert.equal(result.candidateCategory, getCategoryById("poultry-eggs"));
  assert.equal(result.reason, "legacy_label_requires_review");
});

test("Catfish & Aquaculture maps to the other-fish category, never to direct smoked catfish", () => {
  const result = lookupCategory("Catfish & Aquaculture");

  assert.equal(result.kind, CATEGORY_ADAPTER_KINDS.MAPPED);
  assert.equal(result.categoryId, "other-fish-aquaculture");
  assert.notEqual(result.categoryId, "smoked-catfish");
  assert.equal(result.category.channel, CATEGORY_CHANNELS.MARKETPLACE);
  assert.equal(result.category.launchStatus, CATEGORY_LAUNCH_STATUSES.PLANNED);
  assert.equal(result.isSellable, false);
});

test("unknown values return an explicit unknown result", () => {
  const unknownValues = [
    "Seafood",
    "Smoked Catfish Fresh",
    "Catfish",
    "Poultry & Eggs Fresh",
    "",
    "   ",
    null,
    undefined,
    42,
  ];

  for (const value of unknownValues) {
    const result = lookupCategory(value);

    assert.notEqual(result, null);
    assert.equal(result.kind, CATEGORY_ADAPTER_KINDS.UNKNOWN, String(value));
    assert.equal(result.categoryId, null, String(value));
    assert.equal(result.category, null, String(value));
    assert.equal(result.isSellable, false, String(value));
  }
});

test("All categories is a filter, not a listing category", () => {
  const result = lookupCategory("All categories");

  assert.equal(result.kind, CATEGORY_ADAPTER_KINDS.NON_LISTING);
  assert.equal(result.nonListingType, NON_LISTING_TYPES.FILTER);
  assert.equal(result.categoryId, null);
  assert.equal(result.isListing, false);
  assert.equal(result.isSellable, false);
  assert.equal(result.reason, "marketplace_filter");
});

test("Smoked and Fresh are fish attributes, not marketplace categories", () => {
  for (const value of ["Smoked", "Fresh"]) {
    const result = lookupCategory(value);

    assert.equal(result.kind, CATEGORY_ADAPTER_KINDS.NON_LISTING, value);
    assert.equal(result.nonListingType, NON_LISTING_TYPES.FISH_ATTRIBUTE, value);
    assert.equal(result.categoryId, null, value);
    assert.equal(result.isListing, false, value);
    assert.equal(result.isSellable, false, value);
    assert.equal(result.reason, "fish_product_attribute", value);
  }
});

test("lookups trim outer whitespace and match case-insensitively", () => {
  const smoked = lookupCategory("  SMOKED CATFISH  ");
  const poultry = lookupCategory("  poultry & eggs  ");
  const catfish = lookupCategory("  catfish & aquaculture  ");
  const livestock = lookupCategory("  livestock & meat  ");
  const filter = lookupCategory("  all categories  ");

  assert.equal(smoked.kind, CATEGORY_ADAPTER_KINDS.MAPPED);
  assert.equal(smoked.categoryId, "smoked-catfish");
  assert.equal(smoked.input, "  SMOKED CATFISH  ");
  assert.equal(smoked.normalizedValue, "smoked catfish");

  assert.equal(poultry.categoryId, "poultry-eggs");
  assert.equal(catfish.categoryId, "other-fish-aquaculture");
  assert.equal(livestock.kind, CATEGORY_ADAPTER_KINDS.LEGACY_REVIEW);
  assert.equal(filter.kind, CATEGORY_ADAPTER_KINDS.NON_LISTING);
});

test("internal whitespace is not silently collapsed", () => {
  const result = lookupCategory("Smoked  Catfish");

  assert.equal(result.kind, CATEGORY_ADAPTER_KINDS.UNKNOWN);
  assert.equal(result.categoryId, null);
});

test("groups and reserved categories are never reported as sellable", () => {
  const groupResults = ["Aquaculture & Fishery", "Livestock"].map(lookupCategory);
  const reserved = lookupCategory("Other Farm Products");

  for (const result of groupResults) {
    assert.equal(result.kind, CATEGORY_ADAPTER_KINDS.MAPPED);
    assert.equal(result.category.type, CATEGORY_TYPES.GROUP);
    assert.equal(result.isListing, false);
    assert.equal(result.isSellable, false);
  }

  assert.equal(reserved.kind, CATEGORY_ADAPTER_KINDS.MAPPED);
  assert.equal(reserved.category.type, CATEGORY_TYPES.LISTING);
  assert.equal(reserved.category.launchStatus, CATEGORY_LAUNCH_STATUSES.RESERVED);
  assert.equal(reserved.isListing, true);
  assert.equal(reserved.isSellable, false);
});

test("only intended livestock categories are active marketplace categories", () => {
  const activeValues = ["Poultry & Eggs", "Cattle", "Sheep", "Goats"];
  for (const value of activeValues) {
    const result = lookupCategory(value);
    assert.equal(result.kind, CATEGORY_ADAPTER_KINDS.MAPPED, value);
    assert.equal(result.category.launchStatus, CATEGORY_LAUNCH_STATUSES.LIVE, value);
    assert.equal(result.isSellable, true, value);
  }
  const plannedValues = ["Grains & Cereals", "Vegetables & Fruits", "Tubers & Starch", "Processed Agro-Goods", "Catfish & Aquaculture"];
  for (const value of plannedValues) {
    const result = lookupCategory(value);
    assert.equal(result.kind, CATEGORY_ADAPTER_KINDS.MAPPED, value);
    assert.equal(result.category.launchStatus, CATEGORY_LAUNCH_STATUSES.PLANNED, value);
    assert.equal(result.isSellable, false, value);
  }
});

test("live direct smoked catfish and livestock category mappings are sellable", () => {
  const smoked = lookupCategory("Smoked Catfish");
  const sellableMappings = EXPLICIT_MAPPINGS
    .map(([value]) => lookupCategory(value))
    .filter((result) => result.isSellable);

  assert.equal(smoked.isSellable, true);
  assert.equal(smoked.category.channel, CATEGORY_CHANNELS.DIRECT);
  assert.deepEqual(
    sellableMappings.map((result) => result.categoryId),
    ["smoked-catfish", "poultry-eggs", "cattle", "sheep", "goats"],
  );
});
