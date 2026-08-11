import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canPerform } from "../utils/permissions";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const role = user?.role?.toLowerCase() || "";
  const canViewStockLog = canPerform("view_stock_movements", user?.role);

  const roleColors = {
    admin: "#ef4444",
    sales: "#3b82f6",
    warehouse: "#f59e0b",
    accounts: "#10b981",
  };

  const badgeColor = roleColors[role] || "#64748b";

  return (
    <div className="navbar">
      <div className="navbar-brand">
        <NavLink to="/" style={{ color: "white", textDecoration: "none" }}>
          Mini ERP + CRM
        </NavLink>
      </div>
      <nav className="navbar-links">
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/customers">Customers</NavLink>
        <NavLink to="/products">Products</NavLink>
        {canViewStockLog && (
          <NavLink to="/stock-movements">Stock Log</NavLink>
        )}
        <NavLink to="/challans">Challans</NavLink>
      </nav>
      <div className="navbar-user">
        <span>
          {user?.name}{" "}
          <span
            style={{
              display: "inline-block",
              background: badgeColor,
              color: "white",
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "0.15rem 0.5rem",
              borderRadius: "999px",
              textTransform: "uppercase",
              marginLeft: "0.35rem",
            }}
          >
            {user?.role}
          </span>
        </span>
        <button className="btn btn-secondary btn-small" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
