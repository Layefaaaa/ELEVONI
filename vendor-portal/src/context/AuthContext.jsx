import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import { resolveApiBaseUrl } from "../utils/apiBase";
import {
  clearStoredToken,
  isUnauthorizedResponse,
  persistStoredToken,
  readStoredToken,
} from "../utils/authSession";
import { AuthContext } from "./auth-context";

const getStoredToken = () =>
  readStoredToken(typeof window !== "undefined" ? window.localStorage : null);

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(Boolean(getStoredToken()));
  const sessionVersion = useRef(0);
  const skipNextHydration = useRef("");
  const url = useMemo(() => resolveApiBaseUrl(), []);

  const invalidateSession = useCallback(() => {
    sessionVersion.current += 1;

    if (typeof window !== "undefined") {
      clearStoredToken(window.localStorage);
    }

    setToken("");
    setUser(null);
    setApplication(null);
    setLoading(false);
  }, []);

  const loadSession = useCallback(
    async (sessionToken) => {
      const version = ++sessionVersion.current;
      setLoading(true);

      try {
        const userResponse = await api.get("/api/user/me", {
          headers: { token: sessionToken },
        });

        if (version !== sessionVersion.current) return null;

        if (!userResponse.data?.success || !userResponse.data?.user) {
          throw new Error("Unable to verify your account.");
        }

        const currentUser = userResponse.data.user;

        const vendorResponse = await api.get("/api/vendor/me", {
          headers: { token: sessionToken },
        });

        if (version !== sessionVersion.current) return null;

        const currentApplication = vendorResponse.data?.success
          ? (vendorResponse.data.application ?? null)
          : null;

        setUser(currentUser);
        setApplication(currentApplication);

        return {
          user: currentUser,
          application: currentApplication,
        };
      } catch (error) {
        if (version !== sessionVersion.current) return null;

        if (isUnauthorizedResponse(error)) {
          invalidateSession();
        }

        throw error;
      } finally {
        if (version === sessionVersion.current) {
          setLoading(false);
        }
      }
    },
    [invalidateSession],
  );

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (token && skipNextHydration.current === token) {
        skipNextHydration.current = "";
        return;
      }
      if (!token) {
        setUser(null);
        setApplication(null);
        setLoading(false);
        return;
      }

      try {
        await loadSession(token);
      } catch {
        // Preserve the token on network/server failures. A 401 is
        // handled by loadSession and invalidates the session.
        if (!cancelled) {
          setUser(null);
          setApplication(null);
        }
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [token, loadSession]);

  const signIn = useCallback(
    async (nextToken, nextUser = null) => {
      if (
        !persistStoredToken(
          typeof window !== "undefined" ? window.localStorage : null,
          nextToken,
        )
      ) {
        throw new Error("The server did not provide a valid session token.");
      }

      skipNextHydration.current = nextToken;

      setToken(nextToken);
      setUser(nextUser);
      setApplication(null);

      return loadSession(nextToken);
    },
    [loadSession],
  );

  const signOut = useCallback(() => {
    invalidateSession();
  }, [invalidateSession]);

  const value = useMemo(
    () => ({
      url,
      token,
      user,
      setUser,
      application,
      setApplication,
      loading,
      signIn,
      signOut,
      invalidateSession,
      isAuthenticated: Boolean(token),
      isUnauthorizedResponse,
    }),
    [
      url,
      token,
      user,
      application,
      loading,
      signIn,
      signOut,
      invalidateSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
