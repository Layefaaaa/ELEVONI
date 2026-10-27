import { useState } from "react";
import { useAuth } from "../context/useAuth";
import "./AdminLogin.css";

const AdminLogin = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (loginError) {
      setError(
        loginError.response?.data?.message ||
          loginError.message ||
          "Unable to log in",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="admin-login-page">
      <div className="admin-login-container">
        <form className="admin-login-card" onSubmit={submit} noValidate>
          <div className="admin-login-header">
            <span className="admin-badge">Admin Portal</span>
            <h1>Elevoni</h1>
            <p>Sign in with an authorized administrator account.</p>
          </div>

          <div className="form-group">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              placeholder="admin@elevoni.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button type="button" className="password-visibility-toggle" aria-label={passwordVisible ? "Hide password" : "Show password"} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((value) => !value)}>{passwordVisible ? "Hide password" : "Show password"}</button>
          </div>

         

          {error && (
            <div className="admin-login-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="admin-submit-btn"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
};

export default AdminLogin;
