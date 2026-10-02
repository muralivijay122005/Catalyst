// src/BACKEND/routes/projects.cjs
const express = require("express");
const router = express.Router();
const { Project, Task, User, Memory, Channel } = require("../models/index.cjs");
const { authenticateToken, requireGlobal } = require("../middleware/authenticationToken.cjs");
const { projectCan, projectRole, PROJECT_ROLES, sameId } = require("../utils/permissions.cjs");
const { badRequest, forbidden, notFound, isObjectId } = require("../utils/http.cjs");
const { visibleProjects, loadProject, notify } = require("../utils/access.cjs");

router.use(authenticateToken);

const PUBLIC = User.PUBLIC;

async function taskStats(projectIds) {
  const rows = await Task.aggregate([
    { $match: { projectId: { $in: projectIds } } },
    {
      $group: {
        _id: { p: "$projectId", s: "$status" },
        n: { $sum: 1 },
        overdue: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ["$dueDate", null] }, { $lt: ["$dueDate", new Date()] }, { $not: [{ $in: ["$status", ["done", "canceled"]] }] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  const stats = new Map();
  rows.forEach((r) => {
    const key = String(r._id.p);
    const s = stats.get(key) || { total: 0, done: 0, overdue: 0, byStatus: {} };
    s.byStatus[r._id.s] = r.n;
    if (r._id.s !== "canceled") s.total += r.n;
    if (r._id.s === "done") s.done += r.n;
    s.overdue += r.overdue;
    stats.set(key, s);
  });
  return stats;
}

const serialize = (user, project, stats) => {
  const obj = project.toObject ? project.toObject() : project;
  const s = stats?.get(String(obj._id)) || { total: 0, done: 0, overdue: 0, byStatus: {} };
  return {
    ...obj,
    stats: { ...s, progress: s.total ? Math.round((s.done / s.total) * 100) : 0 },
    can: projectCan(user, project),
  };
};

router.get("/", async (req, res) => {
  const projects = await visibleProjects(req.user);
  const ids = projects.map((p) => p._id);
  const [stats, populated] = await Promise.all([
    taskStats(ids),
    Project.find({ _id: { $in: ids } })
      .sort({ createdAt: 1 })
      .populate("owner", PUBLIC)
      .populate("members.user", PUBLIC),
  ]);
  res.json(populated.map((p) => serialize(req.user, p, stats)));
});

router.post("/", requireGlobal("project.create"), async (req, res) => {
  const { name, key, description = "", color, requireApproval = true, targetDate, memberIds = [] } = req.body || {};
  if (!name?.trim()) throw badRequest("Give the project a name");
  const cleanKey = String(key || name.replace(/[^a-z]/gi, "").slice(0, 3)).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5);
  if (cleanKey.length < 2) throw badRequest("Project key needs 2-5 letters");
  if (await Project.exists({ key: cleanKey })) throw badRequest(`The key ${cleanKey} is already used by another project`);

  const members = [{ user: req.user._id, role: "owner" }];
  const validIds = (Array.isArray(memberIds) ? memberIds : []).filter((id) => isObjectId(id) && !sameId(id, req.user._id));
  const users = await User.find({ _id: { $in: validIds }, status: "active" }).select("_id role");
  users.forEach((u) => members.push({ user: u._id, role: u.role === "guest" ? "viewer" : "member" }));

  const project = await Project.create({
    name: name.trim(),
    key: cleanKey,
    description: String(description).trim(),
    color: /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#2563eb",
    owner: req.user._id,
    members,
    requireApproval: Boolean(requireApproval),
    startDate: new Date(),
    targetDate: targetDate ? new Date(targetDate) : undefined,
    labels: [
      { name: "Bug", color: "#dc2626" },
      { name: "Feature", color: "#2563eb" },
      { name: "Improvement", color: "#0891b2" },
    ],
  });

  // Every project gets a discussion channel for its team
  await Channel.create({
    name: cleanKey.toLowerCase(),
    topic: `Discussion for ${project.name}`,
    kind: "private",
    projectId: project._id,
    members: members.map((m) => m.user),
    createdBy: req.user._id,
  });

  await notify(
    users.map((u) => u._id),
    {
      actor: req.user._id,
      type: "added_to_project",
      title: `${req.user.firstName} added you to ${project.name}`,
      link: { kind: "project", id: project.key },
    }
  );

  await project.populate("owner", PUBLIC);
  await project.populate("members.user", PUBLIC);
  res.status(201).json(serialize(req.user, project, new Map()));
});

router.get("/:idOrKey", async (req, res) => {
  const project = await loadProject(req.user, req.params.idOrKey);
  await project.populate("owner", PUBLIC);
  await project.populate("members.user", PUBLIC);
  const stats = await taskStats([project._id]);
  res.json(serialize(req.user, project, stats));
});

/** Project overview: workload per person, milestone progress, recent activity, knowledge. */
router.get("/:idOrKey/overview", async (req, res) => {
  const project = await loadProject(req.user, req.params.idOrKey);
  const tasks = await Task.find({ projectId: project._id })
    .select("number title status priority assignee dueDate milestone activity completedAt createdAt approval")
    .populate("assignee", "firstName lastName avatarColor")
    .populate("activity.actor", "firstName lastName avatarColor")
    .lean();

  const now = Date.now();
  const workload = new Map();
  tasks.forEach((t) => {
    if (!t.assignee || ["done", "canceled"].includes(t.status)) return;
    const k = String(t.assignee._id);
    const w = workload.get(k) || { user: t.assignee, open: 0, overdue: 0, inProgress: 0 };
    w.open++;
    if (t.status === "in_progress") w.inProgress++;
    if (t.dueDate && new Date(t.dueDate).getTime() < now) w.overdue++;
    workload.set(k, w);
  });

  const milestones = project.milestones.map((m) => {
    const mt = tasks.filter((t) => sameId(t.milestone, m._id) && t.status !== "canceled");
    const done = mt.filter((t) => t.status === "done").length;
    return { ...m.toObject(), total: mt.length, done, progress: mt.length ? Math.round((done / mt.length) * 100) : 0 };
  });

  const activity = tasks
    .flatMap((t) => (t.activity || []).map((a) => ({ ...a, task: { _id: t._id, number: t.number, title: t.title } })))
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 25);

  // Completed per week for the last 8 weeks (burn-up)
  const weeks = Array.from({ length: 8 }, (_v, i) => {
    const end = new Date(now - (7 - i) * 7 * 86400000);
    const start = new Date(end.getTime() - 7 * 86400000);
    return {
      week: end.toISOString().slice(0, 10),
      completed: tasks.filter((t) => t.completedAt && new Date(t.completedAt) > start && new Date(t.completedAt) <= end).length,
      created: tasks.filter((t) => new Date(t.createdAt) > start && new Date(t.createdAt) <= end).length,
    };
  });

  const knowledge = await Memory.find({ projectId: project._id, visibility: { $ne: "private" } })
    .sort({ pinned: -1, importance: -1, updatedAt: -1 })
    .limit(6)
    .select("title type summary verified pinned updatedAt importance")
    .lean();

  res.json({
    workload: [...workload.values()].sort((a, b) => b.open - a.open),
    milestones,
    activity,
    weeks,
    knowledge,
    pendingApprovals: tasks.filter((t) => t.approval?.state === "pending").length,
  });
});

router.patch("/:id", async (req, res) => {
  const project = await loadProject(req.user, req.params.id, "project.update");
  const body = req.body || {};
  if (typeof body.name === "string" && body.name.trim()) project.name = body.name.trim();
  if (typeof body.description === "string") project.description = body.description.trim();
  if (/^#[0-9a-f]{6}$/i.test(body.color || "")) project.color = body.color;
  if (["active", "paused", "completed", "archived"].includes(body.status)) project.status = body.status;
  if (typeof body.requireApproval === "boolean") project.requireApproval = body.requireApproval;
  if (body.startDate !== undefined) project.startDate = body.startDate ? new Date(body.startDate) : undefined;
  if (body.targetDate !== undefined) project.targetDate = body.targetDate ? new Date(body.targetDate) : undefined;
  if (Array.isArray(body.labels)) {
    project.labels = body.labels
      .filter((l) => l?.name?.trim())
      .slice(0, 30)
      .map((l) => ({ ...(isObjectId(l._id) ? { _id: l._id } : {}), name: l.name.trim().slice(0, 32), color: /^#[0-9a-f]{6}$/i.test(l.color) ? l.color : "#737373" }));
  }
  if (Array.isArray(body.milestones)) {
    project.milestones = body.milestones
      .filter((m) => m?.name?.trim())
      .slice(0, 30)
      .map((m) => ({
        ...(isObjectId(m._id) ? { _id: m._id } : {}),
        name: m.name.trim().slice(0, 80),
        dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
        done: Boolean(m.done),
      }));
  }
  await project.save();
  await project.populate("owner", PUBLIC);
  await project.populate("members.user", PUBLIC);
  res.json(serialize(req.user, project, await taskStats([project._id])));
});

router.delete("/:id", async (req, res) => {
  const project = await loadProject(req.user, req.params.id, "project.delete");
  if (req.body?.confirm !== project.key) throw badRequest(`Type ${project.key} to confirm`);
  await Promise.all([
    Task.deleteMany({ projectId: project._id }),
    Channel.deleteMany({ projectId: project._id }),
    // Knowledge outlives the project: keep it, but unscope it so it stays readable
    Memory.updateMany({ projectId: project._id }, { $unset: { projectId: 1 }, $set: { visibility: "workspace" } }),
  ]);
  await project.deleteOne();
  res.json({ id: project._id });
});

/* ── Membership ─────────────────────────────────────────────── */

const syncChannel = (project) =>
  Channel.updateMany(
    { projectId: project._id },
    { $set: { members: [project.owner, ...project.members.map((m) => m.user)].filter(Boolean) } }
  );

router.post("/:id/members", async (req, res) => {
  const project = await loadProject(req.user, req.params.id, "project.members");
  const { userId, role = "member" } = req.body || {};
  if (!PROJECT_ROLES.includes(role) || role === "owner") throw badRequest("Pick member, manager or viewer");
  if (role === "manager" && projectRole(req.user, project) !== "owner") throw forbidden("Only the project owner can add managers");
  const user = await User.findById(userId);
  if (!user || user.status !== "active") throw notFound("Person");
  if (project.members.some((m) => sameId(m.user, user._id))) throw badRequest(`${user.firstName} is already on this project`);
  project.members.push({ user: user._id, role: user.role === "guest" ? "viewer" : role });
  await project.save();
  await syncChannel(project);
  await notify([user._id], {
    actor: req.user._id,
    type: "added_to_project",
    title: `${req.user.firstName} added you to ${project.name}`,
    link: { kind: "project", id: project.key },
  });
  await project.populate("owner", PUBLIC);
  await project.populate("members.user", PUBLIC);
  res.json(serialize(req.user, project, await taskStats([project._id])));
});

router.patch("/:id/members/:userId", async (req, res) => {
  const project = await loadProject(req.user, req.params.id, "project.members");
  const { role } = req.body || {};
  const entry = project.members.find((m) => sameId(m.user, req.params.userId));
  if (!entry) throw notFound("Member");
  const actorRole = projectRole(req.user, project);

  if (role === "owner") {
    // Ownership transfer: only the owner (or an admin) can hand it over
    if (actorRole !== "owner") throw forbidden("Only the owner can transfer ownership");
    const target = await User.findById(entry.user);
    if (target?.role === "guest") throw badRequest("Guests can't own projects");
    const previous = project.members.find((m) => sameId(m.user, project.owner));
    if (previous) previous.role = "manager";
    entry.role = "owner";
    project.owner = entry.user;
  } else {
    if (!PROJECT_ROLES.includes(role)) throw badRequest("Unknown project role");
    if (sameId(entry.user, project.owner)) throw badRequest("Transfer ownership before changing the owner's role");
    if ((role === "manager" || entry.role === "manager") && actorRole !== "owner") {
      throw forbidden("Only the project owner can promote or demote managers");
    }
    const target = await User.findById(entry.user);
    if (target?.role === "guest" && role !== "viewer") throw badRequest("Guests can only be viewers");
    entry.role = role;
  }
  await project.save();
  await notify([entry.user], {
    actor: req.user._id,
    type: "role_changed",
    title: `You're now ${entry.role === "owner" ? "the owner" : `a ${entry.role}`} on ${project.name}`,
    link: { kind: "project", id: project.key },
  });
  await project.populate("owner", PUBLIC);
  await project.populate("members.user", PUBLIC);
  res.json(serialize(req.user, project, await taskStats([project._id])));
});

router.delete("/:id/members/:userId", async (req, res) => {
  const leavingSelf = sameId(req.params.userId, req.user._id);
  const project = await loadProject(req.user, req.params.id, leavingSelf ? "project.view" : "project.members");
  const entry = project.members.find((m) => sameId(m.user, req.params.userId));
  if (!entry) throw notFound("Member");
  if (sameId(entry.user, project.owner)) throw badRequest("Transfer ownership before removing the owner");
  if (!leavingSelf && entry.role === "manager" && projectRole(req.user, project) !== "owner") {
    throw forbidden("Only the project owner can remove managers");
  }
  project.members = project.members.filter((m) => !sameId(m.user, entry.user));
  await project.save();
  await syncChannel(project);
  // Their open tasks in this project go back to the pool
  await Task.updateMany(
    { projectId: project._id, assignee: entry.user, status: { $nin: ["done", "canceled"] } },
    { $unset: { assignee: 1 } }
  );
  await project.populate("owner", PUBLIC);
  await project.populate("members.user", PUBLIC);
  res.json(serialize(req.user, project, await taskStats([project._id])));
});

module.exports = router;
module.exports.taskStats = taskStats;
