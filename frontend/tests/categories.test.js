import test from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORY_STATUS,
  categoryPath,
  getCategory,
  listCategories,
  listSubcategories,
  resolveCategoryEntry,
} from "../src/config/categories.js";
import {
  AVAILABILITY_TONE,
  buildCategoryCards,
  buildSubcategoryCards,
  describeAvailability,
  describeCategoryEntry,
  describeEmptyState,
} from "../src/utils/categoryViews.js";

test("the storefront exposes exactly the approved top-level categories", () => {
  assert.deepEqual(
    listCategories().map((category) => category.name),
    ["Aquaculture & Fishery", "Livestock", "Other Farm Products"],
  );
});

test("livestock exposes poultry, cattle, sheep and goats", () => {
  assert.deepEqual(
    listSubcategories("livestock").map((child) => child.name),
    ["Poultry", "Cattle", "Sheep", "Goats"],
  );
});

test("category slugs are unique so every category owns one route", () => {
  const topLevel = listCategories().map((category) => category.slug);
  assert.equal(new Set(topLevel).size, topLevel.length);

  for (const category of listCategories()) {
    const childSlugs = category.children.map((child) => child.slug);
    assert.equal(new Set(childSlugs).size, childSlugs.length);
  }
});

test("category routes are derived from the configuration", () => {
  assert.equal(categoryPath("aquaculture-fishery"), "/category/aquaculture-fishery");
  assert.equal(categoryPath("livestock"), "/category/livestock");
  assert.equal(categoryPath("livestock", "poultry"), "/category/livestock/poultry");
});

test("an unknown category path resolves to nothing so the page can say so", () => {
  assert.equal(resolveCategoryEntry("not-a-category"), null);
  assert.equal(resolveCategoryEntry("livestock", "crocodiles"), null);
  assert.equal(resolveCategoryEntry("not-a-category", "poultry"), null);
});

test("a category path resolves to its configured entry", () => {
  const aquaculture = resolveCategoryEntry("aquaculture-fishery");
  assert.equal(aquaculture.name, "Aquaculture & Fishery");
  assert.equal(aquaculture.level, "category");
  assert.equal(aquaculture.path, "/category/aquaculture-fishery");

  const poultry = resolveCategoryEntry("livestock", "poultry");
  assert.equal(poultry.name, "Poultry");
  assert.equal(poultry.level, "subcategory");
  assert.equal(poultry.parent.name, "Livestock");
  assert.equal(poultry.path, "/category/livestock/poultry");
});

test("only the smoked catfish subcategory is served by the live catalogue", () => {
  const served = listCategories().flatMap((category) =>
    category.children.filter((child) => Boolean(child.catalogue)),
  );
  assert.deepEqual(
    served.map((child) => child.slug),
    ["smoked-catfish"],
  );
});

test("a catalogue category reports the real number of listed products", () => {
  const withProducts = describeAvailability({
    status: CATEGORY_STATUS.CATALOGUE,
    productCount: 3,
  });
  assert.equal(withProducts.tone, AVAILABILITY_TONE.LIVE);
  assert.equal(withProducts.label, "3 products available");
  assert.equal(withProducts.orderable, true);

  const single = describeAvailability({
    status: CATEGORY_STATUS.CATALOGUE,
    productCount: 1,
  });
  assert.equal(single.label, "1 product available");

  const empty = describeAvailability({
    status: CATEGORY_STATUS.CATALOGUE,
    productCount: 0,
  });
  assert.equal(empty.tone, AVAILABILITY_TONE.EMPTY);
  assert.equal(empty.label, "No products listed right now");
  assert.equal(empty.orderable, false);
});

test("planned categories are never described as order-ready", () => {
  const comingSoon = describeAvailability({ status: CATEGORY_STATUS.COMING_SOON });
  assert.equal(comingSoon.tone, AVAILABILITY_TONE.COMING_SOON);
  assert.equal(comingSoon.label, "Coming soon");
  assert.equal(comingSoon.orderable, false);

  const reserved = describeAvailability({ status: CATEGORY_STATUS.RESERVED });
  assert.equal(reserved.tone, AVAILABILITY_TONE.RESERVED);
  assert.equal(reserved.label, "Reserved for future expansion");
  assert.equal(reserved.orderable, false);

  for (const category of listCategories()) {
    if (category.status === CATEGORY_STATUS.CATALOGUE) continue;
    for (const child of category.children) {
      assert.equal(
        describeAvailability({ status: child.status }).orderable,
        false,
        `${child.name} must not be presented as order-ready`,
      );
    }
  }
});

test("empty states never promise that something can be ordered", () => {
  const reserved = describeEmptyState({
    status: CATEGORY_STATUS.RESERVED,
    name: "Other Farm Products",
  });
  assert.match(reserved.title, /reserved for future expansion/i);
  assert.match(reserved.body, /not listing products/i);

  const comingSoon = describeEmptyState({
    status: CATEGORY_STATUS.COMING_SOON,
    name: "Poultry",
  });
  assert.match(comingSoon.title, /Poultry is coming soon/i);
  assert.match(comingSoon.body, /No products are listed/i);

  const emptyCatalogue = describeEmptyState({
    status: CATEGORY_STATUS.CATALOGUE,
    name: "Smoked Catfish",
  });
  assert.match(emptyCatalogue.body, /no products available to order/i);
});

test("the homepage cards are built from the configuration", () => {
  const cards = buildCategoryCards({
    categories: listCategories(),
    catalogueCount: 2,
  });

  assert.deepEqual(
    cards.map((card) => card.path),
    [
      "/category/aquaculture-fishery",
      "/category/livestock",
      "/category/other-farm-products",
    ],
  );

  const aquaculture = cards[0];
  assert.equal(aquaculture.availability.label, "2 products available");
  assert.equal(aquaculture.availability.orderable, true);
  assert.deepEqual(aquaculture.childNames, ["Smoked Catfish"]);

  const livestock = cards[1];
  assert.equal(livestock.availability.label, "Coming soon");
  assert.equal(livestock.availability.orderable, false);
  assert.deepEqual(livestock.childNames, ["Poultry", "Cattle", "Sheep", "Goats"]);

  const other = cards[2];
  assert.equal(other.availability.label, "Reserved for future expansion");
  assert.equal(other.availability.orderable, false);
});

test("subcategory cards carry their own route and availability", () => {
  const livestockCards = buildSubcategoryCards({
    category: getCategory("livestock"),
    catalogueCount: 5,
  });

  assert.deepEqual(
    livestockCards.map((card) => card.path),
    [
      "/category/livestock/poultry",
      "/category/livestock/cattle",
      "/category/livestock/sheep",
      "/category/livestock/goats",
    ],
  );

  for (const card of livestockCards) {
    assert.equal(card.availability.orderable, false);
    assert.equal(card.availability.label, "Coming soon");
  }

  const smokedCatfishCards = buildSubcategoryCards({
    category: getCategory("aquaculture-fishery"),
    catalogueCount: 5,
  });
  assert.equal(smokedCatfishCards[0].availability.label, "5 products available");
  assert.equal(smokedCatfishCards[0].availability.orderable, true);
});

test("a category entry describes its availability and empty state", () => {
  const aquaculture = describeCategoryEntry(resolveCategoryEntry("aquaculture-fishery"), {
    catalogueCount: 1,
  });
  assert.equal(aquaculture.name, "Aquaculture & Fishery");
  assert.equal(aquaculture.availability.label, "1 product available");
  assert.equal(aquaculture.emptyState, null);

  const poultry = describeCategoryEntry(resolveCategoryEntry("livestock", "poultry"), {
    catalogueCount: 0,
  });
  assert.equal(poultry.name, "Poultry");
  assert.equal(poultry.eyebrow, "Livestock");
  assert.equal(poultry.availability.orderable, false);
  assert.match(poultry.emptyState.title, /coming soon/i);

  const missing = describeCategoryEntry(null);
  assert.equal(missing.name, "Category not found");
  assert.equal(missing.emptyState, null);
});
