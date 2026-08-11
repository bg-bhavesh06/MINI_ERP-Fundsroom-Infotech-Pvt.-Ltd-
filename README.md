# Mini ERP + CRM Operations Portal

> **Full Stack Developer Case Study** — Production-ready, enterprise-grade Operations Portal built with **Node.js, TypeScript, Express, PostgreSQL (Neon Cloud), and React**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Business Context](#2-business-context)
3. [Key Features](#3-key-features)
4. [Tech Stack](#4-tech-stack)
5. [System Architecture](#5-system-architecture)
6. [Authentication & Security](#6-authentication--security)
7. [Role-Based Access Control (RBAC)](#7-role-based-access-control-rbac)
8. [Customer CRM Module](#8-customer-crm-module)
9. [Product & Inventory Management](#9-product--inventory-management)
10. [Stock Movements Audit Log](#10-stock-movements-audit-log)
11. [Sales Challan Lifecycle & Business Logic](#11-sales-challan-lifecycle--business-logic)
12. [Concurrency Control & Row-Level Locking](#12-concurrency-control--row-level-locking)
13. [Database Schema & Integrity](#13-database-schema--integrity)
14. [REST API Documentation](#14-rest-api-documentation)
15. [Environment Variables](#15-environment-variables)
16. [PostgreSQL Cloud Setup](#16-postgresql-cloud-setup)
17. [Local Installation & Setup](#17-local-installation--setup)
18. [Building for Production](#18-building-for-production)
19. [Automated Testing Suite](#19-automated-testing-suite)
20. [Postman Collection](#20-postman-collection)
21. [PDF Delivery Challan / Invoice Export](#21-pdf-delivery-challan--invoice-export)
22. [Deployment Guide](#22-deployment-guide)
23. [Assumptions](#23-assumptions)
24. [Known Limitations](#24-known-limitations)
25. [Future Roadmap](#25-future-roadmap)
26. [Demo & Test Credentials](#26-demo--test-credentials)

---

## 1. Project Overview

The **Mini ERP + CRM Operations Portal** is a full-stack web application developed for wholesale and distribution enterprises. It unifies customer relationship management, catalog/inventory tracking, and sales dispatch operations (delivery challans & invoices) with atomic transaction safety, strict input validation, and role-based access control.

---

## 2. Business Context

Wholesale and distribution companies manage high-volume customer accounts, variable warehouse inventory, and multi-product dispatch orders. Internal teams (Sales, Warehouse, Accounts, and Administrators) require a synchronized operational portal to:
- Onboard and nurture customer leads into active wholesale buyers.
- Track real-time stock levels with automated low-stock warnings.
- Execute dispatch orders via **Sales Challans** that guarantee inventory deduction only when confirmed, preventing over-allocation or negative inventory.
- Download professional, branded PDF delivery challans / invoices for transport compliance.

---

## 3. Key Features

- **JWT Authentication & RBAC**: 4 distinct operational roles with backend enforcement and UI action gating.
- **Customer CRM**: Complete customer lifecycle management (Lead, Active, Inactive), search, contact filters, and timestamped follow-up logs.
- **Product & Inventory**: SKU cataloging, unit pricing, real-time stock levels, warehouse bay tracking, and low-stock alerts.
- **Stock Movement Log**: Audit trail recording quantity changes, movement type (`IN` / `OUT`), reason, created by user, and timestamp.
- **Sales Challans with Snapshots**: Multi-product dispatch orders, atomic challan numbering (`CH-0001`), historical price snapshots, and confirmation workflows.
- **Concurrency-Safe Stock Operations**: PostgreSQL `SELECT ... FOR UPDATE` row locks inside ACID transactions to eliminate race conditions.
- **Client-Side PDF Generation**: One-click professional Delivery Challan & Invoice PDF export with jsPDF and AutoTable.
- **Paginated REST APIs**: Clean JSON responses with error handling, search parameters, and pagination metadata.

---

## 4. Tech Stack

### Backend
- **Runtime**: Node.js (v20+)
- **Language**: TypeScript (v5.6)
- **Framework**: Express.js (v4.19)
- **Database**: PostgreSQL (Neon Cloud / Serverless Postgres)
- **Database Driver**: `pg` (node-postgres connection pooling)
- **Security & Tokens**: `bcryptjs` (password hashing), `jsonwebtoken` (JWT)
- **Development Tooling**: `tsx` (TypeScript execute & watch), `tsc` (TypeScript compiler)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Routing**: React Router DOM (v6)
- **HTTP Client**: Axios
- **PDF Generation**: `jspdf` & `jspdf-autotable`
- **Styling**: Responsive Vanilla CSS design system

---

## 5. System Architecture

```
                                  ┌───────────────────────────────┐
                                  │      React + Vite Frontend    │
                                  │  (Role-Based UI, jsPDF Export)│
                                  └───────────────┬───────────────┘
                                                  │ HTTP / REST (JWT)
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │   Node.js + TypeScript API    │
                                  │ (Express, Auth, Transactions) │
                                  └───────────────┬───────────────┘
                                                  │ Connection Pool (SSL)
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │   PostgreSQL (Neon Cloud)     │
                                  │  (Row Locks, Sequences, ACID) │
                                  └───────────────────────────────┘
```

---

## 6. Authentication & Security

- **Password Storage**: Passwords hashed with `bcryptjs` (10 salt rounds).
- **JWT Authorization**: Stateless JWT bearer tokens signed with `JWT_SECRET` and configurable expiry (`8h`).
- **Backend Guardrails**: Middleware (`requireAuth`, `requireRole`) strictly verifies identity and roles on all write/read endpoints.
- **SQL Injection Prevention**: 100% parameterized queries (`$1`, `$2`, etc.). Zero raw SQL string concatenation.
- **Information Leak Protection**: Centralized error handler captures errors, logs diagnostics server-side, and returns safe, sanitized error messages without stack traces or internal DB details.

---

## 7. Role-Based Access Control (RBAC)

| Role | Customer CRM | Product Catalog | Stock Adjustments | Sales Challans | Dashboard Summary |
|---|:---:|:---:|:---:|:---:|:---:|
| **Admin** | Read / Write | Read / Write | Full (IN / OUT) | Create / Confirm / Cancel | Full View |
| **Sales** | Read / Write | Read Only | None | Create / Confirm / Cancel | Full View |
| **Warehouse** | Read Only | Read / Write | Full (IN / OUT) | Read Only | Full View |
| **Accounts** | Read Only | Read Only | None | Read Only (Audit) | Full View |

---

## 8. Customer CRM Module

### Supported Fields
- `name` (Required string)
- `mobile` (Phone string)
- `email` (Validated email format)
- `business_name` (Company name)
- `gst_number` (Optional GST identification)
- `customer_type` (`Retail` | `Wholesale` | `Distributor`)
- `address` (Street address/city)
- `status` (`Lead` | `Active` | `Inactive`)
- `followup_date` (Date string)
- `notes` (General remarks)

### Features
- **Search**: Multi-field search across `name`, `mobile`, `email`, and `business_name`.
- **Filters**: Filter by `status` and `customer_type`.
- **CRM Follow-ups**: Append timestamped call/meeting notes under each customer profile.

---

## 9. Product & Inventory Management

### Supported Fields
- `name` (Required product title)
- `sku` (Unique uppercase identifier)
- `category` (Product classification)
- `unit_price` (Non-negative numeric amount)
- `stock_qty` (Current non-negative inventory count)
- `min_stock` (Low-stock threshold quantity)
- `location` (Warehouse aisle/bay)

### Low Stock Alert System
- Any product with `stock_qty <= min_stock` is highlighted with visual alert badges in tables and surfaced directly on the Dashboard KPI grid.

---

## 10. Stock Movements Audit Log

Every quantity alteration automatically logs an immutable audit entry:
- **Product ID & Snapshot Details**: Product name & SKU
- **Quantity Changed**: Positive integer
- **Type**: `IN` (Receiving/Stock-in/Cancellation) or `OUT` (Dispatch/Stock-out)
- **Reason**: Purchase order reference, Challan number, or damage adjustment
- **Created By**: Logged-in user name
- **Timestamp**: High-precision UTC timestamp

---

## 11. Sales Challan Lifecycle & Business Logic

```
   [ Create Draft ] ──(No stock change)──> [ Draft Challan ]
                                                  │
                                                  ├──(Confirm Challan)──> [ Confirmed Challan ]
                                                  │                          (Deducts stock via FOR UPDATE)
                                                  │                                  │
                                                  │                                  └──(Cancel Challan)──> [ Cancelled ]
                                                  │                                                           (Restores stock)
                                                  └──(Cancel Draft)──> [ Cancelled ]
```

### Business Rules
1. **Draft Challans**: Reserve zero stock, allowing sales reps to prepare orders without prematurely depleting inventory.
2. **Confirmed Challans**: Atomically reduce stock for all line items. If stock is insufficient, the entire transaction rolls back with HTTP 400.
3. **Price Snapshot Integrity**: When a challan is created, the current product `name`, `sku`, and `unit_price` are captured in `challan_items`. Future changes to product catalog prices do **not** affect historical challans or invoices.
4. **Cancellation**:
   - Cancelling a *Draft* updates status with no stock change.
   - Cancelling a *Confirmed* challan restores deducted quantities back to inventory and logs an `IN` movement.
5. **State Transition Protection**: Repeated confirmation or cancellation requests are rejected with clear error codes.

---

## 12. Concurrency Control & Row-Level Locking

In high-concurrency environments, naive `SELECT stock -> UPDATE stock` patterns cause race conditions. Mini ERP implements **PostgreSQL row-level locking**:

```sql
BEGIN;
-- Lock all product rows for the challan in sorted order (prevents deadlocks)
SELECT id, name, sku, stock_qty 
FROM products 
WHERE id = ANY($1::int[]) 
ORDER BY id 
FOR UPDATE;

-- Validate each product's stock
-- If any stock < requested: ROLLBACK and throw 400

-- Deduct stock and record movements
UPDATE products SET stock_qty = stock_qty - $1 WHERE id = $2;
INSERT INTO stock_movements ...;
UPDATE challans SET status = 'Confirmed' WHERE id = $3;
COMMIT;
```

---

## 13. Database Schema & Integrity

PostgreSQL relational schema initialized automatically in [src/db.ts](file:///c:/Users/bgbha/OneDrive/Desktop/Cash-Study/MINI_ERP/MINI_ERP/backend/src/db.ts):

- `users` (`id`, `name`, `email` UNIQUE, `password`, `role`)
- `customers` (`id`, `name`, `mobile`, `email`, `business_name`, `gst_number`, `customer_type`, `address`, `status`, `followup_date`, `notes`, `created_at`)
- `followups` (`id`, `customer_id` FK -> `customers.id`, `note`, `created_at`)
- `products` (`id`, `name`, `sku` UNIQUE, `category`, `unit_price`, `stock_qty`, `min_stock`, `location`, `created_at`)
- `stock_movements` (`id`, `product_id` FK -> `products.id`, `qty`, `type`, `reason`, `created_by`, `created_at`)
- `challans` (`id`, `challan_number` UNIQUE, `customer_id` FK -> `customers.id`, `status`, `total_qty`, `created_by`, `created_at`)
- `challan_items` (`id`, `challan_id` FK -> `challans.id`, `product_id` FK -> `products.id`, `product_name`, `sku`, `price`, `qty`)
- `challan_number_seq` (Atomic sequence for unique numbering)

---

## 14. REST API Documentation

### Authentication
- `POST /api/auth/login` — Authenticate and receive JWT token.
- `GET /api/auth/me` — Retrieve current authenticated user profile.

### Customers CRM
- `GET /api/customers?search=&status=&customer_type=&page=1&limit=10` — List paginated customers.
- `GET /api/customers/:id` — Get customer details and follow-up timeline.
- `POST /api/customers` — Create customer *(Admin, Sales)*.
- `PUT /api/customers/:id` — Update customer details *(Admin, Sales)*.
- `POST /api/customers/:id/followups` — Log follow-up note *(Admin, Sales)*.

### Products & Inventory
- `GET /api/products?search=&lowStock=&category=&location=&page=1&limit=10` — List paginated products.
- `GET /api/products/:id` — Get product details and stock movement history.
- `POST /api/products` — Create product *(Admin, Warehouse)*.
- `PUT /api/products/:id` — Update product details *(Admin, Warehouse)*.
- `POST /api/products/:id/stock` — Adjust stock (`IN` / `OUT`) *(Admin, Warehouse)*.
- `GET /api/products/movements?page=1&limit=20` — Audit log of all stock movements.

### Sales Challans
- `GET /api/challans?status=&customer_id=&search=&page=1&limit=10` — List paginated challans.
- `GET /api/challans/:id` — Get challan with historical items.
- `POST /api/challans` — Create Draft or Confirmed challan *(Admin, Sales)*.
- `PUT /api/challans/:id/confirm` — Confirm Draft challan & deduct stock *(Admin, Sales)*.
- `PUT /api/challans/:id/cancel` — Cancel challan & restore stock *(Admin, Sales)*.

### Dashboard
- `GET /api/dashboard/summary` — Aggregate KPI metrics, recent challans, and low stock list.

---

## 15. Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=8h
DATABASE_URL=postgresql://username:password@your-postgres-host.neon.tech/neondb?sslmode=require
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 16. PostgreSQL Cloud Setup

The project is connected to a free-tier **Neon Serverless PostgreSQL** database hosted on AWS US East (Ohio).

1. Sign up at [neon.tech](https://neon.tech).
2. Create a project named `mini-erp`.
3. Copy the pooled connection string into `backend/.env` under `DATABASE_URL`.
4. On startup, the backend automatically runs migrations and seeds default data.

---

## 17. Local Installation & Setup

### Prerequisites
- Node.js (v20 or higher)
- npm (v10 or higher)

### 1. Backend Setup
```bash
cd backend
npm install
npm run build      # Compiles TypeScript into dist/
npm run dev        # Starts TypeScript server with auto-reload (port 5000)
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev        # Starts Vite React dev server (port 5173)
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 18. Building for Production

```bash
# Build Backend (TypeScript -> JavaScript in backend/dist)
cd backend
npm run build

# Start Production Backend
npm start

# Build Frontend (React -> static bundle in frontend/dist)
cd frontend
npm run build
```

---

## 19. Automated Testing Suite

The backend includes a comprehensive 26-test automated suite verifying all core pillars:

```bash
cd backend
npm test
```

### Test Coverage Highlights:
- **Authentication**: All 4 role logins, invalid password rejection, JWT verification.
- **Authorization**: Role gating for Accounts, Sales, and Warehouse roles.
- **CRM Validation**: Required fields, enum validation on create & update, follow-up logging.
- **Inventory Concurrency**: Duplicate SKU conflict, opening stock, negative stock prevention.
- **Challan Integrity**: Draft stock preservation, over-allocation prevention (400), atomic confirmation stock reduction, double-confirmation prevention, historical price snapshot preservation, cancellation stock restoration.

---

## 20. Postman Collection

Import [postman/Mini_ERP_CRM.postman_collection.json](file:///c:/Users/bgbha/OneDrive/Desktop/Cash-Study/MINI_ERP/MINI_ERP/postman/Mini_ERP_CRM.postman_collection.json) into Postman:
- Includes pre-configured environment variables (`base_url`, `token`).
- Test scripts automatically capture and inject the JWT `token` upon login.
- Includes positive requests and negative validation/error test cases.

---

## 21. PDF Delivery Challan / Invoice Export

Each Challan Detail page includes a **📄 Download PDF** button:
- Formats a standard A4 Delivery Challan & Invoice document.
- Includes company header, Challan number, customer details, creation date, and status.
- Itemized table with product descriptions, SKUs, historical unit prices, quantities, and line totals.
- Computed grand totals and signature authorization boxes.

---

## 22. Deployment Guide

### Frontend Deployment (Vercel / Netlify)
1. Push repository to GitHub.
2. Link the `frontend` folder to Vercel/Netlify.
3. Set build command: `npm run build` and publish directory: `dist`.
4. Set environment variable: `VITE_API_URL=https://your-backend-url.onrender.com/api`.

### Backend Deployment (Render / Railway)
1. Link the `backend` folder to Render/Railway Web Service.
2. Build command: `npm install && npm run build`.
3. Start command: `npm start`.
4. Add environment variables: `DATABASE_URL`, `JWT_SECRET`, `PORT=5000`.

### Database
- Already deployed on Neon Cloud PostgreSQL.

---

## 23. Assumptions

- Multi-currency: All prices and monetary amounts are in INR (₹).
- Single-location per product: Each product currently tracks one primary warehouse location string.
- Challan numbering: Formatted as `CH-0001`, `CH-0002` driven by an atomic PostgreSQL sequence.

---

## 24. Known Limitations

- Multi-warehouse stock split: Products track total stock per location string rather than multi-warehouse bin splits.
- Email dispatch: Invoices are downloaded directly as PDF files; direct SMTP email dispatch can be integrated with SendGrid/Nodemailer.

---

## 25. Future Roadmap

- Batch and Serial Number tracking for perishable or electronics distribution.
- Barcode / QR scanner integration on mobile devices for warehouse stock-in.
- Multi-warehouse inventory transfers.
- Automated payment gateway reconciliation for invoices.

---

## 26. Demo & Test Credentials

| Role | Email | Password | Primary Capabilities |
|---|---|---|---|
| **Admin** | `admin@erp.com` | `admin123` | Full access across all modules |
| **Sales** | `sales@erp.com` | `sales123` | Customer CRM, Create & Confirm Challans |
| **Warehouse** | `warehouse@erp.com` | `warehouse123` | Products catalog & Stock IN/OUT Adjustments |
| **Accounts** | `accounts@erp.com` | `accounts123` | Read-only view & financial audit across portal |

*Quick-fill credential buttons are also available on the Login screen for instant one-click testing.*
