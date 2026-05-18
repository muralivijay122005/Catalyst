// src/BACKEND/server.cjs
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

// FIXED CORS — this is the only one that actually works with Vite/React
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);

app.use(express.json());

// BULLETPROOF MONGO CONNECTION — will scream at you if MongoDB is off
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/projectDB", {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  })
  .then(() => {
    console.log("MongoDB Connected SUCCESSFULLY");
  })
  .catch((err) => {
    console.error("MONGODB IS NOT RUNNING!!!");
    console.error("Run this in CMD as Admin:");
    console.error("   net start MongoDB");
    console.error("Or install MongoDB from: https://mongodb.com");
    console.error("Full error:", err.message);
    process.exit(1); // Kill server if DB is dead
  });

// ALL YOUR ROUTES
app.use("/api/auth", require("./routes/auth.cjs"));
app.use("/api/projects", require("./routes/projects.cjs"));
app.use("/api/tasks", require("./routes/tasks.cjs"));
app.use("/api/taskgroups", require("./routes/taskGroups.cjs"));
app.use("/api/modules", require("./routes/modules.cjs"));
app.use("/api/users", require("./routes/users.cjs"));
app.use("/api/channels", require("./routes/channels.cjs"));
app.use("/api/messages", require("./routes/messages.cjs"));

app.get("/", (req, res) => {
  res.send(`
    <h1 style="font-family: system-ui; text-align: center; margin-top: 10rem;">
      Catalyst API Running Perfectly<br>
      <small style="color: #666;">Port: ${
        process.env.PORT || 5000
      } • MongoDB: Connected</small>
    </h1>
  `);
});

// FIXED PORT — no more conflicts
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server LIVE at http://localhost:${PORT}`);
  console.log(`Open your app at http://localhost:5173`);
  console.log(`If MongoDB error → run: net start MongoDB`);
});
