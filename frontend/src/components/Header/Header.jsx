import "./Header.css";

const Header = () => {
  const scrollToShop = () => {
    document
      .getElementById("fish-display")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="header-hero">
      {/* Main Copy & Action Column */}
      <div className="hero-copy-col">
        <h1 className="hero-title">
          <span className="hero-title-accent">Smoked Catfish Delivered</span> to
          Your Doorstep
        </h1>

        <p className="hero-description">
          Premium, hygienically oven-dried catfish processed in Abuja.
          Standardized portion control for households, restaurants, and hotel
          kitchens.
        </p>

        <div className="hero-cta-group">
          <button className="btn-primary" onClick={scrollToShop}>
            Shop Now
          </button>
          <a
            href="https://wa.me/2348135738991?text=Hello%20Elevoni%20Farms,%20I%20would%20like%20to%20inquire%20about%20wholesale%20orders."
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Wholesale Inquiry
          </a>
        </div>
      </div>

      {/* Creative Right Column: B2B Wholesale Tier Card */}
      <div className="hero-pricing-card">
        <div className="card-header">
          <span className="card-tag">B2B Wholesale Tiers</span>
          <h3>Standardized Supply Pricing</h3>
        </div>

        <div className="pricing-rows">
          <div className="pricing-row">
            <span className="tier-label">1 – 4 kg (Standard)</span>
            <span className="tier-price">
              ₦25,000 <small>/kg</small>
            </span>
          </div>
          <div className="pricing-row">
            <span className="tier-label">5 – 9 kg (Mid-Volume)</span>
            <span className="tier-price">
              ₦24,000 <small>/kg</small>
            </span>
          </div>
          <div className="pricing-row">
            <span className="tier-label">10 – 19 kg (Commercial)</span>
            <span className="tier-price">
              ₦22,500 <small>/kg</small>
            </span>
          </div>
          <div className="pricing-row active-tier">
            <span className="tier-label">20+ kg (Enterprise)</span>
            <span className="tier-price">
              ₦21,000 <small>/kg</small>
            </span>
          </div>
        </div>

        <div className="card-footer">
          <div className="spec-pill">5–6 pcs / kg</div>
          <div className="spec-pill">Oven-Dried</div>
          <div className="spec-pill">Vacuum Packaged</div>
        </div>
      </div>
    </header>
  );
};

export default Header;
