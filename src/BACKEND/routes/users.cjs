// src/BACKEND/routes/users.cjs
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { User, Task, Project } = require("../models/index.cjs");
const { authenticateToken, requireGlobal } = require("../middleware/authenticationToken.cjs");
const { ROLES, ROLE_LABEL, invitableRoles, isAdmin, sameId, projectRole } = require("../utils/permissions.cjs");
const { badRequest, forbidden, notFound, isObjectId } = require("../utils/http.cjs");
const { notify, visibleProjects } = require("../utils/access.cjs");
const { presenceOf } = require("../utils/presence.cjs");

router.use(authenticateToken);

/** Directory with workload. Guests only see people who share a project with them. */
router.get("/", async (req, res) => {
  let users = await User.find({}).sort({ firstName: 1 }).lean();
  const projects = await visibleProjects(req.user);

  if (req.user.role === "guest") {
    const shared = new Set();
    projects.forEach((p) => {
      shared.add(String(p.owner));
      p.members.forEach((m) => shared.add(String(m.user)));
    });
    users = users.filter((u) => shared.has(String(u._id)));
  }

  const projectIds = projects.map((p) => p._id);
  const load = await Task.aggregate([
    { $match: { projectId: { $in: projectIds }, status: { $nin: ["done", "canceled"] }, assignee: { $ne: null } } },
    {
      $group: {
        _id: "$assignee",
        open: { $sum: 1 },
        overdue: { $sum: { $cond: [{ $and: [{ $ne: ["$dueDate", null] }, { $lt: ["$dueDate", new Date()] }] }, 1, 0] } },
        inReview: { $sum: { $cond: [{ $eq: ["$status", "in_review"] }, 1, 0] } },
      },
    },
  ]);
  const byUser = new Map(load.map((l) => [String(l._id), l]));
  const memberships = (id) =>
    projects
      .filter((p) => sameId(p.owner, id) || p.members.some((m) => sameId(m.user, id)))
      .map((p) => ({
        _id: p._id,
        key: p.key,
        name: p.name,
        color: p.color,
        role: sameId(p.owner, id) ? "owner" : p.members.find((m) => sameId(m.user, id))?.role,
      }));

  const showEmail = req.user.role !== "guest";
  res.json(
    users.map((u) => {
      const { password, __v, preferences, favorites, ...rest } = u;
      return {
        ...rest,
        email: showEmail ? u.email : undefined,
        fullName: `${u.firstName} ${u.lastName}`,
        workload: byUser.get(String(u._id)) || { open: 0, overdue: 0, inReview: 0 },
        projects: memberships(u._id),
        online: presenceOf(u).online,
      };
    })
  );
});

/* ── Presence ────────────────────────────────────────────────── */

/** Heartbeat from an active tab ({ state: "online" }) or an explicit sign-off ({ state: "offline" }). */
router.post("/presence", async (req, res) => {
  const state = req.body?.state === "offline" ? "offline" : "online";
  await User.updateOne({ _id: req.user._id }, { presence: state, lastSeenAt: new Date() }, { timestamps: false });
  res.json({ ok: true, state });
});

/** Lightweight presence for everyone the caller can see — polled to keep dots and "Active x ago" live. */
router.get("/presence", async (req, res) => {
  let users = await User.find({ status: "active" }).select("_id lastSeenAt presence").lean();
  if (req.user.role === "guest") {
    const shared = new Set([String(req.user._id)]);
    (await visibleProjects(req.user)).forEach((p) => {
      shared.add(String(p.owner));
      p.members.forEach((m) => shared.add(String(m.user)));
    });
    users = users.filter((u) => shared.has(String(u._id)));
  }
  const now = Date.now();
  res.json({ serverTime: new Date(now).toISOString(), people: users.map((u) => presenceOf(u, now)) });
});

router.get("/meta", (req, res) => {
  res.json({
    roles: ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] })),
    invitable: invitableRoles(req.user),
  });
});

/** Invite: creates the account with a temporary password the inviter shares. */
router.post("/", requireGlobal("user.invite"), async (req, res) => {
  const { firstName, lastName, email, role = "member", title = "", department = "", projectIds = [] } = req.body || {};
  if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) throw badRequest("Name and email are required");
  if (!invitableRoles(req.user).includes(role)) throw forbidden(`You can't invite someone as ${ROLE_LABEL[role] || role}`);
  const normalized = email.trim().toLowerCase();
  if (await User.exists({ email: normalized })) throw badRequest("Someone with that email is already in the workspace");

  let base = normalized.split("@")[0].replace(/[^a-z0-9._-]/g, "").slice(0, 20) || "user";
  let username = base;
  for (let i = 2; await User.exists({ username }); i++) username = `${base}${i}`;

  const tempPassword = `cat-${crypto.randomBytes(4).toString("hex")}`;
  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalized,
    username,
    password: tempPassword,
    role,
    title: String(title).trim(),
    department: String(department).trim(),
  });

  // Optionally add them to projects the inviter manages
  const ids = (Array.isArray(projectIds) ? projectIds : []).filter(isObjectId);
  if (ids.length) {
    const projects = await Project.find({ _id: { $in: ids } });
    for (const p of projects) {
      const r = projectRole(req.user, p);
      if (!["owner", "manager"].includes(r)) continue;
      p.members.push({ user: user._id, role: role === "guest" ? "viewer" : "member" });
      await p.save();
    }
  }

  res.status(201).json({ user: user.toJSON(), tempPassword });
});

router.get("/:id", async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound("Person");
  const user = await User.findById(req.params.id).select(User.PUBLIC + " bio createdAt");
  if (!user) throw notFound("Person");
  res.json(user);
});

/** Admin-only role changes with guard rails. */
router.patch("/:id/role", requireGlobal("user.manage"), async (req, res) => {
  const { role } = req.body || {};
  if (!ROLES.includes(role)) throw badRequest("Unknown role");
  const user = await User.findById(req.params.id);
  if (!user) throw notFound("Person");
  if (sameId(user._id, req.user._id)) throw badRequest("You can't change your own role");
  if (user.role === "admin" && role !== "admin") {
    const admins = await User.countDocuments({ role: "admin", status: "active" });
    if (admins <= 1) throw badRequest("The workspace needs at least one active admin");
  }
  const from = user.role;
  user.role = role;
  await user.save();

  // Guests can only ever be viewers inside projects
  if (role === "guest") {
    await Project.updateMany({ "members.user": user._id }, { $set: { "members.$[m].role": "viewer" } }, { arrayFilters: [{ "m.user": user._id }] });
  }

  await notify([user._id], {
    actor: req.user._id,
    type: "role_changed",
    title: `Your workspace role is now ${ROLE_LABEL[role]}`,
    body: `${req.user.firstName} changed your role from ${ROLE_LABEL[from]} to ${ROLE_LABEL[role]}.`,
    link: { kind: "people" },
  });
  res.json(user.toJSON());
});

router.patch("/:id/status", requireGlobal("user.manage"), async (req, res) => {
  const { status } = req.body || {};
  if (!["active", "deactivated"].includes(status)) throw badRequest("Unknown status");
  const user = await User.findById(req.params.id);
  if (!user) throw notFound("Person");
  if (sameId(user._id, req.user._id)) throw badRequest("You can't deactivate yourself");
  if (status === "deactivated" && isAdmin(user)) {
    const admins = await User.countDocuments({ role: "admin", status: "active" });
    if (admins <= 1) throw badRequest("The workspace needs at least one active admin");
  }
  user.status = status;
  await user.save();
  // Hand their open work back to the pool so nothing silently stalls
  let unassigned = 0;
  if (status === "deactivated") {
    const result = await Task.updateMany(
      { assignee: user._id, status: { $nin: ["done", "canceled"] } },
      { $unset: { assignee: 1 } }
    );
    unassigned = result.modifiedCount;
  }
  res.json({ user: user.toJSON(), unassigned });
});

module.exports = router;
