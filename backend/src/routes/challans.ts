import { Router, Response } from "express";
import { query, withTransaction } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { validatePagination, isPositiveInteger } from "../middleware/validator";
import { AuthenticatedRequest } from "../types";

const router = Router();
router.use(requireAuth);

async function getNextChallanNumber(client?: any): Promise<string> {
  const q = client ? client.query.bind(client) : query;
  const { rows } = await q(`
    SELECT COALESCE(MAX(CAST(NULLIF(SUBSTRING(challan_number FROM 4), '') AS INT)), 0) + 1 AS next_num 
    FROM challans
  `);
  const nextNum = rows[0]?.next_num || 1;
  return `CH-${String(nextNum).padStart(4, "0")}`;
}

async function reduceLockedProductStock(
  client: any,
  items: { product_id: number; qty: number }[],
  challanNumber: string,
  userName: string
) {
  const sortedItems = [...items].sort((a, b) => a.product_id - b.product_id);

  for (const item of sortedItems) {
    const { rows: [product] } = await client.query(
      "SELECT id, name, stock_qty FROM products WHERE id = $1 FOR UPDATE",
      [item.product_id]
    );

    if (!product) {
      throw { status: 400, message: `Product #${item.product_id} not found` };
    }

    if (product.stock_qty < item.qty) {
      throw {
        status: 400,
        message: `Insufficient stock for "${product.name}". Available: ${product.stock_qty}, Requested: ${item.qty}`,
      };
    }

    await client.query("UPDATE products SET stock_qty = stock_qty - $1 WHERE id = $2", [
      item.qty,
      item.product_id,
    ]);

    await client.query(
      "INSERT INTO stock_movements (product_id, qty, type, reason, created_by) VALUES ($1, $2, 'OUT', $3, $4)",
      [item.product_id, item.qty, `Challan ${challanNumber}`, userName]
    );
  }
}

// GET /api/challans?status=&customer_id=&search=&page=&limit=
router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, offset } = validatePagination(req.query.page, req.query.limit, 10);
    const { status = "", customer_id = "", search = "" } = req.query;

    let where = "WHERE 1=1";
    const params: any[] = [];
    let i = 1;

    if (status && ["Draft", "Confirmed", "Cancelled"].includes(String(status))) {
      where += ` AND c.status = $${i++}`;
      params.push(status);
    }

    if (customer_id) {
      const cid = Number(customer_id);
      if (!Number.isInteger(cid) || cid < 1) {
        return res.status(400).json({ success: false, message: "customer_id must be a valid integer" });
      }
      where += ` AND c.customer_id = $${i++}`;
      params.push(cid);
    }

    if (search) {
      where += ` AND (c.challan_number ILIKE $${i} OR cu.name ILIKE $${i})`;
      params.push(`%${search}%`);
      i++;
    }

    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*) FROM challans c JOIN customers cu ON cu.id = c.customer_id ${where}`,
      params
    );

    const total = Number(count);
    const { rows } = await query(
      `SELECT c.*, cu.name AS customer_name
       FROM challans c
       JOIN customers cu ON cu.id = c.customer_id
       ${where}
       ORDER BY c.created_at DESC
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

// GET /api/challans/:id
router.get(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { rows: [challan] } = await query(
      `SELECT c.*, cu.name AS customer_name
       FROM challans c
       JOIN customers cu ON cu.id = c.customer_id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (!challan) {
      return res.status(404).json({ success: false, message: "Challan not found" });
    }

    const { rows: items } = await query(
      "SELECT * FROM challan_items WHERE challan_id = $1 ORDER BY id ASC",
      [req.params.id]
    );

    res.json({ success: true, data: { ...challan, items } });
  })
);

// POST /api/challans
router.post(
  "/",
  requireRole("admin", "sales"),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { customer_id, items, status } = req.body;

    if (!customer_id || !Number.isInteger(Number(customer_id))) {
      return res.status(400).json({ success: false, message: "Valid customer_id is required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "At least one product line item is required" });
    }

    const { rows: [customer] } = await query("SELECT id, name FROM customers WHERE id = $1", [customer_id]);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    let totalQty = 0;
    const snapshots: any[] = [];

    for (const item of items) {
      if (!item || typeof item !== "object") {
        return res.status(400).json({ success: false, message: "Invalid item payload" });
      }

      if (!isPositiveInteger(item.qty)) {
        return res.status(400).json({ success: false, message: "Quantity for each product must be a positive integer" });
      }

      const { rows: [prod] } = await query(
        "SELECT id, name, sku, unit_price, stock_qty FROM products WHERE id = $1",
        [item.product_id]
      );

      if (!prod) {
        return res.status(400).json({ success: false, message: `Product #${item.product_id} not found` });
      }

      const qty = Number(item.qty);
      totalQty += qty;
      snapshots.push({
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku,
        price: Number(prod.unit_price) || 0,
        qty,
      });
    }

    const targetStatus = status === "Confirmed" ? "Confirmed" : "Draft";
    const userName = req.user?.name || "System";

    const savedChallan = await withTransaction(async (client) => {
      const challanNumber = await getNextChallanNumber(client);
      const { rows: [c] } = await client.query(
        `INSERT INTO challans (challan_number, customer_id, status, total_qty, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [challanNumber, customer_id, targetStatus, totalQty, userName]
      );

      for (const s of snapshots) {
        await client.query(
          `INSERT INTO challan_items (challan_id, product_id, product_name, sku, price, qty)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [c.id, s.product_id, s.product_name, s.sku, s.price, s.qty]
        );
      }

      if (targetStatus === "Confirmed") {
        await reduceLockedProductStock(client, snapshots, challanNumber, userName);
      }

      return c;
    });

    res.status(201).json({
      success: true,
      data: {
        ...savedChallan,
        customer_name: customer.name,
        items: snapshots,
      },
    });
  })
);

// PUT /api/challans/:id/confirm
router.put(
  "/:id/confirm",
  requireRole("admin", "sales"),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userName = req.user?.name || "System";

    const updated = await withTransaction(async (client) => {
      const { rows: [challan] } = await client.query(
        "SELECT * FROM challans WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );

      if (!challan) {
        throw { status: 404, message: "Challan not found" };
      }

      if (challan.status === "Confirmed") {
        throw { status: 400, message: "Challan is already Confirmed" };
      }

      if (challan.status === "Cancelled") {
        throw { status: 400, message: "Cannot confirm a Cancelled challan" };
      }

      if (challan.status !== "Draft") {
        throw { status: 400, message: `Invalid status for confirmation: ${challan.status}` };
      }

      const { rows: items } = await client.query(
        "SELECT product_id, qty FROM challan_items WHERE challan_id = $1",
        [challan.id]
      );

      await reduceLockedProductStock(client, items, challan.challan_number, userName);

      const { rows: [u] } = await client.query(
        "UPDATE challans SET status = 'Confirmed' WHERE id = $1 RETURNING *",
        [challan.id]
      );

      return u;
    });

    res.json({ success: true, data: updated });
  })
);

// PUT /api/challans/:id/cancel
router.put(
  "/:id/cancel",
  requireRole("admin", "sales"),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userName = req.user?.name || "System";

    const updated = await withTransaction(async (client) => {
      const { rows: [challan] } = await client.query(
        "SELECT * FROM challans WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );

      if (!challan) {
        throw { status: 404, message: "Challan not found" };
      }

      if (challan.status === "Cancelled") {
        throw { status: 400, message: "Challan is already Cancelled" };
      }

      if (challan.status === "Confirmed") {
        const { rows: items } = await client.query(
          "SELECT product_id, qty FROM challan_items WHERE challan_id = $1",
          [challan.id]
        );

        for (const item of items) {
          await client.query("UPDATE products SET stock_qty = stock_qty + $1 WHERE id = $2", [
            item.qty,
            item.product_id,
          ]);

          await client.query(
            "INSERT INTO stock_movements (product_id, qty, type, reason, created_by) VALUES ($1, $2, 'IN', $3, $4)",
            [item.product_id, item.qty, `Cancelled challan ${challan.challan_number}`, userName]
          );
        }
      }

      const { rows: [u] } = await client.query(
        "UPDATE challans SET status = 'Cancelled' WHERE id = $1 RETURNING *",
        [challan.id]
      );

      return u;
    });

    res.json({ success: true, data: updated });
  })
);

export default router;
