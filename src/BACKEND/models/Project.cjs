//src/BACKEND/models/Project.cjs
const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: {
          type: String,
          enum: ["owner", "manager", "member"],
          default: "member",
        },
      },
    ],
    modules: [{ type: mongoose.Schema.Types.ObjectId, ref: "Module" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", ProjectSchema);
