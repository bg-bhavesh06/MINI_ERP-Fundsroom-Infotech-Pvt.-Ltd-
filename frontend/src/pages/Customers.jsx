import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { canPerform } from "../utils/permissions";

const EMPTY_FORM = {
  name: "",
  mobile: "",
  email: "",
  business_name: "",
  gst_number: "",
  customer_type: "Retail",
  address: "",
  status: "Lead",
  followup_date: "",
  notes: "",
};

export default function Customers() {
  const { user } = useAuth();
  const canManageCustomers = canPerform("manage_customers", user?.role);

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  function load() {
    setLoading(true);
    api
      .get("/customers", { params: { search, page, limit: 10 } })
      .then((res) => {
        setCustomers(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load customers");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [search, page]);

  function openAddForm() {
    if (!canManageCustomers) return;
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function openEditForm(c) {
    if (!canManageCustomers) return;
    setForm({
      name: c.name || "",
      mobile: c.mobile || "",
      email: c.email || "",
      business_name: c.business_name || "",
      gst_number: c.gst_number || "",
      customer_type: c.customer_type || "Retail",
      address: c.address || "",
      status: c.status || "Lead",
      followup_date: c.followup_date || "",
      notes: c.notes || "",
    });
    setEditingId(c.id);
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canManageCustomers) return;
    setError("");
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, form);
        setSuccessMsg("Customer updated successfully");
      } else {
        await api.post("/customers", form);
        setSuccessMsg("Customer created successfully");
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Customers CRM</h1>
        <button
          className="btn btn-primary"
          onClick={openAddForm}
          disabled={!canManageCustomers}
          title={!canManageCustomers ? "Only Sales and Admin can add customers" : ""}
        >
          + Add Customer
        </button>
      </div>

      <div className="filters">
        <input
          placeholder="Search by name, mobile, business, email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
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

      {showForm && canManageCustomers && (
        <form className="card form-card" onSubmit={handleSubmit}>
          <h2>{editingId ? "Edit Customer" : "Add Customer"}</h2>
          <div className="form-grid">
            <div>
              <label>Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label>Mobile</label>
              <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>
            <div>
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label>Business Name</label>
              <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
            </div>
            <div>
              <label>GST Number (Optional)</label>
              <input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
            </div>
            <div>
              <label>Customer Type</label>
              <select value={form.customer_type} onChange={(e) => setForm({ ...form, customer_type: e.target.value })}>
                <option value="Retail">Retail</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Distributor">Distributor</option>
              </select>
            </div>
            <div>
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Lead">Lead</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label>Follow-up Date</label>
              <input type="date" value={form.followup_date || ""} onChange={(e) => setForm({ ...form, followup_date: e.target.value })} />
            </div>
            <div className="form-full">
              <label>Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="form-full">
              <label>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
        <div className="loading-box">Loading customers...</div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Business</th>
                <th>Mobile</th>
                <th>Type</th>
                <th>Status</th>
                <th>Follow-up</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/customers/${c.id}`}><strong>{c.name}</strong></Link>
                  </td>
                  <td>{c.business_name || "-"}</td>
                  <td>{c.mobile || "-"}</td>
                  <td>{c.customer_type}</td>
                  <td>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td>{c.followup_date || "-"}</td>
                  <td className="row-actions">
                    <button
                      className="btn btn-small"
                      onClick={() => openEditForm(c)}
                      disabled={!canManageCustomers}
                      title={!canManageCustomers ? "Your role cannot edit customers" : ""}
                    >
                      Edit
                    </button>
                    <Link to={`/customers/${c.id}`} className="btn btn-small btn-secondary">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan="7" className="muted empty-box">No customers found.</td></tr>
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
