// src/BACKEND/routes/auth.cjs
const express = require("express");
const router = express.Router();
const { User, Project } = require("../models/index.cjs");
const { authenticateToken, signToken } = require("../middleware/authenticationToken.cjs");
const { describeUser, ROLES } = require("../utils/permissions.cjs");
const { badRequest } = require("../utils/http.cjs");

const AVATAR_COLORS = ["#2563eb", "#0f172a", "#0891b2", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#4f46e5"];

const session = (user) => ({ user: user.toJSON(), permissions: describeUser(user) });

router.post("/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body || {};
  if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) throw badRequest("Name and email are required");
  if (!password || password.length < 8) throw badRequest("Use a password of at least 8 characters");
  const normalized = email.trim().toLowerCase();
  if (await User.exists({ email: normalized })) throw badRequest("An account with that email already exists");

  // Unique username from the email prefix
  let base = normalized.split("@")[0].replace(/[^a-z0-9._-]/g, "").slice(0, 20) || "user";
  let username = base;
  for (let i = 2; await User.exists({ username }); i++) username = `${base}${i}`;

  // The first account in an empty workspace becomes its admin
  const role = (await User.estimatedDocumentCount()) === 0 ? "admin" : "member";
  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    username,
    email: normalized,
    password,
    role,
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  });
  res.status(201).json({ token: signToken(user), ...session(user) });
});

router.post("/login", async (req, res) => {
  const { emailOrUsername, password } = req.body || {};
  const id = String(emailOrUsername || "").trim().toLowerCase();
  if (!id || !password) throw badRequest("Enter your email and password");
  const user = await User.findOne({ $or: [{ email: id }, { username: id }] });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(400).json({ message: "Incorrect email or password" });
  }
  if (user.status === "deactivated") {
    return res.status(403).json({ message: "This account has been deactivated. Contact your admin." });
  }
  user.lastSeenAt = new Date();
  await user.save();
  res.json({ token: signToken(user), ...session(user) });
});

router.get("/me", authenticateToken, async (req, res) => {
  res.json(session(req.user));
});

router.patch("/me", authenticateToken, async (req, res) => {
  const user = req.user;
  const body = req.body || {};
  ["firstName", "lastName", "title", "department", "bio", "location", "avatarColor"].forEach((k) => {
    if (typeof body[k] === "string") user[k] = body[k].trim();
  });
  if (body.preferences && typeof body.preferences === "object") {
    const p = body.preferences;
    if ([0, 1].includes(p.weekStartsOn)) user.preferences.weekStartsOn = p.weekStartsOn;
    if (["board", "list", "calendar", "timeline"].includes(p.defaultProjectView)) {
      user.preferences.defaultProjectView = p.defaultProjectView;
    }
    if (typeof p.reduceMotion === "boolean") user.preferences.reduceMotion = p.reduceMotion;
    if (typeof p.emailDigest === "boolean") user.preferences.emailDigest = p.emailDigest;
  }
  if (Array.isArray(body.favorites)) {
    const ids = body.favorites.filter((id) => /^[a-f\d]{24}$/i.test(id)).slice(0, 20);
    const existing = await Project.find({ _id: { $in: ids } }).select("_id");
    const allowed = new Set(existing.map((p) => p._id.toString()));
    user.favorites = ids.filter((id) => allowed.has(id));
  }
  await user.save();
  res.json(session(user));
});

router.post("/me/password", authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!(await req.user.comparePassword(currentPassword || ""))) throw badRequest("Current password is incorrect");
  if (!newPassword || newPassword.length < 8) throw badRequest("Use a password of at least 8 characters");
  req.user.password = newPassword;
  await req.user.save();
  res.json({ ok: true });
});

router.get("/roles", (_req, res) => res.json(ROLES));

module.exports = router;
