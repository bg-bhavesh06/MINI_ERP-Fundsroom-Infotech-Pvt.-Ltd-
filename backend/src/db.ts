import dotenv from "dotenv";
dotenv.config();

import { Pool, PoolClient } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("WARNING: DATABASE_URL environment variable is not set. Please provide it in your .env file.");
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function initDB(): Promise<void> {
  // 1. Schema Tables
  await query(`
    CREATE SEQUENCE IF NOT EXISTS challan_number_seq START WITH 1 INCREMENT BY 1;

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'sales', 'warehouse', 'accounts')),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      mobile VARCHAR(50),
      email VARCHAR(255),
      business_name VARCHAR(255),
      gst_number VARCHAR(100),
      customer_type VARCHAR(50) NOT NULL DEFAULT 'Retail' CHECK (customer_type IN ('Retail', 'Wholesale', 'Distributor')),
      address TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'Lead' CHECK (status IN ('Lead', 'Active', 'Inactive')),
      followup_date VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS followups (
      id SERIAL PRIMARY KEY,
      customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      note TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      sku VARCHAR(100) UNIQUE NOT NULL,
      category VARCHAR(100),
      unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
      stock_qty INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
      min_stock INT NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
      location VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id SERIAL PRIMARY KEY,
      product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      qty INT NOT NULL CHECK (qty > 0),
      type VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT')),
      reason TEXT,
      created_by VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS challans (
      id SERIAL PRIMARY KEY,
      challan_number VARCHAR(100) UNIQUE NOT NULL,
      customer_id INT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Confirmed', 'Cancelled')),
      total_qty INT NOT NULL DEFAULT 0,
      created_by VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS challan_items (
      id SERIAL PRIMARY KEY,
      challan_id INT NOT NULL REFERENCES challans(id) ON DELETE CASCADE,
      product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      product_name VARCHAR(255) NOT NULL,
      sku VARCHAR(100) NOT NULL,
      price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      qty INT NOT NULL CHECK (qty > 0)
    );

    CREATE INDEX IF NOT EXISTS idx_customers_search ON customers(name, email, mobile, business_name);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_challans_number ON challans(challan_number);
  `);

  // Seed default users if empty
  const userCount = await query("SELECT COUNT(*) AS c FROM users");
  if (parseInt(userCount.rows[0].c, 10) === 0) {
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
  }

  // Seed sample products if empty
  const productCount = await query("SELECT COUNT(*) AS c FROM products");
  if (parseInt(productCount.rows[0].c, 10) === 0) {
    const sampleProducts = [
      ["A4 Copier Paper (Ream)", "PAP-001", "Stationery", 250, 100, 20, "Warehouse A"],
      ["Blue Ballpoint Pen (Box)", "PEN-001", "Stationery", 120, 60, 10, "Warehouse A"],
      ["Steel Almirah", "FUR-001", "Furniture", 8500, 5, 2, "Warehouse B"],
    ];
    for (const [name, sku, category, unit_price, stock_qty, min_stock, location] of sampleProducts) {
      await query(
        `INSERT INTO products (name, sku, category, unit_price, stock_qty, min_stock, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (sku) DO NOTHING`,
        [name, sku, category, unit_price, stock_qty, min_stock, location]
      );
    }
  }

  // Seed sample customer if empty
  const customerCount = await query("SELECT COUNT(*) AS c FROM customers");
  if (parseInt(customerCount.rows[0].c, 10) === 0) {
    await query(
      `INSERT INTO customers (name, mobile, email, business_name, gst_number, customer_type, address, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        "Ramesh Traders",
        "9876543210",
        "ramesh@example.com",
        "Ramesh Traders Pvt Ltd",
        "24AAAAA0000A1Z5",
        "Wholesale",
        "Vadodara, Gujarat",
        "Active",
        "Primary wholesale distributor.",
      ]
    );
  }
}
