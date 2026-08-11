import { Router, Response } from "express";
import { query } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { validatePagination } from "../middleware/validator";
import { AuthenticatedRequest } from "../types";

const router = Router();
router.use(requireAuth);

const CUSTOMER_TYPES = ["Retail", "Wholesale", "Distributor"];
const STATUSES = ["Lead", "Active", "Inactive"];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// GET /api/customers?search=&status=&customer_type=&page=&limit=
router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, offset } = validatePagination(req.query.page, req.query.limit, 10);
    const { search = "", status = "", customer_type = "" } = req.query;

    let where = "WHERE 1=1";
    const params: any[] = [];
    let i = 1;

    if (search) {
      where += ` AND (name ILIKE $${i} OR mobile ILIKE $${i + 1} OR business_name ILIKE $${i + 2} OR email ILIKE $${i + 3})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      i += 4;
    }

    if (status && STATUSES.includes(String(status))) {
      where += ` AND status = $${i++}`;
      params.push(status);
    }

    if (customer_type && CUSTOMER_TYPES.includes(String(customer_type))) {
      where += ` AND customer_type = $${i++}`;
      params.push(customer_type);
    }

    const { rows: [{ count }] } = await query(`SELECT COUNT(*) FROM customers ${where}`, params);
    const total = Number(count);

    const { rows } = await query(
      `SELECT * FROM customers ${where} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  })
);

// GET /api/customers/:id
router.get(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { rows: [customer] } = await query("SELECT * FROM customers WHERE id = $1", [req.params.id]);
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

    const { rows: followups } = await query(
      "SELECT * FROM followups WHERE customer_id = $1 ORDER BY created_at DESC",
      [req.params.id]
    );

    res.json({ success: true, data: { ...customer, followups } });
  })
);

// POST /api/customers (Admin/Sales)
router.post(
  "/",
  requireRole("admin", "sales"),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      name,
      mobile,
      email,
      business_name,
      gst_number,
      customer_type = "Retail",
      address,
      status = "Lead",
      followup_date,
      notes,
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Customer name is required" });
    }

    if (email && (typeof email !== "string" || !isValidEmail(email.trim()))) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    if (customer_type && !CUSTOMER_TYPES.includes(customer_type)) {
      return res.status(400).json({
        success: false,
        message: `customer_type must be one of: ${CUSTOMER_TYPES.join(", ")}`,
      });
    }

    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${STATUSES.join(", ")}`,
      });
    }

    const { rows: [created] } = await query(
      `INSERT INTO customers (name, mobile, email, business_name, gst_number, customer_type, address, status, followup_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        name.trim(),
        mobile ? String(mobile).trim() : null,
        email ? email.trim().toLowerCase() : null,
        business_name ? String(business_name).trim() : null,
        gst_number ? String(gst_number).trim() : null,
        customer_type,
        address ? String(address).trim() : null,
        status,
        followup_date ? String(followup_date).trim() : null,
        notes ? String(notes).trim() : null,
      ]
    );

    res.status(201).json({ success: true, data: created });
  })
);

// PUT /api/customers/:id (Admin/Sales)
router.put(
  "/:id",
  requireRole("admin", "sales"),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { rows: [existing] } = await query("SELECT * FROM customers WHERE id = $1", [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: "Customer not found" });

    const {
      name,
      mobile,
      email,
      business_name,
      gst_number,
      customer_type,
      address,
      status,
      followup_date,
      notes,
    } = req.body;

    if (name !== undefined && (!name || typeof name !== "string" || !name.trim())) {
      return res.status(400).json({ success: false, message: "Customer name cannot be empty" });
    }

    if (email !== undefined && email !== null && email !== "") {
      if (typeof email !== "string" || !isValidEmail(email.trim())) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
      }
    }

    if (customer_type !== undefined && !CUSTOMER_TYPES.includes(customer_type)) {
      return res.status(400).json({
        success: false,
        message: `customer_type must be one of: ${CUSTOMER_TYPES.join(", ")}`,
      });
    }

    if (status !== undefined && !STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${STATUSES.join(", ")}`,
      });
    }

    const updated = {
      name: name !== undefined ? name.trim() : existing.name,
      mobile: mobile !== undefined ? (mobile ? String(mobile).trim() : null) : existing.mobile,
      email: email !== undefined ? (email ? email.trim().toLowerCase() : null) : existing.email,
      business_name: business_name !== undefined ? (business_name ? String(business_name).trim() : null) : existing.business_name,
      gst_number: gst_number !== undefined ? (gst_number ? String(gst_number).trim() : null) : existing.gst_number,
      customer_type: customer_type !== undefined ? customer_type : existing.customer_type,
      address: address !== undefined ? (address ? String(address).trim() : null) : existing.address,
      status: status !== undefined ? status : existing.status,
      followup_date: followup_date !== undefined ? (followup_date ? String(followup_date).trim() : null) : existing.followup_date,
      notes: notes !== undefined ? (notes ? String(notes).trim() : null) : existing.notes,
    };

    const { rows: [u] } = await query(
      `UPDATE customers SET name=$1, mobile=$2, email=$3, business_name=$4, gst_number=$5, customer_type=$6, address=$7, status=$8, followup_date=$9, notes=$10 WHERE id=$11 RETURNING *`,
      [
        updated.name,
        updated.mobile,
        updated.email,
        updated.business_name,
        updated.gst_number,
        updated.customer_type,
        updated.address,
        updated.status,
        updated.followup_date,
        updated.notes,
        req.params.id,
      ]
    );

    res.json({ success: true, data: u });
  })
);

// POST /api/customers/:id/followups (Admin/Sales)
router.post(
  "/:id/followups",
  requireRole("admin", "sales"),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { note } = req.body;
    if (!note || typeof note !== "string" || !note.trim()) {
      return res.status(400).json({ success: false, message: "Note text is required" });
    }

    const { rows: [created] } = await query(
      "INSERT INTO followups (customer_id, note) VALUES ($1, $2) RETURNING *",
      [req.params.id, note.trim()]
    );

    res.status(201).json({ success: true, data: created });
  })
);

export default router;
