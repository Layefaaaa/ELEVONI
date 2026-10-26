import test from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORIES,
  CATEGORY_CHANNELS,
  CATEGORY_LAUNCH_STATUSES,
  CATEGORY_TYPES,
  LEGACY_CATEGORY_NAMES_REQUIRING_REVIEW,
  getCategoryById,
  isListingCategory,
  listChildCategories,
  listListingCategories,
  listTopLevelCategories,
} from "./categories.mjs";

const CATEGORY_IDS = new Set(CATEGORIES.map((category) => category.id));

test("category IDs are unique", () => {
  assert.equal(CATEGORY_IDS.size, CATEGORIES.length);
});

test("every parent reference points to an existing category", () => {
  for (const category of CATEGORIES) {
    if (category.parentId === null) continue;
    assert.ok(
      CATEGORY_IDS.has(category.parentId),
      `${category.id} references missing parent ${category.parentId}`,
    );
  }
});

test("the category graph has no parent-child cycles", () => {
  const byId = new Map(CATEGORIES.map((category) => [category.id, category]));

  for (const category of CATEGORIES) {
    const seen = new Set();
    let current = category;

    while (current && current.parentId !== null) {
      assert.ok(
        !seen.has(current.id),
        `${category.id} participates in a parent-child cycle`,
      );
      seen.add(current.id);
      current = byId.get(current.parentId);
    }
  }
});

test("every category uses a valid type, channel, and launch status", () => {
  const types = new Set(Object.values(CATEGORY_TYPES));
  const channels = new Set(Object.values(CATEGORY_CHANNELS));
  const launchStatuses = new Set(Object.values(CATEGORY_LAUNCH_STATUSES));

  for (const category of CATEGORIES) {
    assert.ok(types.has(category.type), `${category.id} has an invalid type`);
    assert.ok(channels.has(category.channel), `${category.id} has an invalid channel`);
    assert.ok(
      launchStatuses.has(category.launchStatus),
      `${category.id} has an invalid launch status`,
    );
  }
});

test("top-level categories are groups and cannot be mistaken for listings", () => {
  const topLevel = listTopLevelCategories();

  assert.deepEqual(
    topLevel.map((category) => category.id),
    [
      "aquaculture-fishery",
      "livestock",
      "crops-produce",
      "processed-other-farm-products",
    ],
  );

  for (const category of topLevel) {
    assert.equal(category.type, CATEGORY_TYPES.GROUP);
    assert.equal(category.channel, CATEGORY_CHANNELS.NONE);
    assert.deepEqual(category.vendorFocus, []);
    assert.equal(isListingCategory(category), false);
  }
});

test("every listing category belongs to a top-level group", () => {
  for (const listing of listListingCategories()) {
    const parent = getCategoryById(listing.parentId);

    assert.ok(parent, `${listing.id} has no parent`);
    assert.equal(parent.type, CATEGORY_TYPES.GROUP);
    assert.equal(parent.parentId, null);
  }
});

test("smoked catfish is the only live direct listing", () => {
  const smokedCatfish = getCategoryById("smoked-catfish");
  const directListings = listListingCategories().filter(
    (category) => category.channel === CATEGORY_CHANNELS.DIRECT,
  );

  assert.equal(smokedCatfish.parentId, "aquaculture-fishery");
  assert.equal(smokedCatfish.channel, CATEGORY_CHANNELS.DIRECT);
  assert.equal(smokedCatfish.launchStatus, CATEGORY_LAUNCH_STATUSES.LIVE);
  assert.deepEqual(directListings.map((category) => category.id), ["smoked-catfish"]);
});

test("third-party fish remains a planned marketplace category", () => {
  const otherFish = getCategoryById("other-fish-aquaculture");

  assert.equal(otherFish.parentId, "aquaculture-fishery");
  assert.equal(otherFish.channel, CATEGORY_CHANNELS.MARKETPLACE);
  assert.equal(otherFish.launchStatus, CATEGORY_LAUNCH_STATUSES.PLANNED);
  assert.deepEqual(otherFish.vendorFocus, []);
});

test("marketplace listings are planned until verified", () => {
  const marketplaceListings = listListingCategories().filter(
    (category) => category.channel === CATEGORY_CHANNELS.MARKETPLACE,
  );

  assert.ok(marketplaceListings.length > 0);

  for (const category of marketplaceListings) {
    assert.equal(category.launchStatus, CATEGORY_LAUNCH_STATUSES.PLANNED);
  }
});

test("other farm products is reserved and has no active sales channel", () => {
  const otherFarmProducts = getCategoryById("other-farm-products");

  assert.equal(otherFarmProducts.parentId, "processed-other-farm-products");
  assert.equal(otherFarmProducts.channel, CATEGORY_CHANNELS.NONE);
  assert.equal(otherFarmProducts.launchStatus, CATEGORY_LAUNCH_STATUSES.RESERVED);
});

test("Livestock & Meat is not classified as cattle, sheep, or goats", () => {
  const livestockSpecies = ["cattle", "sheep", "goats"].map(getCategoryById);

  assert.ok(LEGACY_CATEGORY_NAMES_REQUIRING_REVIEW.includes("Livestock & Meat"));

  for (const category of CATEGORIES) {
    assert.ok(
      !category.legacyNames.includes("Livestock & Meat"),
      `${category.id} must not claim Livestock & Meat as a legacy name`,
    );
  }

  for (const category of livestockSpecies) {
    assert.equal(category.name.includes("Livestock & Meat"), false);
  }
});

test("children are discoverable from their parent", () => {
  assert.deepEqual(
    listChildCategories("livestock").map((category) => category.id),
    ["poultry-eggs", "cattle", "sheep", "goats"],
  );

  assert.deepEqual(
    listChildCategories("aquaculture-fishery").map((category) => category.id),
    ["smoked-catfish", "other-fish-aquaculture"],
  );
});
