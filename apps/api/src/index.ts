import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.routes.js";
import clientRoutes from "./routes/client.routes.js";
import providerRoutes from "./routes/provider.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

// ─── Global Middleware ───────────────────────────────────
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// ─── Health Check ────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API v1 Routes ───────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", clientRoutes);
app.use("/api/v1/provider", providerRoutes);
app.use("/api/v1/admin", adminRoutes);

// ─── Error Handler ───────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────
app.listen(config.port, () => {
    console.log(`🚀 Nearby API running on http://localhost:${config.port}`);
    console.log(`📋 Environment: ${process.env["NODE_ENV"] ?? "development"}`);
});

export default app;
