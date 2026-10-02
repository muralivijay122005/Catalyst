// src/BACKEND/models/User.cjs
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLES } = require("../utils/permissions.cjs");

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ROLES, default: "member" },
    title: { type: String, trim: true, default: "", maxlength: 80 },
    department: { type: String, trim: true, default: "", maxlength: 60 },
    bio: { type: String, trim: true, default: "", maxlength: 280 },
    location: { type: String, trim: true, default: "", maxlength: 80 },
    avatarColor: { type: String, default: "#2563eb" },
    status: { type: String, enum: ["active", "deactivated"], default: "active" },
    lastSeenAt: { type: Date },
    preferences: {
      weekStartsOn: { type: Number, enum: [0, 1], default: 1 },
      defaultProjectView: { type: String, enum: ["board", "list", "calendar", "timeline"], default: "board" },
      reduceMotion: { type: Boolean, default: false },
      emailDigest: { type: Boolean, default: true },
    },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

// Fields that are safe to expose when another document populates a user
UserSchema.statics.PUBLIC = "firstName lastName username email role title department avatarColor status location lastSeenAt";

module.exports = mongoose.model("User", UserSchema);
