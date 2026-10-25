import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Navbar from "./components/Navbar/Navbar";
import Home from "./pages/Home/Home";
import Cart from "./pages/Cart/Cart";
import PlaceOrder from "./pages/PlaceOrder/PlaceOrder";
import MyOrders from "./pages/MyOrders/MyOrders";
import Footer from "./components/Footer/Footer";
import LoginPopup from "./components/LoginPopup/LoginPopup";
import ScrollToTop from "./components/ScrollToTop";
import AboutUs from "./pages/InfoPages/AboutUs";
import Delivery from "./pages/InfoPages/Delivery";
import PrivacyPolicy from "./pages/InfoPages/PrivacyPolicy";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ItemDetails from "./pages/ItemDetails/ItemDetails";
import CategoryPage from "./pages/Category/CategoryPage";
import SellWithElevoni from "./pages/Vendor/SellWithElevoni";
import Marketplace from "./pages/Marketplace/Marketplace";
import Success from "./components/SuccessPage/Success";
import ReactGA from "./analytics";

ReactGA.send({
  hitType: "pageview",
  page: window.location.pathname,
});

const readGoogleRedirectOutcome = () => {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const continuation = hashParams.get("elevoni_google_signup");
  if (continuation) return { code: "CONSENT_REQUIRED", intent: "sign_up", continuation };
  const code = params.get("google_auth_error");
  if (!code) return null;
  return { code, intent: params.get("google_auth_intent") === "sign_up" ? "sign_up" : "sign_in" };
};

const App = () => {
  const [googleRedirectOutcome, setGoogleRedirectOutcome] = useState(readGoogleRedirectOutcome);
  const [showLogin, setShowLogin] = useState(() => Boolean(readGoogleRedirectOutcome()));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const hadError = params.has("google_auth_error");
    const hadContinuation = hashParams.has("elevoni_google_signup");
    if (!hadError && !hadContinuation) return;

    params.delete("google_auth_error");
    params.delete("google_auth_intent");
    hashParams.delete("elevoni_google_signup");
    const remainingSearch = params.toString();
    const remainingHash = hashParams.toString();
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname +
        (remainingSearch ? "?" + remainingSearch : "") +
        (remainingHash ? "#" + remainingHash : ""),
    );
  }, []);
  const handleSetShowLogin = (isOpen) => {
    setShowLogin(isOpen);
    if (!isOpen) setGoogleRedirectOutcome(null);
  };
  return (
    <HelmetProvider>
      <ScrollToTop />
      {showLogin ? <LoginPopup setShowLogin={handleSetShowLogin} redirectOutcome={googleRedirectOutcome} /> : <></>}
      <Navbar setShowLogin={setShowLogin} />
      <div className="app">
        <ToastContainer position="top-right" autoClose={3000} theme="light" />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/order" element={<PlaceOrder />} />
          <Route path="/myorders" element={<MyOrders />} />
          <Route path="/success" element={<Success />} />
          <Route path="/product/:id" element={<ItemDetails />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/category/:slug/:childSlug" element={<CategoryPage />} />
          <Route path="/sell-with-elevoni" element={<SellWithElevoni />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
        </Routes>
      </div>
      <Footer />
    </HelmetProvider>
  );
};

export default App;
