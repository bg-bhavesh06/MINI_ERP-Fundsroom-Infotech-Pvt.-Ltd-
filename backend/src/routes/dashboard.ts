import { Router, Response } from "express";
import { query } from "../db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { AuthenticatedRequest } from "../types";

const router = Router();
router.use(requireAuth);

// GET /api/dashboard/summary
router.get(
  "/summary",
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const [customersRes, productsRes, lowStockRes, challansRes, recentChallansRes, lowStockProdsRes] =
      await Promise.all([
        query("SELECT COUNT(*) AS c FROM customers"),
        query("SELECT COUNT(*) AS c FROM products"),
        query("SELECT COUNT(*) AS c FROM products WHERE stock_qty <= min_stock"),
        query("SELECT COUNT(*) AS c FROM challans WHERE status = 'Confirmed'"),
        query(`
          SELECT c.id, c.challan_number, c.status, c.total_qty, cu.name AS customer_name, c.created_at
          FROM challans c
          JOIN customers cu ON cu.id = c.customer_id
          ORDER BY c.created_at DESC
          LIMIT 5
        `),
        query(`
          SELECT id, name, sku, stock_qty, min_stock
          FROM products
          WHERE stock_qty <= min_stock
          ORDER BY stock_qty ASC
          LIMIT 5
        `),
      ]);

    res.json({
      success: true,
      data: {
        total_customers: parseInt(customersRes.rows[0].c, 10),
        total_products: parseInt(productsRes.rows[0].c, 10),
        low_stock_count: parseInt(lowStockRes.rows[0].c, 10),
        total_challans: parseInt(challansRes.rows[0].c, 10),
        recent_challans: recentChallansRes.rows,
        low_stock_products: lowStockProdsRes.rows,
      },
    });
  })
);

export default router;
