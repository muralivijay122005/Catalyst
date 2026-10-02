// src/BACKEND/models/Memory.cjs
// A unit of team knowledge: a decision, insight, fact, process, reference or note.
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const MEMORY_TYPES = ["decision", "process", "insight", "fact", "reference", "note"];
const SOURCE_KINDS = ["manual", "channel", "message", "project", "task", "comment", "answer"];
const VISIBILITY = ["workspace", "project", "private"];

const MemorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    content: { type: String, required: true, trim: true, maxlength: 20000 },
    summary: { type: String, trim: true, default: "", maxlength: 400 },
    type: { type: String, enum: MEMORY_TYPES, default: "note", index: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    entities: [{ type: String, trim: true }],
    importance: { type: Number, min: 1, max: 5, default: 3 },
    pinned: { type: Boolean, default: false },
    visibility: { type: String, enum: VISIBILITY, default: "workspace" },
    projectId: { type: ObjectId, ref: "Project", index: true },
    // Explicit connections; implicit ones are computed from content similarity
    links: [{ type: ObjectId, ref: "Memory" }],
    tasks: [{ type: ObjectId, ref: "Task" }],
    verified: {
      by: { type: ObjectId, ref: "User" },
      at: { type: Date },
    },
    // Verified knowledge older than this many days is flagged for review
    reviewEveryDays: { type: Number, default: 90, min: 7, max: 730 },
    enrichedBy: { type: String, enum: ["none", "local", "groq"], default: "none" },
    source: {
      kind: { type: String, enum: SOURCE_KINDS, default: "manual" },
      refId: { type: String },
      label: { type: String },
    },
    helpful: [{ type: ObjectId, ref: "User" }],
    views: { type: Number, default: 0 },
    createdBy: { type: ObjectId, ref: "User" },
    updatedBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Memory", MemorySchema);
module.exports.MEMORY_TYPES = MEMORY_TYPES;
module.exports.VISIBILITY = VISIBILITY;
module.exports.SOURCE_KINDS = SOURCE_KINDS;
