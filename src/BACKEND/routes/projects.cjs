// src/BACKEND/routes/projects.cjs
const express = require("express");
const router = express.Router();
const { Project } = require("../models/index.cjs");
const { authenticateToken } = require("../middleware/authenticationToken.cjs");

// GET all projects
router.get("/", authenticateToken, async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("owner", "firstName lastName email")
      .populate("members.user", "firstName lastName email")
      .populate("modules", "name");
    res.json(projects);
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ message: "Server error fetching projects" });
  }
});

// CREATE Project — ONLY ADMIN
router.post("/", authenticateToken, async (req, res) => {
  try {
    // ONLY ADMIN CAN CREATE PROJECTS
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied: Only Admins can create projects 👑",
      });
    }

    const { name, description, members } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Project name is required" });
    }

    const newProject = await Project.create({
      name: name.trim(),
      description: description || "",
      owner: req.user.id,
      members: members || [],
    });

    res.status(201).json(newProject);
  } catch (err) {
    console.error("Error creating project:", err);
    res.status(500).json({ message: "Failed to create project" });
  }
});

// DELETE Project — ONLY ADMIN
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only Admins can delete projects",
      });
    }

    const deleted = await Project.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Project not found" });

    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE Project — Admin OR Project Manager of that project
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isAdmin = req.user.role === "admin";
    const isPM = req.user.role === "projectManager";

    // If not admin, check if user is a manager in this project
    if (!isAdmin && isPM) {
      const isManager = project.members.some(
        (m) =>
          m.user.toString() === req.user.id.toString() && m.role === "manager"
      );
      if (!isManager) {
        return res.status(403).json({
          message: "You can only edit projects you manage",
        });
      }
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedProject);
  } catch (err) {
    console.error("Error updating project:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
