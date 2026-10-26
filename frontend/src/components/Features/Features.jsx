import "./Features.css";
import { FaLeaf, FaShieldAlt, FaTruck, FaAward } from "react-icons/fa";

const Features = () => (
  <section className="features" aria-label="Elevoni service principles">
    <article className="feature-card"><FaLeaf aria-hidden="true" /><div><h3>Agricultural focus</h3><p>Starting with smoked catfish, with more categories under development.</p></div></article>
    <article className="feature-card"><FaShieldAlt aria-hidden="true" /><div><h3>Clear product details</h3><p>Review the product information and ask questions before ordering.</p></div></article>
    <article className="feature-card"><FaTruck aria-hidden="true" /><div><h3>Delivery by arrangement</h3><p>Confirm location, timing and cost before placing an order.</p></div></article>
    <article className="feature-card"><FaAward aria-hidden="true" /><div><h3>Careful handling</h3><p>Check the agreed quantity and packaging at handover.</p></div></article>
  </section>
);

export default Features;
