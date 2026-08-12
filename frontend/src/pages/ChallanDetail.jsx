import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { canPerform } from "../utils/permissions";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function ChallanDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManageChallans = canPerform("manage_challans", user?.role);

  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const printRef = useRef();

  function load() {
    setLoading(true);
    api
      .get(`/challans/${id}`)
      .then((res) => setChallan(res.data.data))
      .catch((err) =>
        setError(err.response?.data?.message || "Could not load challan"),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleConfirm() {
    if (!canManageChallans) return;
    if (
      !window.confirm(
        "Confirm this challan? This will permanently deduct stock from inventory.",
      )
    )
      return;
    setActionLoading(true);
    setError("");
    try {
      await api.put(`/challans/${id}/confirm`);
      setSuccessMsg("Challan confirmed successfully. Stock deducted.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not confirm challan");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!canManageChallans) return;
    if (
      !window.confirm(
        "Cancel this challan? If confirmed, stock will be restored.",
      )
    )
      return;
    setActionLoading(true);
    setError("");
    try {
      await api.put(`/challans/${id}/cancel`);
      setSuccessMsg("Challan cancelled successfully.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not cancel challan");
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadPDF() {
    const element = printRef.current;
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${challan.challan_number || "challan"}.pdf`);
    } catch (err) {
      setError("Failed to generate PDF export");
    }
  }

  if (loading)
    return <div className="loading-box">Loading challan details...</div>;
  if (!challan)
    return <div className="muted empty-box">Challan not found.</div>;

  const grandTotal = (challan.items || []).reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
    0,
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <Link
            to="/challans"
            className="btn btn-secondary btn-small"
            style={{ marginBottom: "0.5rem" }}
          >
            &larr; Back to Challans
          </Link>
          <h1>Challan #{challan.challan_number}</h1>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={downloadPDF}>
            📄 Download Invoice PDF
          </button>
          {challan.status === "Draft" && (
            <button
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={actionLoading || !canManageChallans}
              title={
                !canManageChallans
                  ? "Only Sales and Admin can confirm challans"
                  : ""
              }
            >
              Confirm Challan
            </button>
          )}
          {challan.status === "Draft" && (
            <button
              className="btn btn-danger"
              onClick={handleCancel}
              disabled={actionLoading || !canManageChallans}
              title={
                !canManageChallans
                  ? "Only Sales and Admin can cancel challans"
                  : ""
              }
            >
              Cancel Challan
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-message">{error}</span>
          <button
            type="button"
            className="alert-close"
            onClick={() => setError("")}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          <span className="alert-message">{successMsg}</span>
          <button
            type="button"
            className="alert-close"
            onClick={() => setSuccessMsg("")}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <div ref={printRef} className="card" style={{ padding: "2rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "2px solid #e2e8f0",
            paddingBottom: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: "#1e293b" }}>
              MINI ERP & CRM OPERATIONS
            </h2>
            <p className="muted small">Wholesale & Distribution Portal</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h3 style={{ margin: 0 }}>DELIVERY CHALLAN</h3>
            <p className="muted small">
              Challan #: <strong>{challan.challan_number}</strong>
            </p>
            <p className="muted small">
              Date: {new Date(challan.created_at).toLocaleDateString()}
            </p>
            <span className={`badge badge-${challan.status.toLowerCase()}`}>
              {challan.status}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
            marginBottom: "2rem",
          }}
        >
          <div>
            <h4 style={{ marginBottom: "0.25rem" }}>Customer Details:</h4>
            <p>
              <strong>{challan.customer_name}</strong>
            </p>
            {challan.business_name && (
              <p className="small muted">Business: {challan.business_name}</p>
            )}
            {challan.mobile && (
              <p className="small muted">Mobile: {challan.mobile}</p>
            )}
            {challan.email && (
              <p className="small muted">Email: {challan.email}</p>
            )}
            {challan.gst_number && (
              <p className="small muted">GSTIN: {challan.gst_number}</p>
            )}
            {challan.address && (
              <p className="small muted">Address: {challan.address}</p>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <h4 style={{ marginBottom: "0.25rem" }}>Dispatched By:</h4>
            <p className="small muted">
              Created By: {challan.created_by || "System"}
            </p>
            <p className="small muted">Status: {challan.status}</p>
          </div>
        </div>

        <h4 style={{ marginBottom: "0.5rem" }}>Item Details (Snapshot Data)</h4>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product Name</th>
              <th>SKU</th>
              <th>Unit Price</th>
              <th>Qty</th>
              <th style={{ textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(challan.items || []).map((it, idx) => (
              <tr key={it.id || idx}>
                <td>{idx + 1}</td>
                <td>
                  <strong>{it.product_name}</strong>
                </td>
                <td>{it.sku}</td>
                <td>₹{Number(it.price).toFixed(2)}</td>
                <td>{it.qty}</td>
                <td style={{ textAlign: "right" }}>
                  ₹{(Number(it.price) * Number(it.qty)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 700, background: "#f8fafc" }}>
              <td colSpan="4" style={{ textAlign: "right" }}>
                Total Quantity / Amount:
              </td>
              <td>{challan.total_qty}</td>
              <td style={{ textAlign: "right" }}>₹{grandTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "3rem",
            paddingTop: "1.5rem",
            borderTop: "1px dashed #cbd5e1",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                minWidth: "180px",
                borderTop: "1px solid #94a3b8",
                paddingTop: "0.25rem",
              }}
              className="small muted"
            >
              Receiver's Signature
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                minWidth: "180px",
                borderTop: "1px solid #94a3b8",
                paddingTop: "0.25rem",
              }}
              className="small muted"
            >
              Authorized Signatory
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
