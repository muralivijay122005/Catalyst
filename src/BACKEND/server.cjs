// src/BACKEND/server.cjs
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const dns = require("dns");
dotenv.config({ path: path.join(__dirname, ".env"), quiet: true });

// On this Windows setup Node fails to read the system DNS config and falls back to
// 127.0.0.1 (where nothing is listening), which breaks Atlas "mongodb+srv://" SRV lookups
// with "querySrv ECONNREFUSED". Point Node's resolver at public DNS explicitly.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 10000 });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("Failed to connect to remote MongoDB:", err.message);
    console.warn("Falling back to local MongoDB at 127.0.0.1:27017/catalyst ...");
    try {
      await mongoose.connect("mongodb://127.0.0.1:27017/catalyst", { serverSelectionTimeoutMS: 5000 });
      console.log("Connected to local MongoDB");
    } catch (localErr) {
      console.error("MongoDB is not reachable. Start it with `net start MongoDB` or set MONGODB_URI.");
      console.error(localErr.message);
      process.exit(1);
    }
  }
};
connect();

app.use("/api/auth", require("./routes/auth.cjs"));
app.use("/api/users", require("./routes/users.cjs"));
app.use("/api/projects", require("./routes/projects.cjs"));
app.use("/api/tasks", require("./routes/tasks.cjs"));
app.use("/api/channels", require("./routes/channels.cjs"));
app.use("/api/memories", require("./routes/memories.cjs"));
app.use("/api/notifications", require("./routes/notifications.cjs"));
app.use("/api/workspace", require("./routes/workspace.cjs"));

app.get("/api/health", (_req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));

app.use("/api", (_req, res) => res.status(404).json({ message: "Endpoint not found" }));

// Express 5 forwards rejected promises from async handlers here
app.use((err, _req, res, _next) => {
  if (err.name === "ValidationError") {
    const first = Object.values(err.errors)[0];
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`Catalyst API on http://localhost:${PORT}`));
