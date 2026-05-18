// src/BACKEND/routes/tasks.cjs
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { Task } = require("../models/index.cjs");
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "No token, access denied" });
  jwt.verify(
    token,
    process.env.JWT_SECRET || "supersecretjwtkeychangeitinprod",
    (err, user) => {
      if (err)
        return res.status(403).json({ message: "Invalid or expired token" });
      req.user = user;
      next();
    }
  );
};
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { projectId, moduleId, groupId, status } = req.query;
    let query = {};
    if (projectId) query.projectId = projectId;
    if (moduleId) query.moduleId = moduleId;
    if (groupId) query.groupId = groupId; // SUPPORT FOR status=Pending AND status!=Pending
    if (status) {
      if (status.startsWith("!=")) {
        query.status = { $ne: status.slice(2) }; // e.g. status!=Pending
      } else {
        query.status = status;
      }
    }
    const tasks = await Task.find(query)
      .populate({
        path: "assignee",
        select: "firstName lastName profilePicture",
      })
      .populate("groupId", "title")
      .populate("moduleId", "name")
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const updates = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("assignee", "firstName lastName profilePicture")
      .populate("groupId", "title")
      .populate("moduleId", "name");
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ message: "Failed to update task" });
  }
});
module.exports = router;
