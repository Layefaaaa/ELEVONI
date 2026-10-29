import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import VendorApplicationForm from "../src/components/VendorApplicationForm/VendorApplicationForm.jsx";
import VendorStatusCard from "../src/components/VendorStatusCard/VendorStatusCard.jsx";
import Footer from "../src/components/Footer/Footer.jsx";
import CategoryPage from "../src/pages/Category/CategoryPage.jsx";
import { StoreContext } from "../src/context/StoreContext.jsx";

const storeValue = (products = []) => ({
  fish_list: products,
  cartItems: {},
  catalogueLoading: false,
  catalogueError: false,
  url: "https://api.example.test",
  token: "",
});

const baseValues = {
  name: "",
  email: "",
  password: "",
  businessName: "",
  contactName: "",
  phone: "",
  location: "",
  state: "",
  lga: "",
  productFocus: [],
  description: "",
};

test("new vendor form collects all required backend fields", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <VendorApplicationForm
        mode="register"
        values={baseValues}
        errors={{}}
        busy={false}
        notice=""
        onSubmit={() => {}}
        onChange={() => {}}
        onToggleFocus={() => {}}
      />
    </MemoryRouter>,
  );

  assert.match(markup, /name="name"/);
  assert.match(markup, /name="email"/);
  assert.match(markup, /name="password"/);
  assert.match(markup, /name="businessName"/);
  assert.match(markup, /name="contactName"/);
  assert.match(markup, /name="phone"/);
  assert.match(markup, /name="state"/);
  assert.match(markup, /name="lga"/);
  assert.match(markup, /name="location"/);
  assert.match(markup, /name="productFocus"/);
  assert.match(markup, /name="description"/);
  assert.match(markup, /Poultry/);
  assert.match(markup, /Cattle/);
  assert.match(markup, /Sheep/);
  assert.match(markup, /Goats/);
  assert.match(markup, /does not publish products/i);
  assert.match(markup, /do not ask for NIN/i);
});

test("existing-customer form uses account email and omits password", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <VendorApplicationForm
        mode="apply"
        values={{ ...baseValues, contactName: "Ada Okoye" }}
        errors={{}}
        busy={false}
        notice=""
        accountEmail="ada@example.com"
        onSubmit={() => {}}
        onChange={() => {}}
        onToggleFocus={() => {}}
      />
    </MemoryRouter>,
  );

  assert.doesNotMatch(markup, /name="password"/);
  assert.doesNotMatch(markup, /Create account and apply/);
  assert.match(markup, /Submit application/);
  assert.match(markup, /ada@example.com/);
  assert.match(markup, /existing account/);
});

test("form validation errors are displayed and linked", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <VendorApplicationForm
        mode="register"
        values={baseValues}
        errors={{ email: "Enter a valid email address", productFocus: "Select at least one livestock product focus" }}
        busy={false}
        notice="Please fix the highlighted fields and try again."
        onSubmit={() => {}}
        onChange={() => {}}
        onToggleFocus={() => {}}
      />
    </MemoryRouter>,
  );

  assert.match(markup, /role="alert"/);
  assert.match(markup, /Enter a valid email address/);
  assert.match(markup, /Select at least one livestock product focus/);
  assert.match(markup, /Please fix the highlighted fields/);
});

test("status card shows pending state and states approval does not publish", () => {
  const application = {
    id: "v1",
    businessName: "Ada Farms",
    contactName: "Ada Okoye",
    email: "ada@example.com",
    phone: "+2348012345678",
    location: "Abuja",
    productFocus: ["poultry", "goats"],
    description: "Free-range birds",
    status: "pending",
    submittedAt: "2026-10-01T09:30:00.000Z",
  };
  const markup = renderToStaticMarkup(<VendorStatusCard application={application} />);
  assert.match(markup, /Application under review/);
  assert.match(markup, /Ada Farms/);
  assert.match(markup, /Poultry, Goats/);
  assert.match(markup, /does not verify stock/i);
  assert.match(markup, /publish products/i);
  assert.match(markup, /enable checkout/i);
});

test("status card prefers State and LGA and falls back to legacy location", () => {
  const application = {
    id: "v-location",
    businessName: "Ada Farms",
    contactName: "Ada Okoye",
    email: "ada@example.com",
    phone: "+2348012345678",
    location: "Abuja",
    state: "FCT",
    lga: "Abuja Municipal",
    productFocus: ["poultry"],
    description: "",
    status: "pending",
    submittedAt: "2026-10-01T09:30:00.000Z",
  };
  const structured = renderToStaticMarkup(<VendorStatusCard application={application} />);
  assert.match(structured, /Abuja Municipal, FCT/);
  assert.match(structured, /Abuja Municipal, FCT · Abuja/);

  const legacy = renderToStaticMarkup(<VendorStatusCard application={{ ...application, state: undefined, lga: undefined }} />);
  assert.match(legacy, /Abuja/);
  assert.doesNotMatch(legacy, /Abuja Municipal/);
});

test("status card renders all states with appropriate guidance", () => {
  for (const status of ["approved", "rejected", "suspended"]) {
    const application = {
      id: "v2",
      businessName: "Green Acres",
      contactName: "Tunde",
      email: "tunde@example.com",
      phone: "+2348111111111",
      location: "Lagos",
      productFocus: ["cattle"],
      description: "",
      status,
      submittedAt: "2026-10-05T10:00:00.000Z",
    };
    const markup = renderToStaticMarkup(<VendorStatusCard application={application} />);
    assert.match(markup, /Green Acres/);
    if (status === "approved") assert.match(markup, /Approved|approved/i);
    if (status === "rejected") {
      assert.match(markup, /not approved|rejected/i);
      assert.match(markup, /Contact Elevoni/);
    }
    if (status === "suspended") {
      assert.match(markup, /suspended/i);
      assert.match(markup, /Contact Elevoni/);
    }
  }
});

test("status card never renders internal decision notes or reviewer identity", () => {
  const application = {
    id: "v3",
    businessName: "Hilltop",
    contactName: "Musa",
    email: "musa@example.com",
    phone: "+2348222222222",
    location: "Kano",
    productFocus: ["sheep"],
    description: "Wool",
    status: "rejected",
    submittedAt: "2026-10-07T08:00:00.000Z",
    decisionNote: "This should never appear to the applicant",
    reviewedBy: "admin-secret",
    statusHistory: [{ status: "pending", at: "2026-10-07T08:00:00.000Z" }],
  };
  const markup = renderToStaticMarkup(<VendorStatusCard application={application} />);
  assert.doesNotMatch(markup, /This should never appear/);
  assert.doesNotMatch(markup, /admin-secret/);
  assert.doesNotMatch(markup, /statusHistory/i);
  assert.match(markup, /Hilltop/);
});

test("the storefront footer links to sell with elevoni", () => {
  const markup = renderToStaticMarkup(
    <HelmetProvider>
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    </HelmetProvider>,
  );
  assert.match(markup, /href="\/sell-with-elevoni"/);
  assert.match(markup, /Sell with Elevoni/);
});

test("the livestock landing page provides a sell-with-elevoni entry point", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/category/livestock"]}>
      <StoreContext.Provider value={storeValue([])}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/category/:slug/:childSlug" element={<CategoryPage />} />
        </Routes>
      </StoreContext.Provider>
    </MemoryRouter>,
  );
  assert.match(markup, /Apply to sell with Elevoni/);
  assert.match(markup, /href="\/sell-with-elevoni"/);
  assert.match(markup, /poultry|cattle|sheep|goats/i);
});

test("the sell-with-elevoni entry point does not appear on non-livestock categories", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/category/aquaculture-fishery"]}>
      <StoreContext.Provider value={storeValue([])}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/category/:slug/:childSlug" element={<CategoryPage />} />
        </Routes>
      </StoreContext.Provider>
    </MemoryRouter>,
  );
  assert.doesNotMatch(markup, /Farm livestock for sale/);
});
