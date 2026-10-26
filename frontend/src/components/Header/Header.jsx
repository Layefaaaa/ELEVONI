import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaSearch, FaArrowRight } from "react-icons/fa";
import { assets } from "../../assets/assets";
import "./Header.css";

const Header = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const scrollToShop = () => {
    document.getElementById("fish-display")?.scrollIntoView({ behavior: "smooth" });
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/marketplace?search=${encodeURIComponent(value)}` : "/marketplace");
  };

  return (
    <header className="header-hero">
      <div className="hero-copy-col">
        <h1 className="hero-title">Find the agricultural products <span className="hero-title-accent">your business needs.</span></h1>
        <p className="hero-description">
          Explore marketplace listings from approved farms, or buy Elevoni&apos;s smoked catfish directly. Availability and delivery are confirmed before an enquiry becomes an order.
        </p>

        <form className="hero-search" onSubmit={submitSearch} role="search" aria-label="Search agricultural marketplace">
          <FaSearch aria-hidden="true" className="hero-search-icon" />
          <label className="sr-only" htmlFor="homepage-marketplace-search">Search agricultural products</label>
          <input
            id="homepage-marketplace-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try poultry, grains, vegetables…"
          />
          <button type="submit">Search <FaArrowRight aria-hidden="true" /></button>
        </form>

        <div className="hero-cta-group">
          <button className="btn-primary" type="button" onClick={scrollToShop}>Shop smoked catfish</button>
          <Link to="/sell-with-elevoni" className="btn-secondary">Sell with Elevoni <span aria-hidden="true">→</span></Link>
        </div>
        <p className="hero-reassurance">Listings are reviewed before publication. Marketplace enquiries are not completed orders.</p>
      </div>

      <aside className="hero-pricing-card" aria-label="Elevoni Direct smoked catfish">
        <div className="hero-product-image">
          <img src={assets.smoked_catfish_img2} alt="Elevoni smoked catfish" loading="eager" />
          <span>Elevoni Direct</span>
        </div>
        <div className="hero-product-content">
          <p className="hero-product-eyebrow">Available in the direct catalogue</p>
          <h2>Smoked catfish</h2>
          <p>Oven-dried, vacuum-sealed catfish with quantity-based pricing for household and commercial orders.</p>
          <div className="hero-product-facts"><span>About 5 pieces/kg</span><span>Quantity-based pricing</span></div>
          <button type="button" className="hero-card-link" onClick={scrollToShop}>View current catalogue and pricing <span aria-hidden="true">→</span></button>
        </div>
      </aside>
    </header>
  );
};

export default Header;
