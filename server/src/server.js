import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import api from "./routes.js";

const app = express();
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.get("/api/health", (_, res) => res.json({ status: "ok", service: "TaskFlow AI API" }));
app.use("/api", api);
app.use((_, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

const port = process.env.PORT || 5000;
const start = async () => {
  if (process.env.MONGODB_URI) await mongoose.connect(process.env.MONGODB_URI);
  else console.warn("MONGODB_URI is not set; database routes will be unavailable.");
  app.listen(port, () => console.log(`TaskFlow AI API running on port ${port}`));
};
start().catch((error) => { console.error("Startup failed:", error); process.exit(1); });
