import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { canPerform } from "../utils/permissions";

const EMPTY_FORM = {
  name: "",
  sku: "",
  category: "",
  unit_price: 0,
  stock_qty: 0,
  min_stock: 0,
  location: "",
};
const EMPTY_STOCK_FORM = { qty: "", type: "IN", reason: "" };

export default function Products() {
  const { user } = useAuth();
  const canManageProducts = canPerform("manage_products", user?.role);
  const canViewMovements = canPerform("view_stock_movements", user?.role);

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [stockProductId, setStockProductId] = useState(null);
  const [stockForm, setStockForm] = useState(EMPTY_STOCK_FORM);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  function load() {
    setLoading(true);
    api
      .get("/products", {
        params: {
          search,
          lowStock: lowStockOnly ? "true" : "",
          page,
          limit: 10,
        },
      })
      .then((res) => {
        setProducts(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load products");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [search, lowStockOnly, page]);

  function openAddForm() {
    if (!canManageProducts) return;
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function openEditForm(p) {
    if (!canManageProducts) return;
    setForm({
      name: p.name || "",
      sku: p.sku || "",
      category: p.category || "",
      unit_price: p.unit_price || 0,
      stock_qty: p.stock_qty || 0,
      min_stock: p.min_stock || 0,
      location: p.location || "",
    });
    setEditingId(p.id);
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canManageProducts) return;
    setError("");
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, form);
        setSuccessMsg("Product updated successfully");
      } else {
        await api.post("/products", form);
        setSuccessMsg("Product created successfully");
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save product");
    } finally {
      setSaving(false);
    }
  }

  async function submitStockAdjust(e) {
    e.preventDefault();
    if (!canManageProducts) return;
    setError("");
    setSaving(true);
    try {
      await api.post(`/products/${stockProductId}/stock`, {
        qty: Number(stockForm.qty),
        type: stockForm.type,
        reason: stockForm.reason,
      });
      setSuccessMsg("Stock adjusted successfully");
      setStockProductId(null);
      setStockForm(EMPTY_STOCK_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not adjust stock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Products & Inventory</h1>
        <div>
          {canViewMovements && (
            <Link to="/stock-movements" className="btn btn-secondary" style={{ marginRight: "0.5rem" }}>
              Stock Movement Log
            </Link>
          )}
          <button
            className="btn btn-primary"
            onClick={openAddForm}
            disabled={!canManageProducts}
            title={!canManageProducts ? "Only Warehouse and Admin can add products" : ""}
          >
            + Add Product
          </button>
        </div>
      </div>

      <div className="filters">
        <input
          placeholder="Search by name, SKU, category..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              setPage(1);
            }}
          />
          Low stock only
        </label>
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

      {showForm && canManageProducts && (
        <form className="card form-card" onSubmit={handleSubmit}>
          <h2>{editingId ? "Edit Product" : "Add Product"}</h2>
          <div className="form-grid">
            <div>
              <label>Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label>SKU/Code *</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required disabled={!!editingId} />
            </div>
            <div>
              <label>Category</label>
              <input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <label>Unit Price (₹)</label>
              <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
            </div>
            {!editingId && (
              <div>
                <label>Opening Stock</label>
                <input type="number" min="0" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
              </div>
            )}
            <div>
              <label>Minimum Stock Alert Qty</label>
              <input type="number" min="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
            </div>
            <div>
              <label>Location / Warehouse</label>
              <input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="loading-box">Loading products...</div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Location</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={p.stock_qty <= p.min_stock ? "row-warning" : ""}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td>{p.category || "-"}</td>
                  <td>₹{Number(p.unit_price).toFixed(2)}</td>
                  <td>
                    {p.stock_qty}{" "}
                    {p.stock_qty <= p.min_stock && <span className="badge badge-lead">Low</span>}
                  </td>
                  <td>{p.location || "-"}</td>
                  <td className="row-actions">
                    <button
                      className="btn btn-small"
                      onClick={() => openEditForm(p)}
                      disabled={!canManageProducts}
                      title={!canManageProducts ? "Your role cannot edit products" : ""}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => setStockProductId(p.id)}
                      disabled={!canManageProducts}
                      title={!canManageProducts ? "Your role cannot adjust stock" : ""}
                    >
                      Adjust Stock
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan="7" className="muted empty-box">No products found.</td></tr>
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

      {stockProductId && canManageProducts && (
        <div className="modal-backdrop" onClick={() => setStockProductId(null)}>
          <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={submitStockAdjust}>
            <h2>Adjust Stock</h2>
            <label>Type</label>
            <select value={stockForm.type} onChange={(e) => setStockForm({ ...stockForm, type: e.target.value })}>
              <option value="IN">Stock IN (+)</option>
              <option value="OUT">Stock OUT (-)</option>
            </select>
            <label>Quantity *</label>
            <input type="number" min="1" value={stockForm.qty} onChange={(e) => setStockForm({ ...stockForm, qty: e.target.value })} required />
            <label>Reason</label>
            <input value={stockForm.reason} onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })} placeholder="e.g. Purchase order received / damaged" />
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setStockProductId(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
