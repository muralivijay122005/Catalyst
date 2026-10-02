// src/BACKEND/routes/workspace.cjs
// Cross-cutting reads: the Home dashboard and global search (command palette).
const express = require("express");
const router = express.Router();
const { Task, User, Memory, Notification, Channel } = require("../models/index.cjs");
const { authenticateToken } = require("../middleware/authenticationToken.cjs");
const { taskCan, canReadMemory, canApproveTask } = require("../utils/permissions.cjs");
const { visibleProjects } = require("../utils/access.cjs");
const kb = require("../utils/knowledge.cjs");
const { canRead: canReadChannel } = require("./channels.cjs");

router.use(authenticateToken);

const DAY = 86400000;
const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

router.get("/home", async (req, res) => {
  const user = req.user;
  const projects = await visibleProjects(user, { includeArchived: false });
  const byId = new Map(projects.map((p) => [String(p._id), p]));
  const ids = projects.map((p) => p._id);
  const today = startOfDay();
  const weekAgo = new Date(Date.now() - 7 * DAY);

  const [mine, pending, recentTasks, unread, memories] = await Promise.all([
    Task.find({ projectId: { $in: ids }, assignee: user._id, status: { $nin: ["canceled"] } })
      .select("number projectId title status priority dueDate labels checklist approval completedAt updatedAt assignee createdBy")
      .lean(),
    Task.find({ projectId: { $in: ids }, "approval.state": "pending" })
      .select("number projectId title status priority dueDate approval assignee createdBy")
      .populate("approval.requestedBy", "firstName lastName avatarColor")
      .lean(),
    Task.find({ projectId: { $in: ids }, updatedAt: { $gte: new Date(Date.now() - 14 * DAY) } })
      .select("number projectId title activity")
      .populate("activity.actor", "firstName lastName avatarColor")
      .sort({ updatedAt: -1 })
      .limit(60)
      .lean(),
    Notification.countDocuments({ user: user._id, read: false }),
    Memory.find({}).populate("createdBy", "firstName lastName avatarColor").populate("projectId", "key name color").sort({ updatedAt: -1 }).limit(200).lean(),
  ]);

  const decorate = (t) => {
    const p = byId.get(String(t.projectId));
    return { ...t, ref: `${p.key}-${t.number}`, project: { _id: p._id, key: p.key, color: p.color, name: p.name }, can: taskCan(user, p, t) };
  };

  const open = mine.filter((t) => t.status !== "done");
  const due = (t) => (t.dueDate ? new Date(t.dueDate).getTime() : Infinity);
  const overdue = open.filter((t) => due(t) < today.getTime());
  const dueToday = open.filter((t) => due(t) >= today.getTime() && due(t) < today.getTime() + DAY);
  const upcoming = open.filter((t) => due(t) >= today.getTime() + DAY && due(t) < today.getTime() + 8 * DAY);
  const completedWeek = mine.filter((t) => t.status === "done" && t.completedAt && new Date(t.completedAt) >= weekAgo);
  const approvals = pending.filter((t) => canApproveTask(user, byId.get(String(t.projectId)), t));
  const myInReview = open.filter((t) => t.status === "in_review");

  // Completed by me per day, last 14 days
  const streak = Array.from({ length: 14 }, (_v, i) => {
    const start = new Date(today.getTime() - (13 - i) * DAY);
    const end = new Date(start.getTime() + DAY);
    return {
      day: start.toISOString().slice(0, 10),
      count: mine.filter((t) => t.completedAt && new Date(t.completedAt) >= start && new Date(t.completedAt) < end).length,
    };
  });

  const activity = recentTasks
    .flatMap((t) =>
      (t.activity || []).map((a) => {
        const p = byId.get(String(t.projectId));
        return { ...a, task: { ref: `${p.key}-${t.number}`, title: t.title, project: { key: p.key, color: p.color } } };
      })
    )
    .filter((a) => a.actor)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 14);

  const projectIndex = new Map(projects.map((p) => [String(p._id), p]));
  const readable = memories.filter((m) => canReadMemory(user, { ...m, projectId: m.projectId?._id }, projectIndex));
  const knowledge = readable.slice(0, 5).map((m) => ({
    _id: m._id,
    title: m.title,
    type: m.type,
    summary: m.summary,
    verified: Boolean(m.verified?.at),
    createdBy: m.createdBy,
    project: m.projectId?.key ? m.projectId : null,
    updatedAt: m.updatedAt,
  }));

  // Knowledge connected to the work in front of me: what the KB knows about my open tasks
  let forYou = [];
  if (open.length && readable.length) {
    const index = kb.buildIndex(readable);
    const text = open
      .slice(0, 12)
      .map((t) => `${t.title} ${(t.labels || []).join(" ")}`)
      .join(" ");
    forYou = kb.similar(index, text, { limit: 4, minScore: 0.1 }).map((r) => ({
      _id: r.memory._id,
      title: r.memory.title,
      type: r.memory.type,
      summary: r.memory.summary,
      verified: Boolean(r.memory.verified?.at),
    }));
  }

  res.json({
    counts: {
      open: open.length,
      overdue: overdue.length,
      dueToday: dueToday.length,
      upcoming: upcoming.length,
      completedWeek: completedWeek.length,
      approvals: approvals.length,
      inReview: myInReview.length,
      unread,
    },
    focus: [...overdue, ...dueToday].sort((a, b) => due(a) - due(b)).map(decorate),
    inProgress: open.filter((t) => t.status === "in_progress" && !overdue.includes(t) && !dueToday.includes(t)).map(decorate),
    // Work already in progress is listed above, so "coming up" shows what hasn't started
    upcoming: upcoming.filter((t) => t.status !== "in_progress").sort((a, b) => due(a) - due(b)).map(decorate),
    approvals: approvals.slice(0, 6).map(decorate),
    streak,
    activity,
    knowledge,
    forYou,
  });
});

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ tasks: [], projects: [], people: [], memories: [], channels: [] });
  const user = req.user;
  const projects = await visibleProjects(user);
  const byId = new Map(projects.map((p) => [String(p._id), p]));
  const rx = new RegExp(escapeRx(q), "i");

  // "PAY-12" jumps straight to the task
  const refMatch = /^([A-Za-z]{2,5})-(\d+)$/.exec(q);
  const taskFilter = { projectId: { $in: projects.map((p) => p._id) } };
  if (refMatch) {
    const p = projects.find((x) => x.key === refMatch[1].toUpperCase());
    taskFilter.projectId = p ? p._id : null;
    taskFilter.number = Number(refMatch[2]);
  } else {
    taskFilter.$or = [{ title: rx }, { labels: rx }];
  }

  const [tasks, people, memories, channels] = await Promise.all([
    Task.find(taskFilter).select("number projectId title status priority assignee").populate("assignee", "firstName lastName avatarColor").limit(8).lean(),
    User.find({ status: "active", $or: [{ firstName: rx }, { lastName: rx }, { username: rx }, { title: rx }] })
      .select("firstName lastName username title avatarColor role")
      .limit(5)
      .lean(),
    Memory.find({}).populate("projectId", "key name color").lean(),
    Channel.find({ kind: { $ne: "dm" }, name: rx }).limit(5),
  ]);

  const projectIndex = new Map(projects.map((p) => [String(p._id), p]));
  const readable = memories.filter((m) => canReadMemory(user, { ...m, projectId: m.projectId?._id }, projectIndex));
  const ranked = kb.search(kb.buildIndex(readable), q, { limit: 6 });
  const visibleChannels = [];
  for (const c of channels) if (await canReadChannel(user, c)) visibleChannels.push({ _id: c._id, name: c.name, topic: c.topic });

  res.json({
    tasks: tasks.map((t) => {
      const p = byId.get(String(t.projectId));
      return { ...t, ref: `${p.key}-${t.number}`, project: { key: p.key, color: p.color } };
    }),
    projects: projects.filter((p) => rx.test(p.name) || rx.test(p.key)).slice(0, 5).map((p) => ({ _id: p._id, key: p.key, name: p.name, color: p.color })),
    people: user.role === "guest" ? [] : people,
    memories: ranked.map((r) => ({ _id: r.memory._id, title: r.memory.title, type: r.memory.type, snippet: kb.bestSnippet(r.memory, q, 120) })),
    channels: visibleChannels,
  });
});

module.exports = router;
