import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CategoryGrid from "../src/components/CategoryGrid/CategoryGrid.jsx";
import MarketplaceProductCard from "../src/components/MarketplaceProductCard/MarketplaceProductCard.jsx";
import CategoryPage from "../src/pages/Category/CategoryPage.jsx";
import Home from "../src/pages/Home/Home.jsx";
import { StoreContext } from "../src/context/StoreContext.jsx";

const CATALOGUE_PRODUCT = {
  _id: "fish-1",
  name: "Smoked Catfish",
  description: "Carefully smoked catfish with a rich, traditional flavour.",
  price: 25000,
  pricingMode: "single",
  pricingTiers: [],
  image: "catfish.jpg",
};

const storeValue = (products = []) => ({
  fish_list: products,
  cartItems: {},
  catalogueLoading: false,
  catalogueError: false,
  url: "https://api.example.test",
});

const renderCategoryGrid = (products = []) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <StoreContext.Provider value={storeValue(products)}>
        <CategoryGrid />
      </StoreContext.Provider>
    </MemoryRouter>
  );

const renderCategoryPage = (path, products = []) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <StoreContext.Provider value={storeValue(products)}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/category/:slug/:childSlug" element={<CategoryPage />} />
        </Routes>
      </StoreContext.Provider>
    </MemoryRouter>
  );

test("the homepage category section lists every configured category", () => {
  const markup = renderCategoryGrid([CATALOGUE_PRODUCT]);

  assert.match(markup, /Aquaculture &amp; Fishery/);
  assert.match(markup, /Livestock/);
  assert.doesNotMatch(markup, /Other Farm Products/);

  assert.match(markup, /href="\/category\/aquaculture-fishery"/);
  assert.match(markup, /href="\/category\/livestock"/);
});

test("the homepage category section uses existing project imagery where it exists", () => {
  const markup = renderCategoryGrid([CATALOGUE_PRODUCT]);

  assert.match(markup, /<img[^>]*alt="Elevoni smoked catfish"/);
  assert.match(markup, /<img[^>]*alt="Cattle and goats grazing on a Nigerian farm"/);
});

test("the homepage category section reports the real catalogue count", () => {  const withProducts = renderCategoryGrid([CATALOGUE_PRODUCT, { ...CATALOGUE_PRODUCT, _id: "fish-2" }]);
  assert.match(withProducts, /2 products available/);

  const withoutProducts = renderCategoryGrid([]);
  assert.match(withoutProducts, /No products listed right now/);
});

test("the homepage never presents an unverified livestock count as zero", () => {
  const markup = renderCategoryGrid([CATALOGUE_PRODUCT]);

  assert.match(markup, /Checking availability…/);
  assert.doesNotMatch(markup, /Poultry is available/);
});

test("the livestock landing page exposes poultry, cattle, sheep and goats", () => {
  const markup = renderCategoryPage("/category/livestock");

  assert.match(markup, /Poultry/);
  assert.match(markup, /Cattle/);
  assert.match(markup, /Sheep/);
  assert.match(markup, /Goats/);

  assert.match(markup, /href="\/category\/livestock\/poultry"/);
  assert.match(markup, /href="\/category\/livestock\/cattle"/);
  assert.match(markup, /href="\/category\/livestock\/sheep"/);
  assert.match(markup, /href="\/category\/livestock\/goats"/);
});

test("a livestock subcategory loads real inventory without inventing it", () => {
  const markup = renderCategoryPage("/category/livestock/poultry");

  assert.match(markup, /Loading available listings…/);
  assert.match(markup, /Checking availability…/);
  assert.doesNotMatch(markup, /Add to cart/);
  assert.doesNotMatch(markup, /₦/);
  assert.doesNotMatch(markup, /kg/);
});

test("the livestock Sell with Elevoni block comes after the subcategory cards", () => {
  const markup = renderCategoryPage("/category/livestock");

  const subcategoriesPosition = markup.indexOf("Livestock subcategories");
  const sellPosition = markup.indexOf("Sell with Elevoni");

  assert.ok(subcategoriesPosition > -1, "the livestock subcategories must render");
  assert.ok(sellPosition > -1, "the Sell with Elevoni block must render");
  assert.ok(
    subcategoriesPosition < sellPosition,
    "subcategory cards must appear before the Sell with Elevoni block",
  );
});

test("marketplace cards preserve price, unit, vendor and details actions", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <MarketplaceProductCard
        product={{
          _id: "listing-1",
          name: "Broiler Chicken",
          description: "Farm-raised broiler chicken.",
          price: 8500,
          unitOfMeasure: "piece",
          stockQuantity: 4,
          category: "Poultry & Eggs",
          subcategory: "Poultry",
          images: ["chicken.jpg"],
          vendorId: { businessName: "Green Acres Farm" },
        }}
      />
    </MemoryRouter>,
  );

  assert.match(markup, /Green Acres Farm/);
  assert.match(markup, /Broiler Chicken/);
  assert.match(markup, /₦8,500/);
  assert.match(markup, /\/ piece/);
  assert.match(markup, /href="\/product\/listing-1"/);
  assert.match(markup, /View details/);
  assert.match(markup, /Enquire/);
});

test("the smoked catfish category still shows the live catalogue", () => {
  const markup = renderCategoryPage(
    "/category/aquaculture-fishery/smoked-catfish",
    [CATALOGUE_PRODUCT],
  );

  assert.match(markup, /Smoked Catfish/);
  assert.match(markup, /Add to cart/);
  assert.match(markup, /Choose quantity/);
  assert.match(markup, /View product details/);
});

test("the smoked catfish category shows an honest empty state when nothing is listed", () => {
  const markup = renderCategoryPage("/category/aquaculture-fishery/smoked-catfish", []);

  assert.match(markup, /No products are listed in this category right now/);
  assert.doesNotMatch(markup, /Add to cart/);
});

test("the aquaculture landing page links to the smoked catfish catalogue", () => {
  const markup = renderCategoryPage("/category/aquaculture-fishery", [CATALOGUE_PRODUCT]);

  assert.match(markup, /href="\/category\/aquaculture-fishery\/smoked-catfish"/);
  assert.match(markup, /1 product available/);
});

test("a retired category path reports not found instead of rendering inventory", () => {
  const markup = renderCategoryPage("/category/other-farm-products");

  assert.match(markup, /Category not found/);
  assert.doesNotMatch(markup, /Add to cart/);
});

test("an unknown category reports that it was not found instead of rendering nothing", () => {
  const markup = renderCategoryPage("/category/not-a-real-category");

  assert.match(markup, /Category not found/);
  assert.match(markup, /Back to the storefront/);
});

test("the homepage keeps the smoked catfish journey under the new category section", () => {
  const markup = renderToStaticMarkup(
    <HelmetProvider>
      <MemoryRouter>
        <StoreContext.Provider value={storeValue([CATALOGUE_PRODUCT])}>
          <Home />
        </StoreContext.Provider>
      </MemoryRouter>
    </HelmetProvider>
  );

  const categoryPosition = markup.indexOf('id="categories"');
  const cataloguePosition = markup.indexOf('id="fish-display"');

  assert.ok(categoryPosition > -1, "the homepage must show the category section");
  assert.ok(cataloguePosition > -1, "the homepage must keep the product catalogue");
  assert.ok(
    categoryPosition < cataloguePosition,
    "the category section comes before the product catalogue",
  );

  assert.match(markup, /Smoked Catfish/);
  assert.match(markup, /Add to cart/);
  assert.match(markup, /View product details/);
});
