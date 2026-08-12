import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { canPerform } from "../utils/permissions";

export default function CustomerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManageCustomers = canPerform("manage_customers", user?.role);

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  function load() {
    setLoading(true);
    api
      .get(`/customers/${id}`)
      .then((res) => setCustomer(res.data.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load customer"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleAddNote(e) {
    e.preventDefault();
    if (!canManageCustomers) return;
    if (!note.trim()) return;
    setSubmittingNote(true);
    setError("");
    try {
      await api.post(`/customers/${id}/followups`, { note: note.trim() });
      setNote("");
      setSuccessMsg("Follow-up note added successfully");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add note");
    } finally {
      setSubmittingNote(false);
    }
  }

  if (loading) return <div className="loading-box">Loading customer details...</div>;
  if (!customer) return <div className="muted empty-box">Customer not found.</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/customers" className="btn btn-secondary btn-small" style={{ marginBottom: "0.5rem" }}>
            &larr; Back to Customers
          </Link>
          <h1>{customer.name}</h1>
        </div>
        <span className={`badge badge-${customer.status.toLowerCase()}`}>{customer.status}</span>
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

      <div className="dashboard-columns">
        <div className="card">
          <div className="card-header">
            <h2>Customer Information</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label>Business Name</label>
              <p><strong>{customer.business_name || "-"}</strong></p>
            </div>
            <div>
              <label>Customer Type</label>
              <p><strong>{customer.customer_type}</strong></p>
            </div>
            <div>
              <label>Mobile</label>
              <p>{customer.mobile || "-"}</p>
            </div>
            <div>
              <label>Email</label>
              <p>{customer.email || "-"}</p>
            </div>
            <div>
              <label>GST Number</label>
              <p>{customer.gst_number || "-"}</p>
            </div>
            <div>
              <label>Follow-up Date</label>
              <p>{customer.followup_date || "-"}</p>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Address</label>
              <p>{customer.address || "-"}</p>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Initial Notes</label>
              <p>{customer.notes || "-"}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>CRM Follow-up Notes</h2>
          </div>

          <form className="inline-form" onSubmit={handleAddNote}>
            <input
              placeholder={canManageCustomers ? "Add a follow-up note..." : "Your role cannot add follow-up notes"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!canManageCustomers}
              required
            />
            <button
              className="btn btn-primary btn-small"
              type="submit"
              disabled={submittingNote || !canManageCustomers}
              title={!canManageCustomers ? "Only Sales and Admin can add notes" : ""}
            >
              {submittingNote ? "Adding..." : "Add Note"}
            </button>
          </form>

          <ul className="followup-list">
            {(customer.followups || []).map((f) => (
              <li key={f.id}>
                <span>{f.note}</span>
                <span className="muted small">
                  {new Date(f.created_at).toLocaleString()}
                </span>
              </li>
            ))}
            {(customer.followups || []).length === 0 && (
              <li className="muted small">No follow-up notes yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
