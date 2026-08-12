import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("admin@erp.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  function quickFill(fillEmail, fillPass) {
    setEmail(fillEmail);
    setPassword(fillPass);
    setError("");
  }

  return (
    <div className="login-container">
      <div className="card login-card">
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <h1>Mini ERP + CRM</h1>
          <p className="muted">Sign in to your role dashboard</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-message">{error}</span>
            <button type="button" className="alert-close" onClick={() => setError("")}>
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@erp.com"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="demo-credentials">
          <p className="muted small" style={{ marginBottom: "0.5rem" }}>
            <strong>Demo Accounts (Click to Quick-Fill):</strong>
          </p>
          <div className="demo-buttons">
            <button
              type="button"
              className="btn btn-small"
              onClick={() => quickFill("admin@erp.com", "admin123")}
            >
              Admin
            </button>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => quickFill("sales@erp.com", "sales123")}
            >
              Sales
            </button>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => quickFill("warehouse@erp.com", "warehouse123")}
            >
              Warehouse
            </button>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => quickFill("accounts@erp.com", "accounts123")}
            >
              Accounts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
