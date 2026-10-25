import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import axios from "axios";
import { Link } from "react-router-dom";
import { useContext } from "react";
import { StoreContext } from "../../context/StoreContext";
import "./Marketplace.css";

const CATEGORIES = [
  "All categories",
  "Catfish & Aquaculture",
  "Poultry & Eggs",
  "Grains & Cereals",
  "Vegetables & Fruits",
  "Tubers & Starch",
  "Livestock & Meat",
  "Processed Agro-Goods",
];
const money = (value) => `₦${Number(value || 0).toLocaleString("en-NG")}`;
const enquiryUrl = (product) => {
  const vendor = product.vendorId?.businessName || "the listed farm";
  const message = `Hello Elevoni Farms, I would like to enquire about ${product.name} from ${vendor}. Is it available, and what are the delivery arrangements?`;
  return `https://wa.me/2348135738991?text=${encodeURIComponent(message)}`;
};

const Marketplace = () => {
  const { url } = useContext(StoreContext);
  const [products, setProducts] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let current = true;
    const loadProducts = async () => {
      setLoading(true);
      setError("");
      try {
        const params = { limit: 12, page };
        if (search) params.search = search;
        if (category !== "All categories") params.category = category;
        const response = await axios.get(`${url}/api/products`, { params });
        if (!current) return;
        if (response.data?.success !== true || !Array.isArray(response.data.data)) {
          throw new Error("The marketplace response was not in the expected format.");
        }
        setProducts(response.data.data);
        setTotal(Number(response.data.total) || response.data.data.length);
        setPages(Number(response.data.pages) || 0);
      } catch (loadError) {
        if (!current) return;
        setProducts([]);
        setTotal(0);
        setPages(0);
        setError(loadError.response?.data?.message || "We couldn’t load marketplace listings. Please try again.");
      } finally {
        if (current) setLoading(false);
      }
    };
    loadProducts();
    return () => { current = false; };
  }, [url, search, category, page, refresh]);

  return (
    <main className="marketplace-page">
      <Helmet>
        <title>Farm Marketplace | Elevoni Farms</title>
        <meta name="description" content="Discover agricultural products from approved farms and vendors on Elevoni Farms." />
      </Helmet>

      <section className="marketplace-hero">
        <div className="marketplace-hero-copy">
          <p className="marketplace-eyebrow">Beyond the Elevoni catalogue</p>
          <h1>Discover produce from approved farms.</h1>
          <p>Explore listed products from approved vendors. Listings are reviewed before they appear here; availability and delivery details are confirmed with Elevoni before you order.</p>
          <Link to="/sell-with-elevoni" className="marketplace-sell-link">Are you a farmer? Apply to sell <span aria-hidden="true">→</span></Link>
        </div>
        <div className="marketplace-hero-mark" aria-hidden="true">
          <span className="marketplace-mark-sun" />
          <span className="marketplace-mark-row marketplace-mark-row-one" />
          <span className="marketplace-mark-row marketplace-mark-row-two" />
          <span className="marketplace-mark-row marketplace-mark-row-three" />
        </div>
      </section>

      <section className="marketplace-catalogue" aria-labelledby="marketplace-listings-title">
        <div className="marketplace-section-heading">
          <div>
            <p className="marketplace-eyebrow">Marketplace</p>
            <h2 id="marketplace-listings-title">Farm listings</h2>
          </div>
          <p className="marketplace-count">{loading ? "Updating listings…" : `${total} ${total === 1 ? "listing" : "listings"}`}</p>
        </div>

        <div className="marketplace-filters">
          <label className="marketplace-search-label">
            <span>Search products</span>
            <input value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} placeholder="Try poultry, grains, vegetables…" type="search" />
          </label>
          <label className="marketplace-category-label">
            <span>Category</span>
            <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
              {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>

        {loading && <div className="marketplace-state" role="status"><span className="marketplace-spinner" />Loading available listings…</div>}
        {!loading && error && <div className="marketplace-state marketplace-state-error" role="alert"><p>{error}</p><button type="button" onClick={() => setRefresh((value) => value + 1)}>Try again</button></div>}
        {!loading && !error && products.length === 0 && (
          <div className="marketplace-empty">
            <span className="marketplace-empty-icon" aria-hidden="true">✳</span>
            <h3>No listings match this search yet.</h3>
            <p>Try another search or category. New listings appear after the vendor and product review steps are complete.</p>
            <button type="button" onClick={() => { setSearchInput(""); setCategory("All categories"); setPage(1); }}>Clear filters</button>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="marketplace-grid">
            {products.map((product) => (
              <article className="marketplace-product-card" key={product._id}>
                <div className="marketplace-product-image">
                  {product.images?.[0] ? <img src={product.images[0]} alt={product.name} loading="lazy" /> : <div className="marketplace-image-placeholder" aria-label="No product image provided"><span aria-hidden="true">✳</span></div>}
                  <span className="marketplace-product-category">{product.category}</span>
                </div>
                <div className="marketplace-product-content">
                  <p className="marketplace-vendor-name">{product.vendorId?.businessName || "Approved farm"}</p>
                  <h3>{product.name}</h3>
                  {product.description && <p className="marketplace-product-description">{product.description}</p>}
                  <div className="marketplace-product-bottom">
                    <div><strong>{money(product.price)}</strong><span> / {product.unitOfMeasure || "unit"}</span></div>
                    <a href={enquiryUrl(product)} target="_blank" rel="noopener noreferrer" className="marketplace-enquire">Enquire <span aria-hidden="true">↗</span></a>
                  </div>
                  <p className="marketplace-stock-note">{Number(product.stockQuantity) > 0 ? "Listed stock available · confirm before ordering" : "Ask the vendor to confirm availability"}</p>
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && !error && pages > 1 && (
          <nav className="marketplace-pagination" aria-label="Marketplace pages">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>Previous</button>
            <span>Page {page} of {pages}</span>
            <button type="button" onClick={() => setPage((value) => Math.min(pages, value + 1))} disabled={page >= pages}>Next</button>
          </nav>
        )}
        <p className="marketplace-disclaimer">Marketplace enquiries are not completed orders. Confirm quantity, final price, payment and delivery arrangements before making payment.</p>
      </section>
    </main>
  );
};

export default Marketplace;
