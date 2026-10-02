// src/BACKEND/models/Channel.cjs
const mongoose = require("mongoose");

const ChannelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    topic: { type: String, trim: true, default: "", maxlength: 200 },
    kind: { type: String, enum: ["public", "private", "dm"], default: "public" },
    // Announcement-style channels: only admins and managers may post
    locked: { type: Boolean, default: false },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Channel", ChannelSchema);
