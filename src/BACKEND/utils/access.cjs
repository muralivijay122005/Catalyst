// src/BACKEND/utils/access.cjs
// Shared lookups: which projects a user can see, loading a project/task with a permission check, notifications.
const { Project, Task, Notification, User } = require("../models/index.cjs");
const { projectRole, canInProject, idOf, sameId } = require("./permissions.cjs");
const { forbidden, notFound, isObjectId } = require("./http.cjs");

/** All projects the user can see (members, plus oversight for admins/managers). */
async function visibleProjects(user, { includeArchived = true } = {}) {
  const query = includeArchived ? {} : { status: { $ne: "archived" } };
  const all = await Project.find(query).sort({ createdAt: 1 }).lean();
  return all.filter((p) => projectRole(user, p));
}

/** Map of projectId → project for every project the user can see. */
async function projectIndexFor(user) {
  const projects = await visibleProjects(user);
  return new Map(projects.map((p) => [idOf(p._id), p]));
}

/** Load a project by id or key and require a project permission. */
async function loadProject(user, idOrKey, perm = "project.view") {
  const query = isObjectId(idOrKey) ? { _id: idOrKey } : { key: String(idOrKey).toUpperCase() };
  const project = await Project.findOne(query);
  if (!project || !projectRole(user, project)) throw notFound("Project");
  if (!canInProject(user, project, perm)) throw forbidden();
  return project;
}

/** Resolve "PAY-12" or an ObjectId into a task the user can see. */
async function loadTask(user, ref) {
  let task;
  if (isObjectId(ref)) {
    task = await Task.findById(ref);
  } else {
    const match = /^([A-Za-z]{2,5})-(\d+)$/.exec(String(ref));
    if (!match) throw notFound("Task");
    const project = await Project.findOne({ key: match[1].toUpperCase() }).select("_id");
    if (project) task = await Task.findOne({ projectId: project._id, number: Number(match[2]) });
  }
  if (!task) throw notFound("Task");
  const project = await Project.findById(task.projectId);
  if (!project || !projectRole(user, project)) throw notFound("Task");
  return { task, project };
}

/** Create notifications for a set of users (never notifies the actor). */
async function notify(userIds, { actor, type, title, body = "", link = {} }) {
  const unique = [...new Set(userIds.filter(Boolean).map(idOf))].filter((id) => !sameId(id, actor));
  if (!unique.length) return;
  await Notification.insertMany(
    unique.map((user) => ({ user, actor: idOf(actor), type, title: title.slice(0, 200), body: body.slice(0, 500), link }))
  ).catch((err) => console.error("notify failed:", err.message));
}

/** Managers and owners of a project (who receive approval requests). */
function projectManagers(project) {
  const ids = (project.members || []).filter((m) => ["owner", "manager"].includes(m.role)).map((m) => idOf(m.user));
  if (project.owner) ids.push(idOf(project.owner));
  return [...new Set(ids)];
}

/** Extract @username mentions and resolve them to active users. */
async function resolveMentions(text) {
  const names = [...new Set((String(text).match(/@([a-z0-9._-]{2,30})/gi) || []).map((m) => m.slice(1).toLowerCase()))];
  if (!names.length) return [];
  return User.find({ username: { $in: names }, status: "active" }).select("_id username role");
}

module.exports = { visibleProjects, projectIndexFor, loadProject, loadTask, notify, projectManagers, resolveMentions };
