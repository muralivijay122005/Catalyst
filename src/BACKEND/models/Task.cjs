//src/BACKEND/models/Task.cjs
const mongoose = require("mongoose");
const TaskSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true }, // <-- Added description
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskGroup",
      required: true,
    },
    status: {
      type: String,
      enum: ["Not Started", "Pending", "Ongoing", "Completed", "Halted"], // added 'Halted'
      default: "Pending",
    },
    priority: {
      type: String,
      enum: ["Low", "Normal", "Urgent"], // changed 'High' -> 'Urgent'
      default: "Normal",
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    startDate: { type: Date },
    dueDate: { type: Date },
    progress: { type: Number, min: 0, max: 100, default: 0 }, // Glow-up: Keep it 0-100
  },
  { timestamps: true }
);
module.exports = mongoose.model("Task", TaskSchema);
