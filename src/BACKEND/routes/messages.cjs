//src\BACKEND\routes\messages.cjs
const express = require("express");
const router = express.Router();
const { Message } = require("../models/index.cjs");
const { authenticateToken } = require("../middleware/authenticationToken.cjs");

// GET MESSAGES BY CHANNEL
router.get("/:channelId", authenticateToken, async (req, res) => {
    try {
        const messages = await Message.find({ channelId: req.params.channelId })
            .populate("sender", "firstName lastName username profilePicture")
            .sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// CREATE MESSAGE
router.post("/", authenticateToken, async (req, res) => {
    try {
        const { channelId, text } = req.body;
        const newMessage = new Message({
            channelId,
            sender: req.user.id,
            text,
        });
        await newMessage.save();
        
        // Refetch with population to be 100% sure structure is correct
        const populatedMsg = await Message.findById(newMessage._id)
            .populate("sender", "firstName lastName username profilePicture");
        
        res.status(201).json(populatedMsg);
    } catch (error) {
        console.error("Error creating message:", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
