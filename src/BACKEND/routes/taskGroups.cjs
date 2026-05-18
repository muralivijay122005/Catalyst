// src/BACKEND/routes/taskGroups.cjs
const express = require("express");
const router = express.Router();
const { TaskGroup, Task, Module } = require("../models/index.cjs");
const { authenticateToken } = require("../middleware/authenticationToken.cjs");
const { checkRole } = require("../middleware/checkRole.cjs");

router.get("/", async (req, res) => {
  try {
    const { projectId, moduleId } = req.query;
    const query = {};
    if (projectId) query.projectId = projectId;
    if (moduleId) query.moduleId = moduleId;

    const groups = await TaskGroup.find(query)
      .populate("projectId", "name")
      .populate("moduleId", "name")
      .populate({
        path: "subtasks",
        populate: [
          { path: "assignee", select: "firstName lastName" },
          { path: "projectId", select: "name" },
          { path: "moduleId", select: "name" },
          { path: "groupId", select: "title" },
        ],
      })
      .sort({ createdAt: 1 });

    res.json(groups);
  } catch (err) {
    console.error("Error fetching task groups:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, projectId, moduleId } = req.body;
    if (!title || !projectId || !moduleId)
      return res.status(400).json({ message: "Missing required fields" });

    const newGroup = await TaskGroup.create({
      title,
      projectId,
      moduleId,
      subtasks: [],
    });

    await Module.findByIdAndUpdate(moduleId, {
      $push: { taskGroups: newGroup._id },
    });

    res.status(201).json(newGroup);
  } catch (err) {
    console.error("Error creating task group:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// NEW: CREATE TASKGROUP + 2-6 TASKS (ADMIN & MANAGER ONLY)
router.post(
  "/with-tasks",
  authenticateToken,
  checkRole(["admin", "projectManager"]),
  async (req, res) => {
    try {
      const { title, projectId, moduleId, tasks } = req.body;

      if (!title || !projectId || !moduleId) {
        return res
          .status(400)
          .json({ message: "Title, projectId, and moduleId required" });
      }

      if (!Array.isArray(tasks) || tasks.length < 2 || tasks.length > 6) {
        return res.status(400).json({ message: "Must create 2–6 tasks" });
      }

      const newGroup = await TaskGroup.create({
        title,
        projectId,
        moduleId,
        subtasks: [],
      });

      const createdTasks = await Task.insertMany(
        tasks.map((t) => ({
          name: t.name,
          description: t.description || "",
          projectId,
          moduleId,
          groupId: newGroup._id,
          assignee: t.assignee || null,
          startDate: t.startDate ? new Date(t.startDate) : null,
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          priority: t.priority || "Low",
          status: t.status || "Not Started",
          progress: 0,
        }))
      );

      await TaskGroup.findByIdAndUpdate(newGroup._id, {
        $set: { subtasks: createdTasks.map((t) => t._id) },
      });

      await Module.findByIdAndUpdate(moduleId, {
        $push: { taskGroups: newGroup._id },
      });

      const populatedGroup = await TaskGroup.findById(newGroup._id).populate({
        path: "subtasks",
        populate: { path: "assignee", select: "firstName lastName" },
      });

      res.status(201).json(populatedGroup);
    } catch (err) {
      console.error("Error creating task group with tasks:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
