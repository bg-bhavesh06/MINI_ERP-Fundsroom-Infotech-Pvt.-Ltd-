import { Router, Response } from "express";
import { query, withTransaction } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  validatePagination,
  isNonNegativeInteger,
  isPositiveInteger,
  isNonNegativeNumber,
} from "../middleware/validator";
import { AuthenticatedRequest } from "../types";

const router = Router();
router.use(requireAuth);

// GET /api/products?search=&lowStock=&category=&location=&page=&limit=
router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, offset } = validatePagination(req.query.page, req.query.limit, 50);
    const { search = "", lowStock = "", category = "", location = "" } = req.query;

    let where = "WHERE 1=1";
    const params: any[] = [];
    let i = 1;

    if (search) {
      where += ` AND (name ILIKE $${i} OR sku ILIKE $${i + 1} OR category ILIKE $${i + 2})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      i += 3;
    }

    if (lowStock === "true") {
      where += " AND stock_qty <= min_stock";
    }

    if (category) {
      where += ` AND category ILIKE $${i++}`;
      params.push(`%${category}%`);
    }

    if (location) {
      where += ` AND location ILIKE $${i++}`;
      params.push(`%${location}%`);
    }

    const { rows: [{ count }] } = await query(`SELECT COUNT(*) FROM products ${where}`, params);
    const total = Number(count);

    const { rows } = await query(
      `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i}`,
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

// GET /api/products/movements?page=&limit=&product_id=&type= (Admin/Warehouse/Accounts)
router.get(
  "/movements",
  requireRole("admin", "warehouse", "accounts"),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, offset } = validatePagination(req.query.page, req.query.limit, 20);
    const { product_id = "", type = "" } = req.query;

    let where = "WHERE 1=1";
    const params: any[] = [];
    let i = 1;

    if (product_id) {
      const pid = Number(product_id);
      if (!Number.isInteger(pid) || pid < 1) {
        return res.status(400).json({ success: false, message: "product_id must be a valid integer" });
      }
      where += ` AND sm.product_id = $${i++}`;
      params.push(pid);
    }

    if (type && (type === "IN" || type === "OUT")) {
      where += ` AND sm.type = $${i++}`;
      params.push(type);
    }

    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*) FROM stock_movements sm ${where}`,
      params
    );
    const total = Number(count);

    const { rows } = await query(
      `SELECT sm.*, p.name AS product_name, p.sku
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       ${where}
       ORDER BY sm.created_at DESC
       LIMIT $${i++} OFFSET $${i}`,
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

// GET /api/products/:id
router.get(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { rows: [product] } = await query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const { rows: movements } = await query(
      "SELECT * FROM stock_movements WHERE product_id = $1 ORDER BY created_at DESC",
      [req.params.id]
    );

    res.json({ success: true, data: { ...product, movements } });
  })
);

// POST /api/products (Admin/Warehouse)
router.post(
  "/",
  requireRole("admin", "warehouse"),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, sku, category, unit_price = 0, stock_qty = 0, min_stock = 0, location } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Product name is required" });
    }

    if (!sku || typeof sku !== "string" || !sku.trim()) {
      return res.status(400).json({ success: false, message: "SKU is required" });
    }

    if (!isNonNegativeNumber(unit_price)) {
      return res.status(400).json({ success: false, message: "Unit price must be a valid non-negative number" });
    }

    if (!isNonNegativeInteger(stock_qty)) {
      return res.status(400).json({ success: false, message: "Stock quantity must be a non-negative integer" });
    }

    if (!isNonNegativeInteger(min_stock)) {
      return res.status(400).json({ success: false, message: "Minimum stock alert must be a non-negative integer" });
    }

    const cleanSku = sku.trim().toUpperCase();
    const { rows: existing } = await query("SELECT id FROM products WHERE UPPER(sku) = $1", [cleanSku]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `Product with SKU "${cleanSku}" already exists` });
    }

    const { rows: [created] } = await query(
      `INSERT INTO products (name, sku, category, unit_price, stock_qty, min_stock, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        name.trim(),
        cleanSku,
        category?.trim() || null,
        Number(unit_price),
        Number(stock_qty),
        Number(min_stock),
        location?.trim() || null,
      ]
    );

    res.status(201).json({ success: true, data: created });
  })
);

// PUT /api/products/:id (Admin/Warehouse)
router.put(
  "/:id",
  requireRole("admin", "warehouse"),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { rows: [existing] } = await query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, message: "Product not found" });

    const { name, sku, category, unit_price, min_stock, location } = req.body;

    if (name !== undefined && (!name || typeof name !== "string" || !name.trim())) {
      return res.status(400).json({ success: false, message: "Product name cannot be empty" });
    }

    if (unit_price !== undefined && !isNonNegativeNumber(unit_price)) {
      return res.status(400).json({ success: false, message: "Unit price must be a valid non-negative number" });
    }

    if (min_stock !== undefined && !isNonNegativeInteger(min_stock)) {
      return res.status(400).json({ success: false, message: "Minimum stock alert must be a non-negative integer" });
    }

    let cleanSku = existing.sku;
    if (sku !== undefined) {
      if (!sku || typeof sku !== "string" || !sku.trim()) {
        return res.status(400).json({ success: false, message: "SKU cannot be empty" });
      }
      cleanSku = sku.trim().toUpperCase();
      const { rows: dup } = await query(
        "SELECT id FROM products WHERE UPPER(sku) = $1 AND id != $2",
        [cleanSku, req.params.id]
      );
      if (dup.length > 0) {
        return res.status(409).json({ success: false, message: `Product with SKU "${cleanSku}" already exists` });
      }
    }

    const updated = {
      name: name !== undefined ? name.trim() : existing.name,
      sku: cleanSku,
      category: category !== undefined ? (category ? category.trim() : null) : existing.category,
      unit_price: unit_price !== undefined ? Number(unit_price) : existing.unit_price,
      min_stock: min_stock !== undefined ? Number(min_stock) : existing.min_stock,
      location: location !== undefined ? (location ? location.trim() : null) : existing.location,
    };

    const { rows: [u] } = await query(
      `UPDATE products SET name=$1, sku=$2, category=$3, unit_price=$4, min_stock=$5, location=$6 WHERE id=$7 RETURNING *`,
      [updated.name, updated.sku, updated.category, updated.unit_price, updated.min_stock, updated.location, req.params.id]
    );

    res.json({ success: true, data: u });
  })
);

// POST /api/products/:id/stock (Adjust Stock IN/OUT)
router.post(
  "/:id/stock",
  requireRole("admin", "warehouse"),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { qty, type, reason } = req.body;

    if (!isPositiveInteger(qty)) {
      return res.status(400).json({ success: false, message: "Quantity must be a positive integer > 0" });
    }

    if (type !== "IN" && type !== "OUT") {
      return res.status(400).json({ success: false, message: "Type must be IN or OUT" });
    }

    const quantity = Number(qty);
    const userName = req.user?.name || "System";

    const updated = await withTransaction(async (client) => {
      const { rows: [prod] } = await client.query(
        "SELECT id, name, stock_qty FROM products WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );

      if (!prod) throw { status: 404, message: "Product not found" };

      if (type === "OUT" && prod.stock_qty < quantity) {
        throw {
          status: 400,
          message: `Cannot reduce stock. Available: ${prod.stock_qty}, Requested: ${quantity}`,
        };
      }

      const newQty = type === "IN" ? prod.stock_qty + quantity : prod.stock_qty - quantity;

      const { rows: [u] } = await client.query(
        "UPDATE products SET stock_qty = $1 WHERE id = $2 RETURNING *",
        [newQty, req.params.id]
      );

      await client.query(
        "INSERT INTO stock_movements (product_id, qty, type, reason, created_by) VALUES ($1, $2, $3, $4, $5)",
        [req.params.id, quantity, type, reason ? String(reason).trim() : null, userName]
      );

      return u;
    });

    res.json({ success: true, data: updated });
  })
);

export default router;
