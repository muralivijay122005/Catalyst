// src/BACKEND/server.cjs
const { app, connectDB } = require("./app.cjs");

const PORT = process.env.PORT || 5000;

connectDB().catch((err) => {
  console.warn("Initial DB connection failed, will retry on request:", err.message);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Catalyst API on http://localhost:${PORT}`);
});
