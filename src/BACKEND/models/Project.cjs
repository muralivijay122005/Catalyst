// src/BACKEND/models/Project.cjs
const mongoose = require("mongoose");
const { PROJECT_ROLES } = require("../utils/permissions.cjs");

const MemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: PROJECT_ROLES, default: "member" },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MilestoneSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  dueDate: { type: Date },
  done: { type: Boolean, default: false },
});

const LabelSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 32 },
  color: { type: String, default: "#737373" },
});

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    key: { type: String, required: true, uppercase: true, trim: true, maxlength: 5 },
    description: { type: String, trim: true, default: "", maxlength: 2000 },
    color: { type: String, default: "#2563eb" },
    status: { type: String, enum: ["active", "paused", "completed", "archived"], default: "active" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    members: [MemberSchema],
    milestones: [MilestoneSchema],
    labels: [LabelSchema],
    // When on, members' tasks go to "In review" and need a manager's approval before they count as done
    requireApproval: { type: Boolean, default: true },
    startDate: { type: Date },
    targetDate: { type: Date },
    taskSeq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProjectSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.model("Project", ProjectSchema);
