import { ELEVONI_WHATSAPP_PHONE } from "../../config/contact.js";
import { useContext, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import "./CategoryPage.css";
import "../Marketplace/Marketplace.css";
import FishDisplay from "../../components/FishDisplay/FishDisplay";
import MarketplaceProductCard from "../../components/MarketplaceProductCard/MarketplaceProductCard";
import { StoreContext } from "../../context/StoreContext";
import { categoryPath, resolveCategoryEntry } from "../../config/categories.js";
import {
  COUNT_STATUS,
  buildSubcategoryCards,
  describeCategoryEntry,
} from "../../utils/categoryViews.js";
import {
  MARKETPLACE_PAGE_SIZE,
  fetchLivestockParentCount,
  fetchLivestockSubcategoryCounts,
  fetchPublicProducts,
} from "../../utils/marketplace.js";

const NO_CHILDREN = Object.freeze([]);

const enquiryLink = (name) =>
  `https://wa.me/${ELEVONI_WHATSAPP_PHONE}?text=${encodeURIComponent(
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

const useLivestockCounts = ({
  url,
  enabled,
  children = NO_CHILDREN,
  includeTotal = true,
}) => {
  const [counts, setCounts] = useState({
    total: null,
    totalStatus: COUNT_STATUS.LOADING,
    children: {},
    childrenStatus: COUNT_STATUS.LOADING,
  });

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCounts({
        total: null,
        totalStatus: COUNT_STATUS.READY,
        children: {},
        childrenStatus: COUNT_STATUS.READY,
      });
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();

    setCounts({
      total: null,
      totalStatus: includeTotal ? COUNT_STATUS.LOADING : COUNT_STATUS.READY,
      children: {},
      childrenStatus: children.length ? COUNT_STATUS.LOADING : COUNT_STATUS.READY,
    });

    const loadCounts = async () => {
      const [totalResult, childrenResult] = await Promise.allSettled([
        includeTotal
          ? fetchLivestockParentCount({ url, signal: controller.signal })
          : Promise.resolve(null),
        children.length
          ? fetchLivestockSubcategoryCounts({
              url,
              children,
              signal: controller.signal,
            })
          : Promise.resolve({}),
      ]);

      if (cancelled) return;

      setCounts({
        total: totalResult.status === "fulfilled" ? totalResult.value : null,
        totalStatus:
          totalResult.status === "fulfilled"
            ? COUNT_STATUS.READY
            : COUNT_STATUS.ERROR,
        children:
          childrenResult.status === "fulfilled" ? childrenResult.value : {},
        childrenStatus:
          childrenResult.status === "fulfilled"
            ? COUNT_STATUS.READY
            : COUNT_STATUS.ERROR,
      });
    };

    loadCounts();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url, enabled, includeTotal, children]);

  return counts;
};

const CategoryListings = ({ entry, url, onState }) => {
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [listing, setListing] = useState({
    products: [],
    total: 0,
    pages: 0,
    loading: true,
    error: "",
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setListing((current) => ({ ...current, loading: true, error: "" }));
    onState({ path: entry.path, total: null, status: COUNT_STATUS.LOADING });

    const loadListings = async () => {
      try {
        const result = await fetchPublicProducts({
          url,
          ...entry.marketplace,
          page,
          limit: MARKETPLACE_PAGE_SIZE,
          signal: controller.signal,
        });

        if (cancelled) return;

        setListing({
          products: result.products,
          total: result.total,
          pages: result.pages,
          loading: false,
          error: "",
        });
        onState({
          path: entry.path,
          total: result.total,
          status: COUNT_STATUS.READY,
        });
      } catch (error) {
        if (cancelled) return;

        setListing({
          products: [],
          total: 0,
          pages: 0,
          loading: false,
          error:
            error.response?.data?.message ||
            error.message ||
            "We couldn’t load these listings. Please try again.",
        });
        onState({
          path: entry.path,
          total: null,
          status: COUNT_STATUS.ERROR,
        });
      }
    };

    loadListings();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url, entry, page, refresh, onState]);

  return (
    <section
      className="marketplace-page category-listings"
      aria-labelledby="category-listings-title"
    >
      <div className="marketplace-section-heading">
        <div>
          <p className="marketplace-eyebrow">Marketplace</p>
          <h2 id="category-listings-title">{entry.name} listings</h2>
        </div>
        <p className="marketplace-count">
          {listing.loading
            ? "Updating listings…"
            : listing.error
              ? "Count unavailable"
              : `${listing.total} ${listing.total === 1 ? "listing" : "listings"}`}
        </p>
      </div>

      {listing.loading && (
        <div className="marketplace-state" role="status">
          <span className="marketplace-spinner" />
          Loading available listings…
        </div>
      )}

      {!listing.loading && listing.error && (
        <div className="marketplace-state marketplace-state-error" role="alert">
          <p>{listing.error}</p>
          <button type="button" onClick={() => setRefresh((value) => value + 1)}>
            Try again
          </button>
        </div>
      )}

      {!listing.loading && !listing.error && listing.products.length === 0 && (
        <div className="marketplace-empty">
          <span className="marketplace-empty-icon" aria-hidden="true">✳</span>
          <h3>No {entry.name} listings are available right now.</h3>
          <p>
            New listings appear after the vendor and product review steps are complete.
          </p>
          <Link className="category-empty-enquiry" to="/marketplace">
            Browse all marketplace listings
          </Link>
        </div>
      )}

      {!listing.loading && !listing.error && listing.products.length > 0 && (
        <div className="marketplace-grid">
          {listing.products.map((product) => (
            <MarketplaceProductCard key={product._id} product={product} />
          ))}
        </div>
      )}

      {!listing.loading && !listing.error && listing.pages > 1 && (
        <nav className="marketplace-pagination" aria-label={`${entry.name} listing pages`}>
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span>Page {page} of {listing.pages}</span>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(listing.pages, value + 1))}
            disabled={page >= listing.pages}
          >
            Next
          </button>
        </nav>
      )}

      <p className="marketplace-disclaimer">
        Marketplace enquiries are not completed orders. Confirm quantity, final price,
        payment and delivery arrangements before making payment.
      </p>
    </section>
  );
};

const CategoryPage = () => {
  const { slug, childSlug } = useParams();
  const { fish_list, url } = useContext(StoreContext);

  const entry = useMemo(
    () => resolveCategoryEntry(slug, childSlug),
    [slug, childSlug],
  );
  const catalogueCount = Array.isArray(fish_list) ? fish_list.length : 0;
  const isLivestock =
    entry?.slug === "livestock" || entry?.parent?.slug === "livestock";
  const isLivestockSubcategory =
    entry?.level === "subcategory" &&
    entry?.parent?.slug === "livestock" &&
    Boolean(entry?.marketplace);
  const livestockChildren = isLivestock
    ? entry.level === "category"
      ? entry.children
      : entry.parent.children
    : NO_CHILDREN;
  const counts = useLivestockCounts({
    url,
    enabled: isLivestock,
    children: livestockChildren,
    includeTotal: entry?.slug === "livestock",
  });
  const [listingState, setListingState] = useState({
    path: null,
    total: null,
    status: COUNT_STATUS.LOADING,
  });
  const activeListing =
    listingState.path === entry?.path
      ? listingState
      : {
          total: null,
          status: isLivestockSubcategory
            ? COUNT_STATUS.LOADING
            : COUNT_STATUS.READY,
        };

  const view = describeCategoryEntry(entry, {
    catalogueCount,
    livestockCount: counts.total ?? 0,
    livestockCountStatus: counts.totalStatus,
    subcategoryProductCount: activeListing.total ?? 0,
    subcategoryProductCountStatus: activeListing.status,
  });

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
    subcategoryCounts: counts.children,
    subcategoryCountsStatus: counts.childrenStatus,
  });

  const showsCatalogue =
    entry.level === "subcategory" && entry.catalogue === "fish";
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

      {isLivestockSubcategory && (
        <CategoryListings
          key={entry.path}
          entry={entry}
          url={url}
          onState={setListingState}
        />
      )}

      {showsCatalogue ? (
        <FishDisplay
          eyebrow={entry.name}
          title={`${entry.name}, ready for your table`}
          intro={entry.summary}
          sectionId="category-catalogue"
        />
      ) : (
        view.emptyState &&
        !isParentCategory &&
        !isLivestockSubcategory && (
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
