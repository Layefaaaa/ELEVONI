import { useContext, useEffect, useMemo, useState } from "react";
import "./Cart.css";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import getProductPrice from "../../utils/pricing";

const Cart = () => {
  const { cartItems, fish_list, removeFromCart, url, token } =
    useContext(StoreContext);

  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  const orderItems = useMemo(
    () =>
      fish_list
        .filter((product) => Number(cartItems?.[product._id] || 0) > 0)
        .map((product) => ({
          productId: product._id,
          quantity: Number(cartItems[product._id]),
        })),
    [fish_list, cartItems],
  );

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      if (!token || orderItems.length === 0) {
        setQuote(null);
        setQuoteError("");
        setQuoteLoading(false);
        return;
      }
      setQuoteLoading(true);
      axios
        .post(
          url + "/api/order/quote",
          { items: orderItems },
          { headers: { token } },
        )
        .then((response) => {
          if (!active) return;
          if (response.data?.success) {
            setQuote(response.data.data);
            setQuoteError("");
          } else {
            setQuote(null);
            setQuoteError(response.data?.message || "The server could not price this order.");
          }
        })
        .catch((error) => {
          if (!active) return;
          setQuote(null);
          setQuoteError(
            error.response?.data?.message || "The server could not price this order.",
          );
        })
        .finally(() => {
          if (active) setQuoteLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [orderItems, token, url]);

  return (
    <div className="cart">
      <div className="cart-items">
        <div className="cart-items-title">
          <p>Items</p>
          <p>Title</p>
          <p>Price</p>
          <p>Quantity</p>
          <p>Total</p>
          <p>Remove</p>
        </div>

        <br />
        <hr />

        {fish_list.map((item) => {
          const quantity = cartItems?.[item._id] || 0;

          if (quantity > 0) {
            const price = getProductPrice(item, quantity);
            const itemTotal = price * quantity;

            return (
              <div key={item._id}>
                <div className="cart-items-title cart-items-item">
                  <img
                    src={
                      item.image && item.image.startsWith("http")
                        ? item.image
                        : `${url}/images/${item.image}`
                    }
                    alt={item.name}
                  />

                  <p>{item.name}</p>

                  <p>₦{price.toLocaleString()}</p>

                  <p>{quantity}</p>

                  <p>₦{itemTotal.toLocaleString()}</p>

                  <p onClick={() => removeFromCart(item._id)} className="cross">
                    x
                  </p>
                </div>

                <hr />
              </div>
            );
          }

          return null;
        })}
      </div>

      <div className="cart-bottom">
        <div className="cart-total">
          <h2>Cart Total</h2>

          {quoteLoading ? (
            <p>Checking current prices...</p>
          ) : quote ? (
            <div>
              <div className="cart-total-details">
                <p>Subtotal</p>
                <p>₦{quote.subtotal.toLocaleString()}</p>
              </div>

              <hr />

              <div className="cart-total-details">
                <p>Delivery Fee</p>
                <p>₦{quote.deliveryFee.toLocaleString()}</p>
              </div>

              <hr />

              <div className="cart-total-details">
                <b>Total</b>
                <b>₦{quote.totalAmount.toLocaleString()}</b>
              </div>
            </div>
          ) : (
            <p>
              {quoteError ||
                "Your delivery fee and order total will be confirmed at checkout."}
            </p>
          )}

          <button onClick={() => navigate("/order")}>
            PROCEED TO CHECKOUT
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
