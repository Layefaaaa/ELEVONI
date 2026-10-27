import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import { useContext } from "react";
import { StoreContext } from "../../context/StoreContext";
import "./Marketplace.css";

const CATEGORIES = ["All sectors", "Poultry & Eggs", "Livestock & Meat"];
const SUBCATEGORIES = ["All livestock", "Poultry", "Cattle", "Sheep", "Goats"];
const money = (value) => `₦${Number(value || 0).toLocaleString("en-NG")}`;
const enquiryUrl = (product) => {
  const vendor = product.vendorId?.businessName || "the listed business";
  const message = `Hello Elevoni Farms, I would like to enquire about ${product.name} from ${vendor}. Is it available, and what are the delivery arrangements?`;
  return `https://wa.me/2348135738991?text=${encodeURIComponent(message)}`;
};

const Marketplace = () => {
  const { url } = useContext(StoreContext);
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const [products, setProducts] = useState([]);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch.trim());
  const [category, setCategory] = useState("All sectors");
  const [subcategory, setSubcategory] = useState(searchParams.get("subcategory") || "All livestock");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const value = searchParams.get("search") || "";
    // Sync when a new search URL is opened or the user navigates back/forward.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchInput(value);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(value.trim());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubcategory(searchParams.get("subcategory") || "All livestock");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [searchParams]);

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
        if (category !== "All sectors") params.category = category;
        if (subcategory !== "All livestock") params.subcategory = subcategory;
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
  }, [url, search, category, subcategory, page, refresh]);

  return (
    <main className="marketplace-page">
      <Helmet>
        <title>Farm Marketplace | Elevoni Farms</title>
        <meta name="description" content="Explore marketplace listings from approved farms. Confirm availability, price and delivery before ordering." />
      </Helmet>

      <section className="marketplace-hero">
        <div className="marketplace-hero-copy">
          <p className="marketplace-eyebrow">Beyond the Elevoni catalogue</p>
          <h1>Discover agricultural products from reviewed vendors.</h1>
          <p>Explore products listed by vendors whose applications and products have passed the relevant review steps. Confirm availability, final price and delivery arrangements with Elevoni before ordering.</p>
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
            <input value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} placeholder="Try poultry, cattle, sheep, goats…" type="search" />
          </label>
          <label className="marketplace-category-label">
            <span>Sector</span>
            <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
              {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="marketplace-category-label">
            <span>Livestock type</span>
            <select value={subcategory} onChange={(event) => { setSubcategory(event.target.value); setPage(1); }}>
              {SUBCATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
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
            <button type="button" onClick={() => { setSearchInput(""); setCategory("All sectors"); setSubcategory("All livestock"); setPage(1); }}>Clear filters</button>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="marketplace-grid">
            {products.map((product) => (
              <article className="marketplace-product-card" key={product._id}>
                <Link to={`/product/${product._id}`} className="marketplace-product-image" aria-label={`View details for ${product.name}`}>
                  {product.media?.find((media) => media.type === "image")?.url || product.images?.[0] ? <img src={product.media?.find((media) => media.type === "image")?.url || product.images?.[0]} alt={product.name} loading="lazy" /> : <div className="marketplace-image-placeholder" aria-label="No product image provided"><span aria-hidden="true">✳</span></div>}
                  <span className="marketplace-product-category">{product.category}</span>
                </Link>
                <div className="marketplace-product-content">
                  <p className="marketplace-vendor-name">{product.vendorId?.businessName || "Vendor details unavailable"}</p>
                <h3>
  <Link to={`/product/${product._id}`}>{product.name}</Link>
</h3>

{product.subcategory && (
  <p className="marketplace-product-description">
    Type: {product.subcategory}
  </p>
)}

{product.description && (
  <p className="marketplace-product-description">
    {product.description}
  </p>
)}

<Link
  to={`/product/${product._id}`}
  className="marketplace-view-details"
  aria-label={`View details for ${product.name}`}
>
  View details <span aria-hidden="true">→</span>
</Link> <div className="marketplace-product-bottom">
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
