// src/BACKEND/routes/notifications.cjs
const express = require("express");
const router = express.Router();
const { Notification } = require("../models/index.cjs");
const { authenticateToken } = require("../middleware/authenticationToken.cjs");
const { isObjectId } = require("../utils/http.cjs");

router.use(authenticateToken);

router.get("/", async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.unread === "1") filter.read = false;
  const [items, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 100, 200))
      .populate("actor", "firstName lastName avatarColor"),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ items, unread });
});

router.get("/unread-count", async (req, res) => {
  res.json({ unread: await Notification.countDocuments({ user: req.user._id, read: false }) });
});

/** Mark some (ids) or all notifications read — or unread with { read: false }. */
router.post("/read", async (req, res) => {
  const { ids, read = true } = req.body || {};
  const filter = { user: req.user._id };
  if (Array.isArray(ids)) filter._id = { $in: ids.filter(isObjectId) };
  await Notification.updateMany(filter, { $set: { read: Boolean(read) } });
  res.json({ unread: await Notification.countDocuments({ user: req.user._id, read: false }) });
});

router.delete("/:id", async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ unread: await Notification.countDocuments({ user: req.user._id, read: false }) });
});

module.exports = router;
