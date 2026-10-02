// src/BACKEND/models/index.cjs
const User = require("./User.cjs");
const Project = require("./Project.cjs");
const Task = require("./Task.cjs");
const Channel = require("./Channel.cjs");
const Message = require("./Message.cjs");
const Memory = require("./Memory.cjs");
const Notification = require("./Notification.cjs");

module.exports = { User, Project, Task, Channel, Message, Memory, Notification };
