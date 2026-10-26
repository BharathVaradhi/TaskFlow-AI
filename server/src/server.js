import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import api from "./routes.js";

const app = express();

// Security headers
app.use(helmet());

// CORS configuration supporting local Vite development and production origins
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV === "development") {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed: " + origin));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Health check endpoint with database and AI status
app.get("/api/health", (_req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbState = dbStates[mongoose.connection.readyState] || "unknown";
  const hasAI = Boolean(
    (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) ||
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim())
  );

  res.json({
    status: "ok",
    service: "TaskFlow AI API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    database: dbState,
    aiProvider: hasAI ? "configured" : "unconfigured",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api", api);

// 404 Route Handler
app.use((_req, res) => {
  res.status(404).json({ message: "API endpoint not found" });
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error("Express Error:", err.message || err);

  const status = err.status || (err.name === "ValidationError" ? 400 : 500);
  const message =
    status === 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "An unexpected error occurred";

  res.status(status).json({ message });
});

const port = process.env.PORT || 5000;

// Database connection & Server Startup
const start = async () => {
  if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET?.trim()) {
    throw new Error("JWT_SECRET must be configured before starting in production.");
  }
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri && mongoUri.trim()) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log("Connected to MongoDB successfully.");
    } catch (dbErr) {
      console.error("MongoDB connection failed:", dbErr.message);
      console.warn("The server will start, but database-dependent endpoints will return 503.");
    }
  } else {
    console.warn("MONGODB_URI is not configured in server/.env; database endpoints will return 503.");
  }

  app.listen(port, () => {
    console.log(`TaskFlow AI API running on http://localhost:${port}`);
  });
};

start().catch((error) => {
  console.error("Fatal startup failure:", error);
  process.exit(1);
});

export default app;
