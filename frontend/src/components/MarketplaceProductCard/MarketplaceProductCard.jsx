import { Link } from "react-router-dom";
import {
    formatNaira,
    marketplaceEnquiryUrl,
    logMarketplaceEnquiry,
} from "../../utils/marketplace.js";
import { StoreContext } from "../../context/StoreContext";
import { useContext } from "react";

const MarketplaceProductCard = ({ product, url: suppliedUrl }) => {
    const store = useContext(StoreContext);
    const apiUrl = suppliedUrl || store?.url;
    const image =
        product.media?.find((item) => item.type === "image")?.url ||
        product.images?.[0];

    return (
        <article className="marketplace-product-card">
            <Link
                to={`/product/${product._id}`}
                className="marketplace-product-image"
                aria-label={`View details for ${product.name}`}
            >
                {image ? (
                    <img src={image} alt={product.name} loading="lazy" />
                ) : (
                    <div
                        className="marketplace-image-placeholder"
                        aria-label="No product image provided"
                    >
                        <span aria-hidden="true">✳</span>
                    </div>
                )}
                <span className="marketplace-product-category">{product.category}</span>
            </Link>

            <div className="marketplace-product-content">
                <p className="marketplace-vendor-name">
                    {product.vendorId?.businessName || "Vendor details unavailable"}
                </p>
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
                </Link>

                <div className="marketplace-product-bottom">
                    <div>
                        <strong>{formatNaira(product.price)}</strong>
                        <span> / {product.unitOfMeasure || "unit"}</span>
                    </div>
                    <a
                        href={marketplaceEnquiryUrl(product)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => { void logMarketplaceEnquiry({ url: apiUrl, productId: product._id }); }}
                        className="marketplace-enquire"
                    >
                        Enquire <span aria-hidden="true">↗</span>
                    </a>
                </div>
                <p className="marketplace-stock-note">
                    {Number(product.stockQuantity) > 0
                        ? "Listed stock available · confirm before ordering"
                        : "Ask the vendor to confirm availability"}
                </p>
            </div>
        </article>
    );
};

export default MarketplaceProductCard;
