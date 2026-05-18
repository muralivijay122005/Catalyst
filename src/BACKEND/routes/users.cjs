// src/BACKEND/routes/users.cjs
const express = require("express");
const router = express.Router();
const { User } = require("../models/index.cjs");
const { authenticateToken } = require("../middleware/authenticationToken.cjs");
const { checkRole } = require("../middleware/checkRole.cjs");

// GET ALL USERS - Only admin and projectManager can see full list
router.get(
  "/",
  authenticateToken,
  async (req, res) => {
    try {
      const users = await User.find()
        .select("firstName lastName username email role profilePicture")
        .sort({ firstName: 1 });

      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Server error fetching users" });
    }
  }
);

// GET SINGLE USER BY ID - Anyone logged in can see basic info
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "firstName lastName username email role profilePicture"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error fetching user" });
  }
});

// UPDATE USER (only admin can change roles)
router.put(
  "/:id",
  authenticateToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { role, firstName, lastName, username, email } = req.body;

      const updateData = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (role && ["admin", "projectManager", "teamMember"].includes(role)) {
        updateData.role = role;
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      ).select("firstName lastName username email role profilePicture");

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Server error updating user" });
    }
  }
);

module.exports = router;
