import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { canPerform } from "../utils/permissions";

export default function Challans() {
  const { user } = useAuth();
  const canManageChallans = canPerform("manage_challans", user?.role);

  const [challans, setChallans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([{ product_id: "", qty: 1 }]);
  const [initialStatus, setInitialStatus] = useState("Draft");
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    api
      .get("/challans", { params: { status: statusFilter, page, limit: 10 } })
      .then((res) => {
        setChallans(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load challans");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [statusFilter, page]);

  function openCreateModal() {
    if (!canManageChallans) return;
    setError("");
    setCustomerId("");
    setItems([{ product_id: "", qty: 1 }]);
    setInitialStatus("Draft");
    setShowModal(true);

    Promise.all([
      api.get("/customers", { params: { limit: 100 } }),
      api.get("/products", { params: { limit: 100 } }),
    ]).then(([cRes, pRes]) => {
      setCustomers(cRes.data.data || []);
      setProducts(pRes.data.data || []);
    });
  }

  function addItemRow() {
    setItems([...items, { product_id: "", qty: 1 }]);
  }

  function updateItemRow(index, field, value) {
    const next = [...items];
    next[index][field] = value;
    setItems(next);
  }

  function removeItemRow(index) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!canManageChallans) return;
    setError("");
    setCreating(true);

    try {
      await api.post("/challans", {
        customer_id: Number(customerId),
        status: initialStatus,
        items: items.map((it) => ({
          product_id: Number(it.product_id),
          qty: Number(it.qty),
        })),
      });
      setSuccessMsg("Challan created successfully");
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create challan");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Sales Challans</h1>
        <button
          className="btn btn-primary"
          onClick={openCreateModal}
          disabled={!canManageChallans}
          title={!canManageChallans ? "Only Sales and Admin can create challans" : ""}
        >
          + New Challan
        </button>
      </div>

      <div className="filters">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-message">{error}</span>
          <button type="button" className="alert-close" onClick={() => setError("")} title="Dismiss">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          <span className="alert-message">{successMsg}</span>
          <button type="button" className="alert-close" onClick={() => setSuccessMsg("")} title="Dismiss">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-box">Loading challans...</div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total Qty</th>
                <th>Created By</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {challans.map((ch) => (
                <tr key={ch.id}>
                  <td><strong>{ch.challan_number}</strong></td>
                  <td>{ch.customer_name}</td>
                  <td>
                    <span className={`badge badge-${ch.status.toLowerCase()}`}>{ch.status}</span>
                  </td>
                  <td>{ch.total_qty}</td>
                  <td>{ch.created_by || "-"}</td>
                  <td>{new Date(ch.created_at).toLocaleDateString()}</td>
                  <td className="row-actions">
                    <Link to={`/challans/${ch.id}`} className="btn btn-small btn-secondary">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
              {challans.length === 0 && (
                <tr><td colSpan="7" className="muted empty-box">No challans found.</td></tr>
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

      {showModal && canManageChallans && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <form className="card modal modal-wide" onClick={(e) => e.stopPropagation()} onSubmit={handleCreate}>
            <h2>Create Sales Challan</h2>
            <div style={{ marginBottom: "1rem" }}>
              <label>Customer *</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                <option value="">-- Select Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.business_name ? `(${c.business_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label>Initial Status</label>
              <select value={initialStatus} onChange={(e) => setInitialStatus(e.target.value)}>
                <option value="Draft">Draft (Save without reducing stock)</option>
                <option value="Confirmed">Confirmed (Immediately reduce stock)</option>
              </select>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label>Products & Quantities *</label>
              {items.map((row, idx) => (
                <div key={idx} className="item-row">
                  <select
                    style={{ flex: 2 }}
                    value={row.product_id}
                    onChange={(e) => updateItemRow(idx, "product_id", e.target.value)}
                    required
                  >
                    <option value="">-- Select Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.stock_qty}, ₹{p.unit_price})
                      </option>
                    ))}
                  </select>
                  <input
                    style={{ flex: 1 }}
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={row.qty}
                    onChange={(e) => updateItemRow(idx, "qty", e.target.value)}
                    required
                  />
                  {items.length > 1 && (
                    <button type="button" className="btn btn-danger btn-small" onClick={() => removeItemRow(idx)}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-small" onClick={addItemRow} style={{ marginTop: "0.5rem" }}>
                + Add Another Product
              </button>
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Challan"}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
