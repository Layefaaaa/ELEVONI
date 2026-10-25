import { useContext } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import "./CategoryPage.css";
import FishDisplay from "../../components/FishDisplay/FishDisplay";
import { StoreContext } from "../../context/StoreContext";
import { categoryPath, resolveCategoryEntry } from "../../config/categories.js";
import {
  buildSubcategoryCards,
  describeCategoryEntry,
} from "../../utils/categoryViews.js";

const enquiryLink = (name) =>
  `https://wa.me/2348135738991?text=${encodeURIComponent(
    `Hello Elevoni Farms, I would like to ask about ${name}.`,
  )}`;

const CategoryCard = ({ card }) => (
  <article className="subcategory-card">
    <p className="subcategory-card-eyebrow">{card.eyebrow}</p>
    <h3 className="subcategory-card-title">
      <Link to={card.path}>{card.name}</Link>
    </h3>
    <p className="subcategory-card-summary">{card.summary}</p>
    <p className={`subcategory-card-status status-${card.availability.tone}`}>
      {card.availability.label}
    </p>
    <Link className="subcategory-card-link" to={card.path}>
      {card.availability.orderable ? `Browse ${card.name}` : `View ${card.name}`}
      <span aria-hidden="true"> ›</span>
    </Link>
  </article>
);

const CategoryPage = () => {
  const { slug, childSlug } = useParams();
  const { fish_list } = useContext(StoreContext);

  const entry = resolveCategoryEntry(slug, childSlug);
  const catalogueCount = Array.isArray(fish_list) ? fish_list.length : 0;
  const view = describeCategoryEntry(entry, { catalogueCount });

  if (!entry) {
    return (
      <div className="category-page">
        <Helmet>
          <title>Category not found | Elevoni Farms</title>
          <meta
            name="description"
            content="That category is not part of the Elevoni Farms catalogue."
          />
        </Helmet>

        <section className="category-page-hero">
          <p className="category-page-eyebrow">Category</p>
          <h1 className="category-page-title">{view.name}</h1>
          <p className="category-page-summary">{view.summary}</p>
          <Link className="category-page-back" to="/">
            Back to the storefront
          </Link>
        </section>
      </div>
    );
  }

  const parentCategory = entry.level === "category" ? entry : entry.parent;
  const subcategoryCards = buildSubcategoryCards({
    category: parentCategory,
    catalogueCount,
  });

  const showsCatalogue = entry.level === "subcategory" && entry.catalogue === "fish";
  const isParentCategory =
    entry.level === "category" && (entry.children ?? []).length > 0;

  return (
    <div className="category-page">
      <Helmet>
        <title>{`${entry.name} | Elevoni Farms`}</title>
        <meta name="description" content={entry.summary || view.summary} />
      </Helmet>

      <nav className="category-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        {entry.parent && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={categoryPath(entry.parent.slug)}>{entry.parent.name}</Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span aria-current="page">{entry.name}</span>
      </nav>

      <section className="category-page-hero">
        <p className="category-page-eyebrow">{view.eyebrow}</p>
        <h1 className="category-page-title">{view.name}</h1>
        <p className="category-page-summary">{view.summary}</p>
        <p className={`category-page-status status-${view.availability.tone}`}>
          {view.availability.label}
        </p>
      </section>

      {showsCatalogue ? (
        <FishDisplay
          eyebrow={entry.name}
          title={`${entry.name}, ready for your table`}
          intro={entry.summary}
          sectionId="category-catalogue"
        />
      ) : (
        view.emptyState &&
        !isParentCategory && (
          <section className="category-empty" aria-labelledby="category-empty-title">
            <h2 id="category-empty-title">{view.emptyState.title}</h2>
            <p>{view.emptyState.body}</p>
            <a
              className="category-empty-enquiry"
              href={enquiryLink(entry.name)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ask Elevoni about {entry.name}
            </a>
          </section>
        )
      )}

      {entry.slug === "livestock" && (
        <section className="category-sell-cta" aria-labelledby="category-sell-cta-title">
          <p className="category-sell-cta-eyebrow">Sell with Elevoni</p>
          <h2 id="category-sell-cta-title">Are you a livestock farmer?</h2>
          <p>
            Approved vendors can submit livestock and other agricultural product listings to the
            Elevoni marketplace. Vendor applications and individual products are reviewed separately;
            listings appear publicly only after approval.
          </p>
          <div className="category-sell-cta-actions">
            <Link className="category-sell-cta-link" to="/marketplace">Browse marketplace</Link>
            <Link className="category-sell-cta-link category-sell-cta-link-secondary" to="/sell-with-elevoni">Apply to sell with Elevoni</Link>
          </div>
        </section>
      )}

      {entry.level === "category" && subcategoryCards.length > 0 && (
        <section className="category-subcategories" aria-labelledby="category-subcategories-title">
          <h2 id="category-subcategories-title">{entry.name} subcategories</h2>
          <div className="subcategory-grid">
            {subcategoryCards.map((card) => (
              <CategoryCard key={card.slug} card={card} />
            ))}
          </div>
        </section>
      )}

      {entry.level === "subcategory" && entry.parent && subcategoryCards.length > 1 && (
        <section className="category-siblings" aria-labelledby="category-siblings-title">
          <h2 id="category-siblings-title">More in {entry.parent.name}</h2>
          <div className="subcategory-grid">
            {subcategoryCards
              .filter((card) => card.slug !== entry.slug)
              .map((card) => (
                <CategoryCard key={card.slug} card={card} />
              ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CategoryPage;
