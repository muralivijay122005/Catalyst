//src\BACKEND\routes\channels.cjs
const express = require("express");
const router = express.Router();
const { Channel } = require("../models/index.cjs");
const { authenticateToken } = require("../middleware/authenticationToken.cjs");

// GET ALL CHANNELS
router.get("/", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const channels = await Channel.find({
            $or: [
                { isDM: false },
                { isDM: true, participants: userId }
            ]
        }).populate("participants", "firstName lastName username profilePicture");
        res.json(channels);
    } catch (error) {
        console.error("Error fetching channels:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// CREATE CHANNEL
router.post("/", authenticateToken, async (req, res) => {
    try {
        const { name, isDM, participants } = req.body;
        const newChannel = new Channel({
            name,
            isDM: isDM || false,
            participants: participants || []
        });
        await newChannel.save();
        
        await newChannel.populate("participants", "firstName lastName username profilePicture");
        
        res.status(201).json(newChannel);
    } catch (error) {
        console.error("Error creating channel:", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
