import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

export default function CreateChallan() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState([{ product_id: "", qty: 1 }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/customers", { params: { limit: 200 } }).then((res) => setCustomers(res.data.data));
    api.get("/products").then((res) => setProducts(res.data.data));
  }, []);

  function updateLine(index, field, value) {
    const updated = [...lines];
    updated[index][field] = value;
    setLines(updated);
  }

  function addLine() {
    setLines([...lines, { product_id: "", qty: 1 }]);
  }

  function removeLine(index) {
    setLines(lines.filter((_, i) => i !== index));
  }

  function productStock(productId) {
    const p = products.find((prod) => String(prod.id) === String(productId));
    return p ? p.stock_qty : null;
  }

  async function submit(status) {
    setError("");
    if (!customerId) return setError("Please select a customer");

    const items = lines
      .filter((l) => l.product_id && Number(l.qty) > 0)
      .map((l) => ({ product_id: Number(l.product_id), qty: Number(l.qty) }));

    if (items.length === 0) return setError("Add at least one product line");

    setSaving(true);
    try {
      const res = await api.post("/challans", { customer_id: Number(customerId), items, status });
      navigate(`/challans/${res.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create challan");
    } finally {
      setSaving(false);
    }
  }

  const totalQty = lines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);

  return (
    <div>
      <Link to="/challans">&larr; Back to Challans</Link>
      <h1>New Sales Challan</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card form-card">
        <label>Customer *</label>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Select a customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name} {c.business_name ? `(${c.business_name})` : ""}</option>
          ))}
        </select>

        <h2 style={{ marginTop: "1.5rem" }}>Products</h2>
        {lines.map((line, i) => (
          <div className="challan-line" key={i}>
            <select value={line.product_id} onChange={(e) => updateLine(i, "product_id", e.target.value)}>
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku}) — {p.stock_qty} in stock</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={line.qty}
              onChange={(e) => updateLine(i, "qty", e.target.value)}
              style={{ width: "90px" }}
            />
            {line.product_id && Number(line.qty) > productStock(line.product_id) && (
              <span className="muted small" style={{ color: "#c0392b" }}>Exceeds available stock</span>
            )}
            {lines.length > 1 && (
              <button type="button" className="btn btn-small btn-secondary" onClick={() => removeLine(i)}>Remove</button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-small" onClick={addLine}>+ Add Product Line</button>

        <p style={{ marginTop: "1rem" }}><strong>Total Quantity:</strong> {totalQty}</p>

        <div className="form-actions">
          <button className="btn btn-secondary" disabled={saving} onClick={() => submit("Draft")}>Save as Draft</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => submit("Confirmed")}>Confirm & Reduce Stock</button>
        </div>
      </div>
    </div>
  );
}
