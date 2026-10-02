// src/BACKEND/middleware/authenticationToken.cjs
const jwt = require("jsonwebtoken");
const { User } = require("../models/index.cjs");
const { hasGlobal } = require("../utils/permissions.cjs");

const JWT_SECRET = () => process.env.JWT_SECRET || "supersecretjwtkeychangeitinprod";

const signToken = (user) => jwt.sign({ id: user._id.toString() }, JWT_SECRET(), { expiresIn: "7d" });

async function authenticateToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Sign in to continue" });

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET());
  } catch {
    return res.status(401).json({ message: "Your session has expired. Sign in again." });
  }

  const user = await User.findById(decoded.id);
  if (!user) return res.status(401).json({ message: "This account no longer exists" });
  if (user.status === "deactivated") return res.status(401).json({ message: "This account has been deactivated" });

  req.user = user;
  // Presence is tracked by explicit heartbeats (POST /api/users/presence), not by every request
  next();
}

/** Require a workspace-level permission (admins always pass). */
const requireGlobal = (perm) => (req, res, next) => {
  if (!hasGlobal(req.user, perm)) {
    return res.status(403).json({ message: "Your role doesn't allow this action" });
  }
  next();
};

module.exports = { authenticateToken, requireGlobal, signToken };
