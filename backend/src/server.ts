import express from "express";
import cors from "cors";
import { ENV } from "./config/environment.js";
import { connectDatabase } from "./config/database.js";
import "./database/models/index.js"; // Registers all Mongoose schemas
import { errorHandler } from "./middleware/errorHandler.js";

// Route imports
import authRoutes from "./modules/auth/auth.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import categoriesRoutes from "./modules/categories/categories.routes.js";
import manufacturersRoutes from "./modules/manufacturers/manufacturers.routes.js";
import medicinesRoutes from "./modules/medicines/medicines.routes.js";
import scannerRoutes from "./modules/scanner/scanner.routes.js";
import batchesRoutes from "./modules/batches/batches.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import suppliersRoutes from "./modules/suppliers/suppliers.routes.js";
import purchasesRoutes from "./modules/purchases/purchases.routes.js";
import salesRoutes from "./modules/sales/sales.routes.js";
import alertsRoutes from "./modules/alerts/alerts.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import branchesRoutes from "./modules/branches/branches.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import auditRoutes from "./modules/audit/audit.routes.js";

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Health Check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Medical Inventory Management System API (MERN Edition)",
    database: "MongoDB 7.0 Connected",
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/manufacturers", manufacturersRoutes);
app.use("/api/medicines", medicinesRoutes);
app.use("/api/scanner", scannerRoutes);
app.use("/api/batches", batchesRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/purchases", purchasesRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/branches", branchesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/audit", auditRoutes);

// Error Handler
app.use(errorHandler);

import { syncInventoryAlerts } from "./modules/alerts/alerts.controller.js";

// Start Server after connecting to MongoDB
const startServer = async () => {
  await connectDatabase();

  app.listen(Number(ENV.PORT), "0.0.0.0", () => {
    console.log(`[MIS API Server] running in ${ENV.NODE_ENV} mode on port ${ENV.PORT}`);
    console.log(`Health endpoint: http://localhost:${ENV.PORT}/api/health`);
    
    // Immediate initial sync & start 30s background inventory health monitor
    syncInventoryAlerts().catch(() => {});
    setInterval(() => {
      syncInventoryAlerts().catch(() => {});
    }, 30000);
  });
};

startServer();

export default app;
