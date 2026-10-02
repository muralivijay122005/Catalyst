// src/BACKEND/models/Message.cjs
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const MessageSchema = new mongoose.Schema(
  {
    channelId: { type: ObjectId, ref: "Channel", required: true, index: true },
    sender: { type: ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 4000 },
    reactions: [
      { _id: false, emoji: { type: String, required: true }, users: [{ type: ObjectId, ref: "User" }] },
    ],
    // Set when someone saved this message to the knowledge base
    memoryId: { type: ObjectId, ref: "Memory" },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
