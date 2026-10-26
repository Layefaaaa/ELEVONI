import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import illustration from "../../assets/elevoni-marketplace-illustration.svg";
import "./VendorInvitation.css";

const VendorInvitation = () => (
  <section className="vendor-invitation" aria-labelledby="vendor-invitation-title">
    <div className="vendor-invitation-copy">
      <p className="vendor-invitation-eyebrow">For livestock farms and businesses</p>
      <h2 id="vendor-invitation-title">Bring your products to a wider market.</h2>
      <p>
        We are currently inviting poultry, cattle, sheep and goat businesses to apply. Elevoni reviews applications and individual product listings separately; applying does not guarantee approval or a sale.
      </p>
      <Link to="/sell-with-elevoni" className="vendor-invitation-link">Apply to sell with Elevoni <FaArrowRight aria-hidden="true" /></Link>
      <span className="vendor-invitation-note">Vendor applications and product listings are reviewed separately.</span>
    </div>
    <div className="vendor-invitation-art">
      <img src={illustration} alt="" loading="lazy" />
    </div>
  </section>
);

export default VendorInvitation;
