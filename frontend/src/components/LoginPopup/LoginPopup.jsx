import { useState, useContext, useEffect, useRef, useCallback } from "react";
import "./LoginPopup.css";
import { assets } from "../../assets/assets";
import { StoreContext } from "../../context/StoreContext";
import { persistStoredToken } from "../../utils/authSession";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const googleRedirectErrorText = {
  ACCOUNT_NOT_FOUND: "No Elevoni account was found for this Google account. Choose Sign Up to create one.",
  ACCOUNT_NOT_ALLOWED: "Google sign-in is unavailable for this account.",
  ACCOUNT_CONFLICT: "This account could not be linked. Please use your existing sign-in method.",
  GOOGLE_TOKEN_INVALID: "Google could not verify this sign-in. Please try again.",
  GOOGLE_AUTH_FAILED: "Google sign-in could not be completed. Please try again."
};

const LoginPopup = ({ setShowLogin, redirectOutcome }) => {
  const { url, setToken } = useContext(StoreContext);
  const googleButtonRef = useRef(null);
  const pendingGoogleCredential = useRef(redirectOutcome?.credential || null);
  const pendingGoogleContinuation = useRef(redirectOutcome?.continuation || null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [googleError, setGoogleError] = useState(() => googleRedirectErrorText[redirectOutcome?.code] || "");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleConsentStep, setGoogleConsentStep] = useState(() => redirectOutcome?.code === "CONSENT_REQUIRED" || Boolean(redirectOutcome?.continuation));

  const [currState, setCurrState] = useState(redirectOutcome?.intent === "sign_up" ? "Sign Up" : "Login");
  const submitGoogleCredential = useCallback(async (credential, accepted) => {
    setGoogleBusy(true);
    setGoogleError("");
    try {
      const intent = currState === "Sign Up" ? "sign_up" : "sign_in";
      const response = await axios.post(url + "/api/user/google", {
        credential,
        intent,
        consentAccepted: accepted
      });
      if (!response.data?.success || !response.data?.token) {
        throw new Error(response.data?.message || "Google sign-in failed.");
      }
      pendingGoogleCredential.current = null;
      pendingGoogleContinuation.current = null;
      setToken(response.data.token);
      persistStoredToken(localStorage, response.data.token);
      setShowLogin(false);
      toast.success(intent === "sign_up" && response.status === 201 ? "Your Elevoni account is ready!" : "Welcome back to Elevoni!");
    } catch (error) {
      if (error.response?.data?.code === "CONSENT_REQUIRED") {
        pendingGoogleCredential.current = credential;
        pendingGoogleContinuation.current = null;
        setConsentAccepted(false);
        setGoogleConsentStep(true);
        setGoogleError("");
      } else {
        pendingGoogleCredential.current = null;
        setGoogleError(error.response?.data?.message || error.message || "Unable to sign in with Google. Please try again.");
      }
    } finally {
      setGoogleBusy(false);
    }
  }, [currState, setShowLogin, setToken, url]);

  const continueGoogleSignup = async () => {
    if (!consentAccepted) {
      setGoogleError("Please check the box above to continue.");
      return;
    }
    setGoogleBusy(true);
    setGoogleError("");
    try {
      const response = pendingGoogleContinuation.current
        ? await axios.post(url + "/api/user/google/complete-signup", {
            continuation: pendingGoogleContinuation.current,
            consentAccepted: true
          })
        : pendingGoogleCredential.current
          ? await axios.post(url + "/api/user/google", {
              credential: pendingGoogleCredential.current,
              intent: "sign_up",
              consentAccepted: true
            })
          : null;
      if (!response?.data?.success || !response.data?.token) {
        throw new Error(response?.data?.message || "Google sign-up could not be completed. Please try again.");
      }
      pendingGoogleCredential.current = null;
      pendingGoogleContinuation.current = null;
      setToken(response.data.token);
      persistStoredToken(localStorage, response.data.token);
      setShowLogin(false);
      toast.success("Your Elevoni account is ready!");
    } catch (error) {
      pendingGoogleCredential.current = null;
      pendingGoogleContinuation.current = null;
      setGoogleError(error.response?.data?.message || error.message || "We couldn't complete your Google sign-up. Please try again.");
    } finally {
      setGoogleBusy(false);
    }
  };

  useEffect(() => {
    if (!googleClientId) return undefined;
    let cancelled = false;
    const renderGoogleButton = () => {
      if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) return;
      const iosBrowser = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      window.google.accounts.id.initialize(iosBrowser ? {
        client_id: googleClientId,
        ux_mode: "redirect",
        login_uri: "https://elevonifarms.vercel.app/api/auth/google"
      } : {
        client_id: googleClientId,
        ux_mode: "popup",
        use_fedcm_for_button: true,
        callback: async ({ credential }) => {
          if (!credential) {
            setGoogleError("Google sign-in did not return a credential. Please try again.");
            return;
          }
          await submitGoogleCredential(credential, consentAccepted);
        }
      });
      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: currState === "Sign Up" ? "signup_with" : "signin_with",
        shape: "rect",
        state: `${currState === "Sign Up" ? (consentAccepted ? "sign_up_consented" : "sign_up_unconsented") : "sign_in"}|${window.location.origin}`,
        width: String(Math.min(360, Math.floor(googleButtonRef.current.getBoundingClientRect().width || 360)))
      });
    };

    const handleScriptError = () => setGoogleError(`Google ${currState === "Sign Up" ? "sign-up" : "sign-in"} is unavailable right now.`);
    const scriptId = "google-identity-services";
    let script = document.getElementById(scriptId);
    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", renderGoogleButton);
      script.addEventListener("error", handleScriptError, { once: true });
    }
    return () => {
      cancelled = true;
      script?.removeEventListener("load", renderGoogleButton);
      script?.removeEventListener("error", handleScriptError);
    };
  }, [consentAccepted, currState, googleClientId, setShowLogin, setToken, submitGoogleCredential, url]);
  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setData((data) => ({ ...data, [name]: value }));
  };

  const onLogin = async (event) => {
    event.preventDefault();
    let newUrl = url;
    if (currState === "Login") {
      newUrl += "/api/user/login";
    } else {
      newUrl += "/api/user/register";
    }

    try {
      const response = await axios.post(newUrl, data);

      if (response.data.success && response.data.token) {
        setToken(response.data.token);
        persistStoredToken(localStorage, response.data.token);
        setShowLogin(false);

        if (currState === "Login") {
          toast.success("Welcome back! Logged in successfully.");
        } else {
          toast.success("Account created successfully! Welcome aboard.");
        }
      } else {
        toast.error(response.data.message || "Authentication failed.");
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error(
        error.response?.data?.message || "Server error. Please try again.",
      );
    }
  };

  return (
    <div className="login-popup">
      <form
        onSubmit={(event) => {
          if (googleConsentStep) {
            event.preventDefault();
            void continueGoogleSignup();
          } else {
            onLogin(event);
          }
        }}
        className={"login-popup-container" + (googleConsentStep ? " login-popup-consent-only" : "")}
      >
        <div className="login-popup-title">
          <h2>{googleConsentStep ? "One last step" : currState}</h2>
          <img
            onClick={() => setShowLogin(false)}
            src={assets.cross_icon}
            alt="Close authentication"
          />
        </div>
        {googleConsentStep ? (
          <div className="google-consent-step">
            <p>Before we create your Elevoni account, please confirm that you agree to our Privacy Policy and Terms &amp; Conditions.</p>
            <label className="google-consent-label" htmlFor="google-signup-consent">
              <input
                id="google-signup-consent"
                type="checkbox"
                checked={consentAccepted}
                onChange={(event) => {
                  setConsentAccepted(event.target.checked);
                  if (googleError) setGoogleError("");
                }}
              />
              <span>I agree to Elevoni&apos;s <Link to="/privacy" target="_blank" rel="noreferrer">Privacy Policy</Link> and Terms &amp; Conditions</span>
            </label>
            {googleError && <p className="google-consent-error" role="alert">{googleError}</p>}
            {googleBusy && <p className="google-signin-message" role="status">Completing your Google sign-up...</p>}
            <button type="button" onClick={() => void continueGoogleSignup()} disabled={googleBusy}>
              Continue with Google
            </button>
          </div>
        ) : (
          <>
            <div className="login-popup-inputs">
              {currState === "Login" ? null : (
                <input
                  name="name"
                  onChange={onChangeHandler}
                  value={data.name}
                  type="text"
                  placeholder="Your name"
                  required
                />
              )}
              <input
                name="email"
                onChange={onChangeHandler}
                value={data.email}
                type="email"
                placeholder="Your email"
                required
              />
              <input
                name="password"
                onChange={onChangeHandler}
                value={data.password}
                type="password"
                placeholder="Password"
                required
              />
            </div>
            <button type="submit">
              {currState === "Sign Up" ? "Create account" : "Login"}
            </button>
            <div className="login-popup-divider" aria-hidden="true"><span>or</span></div>
            {googleClientId ? (
              <div className="google-signin-button" ref={googleButtonRef} aria-label={currState === "Sign Up" ? "Sign up with Google" : "Sign in with Google"} />
            ) : (
              <p className="google-signin-message">Google {currState === "Sign Up" ? "sign-up" : "sign-in"} is not configured yet.</p>
            )}
            {googleBusy && <p className="google-signin-message" role="status">Completing Google {currState === "Sign Up" ? "sign-up" : "sign-in"}...</p>}
            {googleError && <p className="google-signin-message" role="alert">{googleError}</p>}
            <div className="login-popup-condition">
              <input type="checkbox" required checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} />
              <p>{currState === "Sign Up" ? "By creating an account, including with Google, I agree to the Terms of Use & Privacy Policy." : "By continuing, I agree to the Terms of Use & Privacy Policy."}</p>
            </div>
            {currState === "Login" ? (
              <p>
                Create a new account?{" "}
                <span onClick={() => { pendingGoogleCredential.current = null; setGoogleError(""); setCurrState("Sign Up"); }}>Click here</span>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <span onClick={() => { pendingGoogleCredential.current = null; setGoogleError(""); setCurrState("Login"); }}>Login here</span>
              </p>
            )}
          </>
        )}
      </form>
    </div>
  );
};

export default LoginPopup;
