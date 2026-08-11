import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { query, pool } from "./db";

async function runSeed() {
  console.log("Cleaning and re-seeding Mini ERP database with clean demo data...");

  // 1. Reset tables cleanly
  await query("TRUNCATE TABLE challan_items, challans, stock_movements, followups, customers, products CASCADE");
  await query("ALTER SEQUENCE challan_number_seq RESTART WITH 1");

  // 2. Seed Users (4 roles)
  const defaultUsers = [
    ["Admin User", "admin@erp.com", "admin123", "admin"],
    ["Sales User", "sales@erp.com", "sales123", "sales"],
    ["Warehouse User", "warehouse@erp.com", "warehouse123", "warehouse"],
    ["Accounts User", "accounts@erp.com", "accounts123", "accounts"],
  ];
  for (const [name, email, password, role] of defaultUsers) {
    const hash = bcrypt.hashSync(password, 10);
    await query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password = $3, role = $4",
      [name, email, hash, role]
    );
  }
  console.log("✓ Seeded 4 clean user roles");

  // 3. Seed 5 Clean Realistic Products
  const sampleProducts = [
    ["A4 Copier Paper (Ream)", "PAP-001", "Stationery", 250.00, 100, 20, "Warehouse Bay 1"],
    ["Blue Ballpoint Pen (Box of 20)", "PEN-001", "Stationery", 120.00, 60, 10, "Warehouse Bay 1"],
    ["Whiteboard Marker (Pack of 4)", "MRK-001", "Stationery", 180.00, 45, 10, "Warehouse Bay 2"],
    ["Steel Office Almirah", "FUR-001", "Furniture", 8500.00, 8, 2, "Warehouse Bay 3"],
    ["Heavy Duty Desktop Stapler", "STP-001", "Stationery", 340.00, 30, 5, "Warehouse Bay 2"],
  ];
  for (const [name, sku, category, unit_price, stock_qty, min_stock, location] of sampleProducts) {
    await query(
      `INSERT INTO products (name, sku, category, unit_price, stock_qty, min_stock, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [name, sku, category, unit_price, stock_qty, min_stock, location]
    );
  }
  console.log("✓ Seeded 5 clean products");

  // 4. Seed 4 Clean Realistic Customers
  const sampleCustomers = [
    [
      "Bhavesh Ganwani",
      "9754930945",
      "bhavesh@enterprise.in",
      "AbC Enterprise",
      "24AAAAA1234A1Z5",
      "Wholesale",
      "Vadodara, Gujarat",
      "Active",
      "2026-08-18",
      "Key wholesale distributor for central Gujarat.",
    ],
    [
      "Apex Logistics & Distribution",
      "9825012345",
      "orders@apexlogistics.in",
      "Apex Logistics Ltd",
      "24AAACA1234A1Z1",
      "Distributor",
      "Surat, Gujarat",
      "Active",
      "",
      "Distributor for western region.",
    ],
    [
      "Ramesh Traders",
      "9876543210",
      "ramesh@example.com",
      "Ramesh Traders Pvt Ltd",
      "24AAAAA0000A1Z5",
      "Wholesale",
      "Ahmedabad, Gujarat",
      "Active",
      "",
      "Regular buyer of paper and stationery.",
    ],
    [
      "Sunrise Retail Mart",
      "9811223344",
      "store@sunrisemart.com",
      "Sunrise Retailers",
      "27BBBBB1111B1Z2",
      "Retail",
      "Mumbai, Maharashtra",
      "Lead",
      "2026-08-22",
      "Interested in bulk office stationery supply.",
    ],
  ];
  for (const [name, mobile, email, bname, gst, type, addr, status, fdate, notes] of sampleCustomers) {
    const { rows: [c] } = await query(
      `INSERT INTO customers (name, mobile, email, business_name, gst_number, customer_type, address, status, followup_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [name, mobile, email, bname, gst, type, addr, status, fdate, notes]
    );

    if (name === "Bhavesh Ganwani") {
      await query("INSERT INTO followups (customer_id, note) VALUES ($1, $2)", [
        c.id,
        "Initial inquiry regarding monthly paper delivery contract received.",
      ]);
    }
  }
  console.log("✓ Seeded 4 clean customers");

  // 5. Seed 1 Demo Confirmed Challan & 1 Draft Challan
  const { rows: custRows } = await query("SELECT id FROM customers LIMIT 2");
  const { rows: prodRows } = await query("SELECT id, name, sku, unit_price FROM products LIMIT 2");

  if (custRows.length >= 2 && prodRows.length >= 2) {
    // Confirmed Challan CH-0001
    const ch1 = await query(
      `INSERT INTO challans (challan_number, customer_id, status, total_qty, created_by)
       VALUES ('CH-0001', $1, 'Confirmed', 5, 'Sales User') RETURNING id`,
      [custRows[0].id]
    );
    await query(
      `INSERT INTO challan_items (challan_id, product_id, product_name, sku, price, qty)
       VALUES ($1, $2, $3, $4, $5, 5)`,
      [ch1.rows[0].id, prodRows[0].id, prodRows[0].name, prodRows[0].sku, prodRows[0].unit_price]
    );
    await query("UPDATE products SET stock_qty = stock_qty - 5 WHERE id = $1", [prodRows[0].id]);
    await query(
      `INSERT INTO stock_movements (product_id, qty, type, reason, created_by)
       VALUES ($1, 5, 'OUT', 'Challan CH-0001', 'Sales User')`,
      [prodRows[0].id]
    );

    // Draft Challan CH-0002
    const ch2 = await query(
      `INSERT INTO challans (challan_number, customer_id, status, total_qty, created_by)
       VALUES ('CH-0002', $1, 'Draft', 10, 'Sales User') RETURNING id`,
      [custRows[1].id]
    );
    await query(
      `INSERT INTO challan_items (challan_id, product_id, product_name, sku, price, qty)
       VALUES ($1, $2, $3, $4, $5, 10)`,
      [ch2.rows[0].id, prodRows[1].id, prodRows[1].name, prodRows[1].sku, prodRows[1].unit_price]
    );
  }
  console.log("✓ Seeded sample challans (CH-0001 Confirmed, CH-0002 Draft)");

  console.log("\n=======================================================");
  console.log("   DATABASE CLEANED & SEEDED WITH PROPER DATA!         ");
  console.log("=======================================================\n");
  await pool.end();
}

runSeed().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
