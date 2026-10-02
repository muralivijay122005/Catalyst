// src/BACKEND/app.cjs
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const dns = require("dns");

dotenv.config({ path: path.join(__dirname, ".env"), quiet: true });

// Node public DNS resolver fallback
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore in environments where setting DNS isn't allowed
}

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

// MongoDB connection caching for serverless environments
let isConnected = false;
let connectingPromise = null;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  if (connectingPromise) {
    await connectingPromise;
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI environment variable is not defined");
    return;
  }

  connectingPromise = (async () => {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000,
      });
      isConnected = true;
      console.log("MongoDB connected");
    } catch (err) {
      console.error("Failed to connect to MongoDB:", err.message);
      throw err;
    } finally {
      connectingPromise = null;
    }
  })();

  await connectingPromise;
};

// Middleware ensuring DB connection before servicing /api requests
app.use(async (req, res, next) => {
  if (req.path === "/api/health") return next();
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Database connection error in request middleware:", err);
    res.status(503).json({ message: "Database unavailable. Please check MONGODB_URI." });
  }
});

app.use("/api/auth", require("./routes/auth.cjs"));
app.use("/api/users", require("./routes/users.cjs"));
app.use("/api/projects", require("./routes/projects.cjs"));
app.use("/api/tasks", require("./routes/tasks.cjs"));
app.use("/api/channels", require("./routes/channels.cjs"));
app.use("/api/memories", require("./routes/memories.cjs"));
app.use("/api/notifications", require("./routes/notifications.cjs"));
app.use("/api/workspace", require("./routes/workspace.cjs"));

app.get("/api/health", async (_req, res) => {
  try {
    await connectDB();
  } catch {
    // Return connection status even if not connected
  }
  res.json({ ok: true, db: mongoose.connection.readyState === 1 });
});

app.use("/api", (_req, res) => res.status(404).json({ message: "Endpoint not found" }));

// Express 5 error handling
app.use((err, _req, res, _next) => {
  if (err.name === "ValidationError") {
    const first = Object.values(err.errors || {})[0];
    return res.status(400).json({ message: first?.message || "Invalid data" });
  }
  if (err.name === "CastError") return res.status(400).json({ message: "Invalid identifier" });
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "value";
    return res.status(409).json({ message: `That ${field} is already taken` });
  }
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: "Something went wrong on our side" });
});

module.exports = { app, connectDB };
