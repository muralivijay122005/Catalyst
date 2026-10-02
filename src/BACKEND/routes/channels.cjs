// src/BACKEND/routes/channels.cjs
// Team discussions: public channels, private/project channels and direct messages.
const express = require("express");
const router = express.Router();
const { Channel, Message, User, Project } = require("../models/index.cjs");
const { authenticateToken } = require("../middleware/authenticationToken.cjs");
const { hasGlobal, isAdmin, sameId, projectRole } = require("../utils/permissions.cjs");
const { badRequest, forbidden, notFound, isObjectId } = require("../utils/http.cjs");
const { notify, resolveMentions } = require("../utils/access.cjs");

router.use(authenticateToken);

const PUBLIC = User.PUBLIC;

async function canRead(user, channel) {
  if (channel.kind === "public") return user.role !== "guest" || channel.members.some((m) => sameId(m, user._id));
  if (channel.members.some((m) => sameId(m, user._id))) return true;
  if (channel.projectId && channel.kind !== "dm") {
    // Workspace oversight extends to project channels
    const project = await Project.findById(channel.projectId).lean();
    return Boolean(project && projectRole(user, project) && user.role !== "guest");
  }
  return false;
}

const canPost = (user, channel) => {
  if (channel.locked && !hasGlobal(user, "channel.announce")) return false;
  if (channel.kind === "public") return user.role !== "guest";
  return channel.members.some((m) => sameId(m, user._id)) || isAdmin(user);
};

/**
 * Channel membership rules
 *   project channels → membership mirrors the project team (manage it on the project)
 *   direct messages  → fixed to the two people
 *   public/private   → members can invite people; the creator, admins and managers can remove anyone;
 *                      anyone can leave; only admins/managers may bring guests into a channel
 */
function channelCan(user, channel) {
  const isMember = channel.members.some((m) => sameId(m, user._id));
  const curator = isAdmin(user) || sameId(channel.createdBy, user._id) || hasGlobal(user, "channel.announce");
  const managed = Boolean(channel.projectId) || channel.kind === "dm";
  return {
    managedByProject: Boolean(channel.projectId),
    addMembers: !managed && user.role !== "guest" && (isMember || curator),
    addGuests: !managed && hasGlobal(user, "user.invite"),
    removeMembers: !managed && curator,
    leave: !managed && isMember,
    join: channel.kind === "public" && !isMember && user.role !== "guest",
    edit: !managed && curator,
    delete: !managed && (isAdmin(user) || sameId(channel.createdBy, user._id)),
  };
}

async function loadChannel(user, id) {
  if (!isObjectId(id)) throw notFound("Channel");
  const channel = await Channel.findById(id);
  if (!channel || !(await canRead(user, channel))) throw notFound("Channel");
  return channel;
}

router.get("/", async (req, res) => {
  const all = await Channel.find({}).sort({ lastMessageAt: -1, createdAt: 1 }).populate("members", PUBLIC).populate("projectId", "key name color");
  const visible = [];
  for (const c of all) if (await canRead(req.user, c)) visible.push(c);
  res.json(
    visible.map((c) => ({
      ...c.toObject(),
      project: c.projectId || null,
      canPost: canPost(req.user, c),
      joined: c.members.some((m) => sameId(m, req.user._id)),
      can: channelCan(req.user, c),
    }))
  );
});

router.post("/", async (req, res) => {
  const { name, topic = "", kind = "public", memberIds = [], locked = false } = req.body || {};

  if (kind === "dm") {
    const other = memberIds.find((id) => isObjectId(id) && !sameId(id, req.user._id));
    const otherUser = other && (await User.findById(other));
    if (!otherUser) throw badRequest("Pick someone to message");
    const existing = await Channel.findOne({ kind: "dm", members: { $all: [req.user._id, otherUser._id], $size: 2 } });
    if (existing) return res.json(existing);
    const dm = await Channel.create({
      name: `${req.user.username}-${otherUser.username}`,
      kind: "dm",
      members: [req.user._id, otherUser._id],
      createdBy: req.user._id,
    });
    return res.status(201).json(dm);
  }

  if (!hasGlobal(req.user, "channel.create")) throw forbidden("Your role can't create channels");
  const clean = String(name || "").toLowerCase().trim().replace(/^#/, "").replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  if (!clean) throw badRequest("Name the channel");
  if (await Channel.exists({ name: clean, kind: { $ne: "dm" } })) throw badRequest(`#${clean} already exists`);
  if (locked && !hasGlobal(req.user, "channel.announce")) throw forbidden("Only managers can create announcement channels");
  const members = [req.user._id, ...memberIds.filter(isObjectId)];
  const channel = await Channel.create({
    name: clean,
    topic: String(topic).trim(),
    kind: kind === "private" ? "private" : "public",
    locked: Boolean(locked),
    members: [...new Set(members.map(String))],
    createdBy: req.user._id,
  });
  res.status(201).json(channel);
});

router.post("/:id/join", async (req, res) => {
  const channel = await loadChannel(req.user, req.params.id);
  if (!channelCan(req.user, channel).join && !channel.members.some((m) => sameId(m, req.user._id))) throw forbidden("Ask a member to add you");
  if (!channel.members.some((m) => sameId(m, req.user._id))) channel.members.push(req.user._id);
  await channel.save();
  await respondWithChannel(req, res, channel);
});

/* ── Membership & settings ──────────────────────────────────── */

async function respondWithChannel(req, res, channel) {
  await channel.populate("members", PUBLIC);
  await channel.populate("projectId", "key name color");
  res.json({
    ...channel.toObject(),
    project: channel.projectId || null,
    canPost: canPost(req.user, channel),
    joined: channel.members.some((m) => sameId(m, req.user._id)),
    can: channelCan(req.user, channel),
  });
}

router.post("/:id/members", async (req, res) => {
  const channel = await loadChannel(req.user, req.params.id);
  const can = channelCan(req.user, channel);
  if (can.managedByProject) throw badRequest("Project channel members follow the project team — add people to the project instead");
  if (!can.addMembers) throw forbidden("You can't add people to this channel");
  const ids = (Array.isArray(req.body?.userIds) ? req.body.userIds : []).filter(isObjectId).slice(0, 50);
  const users = await User.find({ _id: { $in: ids }, status: "active" });
  if (!users.length) throw badRequest("Pick someone to add");
  const guests = users.filter((u) => u.role === "guest");
  if (guests.length && !can.addGuests) throw forbidden("Only admins and managers can add guests to channels");
  const added = users.filter((u) => !channel.members.some((m) => sameId(m, u._id)));
  channel.members.push(...added.map((u) => u._id));
  await channel.save();
  await notify(
    added.map((u) => u._id),
    {
      actor: req.user._id,
      type: "added_to_channel",
      title: `${req.user.firstName} added you to #${channel.name}`,
      body: channel.topic || "",
      link: { kind: "channel", id: String(channel._id) },
    }
  );
  await respondWithChannel(req, res, channel);
});

router.delete("/:id/members/:userId", async (req, res) => {
  const channel = await loadChannel(req.user, req.params.id);
  const can = channelCan(req.user, channel);
  const self = sameId(req.params.userId, req.user._id);
  if (can.managedByProject) throw badRequest("Project channel members follow the project team");
  if (channel.kind === "dm") throw badRequest("You can't leave a direct message");
  if (self ? !can.leave : !can.removeMembers) throw forbidden(self ? "You're not in this channel" : "Only the channel creator, admins and managers can remove people");
  channel.members = channel.members.filter((m) => !sameId(m, req.params.userId));
  await channel.save();
  if (!self) {
    await notify([req.params.userId], {
      actor: req.user._id,
      type: "removed_from_channel",
      title: `${req.user.firstName} removed you from #${channel.name}`,
      link: { kind: "channels" },
    });
  }
  await respondWithChannel(req, res, channel);
});

router.patch("/:id", async (req, res) => {
  const channel = await loadChannel(req.user, req.params.id);
  if (!channelCan(req.user, channel).edit) throw forbidden("Only the channel creator, admins and managers can edit this channel");
  const { name, topic, locked } = req.body || {};
  if (typeof name === "string") {
    const clean = name.toLowerCase().trim().replace(/^#/, "").replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    if (!clean) throw badRequest("Name the channel");
    if (clean !== channel.name && (await Channel.exists({ name: clean, kind: { $ne: "dm" } }))) throw badRequest(`#${clean} already exists`);
    channel.name = clean;
  }
  if (typeof topic === "string") channel.topic = topic.trim().slice(0, 200);
  if (typeof locked === "boolean") {
    if (!hasGlobal(req.user, "channel.announce")) throw forbidden("Only admins and managers can change announcement settings");
    channel.locked = locked;
  }
  await channel.save();
  await respondWithChannel(req, res, channel);
});

router.delete("/:id", async (req, res) => {
  const channel = await loadChannel(req.user, req.params.id);
  if (!channelCan(req.user, channel).delete) throw forbidden("Only the channel creator or an admin can delete it");
  await Promise.all([Message.deleteMany({ channelId: channel._id }), channel.deleteOne()]);
  res.json({ id: channel._id });
});

router.get("/:id/messages", async (req, res) => {
  const channel = await loadChannel(req.user, req.params.id);
  const filter = { channelId: channel._id };
  if (req.query.after) filter.createdAt = { $gt: new Date(req.query.after) };
  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("sender", PUBLIC)
    .populate("memoryId", "title");
  res.json(messages.reverse());
});

router.post("/:id/messages", async (req, res) => {
  const channel = await loadChannel(req.user, req.params.id);
  if (!canPost(req.user, channel)) {
    throw forbidden(channel.locked ? "Only admins and managers can post announcements" : "Join the channel to post");
  }
  const text = String(req.body?.text || "").trim();
  if (!text) throw badRequest("Write a message");
  const message = await Message.create({ channelId: channel._id, sender: req.user._id, text });
  channel.lastMessageAt = message.createdAt;
  if (channel.kind === "public" && !channel.members.some((m) => sameId(m, req.user._id))) channel.members.push(req.user._id);
  await channel.save();

  const mentioned = await resolveMentions(text);
  const label = channel.kind === "dm" ? "a direct message" : `#${channel.name}`;
  await notify(
    channel.kind === "dm" ? channel.members : mentioned.map((u) => u._id),
    {
      actor: req.user._id,
      type: "mentioned",
      title: channel.kind === "dm" ? `${req.user.firstName} sent you a message` : `${req.user.firstName} mentioned you in ${label}`,
      body: text,
      link: { kind: "channel", id: String(channel._id) },
    }
  );
  await message.populate("sender", PUBLIC);
  res.status(201).json(message);
});

router.post("/:id/messages/:messageId/react", async (req, res) => {
  const channel = await loadChannel(req.user, req.params.id);
  const message = await Message.findOne({ _id: req.params.messageId, channelId: channel._id });
  if (!message) throw notFound("Message");
  const emoji = String(req.body?.emoji || "").slice(0, 8);
  let reaction = message.reactions.find((r) => r.emoji === emoji);
  if (!reaction) {
    message.reactions.push({ emoji, users: [] });
    reaction = message.reactions[message.reactions.length - 1];
  }
  const has = reaction.users.some((u) => sameId(u, req.user._id));
  reaction.users = has ? reaction.users.filter((u) => !sameId(u, req.user._id)) : [...reaction.users, req.user._id];
  message.reactions = message.reactions.filter((r) => r.users.length);
  await message.save();
  await message.populate("sender", PUBLIC);
  await message.populate("memoryId", "title");
  res.json(message);
});

router.delete("/:id/messages/:messageId", async (req, res) => {
  const channel = await loadChannel(req.user, req.params.id);
  const message = await Message.findOne({ _id: req.params.messageId, channelId: channel._id });
  if (!message) throw notFound("Message");
  if (!sameId(message.sender, req.user._id) && !isAdmin(req.user)) throw forbidden("You can only delete your own messages");
  await message.deleteOne();
  res.json({ id: message._id });
});

module.exports = router;
module.exports.canRead = canRead;
