import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function StockMovements() {
  const [movements, setMovements] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get("/products/movements", { params: { page, limit: 20 } })
      .then((res) => {
        setMovements(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load stock movements"))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <div className="page-header">
        <h1>Stock Movement Log</h1>
        <Link to="/products" className="btn btn-secondary">
          &larr; Back to Products
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-box">Loading stock movements...</div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Reason</th>
                <th>Created By</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{m.product_name}</td>
                  <td>{m.sku}</td>
                  <td>
                    <span className={`badge badge-${m.type === "IN" ? "active" : "inactive"}`}>
                      {m.type}
                    </span>
                  </td>
                  <td>{m.qty}</td>
                  <td>{m.reason || "-"}</td>
                  <td>{m.created_by || "-"}</td>
                  <td>{new Date(m.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan="7" className="muted empty-box">
                    No stock movements recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="pagination-controls">
                <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  &larr; Prev
                </button>
                <button className="pagination-btn" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
