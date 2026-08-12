import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/dashboard/summary")
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load dashboard summary"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-box">Loading dashboard...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <span className="muted">Welcome back, {user?.name} ({user?.role?.toUpperCase()})</span>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Customers</span>
          <span className="kpi-value">{data?.total_customers || 0}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Products</span>
          <span className="kpi-value">{data?.total_products || 0}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Low Stock Alerts</span>
          <span className="kpi-value warning">{data?.low_stock_count || 0}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Challans</span>
          <span className="kpi-value">{data?.total_challans || 0}</span>
        </div>
      </div>

      <div className="dashboard-columns" style={{ marginTop: "2rem" }}>
        <div className="card">
          <div className="card-header">
            <h2>Recent Sales Challans</h2>
            <Link to="/challans" className="btn btn-secondary btn-small">View All</Link>
          </div>
          <table>
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_challans || []).map((c) => (
                <tr key={c.id}>
                  <td><Link to={`/challans/${c.id}`}>{c.challan_number}</Link></td>
                  <td>{c.customer_name}</td>
                  <td><span className={`badge badge-${c.status?.toLowerCase()}`}>{c.status}</span></td>
                  <td>{c.total_qty}</td>
                </tr>
              ))}
              {(data?.recent_challans || []).length === 0 && (
                <tr><td colSpan="4" className="muted">No recent challans.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Low Stock Products</h2>
            <Link to="/products" className="btn btn-secondary btn-small">View All</Link>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Min Alert</th>
              </tr>
            </thead>
            <tbody>
              {(data?.low_stock_products || []).map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td className="warning"><strong>{p.stock_qty}</strong></td>
                  <td>{p.min_stock}</td>
                </tr>
              ))}
              {(data?.low_stock_products || []).length === 0 && (
                <tr><td colSpan="4" className="muted">All stock levels healthy!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
