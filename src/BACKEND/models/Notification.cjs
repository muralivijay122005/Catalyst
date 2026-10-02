// src/BACKEND/models/Notification.cjs
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: "User", required: true, index: true },
    actor: { type: ObjectId, ref: "User" },
    // assigned | mentioned | commented | approval_requested | approved | rejected | role_changed | added_to_project | kb_verified
    type: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, default: "", maxlength: 500 },
    link: {
      kind: { type: String }, // task | project | memory | channel
      id: { type: String },
      projectId: { type: String },
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
