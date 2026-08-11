import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { query, pool } from "./db";

async function runSeed() {
  console.log("Seeding Mini ERP demo database...");

  // 1. Seed Users (4 roles)
  const defaultUsers = [
    ["Admin User", "admin@erp.com", "admin123", "admin"],
    ["Sales User", "sales@erp.com", "sales123", "sales"],
    ["Warehouse User", "warehouse@erp.com", "warehouse123", "warehouse"],
    ["Accounts User", "accounts@erp.com", "accounts123", "accounts"],
  ];
  for (const [name, email, password, role] of defaultUsers) {
    const hash = bcrypt.hashSync(password, 10);
    await query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
      [name, email, hash, role]
    );
  }
  console.log("✓ Seeded users (Admin, Sales, Warehouse, Accounts)");

  // 2. Seed Products
  const sampleProducts = [
    ["A4 Copier Paper (Ream)", "PAP-001", "Stationery", 250, 100, 20, "Warehouse A"],
    ["Blue Ballpoint Pen (Box)", "PEN-001", "Stationery", 120, 60, 10, "Warehouse A"],
    ["Steel Almirah", "FUR-001", "Furniture", 8500, 5, 2, "Warehouse B"],
    ["Whiteboard Marker (Pack)", "MRK-001", "Stationery", 180, 45, 10, "Warehouse A"],
  ];
  for (const [name, sku, category, unit_price, stock_qty, min_stock, location] of sampleProducts) {
    await query(
      `INSERT INTO products (name, sku, category, unit_price, stock_qty, min_stock, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (sku) DO NOTHING`,
      [name, sku, category, unit_price, stock_qty, min_stock, location]
    );
  }
  console.log("✓ Seeded demo products");

  // 3. Seed Customers
  const sampleCustomers = [
    [
      "Ramesh Traders",
      "9876543210",
      "ramesh@example.com",
      "Ramesh Traders Pvt Ltd",
      "24AAAAA0000A1Z5",
      "Wholesale",
      "Vadodara, Gujarat",
      "Active",
      "Regular bulk buyer of stationery items.",
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
      "Western zone distributor.",
    ],
  ];
  for (const [name, mobile, email, bname, gst, type, addr, status, notes] of sampleCustomers) {
    await query(
      `INSERT INTO customers (name, mobile, email, business_name, gst_number, customer_type, address, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [name, mobile, email, bname, gst, type, addr, status, notes]
    );
  }
  console.log("✓ Seeded demo customers");

  console.log("\nDatabase seeded successfully!");
  await pool.end();
}

runSeed().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
