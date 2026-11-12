require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const monitoringRoutes = require("./routes/monitoringRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const faultRoutes = require("./routes/faultRoutes");
const settingRoutes = require("./routes/settingRoutes");

const app = express();

// CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Request logging
app.use(morgan("dev"));

// Body parsing
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/faults", faultRoutes);
app.use("/api/settings", settingRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

module.exports = app;

