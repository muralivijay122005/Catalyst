//src/BACKEND/models/TaskGroup.cjs
const mongoose = require("mongoose");

const TaskGroupSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    subtasks: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Task" }, // <-- Add this
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("TaskGroup", TaskGroupSchema);
