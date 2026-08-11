import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { initDB } from "./db";

const PORT = parseInt(process.env.PORT || "5000", 10);

async function startServer() {
  try {
    await initDB();
    console.log("✓ PostgreSQL database initialized with tables, sequence, and indexes.");

    app.listen(PORT, () => {
      console.log(`✓ Mini ERP + CRM Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
