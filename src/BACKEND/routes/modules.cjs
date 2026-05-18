// src/BACKEND/routes/modules.cjs
const express = require("express");
const router = express.Router();
const { Module } = require("../models/index.cjs");
const { authenticateToken } = require("../middleware/authenticationToken.cjs");

// GET all modules
router.get("/", authenticateToken, async (req, res) => {
  try {
    const modules = await Module.find()
      .populate("projectId", "name")
      .populate("taskGroups", "title")
      .populate("tasks", "name status");

    res.json(modules);
  } catch (err) {
    console.error("GET modules error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE a new module — ONLY ADMIN
router.post("/", authenticateToken, async (req, res) => {
  try {
    // ONLY ADMIN CAN CREATE MODULES
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only Admins can create modules",
      });
    }

    const { name, description, projectId } = req.body;

    if (!name || !projectId) {
      return res.status(400).json({
        message: "Module name and projectId are required",
      });
    }

    const newModule = await Module.create({
      name: name.trim(),
      description: description || `${name} module`,
      projectId,
    });

    // Also push the module ID back to the project
    const Project = require("../models/Project.cjs");
    await Project.findByIdAndUpdate(projectId, {
      $push: { modules: newModule._id },
    });

    res.status(201).json(newModule);
  } catch (err) {
    console.error("POST module error:", err);
    res.status(500).json({ message: "Failed to create module" });
  }
});

module.exports = router;
