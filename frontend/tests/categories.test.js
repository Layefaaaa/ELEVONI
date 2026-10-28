import { COUNT_STATUS, describeAvailability, describeEmptyState, buildCategoryCards, buildSubcategoryCards, describeCategoryEntry } from "../src/utils/categoryViews.js";
import { CATEGORY_STATUS, categoryPath, getCategory, getSubcategory, listCategories, listSubcategories, resolveCategoryEntry } from "../src/config/categories.js";
import test from "node:test";
import assert from "node:assert/strict";

test("the storefront exposes exactly the approved top-level categories", () => {
  const categories = listCategories();
  assert.deepEqual(categories.map((category) => category.slug), ["aquaculture-fishery", "livestock"]);
  assert.deepEqual(categories.map((category) => category.name), ["Aquaculture & Fishery", "Livestock"]);
});

test("livestock exposes poultry, cattle, sheep and goats", () => {
  const children = listSubcategories("livestock").map((child) => child.slug);
  assert.deepEqual(children, ["poultry", "cattle", "sheep", "goats"]);
});

test("category slugs are unique so every category owns one route", () => {
  const slugs = new Set();
  for (const category of listCategories()) {
    assert.ok(!slugs.has(category.slug));
    slugs.add(category.slug);
    for (const child of category.children || []) {
      const key = `${category.slug}/${child.slug}`;
      assert.ok(!slugs.has(key));
      slugs.add(key);
    }
  }
});

test("category routes are derived from the configuration", () => {
  assert.equal(categoryPath("livestock"), "/category/livestock");
  assert.equal(categoryPath("livestock", "poultry"), "/category/livestock/poultry");
  assert.equal(categoryPath("aquaculture-fishery", "smoked-catfish"), "/category/aquaculture-fishery/smoked-catfish");
});

test("an unknown category path resolves to nothing so the page can say so", () => {
  assert.equal(resolveCategoryEntry("unknown"), null);
  assert.equal(resolveCategoryEntry("livestock", "not-a-child"), null);
  assert.equal(getCategory("missing"), null);
  assert.equal(getSubcategory("missing", "poultry"), null);
});

test("a category path resolves to its configured entry", () => {
  const category = resolveCategoryEntry("livestock");
  assert.equal(category.slug, "livestock");
  assert.equal(category.level, "category");
  assert.equal(category.parent, null);
  assert.equal(category.path, "/category/livestock");

  const child = resolveCategoryEntry("aquaculture-fishery", "smoked-catfish");
  assert.equal(child.slug, "smoked-catfish");
  assert.equal(child.level, "subcategory");
  assert.equal(child.parent.slug, "aquaculture-fishery");
  assert.equal(child.catalogue, "fish");
});

test("only the smoked catfish subcategory is served by the live catalogue", () => {
  const fish = resolveCategoryEntry("aquaculture-fishery", "smoked-catfish");
  const poultry = resolveCategoryEntry("livestock", "poultry");
  assert.equal(fish.catalogue, "fish");
  assert.equal(fish.status, CATEGORY_STATUS.CATALOGUE);
  assert.equal(poultry.catalogue, undefined);
  assert.equal(poultry.status, CATEGORY_STATUS.CATALOGUE);
});

test("a catalogue category reports the real number of listed products", () => {
  const availability = describeAvailability({ status: CATEGORY_STATUS.CATALOGUE, productCount: 2 });
  assert.equal(availability.orderable, true);
  assert.equal(availability.tone, "live");
  assert.match(availability.label, /2 products available/);
});

test("planned categories are never described as order-ready", () => {
  const poultry = describeAvailability({ status: CATEGORY_STATUS.COMING_SOON, productCount: 25 });
  const reserved = describeAvailability({ status: CATEGORY_STATUS.RESERVED, productCount: 25 });
  assert.equal(poultry.orderable, false);
  assert.equal(poultry.label, "Coming soon");
  assert.equal(reserved.orderable, false);
  assert.equal(reserved.label, "Reserved for future expansion");
});

test("empty states never promise that something can be ordered", () => {
  const empty = describeEmptyState({ status: CATEGORY_STATUS.CATALOGUE, name: "Smoked Catfish" });
  const comingSoon = describeEmptyState({ status: CATEGORY_STATUS.COMING_SOON, name: "Poultry" });
  const reserved = describeEmptyState({ status: CATEGORY_STATUS.RESERVED, name: "Other Farm Products" });

  assert.equal(empty.title, "No products listed in Smoked Catfish right now");
  assert.doesNotMatch(JSON.stringify(empty), /add to cart/i);
  assert.doesNotMatch(JSON.stringify(comingSoon), /add to cart/i);
  assert.doesNotMatch(JSON.stringify(reserved), /buy now/i);
});

test("the homepage cards are built from the configuration", () => {
  const cards = buildCategoryCards({ categories: listCategories(), catalogueCount: 1 });
  assert.equal(cards.length, 2);
  assert.deepEqual(cards.map((card) => card.slug), ["aquaculture-fishery", "livestock"]);
  assert.equal(cards[0].availability.orderable, true);
  assert.equal(cards[1].availability.orderable, false);
});

test("subcategory cards carry their own route and availability", () => {
  const cards = buildSubcategoryCards({ category: getCategory("livestock"), catalogueCount: 0 });
  assert.equal(cards.length, 4);
  assert.equal(cards[0].path, "/category/livestock/poultry");
  assert.equal(cards[0].availability.orderable, false);
  assert.equal(cards[0].availability.label, "No products listed right now");
});

test("a category entry describes its availability and empty state", () => {
  const entry = resolveCategoryEntry("livestock", "poultry");
  const view = describeCategoryEntry(entry);
  assert.equal(view.eyebrow, "Livestock");
  assert.equal(view.availability.label, "No products listed right now");
  assert.equal(view.emptyState.title, "No products listed in Poultry right now");
});

test("livestock subcategories carry the API category and subcategory filters", () => {
  assert.deepEqual(getSubcategory("livestock", "poultry").marketplace, {
    category: "Poultry & Eggs",
    subcategory: "Poultry",
  });
  assert.deepEqual(getSubcategory("livestock", "cattle").marketplace, {
    category: "Livestock & Meat",
    subcategory: "Cattle",
  });
  assert.deepEqual(getSubcategory("livestock", "sheep").marketplace, {
    category: "Livestock & Meat",
    subcategory: "Sheep",
  });
  assert.deepEqual(getSubcategory("livestock", "goats").marketplace, {
    category: "Livestock & Meat",
    subcategory: "Goats",
  });
});

test("unknown counts are never reported as zero", () => {
  const loading = describeAvailability({
    status: CATEGORY_STATUS.CATALOGUE,
    countStatus: COUNT_STATUS.LOADING,
  });
  const failed = describeAvailability({
    status: CATEGORY_STATUS.CATALOGUE,
    countStatus: COUNT_STATUS.ERROR,
  });

  assert.equal(loading.label, "Checking availability…");
  assert.equal(loading.countKnown, false);
  assert.equal(failed.label, "Availability unavailable");
  assert.equal(failed.countKnown, false);
  assert.notEqual(failed.label, "No products listed right now");
});

test("subcategory cards can show loading and real API counts", () => {
  const loading = buildSubcategoryCards({
    category: getCategory("livestock"),
    subcategoryCountsStatus: COUNT_STATUS.LOADING,
  });
  assert.equal(loading[0].availability.label, "Checking availability…");
  assert.equal(loading[0].availability.orderable, false);

  const ready = buildSubcategoryCards({
    category: getCategory("livestock"),
    subcategoryCounts: { poultry: 2, cattle: 1, sheep: 0, goats: 3 },
  });
  assert.equal(ready[0].availability.label, "2 products available");
  assert.equal(ready[1].availability.label, "1 product available");
  assert.equal(ready[2].availability.label, "No products listed right now");
  assert.equal(ready[3].availability.label, "3 products available");
});

test("a livestock subcategory entry uses its listing count", () => {
  const entry = resolveCategoryEntry("livestock", "cattle");
  const view = describeCategoryEntry(entry, {
    subcategoryProductCount: 4,
    subcategoryProductCountStatus: COUNT_STATUS.READY,
  });

  assert.equal(view.availability.label, "4 products available");
  assert.equal(view.availability.orderable, true);
  assert.equal(view.emptyState, null);
});
