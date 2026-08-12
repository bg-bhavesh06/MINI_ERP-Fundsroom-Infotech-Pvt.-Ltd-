import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import customerRoutes from "./routes/customers";
import productRoutes from "./routes/products";
import challanRoutes from "./routes/challans";
import dashboardRoutes from "./routes/dashboard";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());

// Root & Health Check Endpoints (Supports GET, HEAD, OPTIONS for Uptime Monitors)
app.all(["/", "/api/health"], (_req, res) => {
  res.status(200).json({ success: true, message: "Mini ERP + CRM API is running" });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/challans", challanRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Error Handler
app.use(errorHandler);

export default app;
