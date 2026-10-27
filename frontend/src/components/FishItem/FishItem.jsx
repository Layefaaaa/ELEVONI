import { useContext, useEffect, useRef, useState } from "react";
import "./FishItem.css";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import getProductPrice from "../../utils/pricing";

const FishItem = ({ id, name, image, price, description, pricingMode, pricingTiers = [] }) => {
  const { cartItems, setCartQuantity, updateCartQuantity, url } = useContext(StoreContext);
  const navigate = useNavigate();
  const quantity = Number(cartItems?.[id] || 0);
  const [imageFailed, setImageFailed] = useState(false);
  const [draftQuantity, setDraftQuantity] = useState(String(quantity));
  const previousQuantity = useRef(quantity);
  const parsedQuantity = Number(draftQuantity);
  const isValidQuantity =
    Number.isSafeInteger(parsedQuantity) && parsedQuantity >= 0;
  const previewQuantity = isValidQuantity ? parsedQuantity : 0;
  const hasQuantity = previewQuantity > 0;
const currentPrice = getProductPrice({ name, price, pricingMode, pricingTiers }, Math.max(1, previewQuantity));

  useEffect(() => {
    if (previousQuantity.current !== quantity) {
      setDraftQuantity(String(quantity));
      previousQuantity.current = quantity;
    }
  }, [quantity]);

  const saveQuantity = async (event) => {
    event.preventDefault();
    if (!isValidQuantity || previewQuantity === 0) return;
    const saved = await setCartQuantity(id, parsedQuantity);
    if (saved !== true) {
      toast.error(
        saved === "forbidden"
          ? "This account does not have customer access. Please log in with a customer account to use the cart."
          : "Your quantity changed locally but could not be synced to your account.",
      );
      return;
    }
    toast.success("Cart updated");
  };

  const imageUrl =
    image && image.startsWith("http") ? image : `${url}/images/${image}`;

  return (
    <article className="fish-item">
      <div className="fish-item-media">
        <button className="fish-item-image-button" type="button" onClick={() => navigate(`/product/${id}`)} aria-label={`View details for ${name}`}>
          {imageFailed ? <span className="fish-item-image-placeholder" role="img" aria-label={`Image unavailable for ${name}`}>Product image unavailable</span> : <img className="fish-item-image" src={imageUrl} alt={`${name} - Premium smoked catfish from Elevoni Farms`} loading="lazy" onError={() => setImageFailed(true)} />}
        </button>
        <span className="fish-item-image-label">Carefully smoked</span>
      </div>

      <div className="fish-item-info">
        <div className="fish-item-copy">
          <p className="fish-item-kicker">Elevoni Farms · Smoked Catfish</p>
          <h3 className="fish-item-name">{name}</h3>
          <p className="fish-item-desc">{description}</p>
        </div>

        <div className="fish-item-price-block">
          <span className="fish-item-price-label">
            {hasQuantity ? "Your price at " + previewQuantity + " kg" : "Enter a quantity to see pricing"}
          </span>
          <p className="fish-item-price">
            {hasQuantity ? <>₦{currentPrice.toLocaleString()}<span> / kg</span></> : "—"}
          </p>
          {hasQuantity && (
            <p className="fish-item-estimate">
              Estimated product total: ₦
              {(currentPrice * previewQuantity).toLocaleString()}
            </p>
          )}
        </div>

        {pricingTiers.length > 0 && (
          <div className="wholesale-pricing">
            <p className="wholesale-title">Wholesale price per kg</p>
            <div className="wholesale-tiers-grid">
              {pricingTiers.map((tier, index) => {
                const active = hasQuantity && previewQuantity >= Number(tier.minQuantity) &&
                  (tier.maxQuantity == null || previewQuantity <= Number(tier.maxQuantity));
                const range = tier.maxQuantity == null
                  ? Number(tier.minQuantity) + "+ kg"
                  : Number(tier.minQuantity) + "–" + Number(tier.maxQuantity) + " kg";
                return (
                  <div className={"tier-card " + (active ? "active-tier" : "")} key={index}>
                    <span className="tier-range">{range}</span>
                    <span className="tier-rate">₦{Number(tier.unitPrice).toLocaleString()}/kg</span>
                  </div>
                );
              })}
            </div>
            <p className="fish-size-note">
              Standard size: 5 pieces per kg. Larger sizes are available on request.
            </p>
          </div>
        )}

        <form className="fish-item-cart-form" onSubmit={saveQuantity}>
          <label htmlFor={`quantity-${id}`}>
            Choose quantity <span>(kilograms)</span>
          </label>
          <div className="fish-item-cart-controls">
            <div className="fish-item-quantity-input">
              <input
                id={`quantity-${id}`}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={draftQuantity}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraftQuantity(value);
                  if (value === "") {
                    void updateCartQuantity(id, 0);
                    return;
                  }
                  const nextQuantity = Number(value);
                  if (Number.isSafeInteger(nextQuantity) && nextQuantity >= 0) {
                    void updateCartQuantity(id, nextQuantity);
                  }
                }}
                aria-label={`Quantity of ${name} in kilograms`}
                required
              />
              <span>kg</span>
            </div>
            <button
              className="fish-item-add-button"
              type="submit"
              disabled={!isValidQuantity || previewQuantity === 0}
            >
              {quantity > 0 ? "Update cart" : "Add to cart"}
            </button>
          </div>
          {quantity > 0 && (
            <p className="fish-item-cart-note">
              Currently in your cart: {quantity} kg
            </p>
          )}
        </form>

        {quantity > 0 && (
          <button className="fish-item-go-to-cart" type="button" onClick={() => navigate("/cart")}>Go to cart</button>
        )}
        <button
          className="details-btn"
          type="button"
          onClick={() => navigate(`/product/${id}`)}
        >
          View product details
        </button>
      </div>
    </article>
  );
};

export default FishItem;
