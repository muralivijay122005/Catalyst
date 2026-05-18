//src\BACKEND\models\Module.cjs
const mongoose = require("mongoose");

const ModuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    taskGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "TaskGroup" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Module", ModuleSchema);
