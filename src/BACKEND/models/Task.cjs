// src/BACKEND/models/Task.cjs
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const STATUSES = ["backlog", "todo", "in_progress", "in_review", "done", "canceled"];
const PRIORITIES = ["none", "low", "medium", "high", "urgent"];

const ReactionSchema = new mongoose.Schema(
  { emoji: { type: String, required: true }, users: [{ type: ObjectId, ref: "User" }] },
  { _id: false }
);

const CommentSchema = new mongoose.Schema(
  {
    author: { type: ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 4000 },
    reactions: [ReactionSchema],
    editedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const ChecklistItemSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 200 },
  done: { type: Boolean, default: false },
});

const ActivitySchema = new mongoose.Schema(
  {
    actor: { type: ObjectId, ref: "User" },
    action: { type: String, required: true }, // created | updated | commented | approved | rejected | submitted
    field: { type: String },
    from: { type: mongoose.Schema.Types.Mixed },
    to: { type: mongoose.Schema.Types.Mixed },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TaskSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true },
    projectId: { type: ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: "", maxlength: 10000 },
    status: { type: String, enum: STATUSES, default: "todo", index: true },
    priority: { type: String, enum: PRIORITIES, default: "none" },
    assignee: { type: ObjectId, ref: "User", index: true },
    createdBy: { type: ObjectId, ref: "User" },
    labels: [{ type: String, trim: true }],
    milestone: { type: ObjectId },
    startDate: { type: Date },
    dueDate: { type: Date, index: true },
    estimate: { type: Number, min: 0, max: 100 },
    checklist: [ChecklistItemSchema],
    comments: [CommentSchema],
    activity: [ActivitySchema],
    approval: {
      state: { type: String, enum: ["none", "pending", "approved", "rejected"], default: "none" },
      requestedBy: { type: ObjectId, ref: "User" },
      requestedAt: { type: Date },
      reviewedBy: { type: ObjectId, ref: "User" },
      reviewedAt: { type: Date },
      note: { type: String, trim: true, maxlength: 500 },
    },
    order: { type: Number, default: 0 },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

TaskSchema.index({ projectId: 1, number: 1 }, { unique: true });
TaskSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Task", TaskSchema);
module.exports.STATUSES = STATUSES;
module.exports.PRIORITIES = PRIORITIES;
