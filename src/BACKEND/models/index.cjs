//src\BACKEND\models\index.cjs
const Project = require("./Project.cjs");
const Module = require("./Module.cjs");
const TaskGroup = require("./TaskGroup.cjs");
const Task = require("./Task.cjs");
const User = require("./User.cjs");
const Channel = require("./Channel.cjs");
const Message = require("./Message.cjs");

module.exports = { Project, Module, TaskGroup, Task, User, Channel, Message };
