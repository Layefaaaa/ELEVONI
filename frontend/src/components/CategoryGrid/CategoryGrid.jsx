import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import "./CategoryGrid.css";
import { assets } from "../../assets/assets";
import { StoreContext } from "../../context/StoreContext";
import { listCategories } from "../../config/categories.js";
import { buildCategoryCards } from "../../utils/categoryViews.js";

const initialsOf = (name) =>
  name
    .split(/\s+/)
    .filter((word) => /[a-z]/i.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

const CategoryCard = ({ card }) => {
  const mediaUrl = card.media?.key ? assets[card.media.key] : null;
  const [imageFailed, setImageFailed] = useState(false);
  const linkLabel = card.availability.orderable
    ? `Browse ${card.name}`
    : `View ${card.name}`;

  return (
    <article className="category-card">
      <Link className="category-card-media" to={card.path} aria-label={linkLabel}>
        {mediaUrl && !imageFailed ? (
          <img
            className="category-card-image"
            src={mediaUrl}
            alt={card.media.alt || ""}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="category-card-monogram" aria-hidden="true">
            {initialsOf(card.name)}
          </span>
        )}
      </Link>

      <div className="category-card-body">
        <p className="category-card-eyebrow">{card.eyebrow}</p>
        <h3 className="category-card-title">
          <Link to={card.path}>{card.name}</Link>
        </h3>
        <p className="category-card-summary">{card.summary}</p>

        {card.childNames.length > 0 && (
          <p className="category-card-children">{card.childNames.join(", ")}</p>
        )}

        <p className={`category-card-status status-${card.availability.tone}`}>
          {card.availability.label}
        </p>

        <Link className="category-card-link" to={card.path}>
          {linkLabel}
          <span aria-hidden="true"> →</span>
        </Link>
      </div>
    </article>
  );
};

const CategoryGrid = () => {
  const { fish_list } = useContext(StoreContext);
  const catalogueCount = Array.isArray(fish_list) ? fish_list.length : 0;

  const categories = listCategories();
  const cards = buildCategoryCards({ categories, catalogueCount });

  return (
    <section className="category-section" id="categories" aria-labelledby="category-section-title">
      <div className="category-section-heading">
        <p className="category-section-eyebrow">Shop by category</p>
        <h2 id="category-section-title">Start with what you need</h2>
        <p className="category-section-intro">
          Elevoni is growing beyond smoked catfish. Explore the categories we
          are building, and see exactly what is available to order today.
        </p>
      </div>

      <nav className="category-grid" aria-label="Product categories">
        {cards.map((card) => (
          <CategoryCard key={card.slug} card={card} />
        ))}
      </nav>
    </section>
  );
};

export default CategoryGrid;
