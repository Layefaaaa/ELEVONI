import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/auth-context";
import api from "../../api";
import "./Login.css";

const Login = () => {
  const { isAuthenticated, loading, signIn, application } =
    useContext(AuthContext);

  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(application?.status === "approved" ? "/" : "/apply", {
        replace: true,
      });
    }
  }, [application, isAuthenticated, loading, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email address and password.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post("/api/user/login", {
        email: email.trim(),
        password,
      });

      const { success, token, user } = response.data ?? {};

      if (!success || !token) {
        setError("We couldn't sign you in. Please try again.");
        return;
      }
      await signIn(token, user ?? null);
    } catch (requestError) {
      const status = requestError.response?.status;

      if (status === 401) {
        setError("Incorrect email or password.");
      } else if (status === 400) {
        setError(
          requestError.response?.data?.message ||
            "Check your details and try again.",
        );
      } else {
        setError(
          "Unable to sign in right now. Check your connection and try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="vendor-page">
      <header className="vendor-page-header">
        <p className="vendor-page-eyebrow">Sign in</p>
        <h1>Sign in to the Vendor Portal</h1>
        <p className="vendor-page-summary">
          Use your Elevoni account to access your vendor application and its
          current status.
        </p>
      </header>

      <div className="vendor-card">
        {loading ? (
          <p role="status">Checking your existing session…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="vendor-form-field">
              <label htmlFor="vendor-login-email">Email address</label>
              <input
                id="vendor-login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="vendor-form-field">
              <label htmlFor="vendor-login-password">Password</label>
              <input
                id="vendor-login-password"
                name="password"
                type={passwordVisible ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button type="button" className="password-visibility-toggle" aria-label={passwordVisible ? "Hide password" : "Show password"} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((value) => !value)}>{passwordVisible ? "Hide password" : "Show password"}</button>
            </div>

            {error && (
              <p className="vendor-form-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        <p className="vendor-note">
          Don't have an application yet?{" "}
          <Link to="/apply">Apply to sell with Elevoni</Link>.
        </p>
      </div>
    </section>
  );
};

export default Login;
