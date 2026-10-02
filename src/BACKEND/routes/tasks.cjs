// src/BACKEND/routes/tasks.cjs
const express = require("express");
const router = express.Router();
const { Task, Project, User } = require("../models/index.cjs");
const { STATUSES, PRIORITIES } = require("../models/Task.cjs");
const { authenticateToken } = require("../middleware/authenticationToken.cjs");
const {
  taskCan,
  canInProject,
  editableTaskFields,
  needsApproval,
  canApproveTask,
  canPickUp,
  canDeleteTask,
  projectRole,
  sameId,
  idOf,
} = require("../utils/permissions.cjs");
const { badRequest, forbidden, notFound, isObjectId } = require("../utils/http.cjs");
const { visibleProjects, loadProject, loadTask, notify, projectManagers, resolveMentions } = require("../utils/access.cjs");

router.use(authenticateToken);

const PUBLIC = User.PUBLIC;
const LIST_FIELDS =
  "number projectId title status priority assignee createdBy labels milestone startDate dueDate estimate checklist approval order completedAt createdAt updatedAt comments._id";

const STATUS_LABEL = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
  canceled: "Canceled",
};

const projectSummary = (p) => ({ _id: p._id, key: p.key, name: p.name, color: p.color });

function serializeListItem(user, task, project) {
  const t = task.toObject ? task.toObject() : task;
  const checklist = t.checklist || [];
  return {
    ...t,
    ref: `${project.key}-${t.number}`,
    project: projectSummary(project),
    commentCount: (t.comments || []).length,
    comments: undefined,
    checklistDone: checklist.filter((c) => c.done).length,
    checklistTotal: checklist.length,
    can: taskCan(user, project, t),
  };
}

async function serializeFull(user, task, project) {
  await task.populate([
    { path: "assignee", select: PUBLIC },
    { path: "createdBy", select: PUBLIC },
    { path: "comments.author", select: PUBLIC },
    { path: "activity.actor", select: "firstName lastName avatarColor" },
    { path: "approval.requestedBy", select: "firstName lastName avatarColor" },
    { path: "approval.reviewedBy", select: "firstName lastName avatarColor" },
  ]);
  const t = task.toObject();
  return {
    ...t,
    ref: `${project.key}-${t.number}`,
    project: {
      ...projectSummary(project),
      labels: project.labels,
      milestones: project.milestones,
      requireApproval: project.requireApproval,
    },
    can: taskCan(user, project, task),
  };
}

/* ── List ───────────────────────────────────────────────────── */

router.get("/", async (req, res) => {
  const { project, assignee, status, approval, q, due, limit } = req.query;
  let projects = await visibleProjects(req.user);
  if (project) {
    projects = projects.filter((p) => String(p._id) === project || p.key === String(project).toUpperCase());
    if (!projects.length) throw notFound("Project");
  }
  const byId = new Map(projects.map((p) => [String(p._id), p]));
  const filter = { projectId: { $in: projects.map((p) => p._id) } };

  if (assignee === "me") filter.assignee = req.user._id;
  else if (assignee === "none") filter.assignee = null;
  else if (isObjectId(assignee)) filter.assignee = assignee;

  if (status) {
    const list = String(status).split(",").filter((s) => STATUSES.includes(s));
    if (list.length) filter.status = { $in: list };
  } else if (req.query.open === "1") {
    filter.status = { $nin: ["done", "canceled"] };
  }
  if (approval === "pending") filter["approval.state"] = "pending";
  if (due === "overdue") {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $nin: ["done", "canceled"] };
  } else if (due === "week") {
    filter.dueDate = { $gte: new Date(Date.now() - 86400000), $lte: new Date(Date.now() + 7 * 86400000) };
  }
  if (q && String(q).trim()) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: rx }, { description: rx }, { labels: rx }];
  }

  const tasks = await Task.find(filter)
    .select(LIST_FIELDS)
    .populate("assignee", PUBLIC)
    .populate("approval.requestedBy", "firstName lastName avatarColor")
    .sort({ order: 1, number: -1 })
    .limit(Math.min(Number(limit) || 1000, 2000));

  let list = tasks.map((t) => serializeListItem(req.user, t, byId.get(String(t.projectId))));
  // Approvals inbox: only the ones this user can actually act on
  if (approval === "pending" && req.query.actionable === "1") list = list.filter((t) => t.can.approve);
  res.json(list);
});

/* ── Read ───────────────────────────────────────────────────── */

router.get("/:ref", async (req, res) => {
  const { task, project } = await loadTask(req.user, req.params.ref);
  res.json(await serializeFull(req.user, task, project));
});

/* ── Create ─────────────────────────────────────────────────── */

async function assertAssignable(project, userId) {
  if (!userId) return null;
  if (!isObjectId(String(userId))) throw badRequest("Unknown assignee");
  const user = await User.findById(userId).select("_id role status firstName");
  if (!user || user.status !== "active") throw badRequest("That person isn't active in the workspace");
  const role = projectRole(user, project);
  const onTeam = sameId(project.owner, user._id) || project.members.some((m) => sameId(m.user, user._id));
  if (!onTeam || role === "viewer") throw badRequest(`${user.firstName} isn't a contributor on ${project.name}`);
  return user;
}

router.post("/", async (req, res) => {
  const body = req.body || {};
  const project = await loadProject(req.user, body.projectId, "task.create");
  if (!body.title?.trim()) throw badRequest("Give the task a title");

  let assignee = body.assignee || null;
  if (assignee && !sameId(assignee, req.user._id) && !canInProject(req.user, project, "task.assign")) {
    throw forbidden("Only project managers can assign tasks to other people");
  }
  await assertAssignable(project, assignee);

  const status = STATUSES.includes(body.status) && !["done", "in_review"].includes(body.status) ? body.status : "todo";
  const { taskSeq } = await Project.findByIdAndUpdate(project._id, { $inc: { taskSeq: 1 } }, { new: true });
  const last = await Task.findOne({ projectId: project._id, status }).sort({ order: -1 }).select("order");

  const task = await Task.create({
    number: taskSeq,
    projectId: project._id,
    title: body.title.trim(),
    description: String(body.description || "").trim(),
    status,
    priority: PRIORITIES.includes(body.priority) ? body.priority : "none",
    assignee: assignee || undefined,
    createdBy: req.user._id,
    labels: Array.isArray(body.labels) ? body.labels.slice(0, 10) : [],
    milestone: isObjectId(body.milestone) ? body.milestone : undefined,
    startDate: body.startDate ? new Date(body.startDate) : undefined,
    dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    estimate: body.estimate != null && body.estimate !== "" ? Number(body.estimate) : undefined,
    checklist: Array.isArray(body.checklist) ? body.checklist.filter((c) => c?.text?.trim()).map((c) => ({ text: c.text.trim() })) : [],
    order: (last?.order || 0) + 1000,
    activity: [{ actor: req.user._id, action: "created" }],
  });

  if (assignee) {
    await notify([assignee], {
      actor: req.user._id,
      type: "assigned",
      title: `${req.user.firstName} assigned you ${project.key}-${task.number}`,
      body: task.title,
      link: { kind: "task", id: `${project.key}-${task.number}`, projectId: project.key },
    });
  }
  res.status(201).json(await serializeFull(req.user, task, project));
});

/* ── Update ─────────────────────────────────────────────────── */

const DATE_FIELDS = ["startDate", "dueDate"];
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

router.patch("/:id", async (req, res) => {
  const { task, project } = await loadTask(req.user, req.params.id);
  const allowed = editableTaskFields(req.user, project, task);
  const body = req.body || {};
  const requested = Object.keys(body).filter((k) => k !== "note");
  const blocked = requested.filter((k) => !allowed.includes(k));
  if (!allowed.length) throw forbidden("You can view this task but not change it");
  if (blocked.length) throw forbidden(`You can't change ${blocked.join(", ")} on this task`);

  const changes = [];
  const record = (field, from, to) => changes.push({ actor: req.user._id, action: "updated", field, from, to, at: new Date() });
  let routedToReview = false;
  let previousAssignee = task.assignee;

  for (const field of requested) {
    let value = body[field];
    if (field === "status") {
      if (!STATUSES.includes(value)) throw badRequest("Unknown status");
      if (value === task.status) continue;
      const from = task.status;
      if (value === "done" || value === "in_review") {
        if (needsApproval(req.user, project)) {
          // Members submit; managers approve
          value = "in_review";
          routedToReview = from !== "in_review" || task.approval?.state !== "pending";
          task.approval = { state: "pending", requestedBy: req.user._id, requestedAt: new Date() };
        } else if (value === "done" && task.approval?.state === "pending") {
          task.approval.state = "approved";
          task.approval.reviewedBy = req.user._id;
          task.approval.reviewedAt = new Date();
        }
      }
      if (value !== "in_review" && value !== "done" && task.approval?.state === "pending") task.approval.state = "none";
      task.status = value;
      task.completedAt = value === "done" ? new Date() : undefined;
      if (value === "in_progress" && !task.startDate) task.startDate = new Date();
      record("status", from, value);
      continue;
    }
    if (field === "priority") {
      if (!PRIORITIES.includes(value)) throw badRequest("Unknown priority");
    }
    if (field === "assignee") {
      value = value || null;
      if (value) await assertAssignable(project, value);
      if (sameId(value, task.assignee) || (!value && !task.assignee)) continue;
      record("assignee", idOf(task.assignee), value);
      task.assignee = value || undefined;
      continue;
    }
    if (DATE_FIELDS.includes(field)) value = value ? new Date(value) : undefined;
    if (field === "estimate") value = value === "" || value == null ? undefined : Number(value);
    if (field === "milestone") value = isObjectId(value) ? value : undefined;
    if (field === "title") {
      value = String(value || "").trim();
      if (!value) throw badRequest("Title can't be empty");
    }
    if (field === "checklist") {
      value = (Array.isArray(value) ? value : [])
        .filter((c) => c?.text?.trim())
        .slice(0, 50)
        .map((c) => ({ ...(isObjectId(c._id) ? { _id: c._id } : {}), text: c.text.trim(), done: Boolean(c.done) }));
      const before = task.checklist.filter((c) => c.done).length;
      const after = value.filter((c) => c.done).length;
      task.checklist = value;
      if (before !== after) record("checklist", `${before}/${task.checklist.length}`, `${after}/${value.length}`);
      continue;
    }
    const current = task[field]?.toObject ? task[field].toObject() : task[field];
    if (same(current, value)) continue;
    // Long text and board order aren't worth diffing in the activity log
    if (field === "description") record("description", null, null);
    else if (field !== "order") record(field, current, value);
    task[field] = value;
  }

  if (changes.length) task.activity.push(...changes);
  await task.save();

  const ref = `${project.key}-${task.number}`;
  const link = { kind: "task", id: ref, projectId: project.key };
  if (task.assignee && !sameId(task.assignee, previousAssignee)) {
    await notify([task.assignee], {
      actor: req.user._id,
      type: "assigned",
      title: `${req.user.firstName} assigned you ${ref}`,
      body: task.title,
      link,
    });
  }
  if (routedToReview) {
    await notify(projectManagers(project), {
      actor: req.user._id,
      type: "approval_requested",
      title: `${req.user.firstName} submitted ${ref} for review`,
      body: task.title,
      link,
    });
  }
  const statusChange = changes.find((c) => c.field === "status");
  if (statusChange && !routedToReview) {
    await notify([task.assignee, task.createdBy], {
      actor: req.user._id,
      type: "status_changed",
      title: `${ref} moved to ${STATUS_LABEL[task.status]}`,
      body: task.title,
      link,
    });
  }

  const full = await serializeFull(req.user, task, project);
  res.json({ ...full, routedToReview });
});

/* ── Workflow actions ───────────────────────────────────────── */

router.post("/:id/pickup", async (req, res) => {
  const { task, project } = await loadTask(req.user, req.params.id);
  if (!canPickUp(req.user, project, task)) throw forbidden("You can't pick up this task");
  task.assignee = req.user._id;
  if (["backlog", "todo"].includes(task.status)) {
    task.activity.push({ actor: req.user._id, action: "updated", field: "status", from: task.status, to: "in_progress" });
    task.status = "in_progress";
    task.startDate = task.startDate || new Date();
  }
  task.activity.push({ actor: req.user._id, action: "picked_up" });
  await task.save();
  res.json(await serializeFull(req.user, task, project));
});

router.post("/:id/approve", async (req, res) => {
  const { task, project } = await loadTask(req.user, req.params.id);
  if (task.approval?.state !== "pending") throw badRequest("This task isn't waiting for review");
  if (!canApproveTask(req.user, project, task)) {
    throw forbidden(
      canInProject(req.user, project, "task.approve")
        ? "Someone else needs to review this — you can't approve your own work"
        : "Only project managers can approve work"
    );
  }
  task.approval.state = "approved";
  task.approval.reviewedBy = req.user._id;
  task.approval.reviewedAt = new Date();
  task.approval.note = String(req.body?.note || "").trim().slice(0, 500);
  task.activity.push({ actor: req.user._id, action: "approved", from: task.status, to: "done" });
  task.status = "done";
  task.completedAt = new Date();
  await task.save();
  const ref = `${project.key}-${task.number}`;
  await notify([task.assignee, task.approval.requestedBy], {
    actor: req.user._id,
    type: "approved",
    title: `${req.user.firstName} approved ${ref}`,
    body: task.approval.note || task.title,
    link: { kind: "task", id: ref, projectId: project.key },
  });
  res.json(await serializeFull(req.user, task, project));
});

router.post("/:id/reject", async (req, res) => {
  const { task, project } = await loadTask(req.user, req.params.id);
  if (task.approval?.state !== "pending") throw badRequest("This task isn't waiting for review");
  if (!canApproveTask(req.user, project, task)) throw forbidden("You can't review this task");
  const note = String(req.body?.note || "").trim().slice(0, 500);
  if (!note) throw badRequest("Tell them what needs to change");
  task.approval.state = "rejected";
  task.approval.reviewedBy = req.user._id;
  task.approval.reviewedAt = new Date();
  task.approval.note = note;
  task.activity.push({ actor: req.user._id, action: "rejected", from: task.status, to: "in_progress" });
  task.status = "in_progress";
  task.comments.push({ author: req.user._id, text: `Changes requested: ${note}` });
  await task.save();
  const ref = `${project.key}-${task.number}`;
  await notify([task.assignee, task.approval.requestedBy], {
    actor: req.user._id,
    type: "rejected",
    title: `${req.user.firstName} requested changes on ${ref}`,
    body: note,
    link: { kind: "task", id: ref, projectId: project.key },
  });
  res.json(await serializeFull(req.user, task, project));
});

/* ── Comments ───────────────────────────────────────────────── */

router.post("/:id/comments", async (req, res) => {
  const { task, project } = await loadTask(req.user, req.params.id);
  if (!canInProject(req.user, project, "task.comment")) throw forbidden("You can't comment on this project");
  const text = String(req.body?.text || "").trim();
  if (!text) throw badRequest("Write a comment first");
  task.comments.push({ author: req.user._id, text });
  task.activity.push({ actor: req.user._id, action: "commented" });
  await task.save();

  const ref = `${project.key}-${task.number}`;
  const link = { kind: "task", id: ref, projectId: project.key };
  const mentioned = (await resolveMentions(text)).filter((u) => projectRole(u, project));
  await notify(
    mentioned.map((u) => u._id),
    { actor: req.user._id, type: "mentioned", title: `${req.user.firstName} mentioned you on ${ref}`, body: text, link }
  );
  const mentionedIds = new Set(mentioned.map((u) => String(u._id)));
  await notify(
    [task.assignee, task.createdBy].filter((id) => id && !mentionedIds.has(String(id))),
    { actor: req.user._id, type: "commented", title: `${req.user.firstName} commented on ${ref}`, body: text, link }
  );
  res.status(201).json(await serializeFull(req.user, task, project));
});

router.patch("/:id/comments/:commentId", async (req, res) => {
  const { task, project } = await loadTask(req.user, req.params.id);
  const comment = task.comments.id(req.params.commentId);
  if (!comment) throw notFound("Comment");
  if (!sameId(comment.author, req.user._id)) throw forbidden("You can only edit your own comments");
  const text = String(req.body?.text || "").trim();
  if (!text) throw badRequest("Comment can't be empty");
  comment.text = text;
  comment.editedAt = new Date();
  await task.save();
  res.json(await serializeFull(req.user, task, project));
});

router.delete("/:id/comments/:commentId", async (req, res) => {
  const { task, project } = await loadTask(req.user, req.params.id);
  const comment = task.comments.id(req.params.commentId);
  if (!comment) throw notFound("Comment");
  if (!sameId(comment.author, req.user._id) && !canInProject(req.user, project, "task.edit")) {
    throw forbidden("You can only delete your own comments");
  }
  comment.deleteOne();
  await task.save();
  res.json(await serializeFull(req.user, task, project));
});

router.post("/:id/comments/:commentId/react", async (req, res) => {
  const { task, project } = await loadTask(req.user, req.params.id);
  const comment = task.comments.id(req.params.commentId);
  if (!comment) throw notFound("Comment");
  const emoji = String(req.body?.emoji || "").slice(0, 8);
  if (!emoji) throw badRequest("Pick a reaction");
  let reaction = comment.reactions.find((r) => r.emoji === emoji);
  if (!reaction) {
    comment.reactions.push({ emoji, users: [] });
    reaction = comment.reactions[comment.reactions.length - 1];
  }
  const has = reaction.users.some((u) => sameId(u, req.user._id));
  reaction.users = has ? reaction.users.filter((u) => !sameId(u, req.user._id)) : [...reaction.users, req.user._id];
  comment.reactions = comment.reactions.filter((r) => r.users.length);
  await task.save();
  res.json(await serializeFull(req.user, task, project));
});

/* ── Delete ─────────────────────────────────────────────────── */

router.delete("/:id", async (req, res) => {
  const { task, project } = await loadTask(req.user, req.params.id);
  if (!canDeleteTask(req.user, project, task)) throw forbidden("You can't delete this task");
  await task.deleteOne();
  res.json({ id: task._id });
});

module.exports = router;
