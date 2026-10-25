import { Link } from "react-router-dom";
import "./NotFound.css";

const NotFound = () => {
  return (
    <section className="vendor-page">
      <header className="vendor-page-header">
        <p className="vendor-page-eyebrow">Not found</p>
        <h1>Page not found</h1>
        <p className="vendor-page-summary">The page you’re looking for doesn’t exist in the Vendor Portal.</p>
      </header>
      <div className="vendor-card">
        <Link className="vendor-link" to="/">
          Return to Dashboard →
        </Link>
      </div>
    </section>
  );
};

export default NotFound;
