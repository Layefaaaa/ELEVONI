import { createContext, useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import getProductPrice from "../utils/pricing";
import { resolveApiBaseUrl } from "../utils/apiBase";
import {
  clearStoredToken,
  isUnauthorizedResponse,
  persistStoredToken,
  readStoredToken,
} from "../utils/authSession";

export const StoreContext = createContext(null);

const url = resolveApiBaseUrl();

const StoreContextProvider = (props) => {
  const [cartItems, setCartItems] = useState({});
  const [token, setToken] = useState("");
  const [fish_list, setFishList] = useState([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState(false);
  const cartQuantitySyncTimers = useRef(new Map());

  const invalidateSession = useCallback(() => {
    clearStoredToken(localStorage);
    setToken("");
  }, []);

  const addtoCart = async (itemId) => {
    if (!cartItems) {
      setCartItems({});
    }

    if (!cartItems?.[itemId]) {
      setCartItems((prev) => ({ ...prev, [itemId]: 1 }));
    } else {
      setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));
    }

    if (token) {
      try {
        await axios.post(
          url + "/api/cart/add",
          { itemId },
          { headers: { token } },
        );
      } catch (error) {
        console.error(
          "Failed to sync added item to remote cart:",
          error.message,
        );
      }
    }
  };

  const removeFromCart = async (itemId) => {
    setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] - 1 }));
    if (token) {
      try {
        await axios.post(
          url + "/api/cart/remove",
          { itemId },
          { headers: { token } },
        );
      } catch (error) {
        console.error(
          "Failed to sync removed item from remote cart:",
          error.message,
        );
      }
    }
  };

  const setCartQuantity = async (itemId, quantity) => {
    if (typeof itemId !== "string" || !Number.isSafeInteger(quantity) || quantity < 0) return false;

    setCartItems((previous) => {
      const next = { ...previous };
      if (quantity === 0) delete next[itemId];
      else next[itemId] = quantity;
      return next;
    });

    if (!token) return true;
    const config = { headers: { token } };
    try {
      const response = await axios.post(
        url + "/api/cart/set",
        { itemId, quantity },
        config,
      );
      if (response.data.success === true) return true;
    } catch (error) {
      if (error.response?.status === 403) return "forbidden";
      console.warn("Cart quantity endpoint unavailable; syncing with existing cart operations:", error.message);
    }

    // Older deployed API instances may not yet expose /cart/set. Reconcile
    // against the server cart using the established read/add/remove endpoints.
    try {
      const currentResponse = await axios.post(url + "/api/cart/get", {}, config);
      if (currentResponse.data.success !== true) return false;
      const currentQuantity = Number(currentResponse.data.cartData?.[itemId] || 0);
      if (!Number.isSafeInteger(currentQuantity) || currentQuantity < 0) return false;

      const operation = quantity > currentQuantity ? "add" : "remove";
      const difference = Math.abs(quantity - currentQuantity);
      for (let index = 0; index < difference; index += 1) {
        const response = await axios.post(
          url + `/api/cart/${operation}`,
          { itemId },
          config,
        );
        if (response.data.success !== true) return false;
      }
      return true;
    } catch (error) {
      if (error.response?.status === 403) return "forbidden";
      console.error("Failed to sync cart quantity:", error.message);
      return false;
    }
  };
  const updateCartQuantity = (itemId, quantity) => {
    if (typeof itemId !== "string" || !Number.isSafeInteger(quantity) || quantity < 0) return false;

    setCartItems((previous) => {
      const next = { ...previous };
      if (quantity === 0) delete next[itemId];
      else next[itemId] = quantity;
      return next;
    });
    if (!token) return true;

    const pendingSync = cartQuantitySyncTimers.current.get(itemId);
    if (pendingSync) clearTimeout(pendingSync);
    const timer = setTimeout(() => {
      cartQuantitySyncTimers.current.delete(itemId);
      void setCartQuantity(itemId, quantity);
    }, 400);
    cartQuantitySyncTimers.current.set(itemId, timer);
    return true;
  };

  const getTotalCartAmount = () => {
    let totalAmount = 0;

    for (const item in cartItems) {
      if (cartItems[item] > 0) {
        const itemInfo = fish_list.find((product) => product._id === item);

        if (itemInfo) {
          const quantity = cartItems[item];
          const price = getProductPrice(itemInfo, quantity);

          totalAmount += price * quantity;
        }
      }
    }

    return totalAmount;
  };

  const fetchFishList = async () => {
    try {
      const response = await axios.get(url + "/api/fish/list");
      const products = Array.isArray(response.data.data) ? response.data.data : [];
      setFishList(products);
      setCatalogueError(false);
    } catch (error) {
      console.error("Failed to fetch product library listings:", error.message);
      setCatalogueError(true);
    } finally {
      setCatalogueLoading(false);
    }
  };

  const loadCartData = async (cartToken) => {
    const response = await axios.post(
      url + "/api/cart/get",
      {},
      { headers: { token: cartToken } },
    );
    setCartItems((localCart) => ({ ...(response.data.cartData || {}), ...localCart }));
  };

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const redirectedToken = hashParams.get("elevoni_google_token");
    if (redirectedToken) {
      persistStoredToken(localStorage, redirectedToken);
      hashParams.delete("elevoni_google_token");
      const remainingHash = hashParams.toString();
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}${remainingHash ? `#${remainingHash}` : ""}`,
      );
    }
    const storedToken = readStoredToken(localStorage);
    if (storedToken) setToken(storedToken);

    async function loadData() {
      await fetchFishList();
      const activeToken = readStoredToken(localStorage);
      if (!activeToken) return;
      setToken(activeToken);
      try {
        await loadCartData(activeToken);
      } catch (error) {
        if (isUnauthorizedResponse(error)) {
          invalidateSession();
          return;
        }
        console.error("Failed to retrieve user cart record:", error.message);
      }
    }
    loadData();
  }, [invalidateSession]);

  const contextValue = {
    fish_list,
    catalogueLoading,
    catalogueError,
    cartItems,
    setCartItems,
    addtoCart,
    removeFromCart,
    setCartQuantity,
    updateCartQuantity,
    getTotalCartAmount,
    url,
    token,
    setToken,
    invalidateSession,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreContextProvider;
