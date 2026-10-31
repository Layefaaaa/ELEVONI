import { ELEVONI_WHATSAPP_PHONE } from "../../config/contact.js";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import "./PlaceOrder.css";
import { StoreContext } from "../../context/StoreContext";
import { FaWhatsapp, FaCreditCard } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const PlaceOrder = () => {
  const { fish_list, cartItems, url, token, setCartItems } =
    useContext(StoreContext);
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    city: "",
    state: "",
    country: "",
    phone: "",
  });
  const [saveInformation, setSaveInformation] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();
  const orderItems = useMemo(
    () =>
      fish_list
        .filter((product) => Number(cartItems[product._id] || 0) > 0)
        .map((product) => ({
          productId: product._id,
          quantity: Number(cartItems[product._id]),
        })),
    [fish_list, cartItems],
  );

  useEffect(() => {
    let active = true;
    if (!token) return undefined;

    axios.get(url + "/api/user/me", { headers: { token } })
      .then((response) => {
        if (!active || response.data?.success !== true) return;
        const user = response.data.user || {};
        const saved = user.checkoutProfile;
        if (saved && typeof saved === "object") {
          setData((previous) => ({
            ...previous,
            ...Object.fromEntries(
              ["firstName", "lastName", "email", "street", "city", "state", "country", "phone"]
                .filter((field) => typeof saved[field] === "string")
                .map((field) => [field, saved[field]])
            ),
          }));
        } else if (typeof user.email === "string") {
          setData((previous) => ({ ...previous, email: previous.email || user.email }));
        }
      })
      .catch(() => {
        // Checkout remains usable if profile prefill is temporarily unavailable.
      });

    return () => { active = false; };
  }, [token, url]);

  const saveCheckoutInformation = async () => {
    if (!saveInformation) return;
    try {
      await axios.put(
        url + "/api/user/checkout-profile",
        { checkoutProfile: data },
        { headers: { token } },
      );
      toast.success("Your checkout information was saved for next time.");
    } catch (error) {
      toast.warning(
        error.response?.data?.message ||
        "Your order can continue, but we couldn't save your information.",
      );
    }
  };

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

  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setData((previous) => ({ ...previous, [name]: value }));
  };
  const validContact = () => {
    if (!data.firstName || !data.phone || !data.street) {
      toast.error(
        "Please fill in your First Name, Phone Number, and Street Address.",
      );
      return false;
    }
    return true;
  };

  const orderWithPaystack = async () => {
    if (submissionLock.current || isSubmitting || !validContact()) return;
    if (!data.email) {
      toast.error("Please enter your email address.");
      return;
    }
    if (!quote || quoteLoading) {
      toast.error("Please wait for the server to confirm your order total.");
      return;
    }
    if (!window.PaystackPop || typeof window.PaystackPop.setup !== "function") {
      toast.error("Paystack failed to initialize. Please refresh the page.");
      return;
    }
    submissionLock.current = true;
    setIsSubmitting(true);
    const loadingToast = toast.loading("Preparing your order...");
    try {
      await saveCheckoutInformation();
      const response = await axios.post(
        url + "/api/payment/initialize",
        { items: orderItems, address: data },
        { headers: { token } },
      );
      if (!response.data.success)
        throw new Error(
          response.data.message || "Unable to initialize payment.",
        );
      toast.dismiss(loadingToast);
      const paystack = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: response.data.email,
        amount: response.data.amount * 100,
        currency: response.data.currency || "NGN",
        ref: response.data.reference,
        callback: async (reference) => {
          const verifyingToast = toast.loading("Verifying transaction...");
          try {
            const verified = await axios.post(
              url + "/api/payment/verify",
              {
                orderId: response.data.orderId,
                reference: reference.reference,
              },
              { headers: { token } },
            );
            if (!verified.data.success)
              throw new Error(
                verified.data.message || "Payment verification failed.",
              );
            setIsSubmitted(true);
            setCartItems({});
            toast.update(verifyingToast, {
              render: "Payment verified and order confirmed.",
              type: "success",
              isLoading: false,
              autoClose: 3000,
            });
            navigate("/success", {
              state: {
                orderId: response.data.orderId,
                paymentStatus: "successful",
              },
            });
          } catch (error) {
            toast.update(verifyingToast, {
              render:
                error.response?.data?.message ||
                error.message ||
                "Payment verification failed.",
              type: "error",
              isLoading: false,
              autoClose: 5000,
            });
            submissionLock.current = false;
            setIsSubmitting(false);
          }
        },
        onClose: () => {
          toast.info(
            "Payment window closed. The order remains unpaid until Paystack verification succeeds.",
          );
          submissionLock.current = false;
          setIsSubmitting(false);
        },
      });
      paystack.openIframe();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Unable to initialize payment.",
      );
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  const orderOnWhatsApp = async () => {
    if (submissionLock.current || isSubmitting || !validContact()) return;
    if (!quote || quoteLoading) {
      toast.error("Please wait for the server to confirm your order total.");
      return;
    }
    submissionLock.current = true;
    setIsSubmitting(true);
    const loadingToast = toast.loading("Recording your order request...");
    try {
      await saveCheckoutInformation();
      const response = await axios.post(
        url + "/api/order/place",
        { items: orderItems, address: data },
        { headers: { token } },
      );
      if (!response.data.success)
        throw new Error(
          response.data.message || "Could not record order request.",
        );
      const order = response.data.data;
      const phoneNumber = "08135738991";
      let message =
        "Hello Elevoni, I would like to confirm this order request.\n\n";
      order.items.forEach((item) => {
        message +=
          "- " +
          item.name +
          " x " +
          item.quantity +
          " kg - NGN " +
          Number(item.lineTotal).toLocaleString() +
          "\n";
      });
      message += "\nSubtotal: NGN " + Number(order.subtotal).toLocaleString();
      message +=
        "\nDelivery Fee: NGN " + Number(order.deliveryFee).toLocaleString();
      message += "\nTotal: NGN " + Number(order.amount).toLocaleString();
      message += "\nOrder reference: " + response.data.orderId;
      message += "\n\nName: " + data.firstName + " " + data.lastName;
      message += "\nPhone: " + data.phone;
      message +=
        "\nAddress: " +
        data.street +
        ", " +
        data.city +
        ", " +
        data.state +
        ", " +
        data.country;
      window.open(
        "https://wa.me/" + phoneNumber + "?text=" + encodeURIComponent(message),
        "_blank",
        "noopener,noreferrer",
      );
      setIsSubmitted(true);
      setCartItems({});
      toast.update(loadingToast, {
        render:
          "Order request saved. Elevoni will confirm it through WhatsApp.",
        type: "success",
        isLoading: false,
        autoClose: 3500,
      });
      navigate("/success", {
        state: {
          orderId: response.data.orderId,
          paymentStatus: "unpaid",
          orderStatus: "pending confirmation",
        },
      });
    } catch (error) {
      toast.update(loadingToast, {
        render:
          error.response?.data?.message ||
          error.message ||
          "Unable to record order request.",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isSubmitted) return;
    if (!token) {
      toast.info("Please log in to proceed to checkout.");
      navigate("/cart");
    } else if (orderItems.length === 0 && !quoteLoading) {
      toast.warn("Your cart is empty. Add some items first!");
      navigate("/cart");
    }
  }, [token, orderItems.length, quoteLoading, navigate, isSubmitted]);

  const money = (value) => Number(value || 0).toLocaleString();
  return (
    <div className="place-order">
      <div className="place-order-left">
        <p className="title">Delivery Information</p>
        <div className="multi-fields">
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={data.firstName}
            onChange={onChangeHandler}
            required
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={data.lastName}
            onChange={onChangeHandler}
          />
        </div>
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={data.email}
          onChange={onChangeHandler}
          required
        />
        <input
          type="text"
          name="street"
          placeholder="Street"
          value={data.street}
          onChange={onChangeHandler}
          required
        />
        <div className="multi-fields">
          <input
            type="text"
            name="city"
            placeholder="City"
            value={data.city}
            onChange={onChangeHandler}
          />
          <input
            type="text"
            name="state"
            placeholder="State"
            value={data.state}
            onChange={onChangeHandler}
          />
        </div>
        <input
          type="text"
          name="country"
          placeholder="Country"
          value={data.country}
          onChange={onChangeHandler}
        />
        <input
          type="text"
          name="phone"
          placeholder="Phone"
          value={data.phone}
          onChange={onChangeHandler}
          required
        />
        <label className="save-checkout-information">
          <input
            type="checkbox"
            checked={saveInformation}
            onChange={(event) => setSaveInformation(event.target.checked)}
          />
          <span>
            <strong>Save my information for future orders</strong>
            <small>Save your details securely so you can check out faster next time.</small>
          </span>
        </label>
      </div>
      <div className="place-order-right">
        <div className="cart-total">
          <h2>Cart Total</h2>
          {quoteLoading ? (
            <p>Checking current prices...</p>
          ) : quote ? (
            <>
              <div className="cart-total-details">
                <p>Subtotal</p>
                <p>NGN {money(quote.subtotal)}</p>
              </div>
              <hr />
              <div className="cart-total-details">
                <p>Delivery Fee</p>
                <p>NGN {money(quote.deliveryFee)}</p>
              </div>
              <hr />
              <div className="cart-total-details">
                <p>Total</p>
                <b>NGN {money(quote.totalAmount)}</b>
              </div>
            </>
          ) : (
            <p>
              {quoteError ||
                "Unable to load a current server quote. Please refresh or try again."}
            </p>
          )}
          <div className="action-buttons-wrapper">
            <button
              type="button"
              className="paystack-btn"
              onClick={orderWithPaystack}
              disabled={isSubmitting || quoteLoading || !quote}
            >
              <FaCreditCard />
              {isSubmitting ? "PROCESSING..." : "PAY ONLINE NOW"}
            </button>
            <div className="custom-divider">
              <span>OR</span>
            </div>
            <button
              type="button"
              className="order-btn"
              onClick={orderOnWhatsApp}
              disabled={isSubmitting || quoteLoading || !quote}
            >
              <FaWhatsapp />
              {isSubmitting ? "PROCESSING..." : "ORDER ON WHATSAPP"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceOrder;
